/**
 * SMS Service using Twilio
 * 
 * Sends SMS messages for tribe invitations.
 */

import twilio from 'twilio';

// Initialize Twilio client
let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Send an SMS message
 * 
 * @param {string} to - Phone number to send to (E.164 format)
 * @param {string} message - Message body
 * @returns {Promise<Object>} Twilio message response
 */
export async function sendSMS(to, message) {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER not configured');
  }
  
  // Normalize phone number to E.164 format
  const normalizedTo = normalizePhoneNumber(to);
  
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalizedTo,
    });
    
    console.log(`📱 SMS sent to ${normalizedTo}: ${result.sid}`);
    
    return {
      success: true,
      sid: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${normalizedTo}:`, error.message);
    throw error;
  }
}

/**
 * Send a tribe invitation SMS
 * 
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} inviterName - Name of the person inviting
 * @param {string} tribeName - Name of the tribe
 * @param {string} inviteToken - Unique invite token
 * @returns {Promise<Object>} Result
 */
export async function sendTribeInviteSMS(phoneNumber, inviterName, tribeName, inviteToken) {
  const baseUrl = process.env.WEB_APP_URL || 'https://helpem.ai';
  const inviteLink = `${baseUrl}/join/${inviteToken}`;
  
  // Keep message short for SMS
  const message = `${inviterName} invited you to join "${tribeName}" on helpem! Tap to join: ${inviteLink}`;
  
  return sendSMS(phoneNumber, message);
}

/**
 * Send a referral invitation SMS
 *
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} inviterName - Name of the person inviting
 * @param {string} referralCode - 6-digit referral code
 * @returns {Promise<Object>} Result
 */
export async function sendReferralInviteSMS(phoneNumber, inviterName, referralCode) {
  const baseUrl = process.env.WEB_APP_URL || 'https://helpem.ai';
  const message = `${inviterName} invited you to HelpEm! Use code ${referralCode} when you sign up. Learn more: ${baseUrl}`;
  return sendSMS(phoneNumber, message);
}

/**
 * Normalize a phone number to E.164 format
 * 
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number in E.164 format
 */
function normalizePhoneNumber(phone) {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If it starts with 1 and is 11 digits, it's a US number
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }
  
  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return '+1' + digits;
  }
  
  // If it already has country code, just add +
  if (digits.length > 10) {
    return '+' + digits;
  }
  
  // Return as-is with + prefix
  return '+' + digits;
}

/**
 * Check if SMS sending is enabled
 * 
 * @returns {boolean} True if Twilio is configured
 */
export function isSMSEnabled() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

export default {
  sendSMS,
  sendTribeInviteSMS,
  sendReferralInviteSMS,
  isSMSEnabled,
};
