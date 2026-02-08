/**
 * Push Notification Service — APNs (iOS) + Web Push (browsers)
 *
 * Sends push notifications to iOS devices via APNs and to web browsers via Web Push.
 */

import https from 'https';
import http2 from 'http2';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { prisma } from '../lib/prisma.js';

// Web Push VAPID configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@helpem.ai';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// APNs configuration
const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';
const APNS_PORT = 443;

// Cache for APNs JWT token (valid for 1 hour, we refresh every 50 minutes)
let apnsToken = null;
let apnsTokenExpiry = 0;

/**
 * Generate APNs JWT token for authentication
 * Uses Apple's token-based authentication
 */
function getAPNsToken() {
  const now = Math.floor(Date.now() / 1000);
  
  // Return cached token if still valid (with 10 minute buffer)
  if (apnsToken && apnsTokenExpiry > now + 600) {
    return apnsToken;
  }
  
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  
  if (!teamId || !keyId || !privateKey) {
    throw new Error('APNs credentials not configured');
  }
  
  // Decode private key if it's base64 encoded
  let key = privateKey;
  if (!privateKey.includes('-----BEGIN')) {
    key = Buffer.from(privateKey, 'base64').toString('utf8');
  }
  
  // Create JWT token
  apnsToken = jwt.sign(
    {
      iss: teamId,
      iat: now,
    },
    key,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    }
  );
  
  // Token is valid for 1 hour
  apnsTokenExpiry = now + 3600;
  
  return apnsToken;
}

/**
 * Send a push notification to a device
 * 
 * @param {string} deviceToken - APNs device token
 * @param {Object} payload - Notification payload
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result
 */
