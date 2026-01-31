/**
 * Notifications Routes
 * 
 * Handles device token registration and notification preferences.
 */

import express from 'express';
import { verifySessionToken } from '../lib/sessionAuth.js';
import { prisma } from '../lib/prisma.js';
import { registerDeviceToken, unregisterDeviceToken, isPushEnabled } from '../services/pushNotificationService.js';

const router = express.Router();

/**
 * POST /notifications/register-device
 * 
 * Register a device token for push notifications.
 */
router.post('/register-device', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { deviceToken, deviceName, platform } = req.body;
    
    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token is required' });
    }
    
    await registerDeviceToken(userId, deviceToken, { deviceName, platform });
    
    return res.json({ 
      success: true, 
      message: 'Device registered for notifications',
      pushEnabled: isPushEnabled(),
    });
    
  } catch (err) {
    console.error('Error registering device:', err);
    return res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * DELETE /notifications/unregister-device
 * 
 * Unregister a device token.
 */
router.delete('/unregister-device', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const { deviceToken } = req.body;
    
    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token is required' });
    }
    
    await unregisterDeviceToken(deviceToken);
    
    return res.json({ success: true, message: 'Device unregistered' });
    
  } catch (err) {
    console.error('Error unregistering device:', err);
    return res.status(500).json({ error: 'Failed to unregister device' });
  }
});

/**
 * GET /notifications/preferences
 * 
 * Get notification preferences for the current user.
 */
router.get('/preferences', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    
    // Get all tribe memberships with notification preferences
    const memberships = await prisma.tribeMember.findMany({
      where: {
        userId,
        leftAt: null,
      },
      include: {
        tribe: {
          select: { id: true, name: true },
        },
      },
    });
    
    // Get registered devices
    const devices = await prisma.userDevice.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        notificationsEnabled: true,
        lastActiveAt: true,
      },
    });
    
    return res.json({
      pushEnabled: isPushEnabled(),
      devices,
      tribes: memberships.map(m => ({
        tribeId: m.tribe.id,
        tribeName: m.tribe.name,
        proposalNotifications: m.proposalNotifs,
        digestNotifications: m.digestNotifs,
      })),
    });
    
  } catch (err) {
    console.error('Error getting notification preferences:', err);
    return res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PATCH /notifications/preferences
 * 
 * Update notification preferences.
 */
router.patch('/preferences', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { deviceId, enabled, tribeId, proposalNotifications, digestNotifications } = req.body;
    
    // Update device notifications
    if (deviceId !== undefined && enabled !== undefined) {
      await prisma.userDevice.update({
        where: { id: deviceId },
        data: { notificationsEnabled: enabled },
      });
    }
    
    // Update tribe notification preferences
    if (tribeId) {
      await prisma.tribeMember.update({
        where: {
          tribeId_userId: { tribeId, userId },
        },
        data: {
          ...(proposalNotifications !== undefined && { proposalNotifs: proposalNotifications }),
          ...(digestNotifications !== undefined && { digestNotifs: digestNotifications }),
        },
      });
    }
    
    return res.json({ success: true, message: 'Preferences updated' });
    
  } catch (err) {
    console.error('Error updating notification preferences:', err);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
