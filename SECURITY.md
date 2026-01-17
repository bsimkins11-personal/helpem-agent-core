# Security Documentation

## Overview

This document outlines the security measures implemented in HelpEm to protect user data and prevent attacks.

---

## 🔐 Authentication & Authorization

### Apple Sign In
- ✅ Users authenticate via Sign in with Apple (iOS native)
- ✅ Identity tokens verified against Apple's public keys
- ✅ No email/name collection per privacy policy
- ✅ Tokens validated for audience (`APPLE_CLIENT_ID`)

### Session Management
- ✅ App-owned JWT tokens issued after Apple auth
- ✅ 14-day token expiry (UAT-friendly)
- ✅ HS256 algorithm with secure `JWT_SECRET`
- ✅ Tokens stored in iOS Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- ✅ Session tokens sent via `Authorization: Bearer <token>` header

### Authorization
- ✅ All user data filtered by `user_id` in database queries
- ✅ `getAuthUser()` helper consistently validates tokens
- ✅ Unauthorized requests return 401 responses
- ✅ All API endpoints require authentication (except public health checks)

---

## 🛡️ Input Validation & Sanitization

### Validation Rules
- ✅ **Todos**: Title required, max 500 chars, priority whitelist, date validation
- ✅ **Appointments**: Title required, max 500 chars, datetime validation
- ✅ **Feedback**: Max 2000 chars, content required
- ✅ **Chat**: Max 500 chars per message

### XSS Protection
- ✅ HTML tags stripped from user inputs: `<script>`, `<iframe>`, etc.
- ✅ Sanitization applied before database insertion
- ✅ No user-generated content rendered as raw HTML

### SQL Injection Prevention
- ✅ **100% parameterized queries** across all endpoints
- ✅ PostgreSQL `pg` library with `$1, $2` placeholders
- ✅ No string concatenation in SQL queries

---

## 🚦 Rate Limiting

### Backend (Express - Railway)
- **Auth endpoint** (`/auth/apple`): 10 attempts per 15 minutes per IP
- **API endpoints** (`/feedback`, `/instructions/me`, `/rules/global`): 200 requests per 15 minutes per IP
- **Test endpoint** (`/test-db`): 200 requests per 15 minutes per IP

### Frontend (Next.js - Vercel)
- **Chat** (`/api/chat`): 100 requests per hour per IP
- **Todos** (`/api/todos`): 50 creations per hour per IP
- **Appointments** (`/api/appointments`): 50 creations per hour per IP
- **Feedback** (`/api/alpha-feedback`): 5 submissions per hour per IP
- **Clear Data** (`/api/clear-all-data`): 3 requests per hour per IP (destructive operation)

### Rate Limit Headers
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds until retry allowed (on 429 errors)

---

## 🌐 CORS & Network Security

### CORS Configuration (Backend)
- ✅ **Allowed origins**:
  - `https://helpem.ai`
  - `https://www.helpem.ai`
  - `http://localhost:3000` (dev only)
  - `http://localhost:3001` (dev only)
- ✅ Credentials enabled for cookie/session support
- ✅ Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- ✅ Allowed headers: `Content-Type`, `Authorization`
- ✅ Unknown origins are blocked and logged

### HTTPS
- ✅ All production traffic uses HTTPS (enforced by Vercel/Railway)
- ✅ SSL/TLS certificates auto-managed

### Payload Limits
- ✅ JSON body size limited to 10MB (prevents DoS via large payloads)

---

## 📊 Usage Limits

### Alpha Testers
- **$2/month** per user for OpenAI API costs
- **~1000 chat messages** per month
- **Cost tracking** via `usageTracker.ts` (session-based)
- **Frontend display** via `mockUsageService.ts`

---

## 📝 Audit Logging

### Events Logged
- ✅ `AUTH_SUCCESS`: Successful authentication
- ✅ `AUTH_FAILED`: Failed authentication attempts
- ✅ `UNAUTHORIZED_ACCESS`: Requests without valid tokens
- ✅ `DATA_DELETE`: User clears all data (critical operation)
- ✅ `RATE_LIMIT_EXCEEDED`: Rate limit violations

