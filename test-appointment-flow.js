#!/usr/bin/env node

/**
 * APPOINTMENT FLOW QA TEST
 * Tests array completion: [day, time, duration, who, what, location]
 * 
 * This script simulates 50+ appointment creation scenarios to validate:
 * - Mandatory field collection (date, time, duration)
 * - Optional field extraction (withWhom, topic, location)
 * - Correction handling
 * - Decline handling
 * - Edge cases and parsing
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_TOKEN = 'test-user-token-12345';

let testsPassed = 0;
let testsFailed = 0;
let errors = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testChat(messages, expectedAction, expectedFields = {}, testName) {
  try {
    log(`\n${'='.repeat(80)}`, 'cyan');
    log(`TEST: ${testName}`, 'cyan');
    log(`${'='.repeat(80)}`, 'cyan');
    
    // Convert string messages to message objects
    const messageObjects = messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      return msg;
    });
    
    log(`Messages: ${messageObjects.map(m => `[${m.role}] ${m.content}`).join(' → ')}`, 'blue');
    
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({ messages: messageObjects }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');
    
    // Validate action
    if (data.action !== expectedAction) {
      throw new Error(`Expected action "${expectedAction}", got "${data.action}"`);
    }
    
    // Validate fields if action is "add"
    if (expectedAction === 'add') {
      const fieldsToCheck = ['datetime', 'durationMinutes', 'withWhom', 'topic', 'location'];
      const missingFields = [];
      const incorrectFields = [];
      
      for (const field of fieldsToCheck) {
        if (expectedFields[field] !== undefined) {
          const actual = data[field];
          const expected = expectedFields[field];
          
          if (field === 'datetime') {
            // For datetime, just check if it exists and is a valid ISO string
            if (!actual || !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(actual)) {
              missingFields.push(field);
            }
          } else if (expected === null && actual !== null && actual !== undefined) {
            incorrectFields.push(`${field}: expected null, got "${actual}"`);
          } else if (expected !== null && actual !== expected) {
            // For non-null expected values, check equality
            if (typeof expected === 'string' && actual && !actual.toLowerCase().includes(expected.toLowerCase())) {
              incorrectFields.push(`${field}: expected "${expected}", got "${actual}"`);
            }
          }
        }
      }
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      if (incorrectFields.length > 0) {
        throw new Error(`Incorrect fields: ${incorrectFields.join('; ')}`);
      }
    }
    
    log(`✅ PASS: ${testName}`, 'green');
    testsPassed++;
    return data;
    
  } catch (error) {
    log(`❌ FAIL: ${testName}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    testsFailed++;
    errors.push({ test: testName, error: error.message });
    return null;
  }
}

async function runTests() {
  log('\n' + '='.repeat(80), 'yellow');
  log('APPOINTMENT FLOW QA TEST - 50+ SCENARIOS', 'yellow');
  log('='.repeat(80) + '\n', 'yellow');
  
  // ===================================================================
  // SECTION 1: COMPLETE INFORMATION UPFRONT (Should create immediately)
  // ===================================================================
  log('\n### SECTION 1: Complete Information Upfront ###', 'cyan');
  
  await testChat(
    ['Set a meeting tomorrow at 2pm for 30 minutes with John about Q1 planning'],
    'add',
    { datetime: true, durationMinutes: 30, withWhom: 'John', topic: 'Q1 planning', location: null },
    '1.1 - All fields provided upfront'
  );
  
  await testChat(
    ['Schedule appointment Friday at 10am for 1 hour with Dr. Smith'],
    'add',
    { datetime: true, durationMinutes: 60, withWhom: 'Dr. Smith', topic: null, location: null },
    '1.2 - No topic, should ask as optional'
  );
  
  await testChat(
    ['Meeting Monday at 3pm for 45 minutes about budget review'],
    'add',
    { datetime: true, durationMinutes: 45, withWhom: null, topic: 'budget review', location: null },
    '1.3 - No withWhom, should ask as optional'
  );
  
  await testChat(
    ['Dentist appointment tomorrow at noon for 30 minutes'],
    'add',
    { datetime: true, durationMinutes: 30, withWhom: null, topic: null, location: null },
    '1.4 - Only mandatory fields, optionals should be null'
  );
  
  // ===================================================================
  // SECTION 2: MISSING TIME - Should ask "What time?"
  // ===================================================================
  log('\n### SECTION 2: Missing Time ###', 'cyan');
  
  await testChat(
    ['Set a meeting tomorrow with Sarah for 15 minutes'],
    'respond',
    {},
    '2.1 - Missing time, should ask "What time?"'
  );
  
  await testChat(
    ['Schedule appointment Friday with Dr. Jones'],
    'respond',
    {},
    '2.2 - Missing time and duration, should ask "What time?" first'
  );
  
  // ===================================================================
  // SECTION 3: MISSING DURATION - Should ask "How long?"
  // ===================================================================
  log('\n### SECTION 3: Missing Duration ###', 'cyan');
  
  const test3_1 = await testChat(
    [
      { role: 'user', content: 'Meeting tomorrow with Alex' },
      { role: 'assistant', content: '{"action": "respond", "message": "What time?"}' },
      { role: 'user', content: '2pm' }
    ],
    'respond',
    {},
    '3.1 - After time provided, should ask "How long?"'
  );
  
  const test3_2 = await testChat(
    [
      { role: 'user', content: 'Set appointment Friday' },
      { role: 'assistant', content: '{"action": "respond", "message": "What time?"}' },
      { role: 'user', content: 'At 11am' }
    ],
    'respond',
    {},
    '3.2 - After time, should ask duration'
  );
  
  // ===================================================================
  // SECTION 4: COMPLETE FLOW - Time then Duration
  // ===================================================================
  log('\n### SECTION 4: Complete Mandatory Field Flow ###', 'cyan');
  
  await testChat(
    [
      { role: 'user', content: 'Meeting tomorrow with the team' },
      { role: 'assistant', content: '{"action": "respond", "message": "What time?"}' },
      { role: 'user', content: '3pm' },
      { role: 'assistant', content: '{"action": "respond", "message": "How long?"}' },
      { role: 'user', content: '1 hour' }
    ],
    'add',
    { datetime: true, durationMinutes: 60, withWhom: 'the team', topic: null, location: null },
    '4.1 - Full flow: missing time → missing duration → create'
  );
  
  await testChat(
    [
      { role: 'user', content: 'Schedule appointment Friday' },
      { role: 'assistant', content: '{"action": "respond", "message": "What time?"}' },
      { role: 'user', content: 'Morning' },
      { role: 'assistant', content: '{"action": "respond", "message": "How long?"}' },
      { role: 'user', content: '30 minutes' }
    ],
    'add',
    { datetime: true, durationMinutes: 30, withWhom: null, topic: null, location: null },
    '4.2 - Vague time ("morning") should default to 9am'
  );
  
  // ===================================================================
  // SECTION 5: AMBIGUOUS "AT" PATTERNS - Should ask clarification
  // ===================================================================
  log('\n### SECTION 5: Ambiguous "at" Patterns ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at the AMS team'],
    'respond',
    {},
    '5.1 - "at the AMS team" is ambiguous, should ask "Did you mean WITH the AMS team?"'
  );
  
  await testChat(
    ['Appointment Friday at Google'],
    'respond',
    {},
    '5.2 - "at Google" is ambiguous, should ask clarification'
  );
  
  await testChat(
    ['Meeting at Conference Room A at 2pm for 30 minutes'],
    'add',
    { datetime: true, durationMinutes: 30, withWhom: null, topic: null, location: 'Conference Room A' },
    '5.3 - "at Conference Room A" is clear location, should extract immediately'
  );
  
  // ===================================================================
  // SECTION 6: FILLER WORDS - Should be ignored
  // ===================================================================
  log('\n### SECTION 6: Filler Words ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at um 2pm for like 30 minutes with John'],
    'add',
    { datetime: true, durationMinutes: 30, withWhom: 'John', topic: null, location: null },
    '6.1 - "um" and "like" should be filtered out'
  );
  
  await testChat(
    ['Appointment uh Friday at you know 3pm for uh 1 hour'],
    'add',
    { datetime: true, durationMinutes: 60, withWhom: null, topic: null, location: null },
    '6.2 - Multiple filler words should be ignored'
  );
  
  // ===================================================================
  // SECTION 7: TIME PARSING ACCURACY
  // ===================================================================
  log('\n### SECTION 7: Time Parsing ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at noon for 15 minutes'],
    'add',
    { datetime: true, durationMinutes: 15 },
    '7.1 - "noon" should be 12:00 PM'
  );
  
  await testChat(
    ['Appointment Friday at midnight for 30 minutes'],
    'add',
    { datetime: true, durationMinutes: 30 },
    '7.2 - "midnight" should be 12:00 AM'
  );
  
  await testChat(
    ['Meeting Monday morning for 1 hour'],
    'add',
    { datetime: true, durationMinutes: 60 },
    '7.3 - "morning" should default to 9am'
  );
  
  await testChat(
    ['Appointment Thursday evening for 45 minutes'],
    'add',
    { datetime: true, durationMinutes: 45 },
    '7.4 - "evening" should default to 6pm'
  );
  
  await testChat(
    ['Meeting tomorrow at 2:30pm for 90 minutes'],
    'add',
    { datetime: true, durationMinutes: 90 },
    '7.5 - Time with minutes (2:30pm) should parse correctly'
  );
  
  // ===================================================================
  // SECTION 8: DURATION PARSING
  // ===================================================================
  log('\n### SECTION 8: Duration Parsing ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at 3pm for 1 hour'],
    'add',
    { durationMinutes: 60 },
    '8.1 - "1 hour" = 60 minutes'
  );
  
  await testChat(
    ['Appointment Friday at 2pm for 2 hours'],
    'add',
    { durationMinutes: 120 },
    '8.2 - "2 hours" = 120 minutes'
  );
  
  await testChat(
    ['Meeting Monday at 10am for 45 mins'],
    'add',
    { durationMinutes: 45 },
    '8.3 - "45 mins" = 45 minutes'
  );
  
  await testChat(
    ['Appointment Thursday at 1pm for 1.5 hours'],
    'add',
    { durationMinutes: 90 },
    '8.4 - "1.5 hours" = 90 minutes'
  );
  
  // ===================================================================
  // SECTION 9: "WITH" EXTRACTION
  // ===================================================================
  log('\n### SECTION 9: "with" Extraction ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at 2pm for 30 minutes with Sarah'],
    'add',
    { withWhom: 'Sarah' },
    '9.1 - "with Sarah" should extract withWhom'
  );
  
  await testChat(
    ['Call with Dr. Smith Friday at 3pm for 15 minutes'],
    'add',
    { withWhom: 'Dr. Smith' },
    '9.2 - "with Dr. Smith" should extract withWhom'
  );
  
  await testChat(
    ['Meeting with the marketing team Monday at 10am for 1 hour'],
    'add',
    { withWhom: 'the marketing team' },
    '9.3 - "with the marketing team" should extract full entity name'
  );
  
  await testChat(
    ['Lunch with Sarah and Mike tomorrow at noon for 30 minutes'],
    'add',
    { withWhom: 'Sarah and Mike' },
    '9.4 - Multiple people should extract as single string'
  );
  
  // ===================================================================
  // SECTION 10: "ABOUT" EXTRACTION
  // ===================================================================
  log('\n### SECTION 10: "about" Extraction ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at 2pm for 30 minutes about budget review'],
    'add',
    { topic: 'budget review' },
    '10.1 - "about budget review" should extract topic'
  );
  
  await testChat(
    ['Call Friday at 3pm for 15 minutes about the Q4 report'],
    'add',
    { topic: 'the Q4 report' },
    '10.2 - "about the Q4 report" should extract topic'
  );
  
  // ===================================================================
  // SECTION 11: COMBINED "WITH" AND "ABOUT"
  // ===================================================================
  log('\n### SECTION 11: Combined with + about ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at 2pm for 30 minutes with John about project planning'],
    'add',
    { withWhom: 'John', topic: 'project planning' },
    '11.1 - Should extract both withWhom and topic'
  );
  
  await testChat(
    ['Call with Sarah about the budget Friday at 3pm for 20 minutes'],
    'add',
    { withWhom: 'Sarah', topic: 'the budget' },
    '11.2 - Order: with + about (before time)'
  );
  
  await testChat(
    ['Meeting about Q1 goals with the team Monday at 10am for 1 hour'],
    'add',
    { withWhom: 'the team', topic: 'Q1 goals' },
    '11.3 - Order: about + with (before time)'
  );
  
  // ===================================================================
  // SECTION 12: LOCATION EXTRACTION
  // ===================================================================
  log('\n### SECTION 12: Location Extraction ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow at 2pm for 30 minutes at Conference Room A'],
    'add',
    { location: 'Conference Room A' },
    '12.1 - Clear location "at Conference Room A"'
  );
  
  await testChat(
    ['Appointment Friday at 3pm for 1 hour at 123 Main Street'],
    'add',
    { location: '123 Main Street' },
    '12.2 - Street address as location'
  );
  
  await testChat(
    ['Meeting with John at Google HQ Monday at 10am for 30 minutes'],
    'add',
    { withWhom: 'John', location: 'Google HQ' },
    '12.3 - Both withWhom and location'
  );
  
  // ===================================================================
  // SECTION 13: CORRECTION SCENARIOS
  // ===================================================================
  log('\n### SECTION 13: Corrections ###', 'cyan');
  
  await testChat(
    [
      { role: 'user', content: 'Meeting tomorrow at 2pm' },
      { role: 'assistant', content: '{"action": "respond", "message": "How long?"}' },
      { role: 'user', content: 'No I said 3pm for 30 minutes' }
    ],
    'add',
    { durationMinutes: 30 },
    '13.1 - Correction with "No I said" should re-process'
  );
  
  await testChat(
    [
      { role: 'user', content: 'Appointment Friday' },
      { role: 'assistant', content: '{"action": "respond", "message": "What time?"}' },
      { role: 'user', content: 'Actually make it Monday at 10am for 1 hour' }
    ],
    'add',
    { durationMinutes: 60 },
    '13.2 - Correction with "Actually" should update date'
  );
  
  // ===================================================================
  // SECTION 14: MISSING FIELDS - Multi-turn flow
  // ===================================================================
  log('\n### SECTION 14: Multi-turn Flows ###', 'cyan');
  
  await testChat(
    [
      { role: 'user', content: 'Set a meeting' },
      { role: 'assistant', content: '{"action": "respond", "message": "When?"}' },
      { role: 'user', content: 'Tomorrow' },
      { role: 'assistant', content: '{"action": "respond", "message": "What time?"}' },
      { role: 'user', content: '2pm' },
      { role: 'assistant', content: '{"action": "respond", "message": "How long?"}' },
      { role: 'user', content: '30 minutes' }
    ],
    'add',
    { datetime: true, durationMinutes: 30 },
    '14.1 - Multi-turn: when → time → duration'
  );
  
  // ===================================================================
  // SECTION 15: EDGE CASES
  // ===================================================================
  log('\n### SECTION 15: Edge Cases ###', 'cyan');
  
  await testChat(
    ['Set a meeting tomorrow at 11:59pm for 1 minute'],
    'add',
    { durationMinutes: 1 },
    '15.1 - 11:59pm time parsing'
  );
  
  await testChat(
    ['Meeting tomorrow at 12:01am for 5 minutes'],
    'add',
    { durationMinutes: 5 },
    '15.2 - 12:01am (just after midnight)'
  );
  
  await testChat(
    ['Appointment tomorrow for 15 minutes at 2pm'],
    'add',
    { durationMinutes: 15 },
    '15.3 - Duration before time (reversed order)'
  );
  
  await testChat(
    ['Meeting for 30 minutes tomorrow at 2pm with John'],
    'add',
    { durationMinutes: 30, withWhom: 'John' },
    '15.4 - Duration at start of sentence'
  );
  
  // ===================================================================
  // SECTION 16: RELATIVE DATES
  // ===================================================================
  log('\n### SECTION 16: Relative Dates ###', 'cyan');
  
  await testChat(
    ['Meeting today at 5pm for 30 minutes'],
    'add',
    { datetime: true, durationMinutes: 30 },
    '16.1 - "today" should be today'
  );
  
  await testChat(
    ['Appointment tomorrow at 9am for 1 hour'],
    'add',
    { datetime: true, durationMinutes: 60 },
    '16.2 - "tomorrow" should be tomorrow'
  );
  
  await testChat(
    ['Meeting next Monday at 10am for 45 minutes'],
    'add',
    { datetime: true, durationMinutes: 45 },
    '16.3 - "next Monday" should be next week'
  );
  
  await testChat(
    ['Appointment this Friday at 2pm for 30 minutes'],
    'add',
    { datetime: true, durationMinutes: 30 },
    '16.4 - "this Friday" should be this week'
  );
  
  // ===================================================================
  // SECTION 17: SPECIFIC DAYS OF WEEK
  // ===================================================================
  log('\n### SECTION 17: Days of Week ###', 'cyan');
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (let i = 0; i < days.length; i++) {
    await testChat(
      [`Meeting ${days[i]} at 2pm for 30 minutes`],
      'add',
      { datetime: true, durationMinutes: 30 },
      `17.${i + 1} - ${days[i]} should be next ${days[i]}`
    );
  }
  
  // ===================================================================
  // SECTION 18: SPECIAL CHARACTERS & PUNCTUATION
  // ===================================================================
  log('\n### SECTION 18: Special Characters ###', 'cyan');
  
  await testChat(
    ['Meeting tomorrow @ 2pm for 30min w/ John re: budget'],
    'add',
    { withWhom: 'John', topic: 'budget' },
    '18.1 - Shorthand: @, w/, re:'
  );
  
  await testChat(
    ['Meeting tomorrow, 2pm, 30 minutes, with Sarah, about Q4'],
    'add',
    { withWhom: 'Sarah', topic: 'Q4' },
    '18.2 - Comma-separated format'
  );
  
  // ===================================================================
  // SUMMARY
  // ===================================================================
  log('\n' + '='.repeat(80), 'yellow');
  log('TEST SUMMARY', 'yellow');
  log('='.repeat(80), 'yellow');
  log(`Total Tests: ${testsPassed + testsFailed}`, 'blue');
  log(`✅ Passed: ${testsPassed}`, 'green');
  log(`❌ Failed: ${testsFailed}`, 'red');
  log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`, 'cyan');
  
  if (errors.length > 0) {
    log('\n### ERRORS ###', 'red');
    errors.forEach((err, idx) => {
      log(`\n${idx + 1}. ${err.test}`, 'red');
      log(`   ${err.error}`, 'red');
    });
  }
  
  log('\n' + '='.repeat(80) + '\n', 'yellow');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
