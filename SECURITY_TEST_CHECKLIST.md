# Security Testing Checklist - Alpha Release

**Version**: 1.0  
**Date**: January 15, 2026  
**Status**: Ready for Testing

This checklist should be run before each major release and after any security-related changes.

---

## 🔐 Authentication & Authorization

### Test 1: Apple Sign In Flow
- [ ] User can successfully sign in with Apple from iOS app
- [ ] Identity token is properly verified against Apple's public keys
- [ ] Session token is issued after successful authentication
- [ ] Session token is stored securely in iOS Keychain
- [ ] User can access protected endpoints with valid token

**Expected**: All steps pass, tokens are valid for 14 days

### Test 2: Invalid Authentication Attempts
- [ ] Request with no token returns 401 Unauthorized
- [ ] Request with expired token returns 401 Unauthorized
- [ ] Request with malformed token returns 401 Unauthorized
- [ ] Request with wrong signature returns 401 Unauthorized
- [ ] Failed attempts are logged in audit logs

**Expected**: All invalid requests are rejected with proper error messages

### Test 3: Authorization Bypass Attempts
- [ ] User A cannot access User B's todos (change `user_id` in request)
- [ ] User A cannot access User B's appointments
- [ ] User A cannot delete User B's data
- [ ] Direct database queries filter by authenticated `user_id`

**Expected**: All cross-user access attempts are blocked

**Test Script**:
```bash
# Create 2 test accounts
# Get session token for each
# Try to access other user's data using modified requests
TOKEN_A="user_a_token"
TOKEN_B="user_b_token"

# Should fail - User A trying to access User B's data
curl -H "Authorization: Bearer $TOKEN_A" \
  https://helpem.ai/api/todos?user_id=user_b_id
```

---

## 🛡️ Input Validation & XSS

### Test 4: SQL Injection Attempts
- [ ] Todo title: `'; DROP TABLE todos; --`
- [ ] Appointment title: `1' OR '1'='1`
- [ ] Feedback: `admin'--`
- [ ] Chat message: `' UNION SELECT * FROM users --`

**Expected**: All malicious inputs are safely handled via parameterized queries

**Test Script**:
```bash
curl -X POST https://helpem.ai/api/todos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "'; DROP TABLE todos; --", "priority": "high"}'
```

### Test 5: XSS Payload Injection
- [ ] Todo title: `<script>alert('XSS')</script>`
- [ ] Appointment title: `<img src=x onerror=alert('XSS')>`
- [ ] Feedback: `<iframe src="javascript:alert('XSS')"></iframe>`
- [ ] Chat message: `<svg onload=alert('XSS')>`

**Expected**: All HTML/script tags are stripped before database storage

**Test Script**:
```bash
curl -X POST https://helpem.ai/api/todos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(\"XSS\")</script>", "priority": "medium"}'

# Verify in database that script tags are removed
```

### Test 6: Input Length Validation
- [ ] Todo title: 501+ characters (should reject)
- [ ] Feedback: 2001+ characters (should reject)
- [ ] Chat message: 501+ characters (should reject)

**Expected**: Requests with oversized inputs return 400 Bad Request

---

## 🚦 Rate Limiting

### Test 7: Auth Endpoint Rate Limit
- [ ] Send 11 auth requests in 15 minutes from same IP
- [ ] 11th request should return 429 Too Many Requests
- [ ] Response includes `Retry-After` header
- [ ] Rate limit resets after window expires

**Expected**: 10 requests allowed, 11th blocked with proper headers

**Test Script**:
```bash
for i in {1..11}; do
  curl -X POST https://api-production-2989.up.railway.app/auth/apple \
    -H "Content-Type: application/json" \
    -d '{"apple_user_id":"test","identity_token":"invalid"}'
  echo "Request $i"
done
```

### Test 8: API Endpoint Rate Limits
- [ ] Send 51 todo creations in 1 hour (should block 51st)
- [ ] Send 51 appointment creations in 1 hour (should block 51st)
- [ ] Send 6 feedback submissions in 1 hour (should block 6th)
- [ ] Send 4 clear-data requests in 1 hour (should block 4th)
- [ ] Send 101 chat messages in 1 hour (should block 101st)

**Expected**: Rate limits enforced, 429 responses returned

### Test 9: Rate Limit Bypass Attempts
- [ ] Change IP address (should reset counter - OK)
- [ ] Change user agent (should NOT reset counter)
- [ ] Use different user accounts from same IP (should share limit)

**Expected**: IP-based limiting works, header changes don't bypass

---

## 🌐 CORS & Network Security

### Test 10: CORS Policy Enforcement
- [ ] Request from `https://helpem.ai` → Allowed
- [ ] Request from `https://www.helpem.ai` → Allowed
- [ ] Request from `http://localhost:3000` → Allowed (dev only)
- [ ] Request from `https://evil.com` → Blocked
- [ ] Request from `https://phishing-helpem.ai` → Blocked

**Expected**: Only whitelisted origins are allowed

**Test Script**:
```bash
# Should succeed
curl -H "Origin: https://helpem.ai" \
  -H "Authorization: Bearer $TOKEN" \
  https://helpem.ai/api/todos

# Should fail (CORS blocked)
curl -H "Origin: https://evil.com" \
  -H "Authorization: Bearer $TOKEN" \
  https://helpem.ai/api/todos
```