export async function sendPushNotification(deviceToken, payload, options = {}) {
  const bundleId = process.env.APNS_BUNDLE_ID || 'ai.helpem.app';
  const isProduction = process.env.NODE_ENV === 'production';
  const host = isProduction ? APNS_HOST_PRODUCTION : APNS_HOST_SANDBOX;
  
  const token = getAPNsToken();
  
  const notificationPayload = {
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
        ...(payload.subtitle && { subtitle: payload.subtitle }),
      },
      sound: payload.sound || 'default',
      badge: payload.badge,
      'mutable-content': 1,
      'content-available': payload.contentAvailable ? 1 : 0,
      ...(payload.category && { category: payload.category }),
      ...(payload.threadId && { 'thread-id': payload.threadId }),
    },
    // Custom data
    ...payload.data,
  };
  
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    
    client.on('error', (err) => {
      console.error('APNs HTTP/2 connection error:', err);
      reject(err);
    });
    
    const headers = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${token}`,
      'apns-topic': bundleId,
      'apns-push-type': payload.contentAvailable ? 'background' : 'alert',
      'apns-priority': options.priority || '10',
      ...(options.expiration && { 'apns-expiration': String(options.expiration) }),
      ...(options.collapseId && { 'apns-collapse-id': options.collapseId }),
    };
    
    const req = client.request(headers);
    
    let data = '';
    
    req.on('response', (responseHeaders) => {
      const status = responseHeaders[':status'];
      
      req.on('data', (chunk) => {
        data += chunk;
      });
      
      req.on('end', () => {
        client.close();
        
        if (status === 200) {
          resolve({ success: true, status });
        } else {
          const error = data ? JSON.parse(data) : { reason: 'Unknown error' };
          console.error(`APNs error (${status}):`, error);
          resolve({ 
            success: false, 
            status, 
            reason: error.reason,
            // If device token is invalid, we should remove it
            invalidToken: error.reason === 'BadDeviceToken' || error.reason === 'Unregistered',
          });
        }
      });
    });
    
    req.write(JSON.stringify(notificationPayload));
    req.end();
  });
}

/**
 * Register a device token for a user
 * 
 * @param {string} userId - User ID
 * @param {string} deviceToken - APNs device token
 * @param {Object} options - Additional options
 */
export async function registerDeviceToken(userId, deviceToken, options = {}) {
  await prisma.userDevice.upsert({
    where: { deviceToken },
    update: {
      userId,
      lastActiveAt: new Date(),
      deviceName: options.deviceName,
      platform: options.platform || 'ios',
      notificationsEnabled: true,
    },
    create: {
      userId,
      deviceToken,
      deviceName: options.deviceName,
      platform: options.platform || 'ios',
    },
  });
  
  console.log(`📱 Device registered for user ${userId}`);
}

/**
 * Unregister a device token
 * 
 * @param {string} deviceToken - APNs device token
 */
export async function unregisterDeviceToken(deviceToken) {
  await prisma.userDevice.delete({
    where: { deviceToken },
  }).catch(() => {
    // Ignore if already deleted
  });
}

// =============================================================================
// Web Push (browsers)
// =============================================================================

/**
 * Send a Web Push notification
 *
 * @param {Object} subscription - PushSubscription from the browser
 * @param {Object} payload - { title, body, url? }
 * @returns {Promise<Object>} Result
 */
export async function sendWebPush(subscription, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, reason: 'VAPID keys not configured' };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/app/dashboard',
      })
    );
    return { success: true };
  } catch (err) {
    const gone = err.statusCode === 410 || err.statusCode === 404;
    if (gone) {
      return { success: false, invalidToken: true, reason: 'Subscription expired' };
    }
    console.error('Web Push error:', err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Register a Web Push subscription for a user.
 * Uses the subscription endpoint as the unique device token.
 *
 * @param {string} userId
 * @param {Object} subscription - PushSubscription object from the browser
 * @param {string} [deviceName]
 */
export async function registerWebPushSubscription(userId, subscription, deviceName) {
  const endpoint = subscription.endpoint;

  await prisma.userDevice.upsert({
    where: { deviceToken: endpoint },
    update: {
      userId,
      pushSubscription: subscription,
      lastActiveAt: new Date(),
      notificationsEnabled: true,
    },
    create: {
      userId,
      deviceToken: endpoint,
      platform: 'web',
      deviceName: deviceName || 'Web Browser',
      pushSubscription: subscription,
    },
  });

  console.log(`🌐 Web push registered for user ${userId}`);
}

/**
 * Check if Web Push is configured
 */
export function isWebPushEnabled() {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Get the VAPID public key (needed by frontend to subscribe)
 */
export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

// =============================================================================
// Send to User (unified — APNs + Web Push)
// =============================================================================

/**
 * Send notification to all devices for a user
 *
 * @param {string} userId - User ID
 * @param {Object} payload - Notification payload
 */
export async function sendToUser(userId, payload) {
  const devices = await prisma.userDevice.findMany({
    where: {
      userId,
      notificationsEnabled: true,
    },
  });

  if (devices.length === 0) {
    console.log(`No devices registered for user ${userId}`);
    return [];
  }

  const results = await Promise.all(
    devices.map(async (device) => {
      let result;

      if (device.platform === 'web' && device.pushSubscription) {
        // Web Push path
        result = await sendWebPush(device.pushSubscription, payload);
      } else {
        // APNs path (iOS)
        result = await sendPushNotification(device.deviceToken, payload);
      }

      // Remove invalid tokens
      if (result.invalidToken) {
        await unregisterDeviceToken(device.deviceToken);
      }

      return { deviceId: device.id, ...result };
    })
  );

  return results;
}

/**
 * Send tribe update notification
 * 
 * @param {string} userId - User ID
 * @param {string} tribeName - Tribe name
 * @param {number} updateCount - Number of updates
 */
export async function sendTribeDigestNotification(userId, tribeName, updateCount) {
  return sendToUser(userId, {
    title: tribeName,
    body: `You have ${updateCount} new update${updateCount === 1 ? '' : 's'}`,
    sound: 'default',
    data: {
      type: 'tribe_digest',
      tribeName,
    },
    threadId: `tribe-${tribeName}`,
  });
}

/**
 * Check if push notifications are enabled
 * 
 * @returns {boolean} True if APNs is configured
 */
export function isPushEnabled() {
  return !!(
    process.env.APNS_TEAM_ID &&
    process.env.APNS_KEY_ID &&
    process.env.APNS_PRIVATE_KEY
  );
}

export default {
  sendPushNotification,
  registerDeviceToken,
  unregisterDeviceToken,
  sendToUser,
  sendTribeDigestNotification,
  isPushEnabled,
  sendWebPush,
  registerWebPushSubscription,
  isWebPushEnabled,
  getVapidPublicKey,
};
