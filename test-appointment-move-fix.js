#!/usr/bin/env node

/**
 * Test script to verify appointment move/reschedule fix
 * 
 * Tests that "move meeting with Michael to 10am" correctly:
 * 1. Recognizes as UPDATE (not ADD)
 * 2. Finds existing "Michael Sims" appointment
 * 3. Updates the datetime
 * 4. Does NOT create new appointment
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 Appointment Move/Reschedule Fix - Test Script');
console.log('================================================\n');

console.log('Test Scenario:');
console.log('  Existing: Meeting with Michael Sims at 4pm');
console.log('  User says: "Move the meeting with Michael to 10am"\n');

console.log('Expected Behavior:');
console.log('  ✅ Returns UPDATE action (not ADD)');
console.log('  ✅ Finds "Michael Sims" appointment');
console.log('  ✅ Changes datetime from 4pm to 10am');
console.log('  ✅ Does NOT create new appointment');
console.log('  ✅ Does NOT hallucinate different person name\n');

console.log('================================================');
console.log('Manual Test Steps:');
console.log('================================================\n');

console.log('1. Create test appointment:');
console.log('   "Add meeting with Michael Sims at 4pm today for 30 minutes"');
console.log('   → Verify appointment created\n');

console.log('2. Move the meeting:');
console.log('   "Move the meeting with Michael to 10am"');
console.log('   → Check AI response\n');

console.log('3. Expected AI response:');
console.log('   {');
console.log('     "action": "update",');
console.log('     "type": "appointment",');
console.log('     "title": "Meeting",  // or partial match');
console.log('     "updates": {');
console.log('       "datetime": "2026-01-24T10:00:00"');
console.log('     },');
console.log('     "message": "I\'ve moved your meeting with Michael Sims to 10am."');
console.log('   }\n');

console.log('4. Verify in UI:');
console.log('   - Only ONE meeting exists');
console.log('   - Meeting is at 10am (not 4pm)');
console.log('   - Meeting is still with Michael Sims (not a different person)');
console.log('   - No duplicate appointments created\n');

console.log('================================================');
console.log('Additional Test Cases:');
console.log('================================================\n');

const testCases = [
  {
    scenario: 'Reschedule by partial name',
    existing: 'Dentist with Dr. Smith at 2pm',
    userSays: 'Reschedule the dentist to Friday',
    shouldDo: 'UPDATE dentist appointment to Friday'
  },
  {
    scenario: 'Move by title only',
    existing: 'Team standup at 9am',
    userSays: 'Move standup to 10am',
    shouldDo: 'UPDATE standup to 10am'
  },
  {
    scenario: 'Change time with person',
    existing: 'Client call with Sarah at 3pm',
    userSays: 'Change the call with Sarah to 4pm',
    shouldDo: 'UPDATE call to 4pm'
  },
  {
    scenario: 'No matching appointment',
    existing: 'Meeting with Michael Sims at 4pm',
    userSays: 'Move the meeting with Bob to noon',
    shouldDo: 'Ask: "I don\'t see an appointment with Bob"'
  }
];

testCases.forEach((test, i) => {
  console.log(`Test ${i + 1}: ${test.scenario}`);
  console.log(`  Existing: ${test.existing}`);
  console.log(`  User: "${test.userSays}"`);
  console.log(`  Expected: ${test.shouldDo}\n`);
});

console.log('================================================');
console.log('\nPress Enter to close...');

rl.on('line', () => {
  process.exit(0);
});
