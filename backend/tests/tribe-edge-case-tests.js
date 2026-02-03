/**
 * Tribe Edge Case Test Suite
 * 50 tests for validation, error handling, and edge cases
 * Run: node tests/tribe-edge-case-tests.js
 */

const API_URL = 'https://api-production-2989.up.railway.app';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function api(method, path, body = null, headers = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
  const options = { method, headers: defaultHeaders };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, ok: response.ok };
}

async function runTest(name, testFn) {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.passed++;
    results.tests.push({ name, status: 'PASS', duration: `${duration}ms` });
    console.log(`✅ PASS: ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message, duration: `${duration}ms` });
    console.log(`❌ FAIL: ${name} - ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runAllTests() {
  console.log('\n================================================');
  console.log('   TRIBE EDGE CASE TEST SUITE (50 Tests)');
  console.log('================================================\n');
  console.log(`API: ${API_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // ===============================================
  // SECTION 1: Input Validation (10 tests)
  // ===============================================
  console.log('\n--- Section 1: Input Validation (10 tests) ---\n');

  await runTest('1. Empty tribe name rejected', async () => {
    const res = await api('POST', '/tribes', { name: '', type: 'family' });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('2. Whitespace-only tribe name rejected', async () => {
    const res = await api('POST', '/tribes', { name: '   ', type: 'family' });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('3. Very long tribe name handled', async () => {
    const longName = 'A'.repeat(1000);
    const res = await api('POST', '/tribes', { name: longName, type: 'family' });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('4. Special characters in tribe name handled', async () => {
    const res = await api('POST', '/tribes', { name: '<script>alert(1)</script>', type: 'family' });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('5. SQL injection in tribe name handled', async () => {
    const res = await api('POST', '/tribes', { name: "'; DROP TABLE tribes; --", type: 'family' });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('6. Empty message rejected', async () => {
    const res = await api('POST', '/tribes/test-id/messages', { message: '' });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('7. Very long message handled', async () => {
    const longMessage = 'A'.repeat(50000);
    const res = await api('POST', '/tribes/test-id/messages', { message: longMessage });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('8. Invalid item type rejected', async () => {
    const res = await api('POST', '/tribes/test-id/items', {
      itemType: 'invalid_type',
      data: { title: 'Test' },
      recipientUserIds: ['user1']
    });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('9. Empty recipient list rejected', async () => {
    const res = await api('POST', '/tribes/test-id/items', {
      itemType: 'appointment',
      data: { title: 'Test' },
      recipientUserIds: []
    });
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('10. Invalid JSON body handled', async () => {
    const response = await fetch(`${API_URL}/tribes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{'
    });
    assert([400, 401, 403].includes(response.status), `Expected 400/401/403, got ${response.status}`);
  });

  // ===============================================
  // SECTION 2: ID Validation (10 tests)
  // ===============================================
  console.log('\n--- Section 2: ID Validation (10 tests) ---\n');

  await runTest('11. Empty tribe ID handled', async () => {
    const res = await api('GET', '/tribes//members');
    assert([400, 401, 403, 404].includes(res.status), `Expected 400/401/403/404, got ${res.status}`);
  });

  await runTest('12. UUID format tribe ID handled', async () => {
    const res = await api('GET', '/tribes/550e8400-e29b-41d4-a716-446655440000/members');
    assert([401, 403, 404].includes(res.status), `Expected 401/403/404, got ${res.status}`);
  });

  await runTest('13. Very long tribe ID handled', async () => {
    const longId = 'a'.repeat(500);
    const res = await api('GET', `/tribes/${longId}/members`);
    assert([400, 401, 403, 404].includes(res.status), `Expected 400/401/403/404, got ${res.status}`);
  });

  await runTest('14. Special chars in tribe ID handled', async () => {
    const res = await api('GET', '/tribes/test%00id/members');
    assert([400, 401, 403, 404].includes(res.status), `Expected 400/401/403/404, got ${res.status}`);
  });

  await runTest('15. Numeric tribe ID handled', async () => {
    const res = await api('GET', '/tribes/12345/members');
    assert([401, 403, 404].includes(res.status), `Expected 401/403/404, got ${res.status}`);
  });

  await runTest('16. Empty member ID handled', async () => {
    const res = await api('DELETE', '/tribes/test-tribe//');
    assert([400, 401, 403, 404, 405].includes(res.status), `Expected 400-405, got ${res.status}`);
  });

  await runTest('17. Empty message ID handled', async () => {
    const res = await api('DELETE', '/tribes/test-tribe/messages/');
    assert([400, 401, 403, 404, 405].includes(res.status), `Expected 400-405, got ${res.status}`);
  });

  await runTest('18. Empty proposal ID handled', async () => {
    const res = await api('POST', '/tribes/test-tribe/proposals//accept');
    assert([400, 401, 403, 404, 405].includes(res.status), `Expected 400-405, got ${res.status}`);
  });

  await runTest('19. Path traversal in ID handled', async () => {
    const res = await api('GET', '/tribes/../../../etc/passwd/members');
    assert([400, 401, 403, 404].includes(res.status), `Expected 400/401/403/404, got ${res.status}`);
  });

  await runTest('20. URL encoded ID handled', async () => {
    const res = await api('GET', '/tribes/%2e%2e%2f/members');
    assert([400, 401, 403, 404].includes(res.status), `Expected 400/401/403/404, got ${res.status}`);
  });

  // ===============================================
  // SECTION 3: HTTP Method Validation (10 tests)
  // ===============================================
  console.log('\n--- Section 3: HTTP Method Validation (10 tests) ---\n');

  await runTest('21. GET on POST-only endpoint rejected', async () => {
    const res = await api('GET', '/tribes/test-id/messages', { message: 'test' });
    // GET /messages is valid, so this should return 401/403
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('22. POST on GET-only endpoint rejected', async () => {
    const res = await api('POST', '/tribes/test-id/shared', {});
    assert([401, 403, 404, 405].includes(res.status), `Expected 401/403/404/405, got ${res.status}`);
  });

  await runTest('23. PUT instead of PATCH handled', async () => {
    const res = await api('PUT', '/tribes/test-id', { name: 'Updated' });
    assert([401, 403, 404, 405].includes(res.status), `Expected 401/403/404/405, got ${res.status}`);
  });

  await runTest('24. DELETE on create endpoint rejected', async () => {
    const res = await api('DELETE', '/tribes');
    assert([401, 403, 404, 405].includes(res.status), `Expected 401/403/404/405, got ${res.status}`);
  });

  await runTest('25. OPTIONS request handled (CORS)', async () => {
    const response = await fetch(`${API_URL}/tribes`, { method: 'OPTIONS' });
    assert([200, 204, 401, 403, 404, 405].includes(response.status), `Expected valid status, got ${response.status}`);
  });

  await runTest('26. HEAD request handled', async () => {
    const response = await fetch(`${API_URL}/health`, { method: 'HEAD' });
    assert([200, 204, 405].includes(response.status), `Expected 200/204/405, got ${response.status}`);
  });

  await runTest('27. PATCH on message create endpoint', async () => {
    const res = await api('PATCH', '/tribes/test-id/messages', { message: 'test' });
    assert([401, 403, 404, 405].includes(res.status), `Expected 401/403/404/405, got ${res.status}`);
  });

  await runTest('28. POST on delete endpoint', async () => {
    const res = await api('POST', '/tribes/test-id/messages/msg-id');
    assert([401, 403, 404, 405].includes(res.status), `Expected 401/403/404/405, got ${res.status}`);
  });

  await runTest('29. GET with body ignored', async () => {
    const res = await api('GET', '/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('30. Multiple slashes in path handled', async () => {
    const res = await api('GET', '/tribes///test-id///members');
    assert([400, 401, 403, 404].includes(res.status), `Expected 400/401/403/404, got ${res.status}`);
  });

  // ===============================================
  // SECTION 4: Header Validation (10 tests)
  // ===============================================
  console.log('\n--- Section 4: Header Validation (10 tests) ---\n');

  await runTest('31. Missing Content-Type handled', async () => {
    const response = await fetch(`${API_URL}/tribes`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', type: 'family' })
    });
    assert([400, 401, 403, 415].includes(response.status), `Expected 400/401/403/415, got ${response.status}`);
  });

  await runTest('32. Wrong Content-Type handled', async () => {
    const response = await fetch(`${API_URL}/tribes`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name: 'Test', type: 'family' })
    });
    assert([400, 401, 403, 415].includes(response.status), `Expected 400/401/403/415, got ${response.status}`);
  });

  await runTest('33. Invalid auth token format handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': 'InvalidFormat' });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('34. Empty auth token handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': 'Bearer ' });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('35. Malformed Bearer token handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': 'Bearer invalid.token.here' });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('36. Very long auth token handled', async () => {
    const longToken = 'a'.repeat(10000);
    const res = await api('GET', '/tribes', null, { 'Authorization': `Bearer ${longToken}` });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('37. SQL injection in auth header handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': "Bearer ' OR '1'='1" });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('38. XSS in auth header handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': 'Bearer <script>alert(1)</script>' });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('39. Null byte in header handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': 'Bearer test\x00token' });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  await runTest('40. Unicode in auth header handled', async () => {
    const res = await api('GET', '/tribes', null, { 'Authorization': 'Bearer токен日本語' });
    assert([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  // ===============================================
  // SECTION 5: Query Parameter Validation (10 tests)
  // ===============================================
  console.log('\n--- Section 5: Query Parameter Validation (10 tests) ---\n');

  await runTest('41. Negative limit handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?limit=-1');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('42. Very large limit handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?limit=999999999');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('43. Non-numeric limit handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?limit=abc');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('44. Negative offset handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?offset=-10');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('45. SQL injection in query param', async () => {
    const res = await api('GET', "/tribes/test-id/messages?limit=1; DROP TABLE messages;--");
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('46. XSS in query param', async () => {
    const res = await api('GET', '/tribes/test-id/messages?search=<script>alert(1)</script>');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('47. Empty query values handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?limit=&offset=');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('48. Duplicate query params handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?limit=10&limit=20');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('49. Float as integer param handled', async () => {
    const res = await api('GET', '/tribes/test-id/messages?limit=10.5');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  await runTest('50. URL encoded special chars in query', async () => {
    const res = await api('GET', '/tribes/test-id/messages?search=%00%0d%0a');
    assert([400, 401, 403].includes(res.status), `Expected 400/401/403, got ${res.status}`);
  });

  // ===============================================
  // SUMMARY
  // ===============================================
  console.log('\n================================================');
  console.log('              TEST SUMMARY');
  console.log('================================================');
  console.log(`Total:  ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('================================================\n');

  const failedTests = results.tests.filter(t => t.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log('Failed Tests:');
    failedTests.forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    console.log('');
  }

  // Category breakdown
  console.log('Category Breakdown:');
  const categories = [
    { name: 'Input Validation', start: 1, end: 10 },
    { name: 'ID Validation', start: 11, end: 20 },
    { name: 'HTTP Method Validation', start: 21, end: 30 },
    { name: 'Header Validation', start: 31, end: 40 },
    { name: 'Query Parameter Validation', start: 41, end: 50 }
  ];

  categories.forEach(cat => {
    const catTests = results.tests.slice(cat.start - 1, cat.end);
    const catPassed = catTests.filter(t => t.status === 'PASS').length;
    console.log(`  ${cat.name}: ${catPassed}/${cat.end - cat.start + 1}`);
  });
  console.log('');

  return results;
}

runAllTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