### Test 11: HTTPS Enforcement
- [ ] Verify all production URLs use HTTPS
- [ ] Verify SSL certificates are valid
- [ ] Verify no mixed content warnings
- [ ] Verify HSTS header is present (if configured)

**Expected**: All traffic encrypted, valid certificates

---

## 📊 Audit Logging

### Test 12: Audit Log Verification
- [ ] Successful auth attempt is logged
- [ ] Failed auth attempt is logged
- [ ] Unauthorized access attempt is logged
- [ ] Data deletion is logged with details
- [ ] Logs include: timestamp, event, userId, IP, user-agent

**Expected**: All security-critical events are logged

**Verification**:
```bash
# Check Railway/Vercel logs for [AUDIT] entries
# Example log format:
# [AUDIT] {"timestamp":"2026-01-15T19:30:00.000Z","event":"AUTH_SUCCESS","userId":"123","ip":"1.2.3.4"}
```

---

## 📱 iOS Security

### Test 13: Keychain Security
- [ ] Session token stored with proper access controls
- [ ] Token survives app restart
- [ ] Token is cleared on logout
- [ ] Token cannot be accessed by other apps
- [ ] Token is not logged or printed

**Expected**: Secure storage, proper isolation

### Test 14: WebView Security
- [ ] Token injection works correctly
- [ ] External links open in SFSafariViewController
- [ ] WebView cache cleared on logout
- [ ] JavaScript bridge only exposes necessary functions
- [ ] No sensitive data in WebView cookies

**Expected**: Secure WebView configuration

---

## 🔒 Secrets Management

### Test 15: Environment Variables
- [ ] `.env` file is NOT in git tracking
- [ ] No hardcoded API keys in source code
- [ ] No hardcoded passwords in source code
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] All secrets are in environment variables

**Expected**: No secrets in code or version control

**Test Script**:
```bash
# Check git history for secrets
git log --all --full-history -- "*.env"

# Search codebase for potential secrets
rg -i '(api[_-]?key|password|secret).{0,20}["\'][a-zA-Z0-9]{20,}' --type ts --type js --type swift
```

### Test 16: Debug Tokens
- [ ] iOS debug token is only in `#if DEBUG` blocks
- [ ] Debug token has clear warning comments
- [ ] No test credentials in production code
- [ ] No commented-out secrets in code

**Expected**: Debug features isolated to DEBUG builds only

---

## 🎯 Usage Limits

### Test 17: Monthly Usage Limits
- [ ] User reaches $2/month limit → Further requests blocked
- [ ] Usage tracking increments correctly per API call
- [ ] Frontend displays current usage accurately
- [ ] Limit resets at start of new month

**Expected**: Usage limits enforced, accurate tracking

---

## 🔄 Session Management

### Test 18: Session Lifecycle
- [ ] New session created on login
- [ ] Session expires after 14 days
- [ ] Expired session returns 401
- [ ] Logout clears session from Keychain
- [ ] Multiple sessions per user NOT allowed (single device)

**Expected**: Proper session lifecycle management

---

## 📋 Final Verification

### Test 19: Code Quality Scan
```bash
# Run linters
cd web && npm run lint

# Check for vulnerabilities
cd backend && npm audit --production
cd web && npm audit --production

# Check for outdated dependencies
npm outdated
```

**Expected**: No critical linting errors, no production vulnerabilities

### Test 20: Documentation Review
- [ ] SECURITY.md is up to date
- [ ] REFACTOR_NOTES.md is current
- [ ] ENVIRONMENT_VARIABLES.md lists all required vars
- [ ] .env.example matches current requirements

**Expected**: All documentation is accurate

---

## ✅ Sign-Off

### Test Results Summary

| Category | Tests Passed | Tests Failed | Status |
|----------|-------------|--------------|--------|
| Authentication | __ / 3 | __ | ⚪️ |
| Input Validation | __ / 3 | __ | ⚪️ |
| Rate Limiting | __ / 3 | __ | ⚪️ |
| CORS & Network | __ / 2 | __ | ⚪️ |
| Audit Logging | __ / 1 | __ | ⚪️ |
| iOS Security | __ / 2 | __ | ⚪️ |
| Secrets | __ / 2 | __ | ⚪️ |
| Usage Limits | __ / 1 | __ | ⚪️ |
| Session Mgmt | __ / 1 | __ | ⚪️ |
| Code Quality | __ / 2 | __ | ⚪️ |
| **TOTAL** | **__ / 20** | **__** | ⚪️ |

### Sign-Off

- [ ] All critical tests passed
- [ ] Vulnerabilities addressed or documented
- [ ] Documentation updated
- [ ] Ready for deployment

**Tested By**: _________________  
**Date**: _________________  
**Notes**: _________________

---

## 🚨 If Tests Fail

1. **Stop deployment immediately**
2. Document the failure in detail
3. Fix the vulnerability
4. Re-run all tests
5. Update this checklist if needed

---

## 📞 Security Contact

For security issues or questions:
- **Email**: security@helpem.ai
- **Response Time**: 48 hours

---

**Remember**: Security is an ongoing process, not a one-time check. Run this checklist regularly!
