# Tribes Auth Debugging Summary

## Current Status

**Problem:** Tribes not showing in app
**Root Cause:** JWT token verification issue

---

## What We Know

### ✅ Backend (Railway) is Working
```bash
✅ Backend API returns 3 tribes correctly
✅ Database has 3 tribes with correct memberships
✅ Railway JWT_SECRET: lO9sFlie...
```

### ✅ Vercel has JWT_SECRET
```bash
✅ JWT_SECRET is set in Vercel production
✅ JWT_SECRET is accessible at runtime
✅ JWT_SECRET matches Railway's secret
```

###❌ Web API Rejects Tokens
```bash
❌ /api/tribes returns 401 "Invalid session token"
❌ Token verification fails in web layer
❌ Never reaches backend
```

---

## The Issue

The **web app (`/api/tribes`)** verifies tokens BEFORE proxying to backend:

```typescript
const session = await verifySessionToken(req);
if (!session.success) {
  return NextResponse.json({ error: session.error }, { status: 401 });
}
```

**This means:**
- Token must be valid for BOTH web AND backend
- Both must use the SAME JWT_SECRET
- Both must use the SAME signing algorithm (HS256)

---

## Next Steps to Try

### 1. User Needs to Re-Sign In

The iOS app likely has an **old token** signed with the OLD JWT_SECRET. When the user signs in:

1. iOS app → Backend `/auth/apple`
2. Backend verifies with Apple
3. Backend creates NEW token with NEW secret
4. App stores token in Keychain
5. App uses token for all requests

**Solution:** User must sign out and sign back in to get a fresh token.

---

### 2. Test with Real Auth Flow

Instead of manual token creation, test the actual auth flow:

```bash
# User signs in via iOS app
# App gets token from /auth/apple
# App uses that token to call /api/tribes
```

---

### 3. Alternative: Bypass Web Verification

The web API could skip verification and just proxy to backend:

```typescript
// Option: Trust backend to verify
const response = await fetch(`${BACKEND_URL}/tribes`, {
  headers: { "Authorization": token }
});
```

But this removes a security layer.

---

## Recommendation

**Have the user:**

1. **Delete the HelpEm app completely**
2. **Reinstall from Xcode/TestFlight**
3. **Sign in with Apple** (gets fresh token)
4. **Check for tribes**

This ensures:
- ✅ Fresh JWT token signed with current secret
- ✅ No cached old tokens
- ✅ Clean app state

---

## If That Doesn't Work

1. Add more logging to see exact JWT error
2. Check if Apple auth is creating tokens correctly
3. Verify token format matches expectations
4. Check if there are multiple JWT_SECRET sources conflicting

---

**Status:** Need user to reinstall app and sign in fresh
**Last Updated:** 2026-01-23 3:15 PM EST
