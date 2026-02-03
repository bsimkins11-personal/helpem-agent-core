/**
 * Test Twilio SMS Integration
 * Run: node tests/test-sms.js +1XXXXXXXXXX
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const toNumber = process.argv[2];

if (!toNumber) {
  console.error('Usage: node tests/test-sms.js +1XXXXXXXXXX');
  process.exit(1);
}

if (!accountSid || !authToken || !fromNumber) {
  console.error('Missing Twilio credentials. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  process.exit(1);
}

console.log('Testing Twilio SMS...');
console.log(`From: ${fromNumber}`);
console.log(`To: ${toNumber}`);

const client = twilio(accountSid, authToken);

try {
  const message = await client.messages.create({
    body: 'Test from HelpEm! Your SMS integration is working. 🎉',
    from: fromNumber,
    to: toNumber,
  });

  console.log('✅ SMS sent successfully!');
  console.log(`Message SID: ${message.sid}`);
  console.log(`Status: ${message.status}`);
} catch (error) {
  console.error('❌ Failed to send SMS:', error.message);
  process.exit(1);
}
