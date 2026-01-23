# Railway Deployment Test Plan

## Pre-Deployment Checklist

### Railway Configuration
- [ ] **Connect Postgres service to backend service**
  - Settings → Connections → Add Postgres
- [ ] **Verify environment variables on backend service:**
  ```
  DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
  JWT_SECRET=<your-secret>
  APPLE_BUNDLE_ID=com.helpem.agent
  ENABLE_DB_HEALTH=true (optional)
  ```
- [ ] **Redeploy backend service**
  - Should run: `npm run prisma:migrate && npm run start`
  - Watch logs for successful migration + server start

---

## Phase 1: Backend Health Verification

### 1.1 Basic Health Check
```bash
curl https://<your-railway-url>.railway.app/
# Expected: "API is running"
```

### 1.2 Database Health Check
```bash
curl https://<your-railway-url>.railway.app/health
# Expected: {"status":"ok","db":"ok"}
# (if ENABLE_DB_HEALTH=true)
```

### 1.3 Auth Endpoint Health
```bash
curl https://<your-railway-url>.railway.app/auth/apple
# Expected: {"status":"ok","service":"auth/apple","version":"1.0.0"}
```

**✅ Success Criteria:** All endpoints return 200 OK

---

## Phase 2: iOS → Backend Auth Flow

### 2.1 Test Apple Sign In (First Time User)

**iOS Action:**
- Open Xcode project at `/Users/avpuser/HelpEm_POC/ios`
- Build and run on simulator/device
- Tap "Sign in with Apple"
- Complete Apple authentication

**Expected Backend Behavior:**
1. Backend receives `POST /auth/apple` with:
   - `apple_user_id`: Apple's `sub` claim
   - `identity_token`: JWT from Apple
2. Backend verifies token with Apple's JWKS
3. Backend creates new user in Postgres via Prisma
4. Backend returns:
   ```json
   {
     "session_token": "eyJ...",
     "user_id": "uuid",
     "is_new_user": true
   }
   ```

**Verification Steps:**
- [ ] iOS receives session token
- [ ] Session token stored in Keychain
- [ ] Check Railway logs for: `✅ Auth success: user=...`
- [ ] Query DB directly: `SELECT * FROM users;` (should have 1 row)

### 2.2 Test Silent Re-Auth (Returning User)

**iOS Action:**
- Close and reopen app
- App should auto-login using stored Keychain token

**Expected Behavior:**
- [ ] App checks Keychain for session token
- [ ] App validates token is not expired
- [ ] App proceeds to main UI without showing SignInView
- [ ] No backend call needed (JWT is self-contained)

### 2.3 Test Returning User New Session

**iOS Action:**
- Force logout (clear Keychain)
- Sign in with Apple again (same Apple ID)

**Expected Backend Behavior:**
1. Backend receives `POST /auth/apple`
2. Backend finds existing user via `appleUserId`
3. Backend updates `lastActiveAt` timestamp
4. Backend returns:
   ```json
   {
     "session_token": "eyJ...",
     "user_id": "same-uuid-as-before",
     "is_new_user": false
   }
   ```

**Verification Steps:**
- [ ] `is_new_user: false`
- [ ] `user_id` matches previous session
- [ ] DB shows updated `last_active_at`

---

## Phase 3: Session Token Validation

### 3.1 Test Protected Endpoint with Valid Token

**Test with curl:**
```bash
# Get session token from iOS Keychain (print in Xcode console)
curl -X POST https://<your-railway-url>.railway.app/test-db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session-token>" \
  -d '{"message": "Test from curl", "type": "text"}'

# Expected: {"success":true,"message":"Text saved successfully","responseType":"text"}
```

**Verification:**
- [ ] Returns 200 OK
- [ ] Check Railway logs: `SESSION USER ID: <uuid>`
- [ ] Query DB: `SELECT * FROM user_inputs;` (should have 1 row)

### 3.2 Test with Expired Token

**Test:**
```bash
curl -X POST https://<your-railway-url>.railway.app/test-db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer expired.token.here" \
  -d '{"message": "Should fail"}'

# Expected: {"error":"Invalid or expired session token"}
```

### 3.3 Test with No Token

**Test:**
```bash
curl -X POST https://<your-railway-url>.railway.app/test-db \
  -H "Content-Type: application/json" \
  -d '{"message": "Should fail"}'

# Expected: {"error":"Missing session token"}
```

---

## Phase 4: iOS WebView Integration

