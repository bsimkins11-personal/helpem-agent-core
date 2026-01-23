# Quick Test Guide

**After Railway Postgres is connected**, use this guide to verify everything works.

---

## 1. Railway Health Check (30 seconds)

```bash
# Basic health
curl https://api-production-2989.up.railway.app/

# DB health (if ENABLE_DB_HEALTH=true)
curl https://api-production-2989.up.railway.app/health
```

**Expected:** Both return 200 OK

---

## 2. iOS Auth Test (2 minutes)

1. Open `ios/HelpEmApp.xcodeproj` in Xcode
2. Build & run on simulator/device
3. Tap "Sign in with Apple"
4. Complete authentication

**Expected:**
- iOS stores session token in Keychain
- Railway logs show: `✅ Auth success: user=...`
- App proceeds to WebView UI

---

## 3. Database Verification (1 minute)

**In Railway Postgres:**
```sql
SELECT * FROM users;
-- Should show 1 row with your apple_user_id

SELECT * FROM user_inputs;
-- Should be empty (or have test data)
```

---

## 4. Protected Endpoint Test (1 minute)

**Get session token from iOS:**
```swift
// Add to AuthManager or any view:
if let token = KeychainHelper.shared.sessionToken {
    print("SESSION TOKEN:", token)
}
```

**Test with curl:**
```bash
curl -X POST https://api-production-2989.up.railway.app/test-db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"message": "Test message", "type": "text"}'
```

**Expected:** `{"success":true,"message":"Text saved successfully",...}`

**Verify in DB:**
```sql
SELECT * FROM user_inputs;
-- Should show your test message
```

---

## 5. Silent Re-Auth Test (30 seconds)

1. Close iOS app
2. Reopen app

**Expected:**
- App checks Keychain for token
- App auto-logs in (no SignInView)
- WebView loads immediately

---

## 6. WebView → Backend Test (2 minutes)

**In iOS WebView:**
1. Navigate to a feature (todos, habits, etc.)
2. Create/update an item

**Expected:**
- WebView sends request with Authorization header
- Backend validates JWT
- Data saved to DB with correct user_id
- UI updates immediately

**Verify in DB:**
```sql
SELECT * FROM user_inputs WHERE user_id = 'your-user-id';
-- Should show new items
```

---

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| `P1001: Can't reach database` | Connect Postgres to backend in Railway |
| `APPLE_CLIENT_ID not set` | Add to Railway env vars: `com.helpem.agent` |
| `JWT_SECRET not set` | Add to Railway env vars (32+ chars) |
| iOS auth fails | Check Bundle ID matches `com.helpem.agent` |
| Token expired | iOS should auto-logout, re-sign in with Apple |

---

## Success Checklist

- [ ] Railway health endpoints return 200
- [ ] iOS Sign in with Apple creates user in DB
- [ ] Session token stored in Keychain
- [ ] Protected endpoint accepts valid token
- [ ] Silent re-auth works (close/reopen app)
- [ ] WebView → Backend API calls succeed
- [ ] Data persists across app restarts

---

**When all checks pass, you're ready for:**
1. Deploy web app to Vercel
2. Build TestFlight archive
3. Invite UAT testers

See `RAILWAY_TEST_PLAN.md` for comprehensive testing guide.
