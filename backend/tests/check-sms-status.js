/**
 * Check SMS message status
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messageSid = process.argv[2];

if (!messageSid) {
  console.log('Checking recent messages...');
}

const client = twilio(accountSid, authToken);

// Get recent messages
const messages = await client.messages.list({ limit: 5 });

console.log('\nRecent SMS Messages:');
console.log('='.repeat(60));

for (const msg of messages) {
  console.log(`\nSID: ${msg.sid}`);
  console.log(`To: ${msg.to}`);
  console.log(`From: ${msg.from}`);
  console.log(`Status: ${msg.status}`);
  console.log(`Error Code: ${msg.errorCode || 'None'}`);
  console.log(`Error Message: ${msg.errorMessage || 'None'}`);
  console.log(`Date: ${msg.dateCreated}`);
}