### Log Format
```json
{
  "timestamp": "2026-01-15T19:30:00.000Z",
  "event": "AUTH_SUCCESS",
  "userId": "user-123",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": { /* event-specific data */ }
}
```

### Log Storage
- **Current**: Console logs captured by Railway/Vercel log aggregators
- **Future**: Consider dedicated audit table or external service (Datadog, Sentry)

---

## 🔒 Sensitive Data Handling

### Environment Variables (Required)
- `JWT_SECRET`: Session token signing key (min 32 chars recommended)
- `APPLE_CLIENT_ID`: Apple Sign In client ID (`ai.helpem.app`)
- `DATABASE_URL`: PostgreSQL connection string (Prisma/pg)
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_SHEETS_CREDENTIALS`: Service account JSON (feedback)
- `GOOGLE_SHEETS_SPREADSHEET_ID`: Feedback destination

### Secrets Management
- ✅ All secrets in environment variables (not in code)
- ✅ `.env` files in `.gitignore`
- ✅ Railway/Vercel env vars encrypted at rest
- ✅ No hardcoded credentials (except debug-only test token in iOS)

### Database Security
- ✅ User data isolated by `user_id` (UUID)
- ✅ No shared data across users
- ✅ SSL connections to Railway Postgres (`ssl: { rejectUnauthorized: false }`)

---

## 📱 iOS Security

### Keychain Storage
- ✅ Session tokens stored with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- ✅ Proper keychain access group: `$(AppIdentifierPrefix)ai.helpem.app`
- ✅ Token cleared on logout

### WebView Security
- ✅ WKWebView for app content (not UIWebView)
- ✅ SFSafariViewController for external links
- ✅ WebView cache cleared on logout
- ✅ Token injection via JavaScript (not URL parameters)

### Apple Credential Verification
- ✅ Credential state checked on app launch
- ✅ Auto-logout if Apple credentials revoked

---

## ⚠️ Known Limitations (Alpha)

1. **In-memory rate limiting**: Rate limits reset on server restart. Consider Redis/Upstash for production.
2. **Debug token in code**: `AuthManager.swift` has a test token for DEBUG builds only. Remove before App Store submission.
3. **Audit logs in console**: Logs written to stdout. Consider dedicated audit table or external service for production.
4. **No 2FA**: Currently relies solely on Apple Sign In. Consider adding additional verification for sensitive operations.

---

## 🧪 Security Testing Checklist

### Before Each Release
- [ ] Run `npm audit` on backend and web packages
- [ ] Verify all API endpoints require authentication
- [ ] Test rate limiting with automated requests
- [ ] Verify CORS blocks unauthorized origins
- [ ] Test input validation with malicious payloads
- [ ] Check audit logs for failed auth attempts
- [ ] Verify user data isolation (create 2 accounts, ensure data doesn't leak)
- [ ] Test session expiry (wait 14 days or manually expire token)
- [ ] Verify SSL certificates are valid

### Penetration Testing
- [ ] SQL injection attempts on all endpoints
- [ ] XSS payload injection in todos/appointments/feedback
- [ ] CSRF attacks (should be mitigated by SameSite cookies + token auth)
- [ ] Rate limit bypass attempts
- [ ] Authorization bypass (try accessing other users' data)
- [ ] Session fixation attacks

---

## 📞 Security Incident Response

If you discover a security vulnerability:

1. **Do NOT** open a public GitHub issue
2. Email: security@helpem.ai (or direct contact)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

We will respond within 48 hours.

---

## 🔄 Updates

**Last Updated**: January 15, 2026  
**Version**: Alpha 1.0  
**Next Review**: Before public launch

---

## ✅ Compliance

- **GDPR**: User data deletable via "Clear All Data"
- **CCPA**: No personal data sale, data deletion available
- **Apple Privacy Policy**: No email/name collection per policy
- **COPPA**: App not designed for children under 13

---

**For questions or security concerns, contact: support@helpem.ai**