### 4.1 Verify Session Injection

**iOS Code Check:**
```swift
// In WebViewContainer.swift
// Should inject session token into WebView via:
// - JavaScript bridge, OR
// - HTTP header, OR
// - URL parameter (least secure)
```

**Test:**
- [ ] Open iOS app after successful auth
- [ ] WebView should load with session token available
- [ ] Web UI should be able to call Railway backend with token

### 4.2 Test WebView → Backend API Call

**Web UI Action:**
- Trigger any action that calls backend (e.g., save a todo, habit, etc.)
- Web should send session token in Authorization header

**Expected:**
- [ ] Backend receives authenticated request
- [ ] Backend validates JWT
- [ ] Backend associates data with correct user_id
- [ ] Web receives success response

---

## Phase 5: End-to-End User Flow

### 5.1 Complete New User Journey

1. [ ] Launch iOS app (fresh install)
2. [ ] Tap "Sign in with Apple"
3. [ ] Complete Apple authentication
4. [ ] App shows WebView with UI
5. [ ] Create a todo/habit in WebView
6. [ ] Close app
7. [ ] Reopen app (should auto-login)
8. [ ] Todo/habit still visible
9. [ ] Create another item
10. [ ] Verify both items exist in DB

### 5.2 Test Logout Flow

1. [ ] In app, trigger logout
2. [ ] App should:
   - Clear Keychain session token
   - Clear WebView cookies/storage
   - Show SignInView
3. [ ] Sign in again
4. [ ] Previous data should still be there (same Apple user)

---

## Phase 6: Error Scenarios

### 6.1 Database Connection Lost
- [ ] Temporarily break DB connection
- [ ] App should show graceful error
- [ ] Backend logs should show connection error

### 6.2 Apple JWKS Unreachable
- [ ] Mock Apple JWKS endpoint failure
- [ ] Auth should fail gracefully
- [ ] User sees "Authentication failed" message

### 6.3 Malformed Token
- [ ] Send invalid JWT format
- [ ] Backend returns 401 with clear error
- [ ] App handles error appropriately

---

## Success Criteria Summary

| Phase | Criteria |
|-------|----------|
| **Backend Health** | All endpoints return 200, DB connection works |
| **Auth Flow** | New user creates account, returning user gets existing account |
| **Session Validation** | Valid tokens work, invalid tokens rejected |
| **WebView Integration** | Session token flows from iOS → WebView → Backend |
| **End-to-End** | Complete user journey works without errors |
| **Error Handling** | All error scenarios handled gracefully |

---

## Troubleshooting Guide

### Issue: `P1001: Can't reach database server`
**Solution:**
- Verify Postgres service connected to backend in Railway
- Check `DATABASE_URL` format: `postgresql://...@postgres.railway.internal:5432/railway`

### Issue: `JWT_SECRET not set`
**Solution:**
- Add `JWT_SECRET` environment variable to Railway backend service
- Must be at least 32 characters

### Issue: `Apple token verification failed`
**Solution:**
- Verify `APPLE_BUNDLE_ID=com.helpem.agent`
- Ensure Apple Developer account has Sign in with Apple enabled
- Check Apple identity token is fresh (expires in 10 minutes)

### Issue: `Session token expired`
**Solution:**
- Current JWT expires in 30 days
- iOS should handle expiry by showing SignInView
- User re-authenticates with Apple to get new token

### Issue: iOS Keychain not persisting
**Solution:**
- Check `HelpEmApp.entitlements` has Keychain access
- Verify `KeychainHelper.swift` using correct service name
- Check Xcode signing & capabilities

---

## Next Steps After Successful Testing

1. **Deploy Web App to Vercel**
   - Point API routes to Railway backend URL
   - Configure CORS on backend for Vercel domain

2. **TestFlight Build**
   - Archive iOS app in Xcode
   - Upload to App Store Connect
   - Create TestFlight internal testing group

3. **UAT with Real Users**
   - Invite testers via TestFlight
   - Monitor Railway logs for usage patterns
   - Collect feedback on auth flow UX

4. **Monitoring & Observability**
   - Set up Railway metrics/alerts
   - Add error tracking (Sentry/Rollbar)
   - Monitor JWT expiry patterns

---

## Notes

- This is a TestFlight/UAT-ready architecture
- Production launch would need:
  - Rate limiting on auth endpoints
  - More comprehensive logging
  - Database backups
  - CI/CD pipeline
  - Better error messages for users
