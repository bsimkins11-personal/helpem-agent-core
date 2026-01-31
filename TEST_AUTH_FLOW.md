# Test Auth Flow - Complete Guide

## Current Issue

You're saying the "old home screen" appears when opening the app. This is likely because:

**You're already logged in!** The auth gate detects your session and redirects you to the dashboard (todos/appointments). This is correct behavior for logged-in users.

## How to Test the New Auth Flow

### Method 1: Logout (Recommended)

1. **Open the app** on your iPhone
2. **Tap the hamburger menu** (≡) in the top right
3. **Tap "🚪 Logout"**
4. App will redirect to auth gate
5. **You should now see:** "Welcome to helpem" with Sign In / Create Account buttons ✅

### Method 2: Force Auth URL (Testing)

Open this URL in the app to force-show the auth gate even when logged in:
```
https://app.helpem.ai/app?force_auth=true
```

### Method 3: Clear Data in iOS

1. **iPhone Settings**
2. **Safari**
3. **Clear History and Website Data**
4. **Delete and reinstall app**

## What You Should See

### For NEW Users (No Session):
1. App opens → `https://app.helpem.ai/app`
2. Brief loading animation
3. **Auth Gate appears:**
   - helpem logo
   - "Welcome to helpem"
   - "Your AI-powered life assistant"
   - **Blue "Sign In" button**
   - **White "Create Account" button**
   - Benefits: "Free 30-day trial • 3,000 AI interactions"

### For LOGGED-IN Users (Has Session):
1. App opens → `https://app.helpem.ai/app`
2. Detects session
3. Auto-redirects to → `https://app.helpem.ai/app/dashboard`
4. Shows main app (todos, appointments, etc.) ✅ **This is correct!**

## Current Deployment Status

✅ **Commit:** `6734bbd` (latest)
✅ **Deployed:** 4 minutes ago
✅ **Routes exist:**
  - `/app` - Auth gate (Sign In / Sign Up)
  - `/app/dashboard` - Main app interface
  - `/app/onboarding` - New user onboarding
  - `/app/signin` - Sign in page

✅ **Aliases confirmed:**
  - app.helpem.ai ✅
  - helpem.ai ✅
  - www.helpem.ai ✅

## Verification Checklist

### ✅ Check if You Have a Session

**In Safari on iPhone:**
1. Go to `https://app.helpem.ai/app`
2. Open Safari Developer Tools (Mac → Develop → [Your iPhone])
3. Check Console for:
   ```
   🔵 App Landing Page - Rendering
   Has session cookie? true/false
   ✅ User authenticated, redirecting to dashboard  ← If you see this, you're logged in!
   ```

If it says "User authenticated", that's why you see the dashboard!

### 🧪 Test Auth Gate (No Session)

1. Use **Method 1** above to logout
2. OR use **Method 2** to force-show it
3. Should see auth gate with Sign In / Sign Up buttons

### 🧪 Test Full New User Flow

After logging out:

**Create Account → Onboarding → Sign In → Dashboard**

1. Tap "Create Account"
2. Goes to `/app/onboarding` (3-step flow)
3. Shows features, pricing, trial offer
4. Tap "Get Started"
5. Goes to `/app/signin`
6. Triggers Apple Sign In
7. After auth → `/app/dashboard`

### 🧪 Test Returning User Flow

After logging out and signing back in:

**Sign In → Dashboard**

1. Tap "Sign In"
2. Goes to `/app/signin`
3. Triggers Apple Sign In
4. After auth → `/app/dashboard`

## If You Still See "Old Screen"

If after logging out you STILL see the old screen (dashboard), then:

1. **Check the URL bar** - Are you at `/app` or `/app/dashboard`?
2. **Check console logs** - Is it redirecting immediately?
3. **Try Safari directly** - Go to `https://app.helpem.ai/app` in Safari (not the app)

## Visual Comparison

### ❌ Old Experience (Pre-Auth Gate):
```
App opens → Directly shows todos/appointments/etc.
No login required
```

### ✅ New Experience (With Auth Gate):
```
New User:
  App opens → Auth gate (Sign In/Sign Up) → Onboarding → Sign In → Dashboard

Logged-In User:
  App opens → (Detects session) → Dashboard
```

## What Changed

**Before:**
- `/app` = Main app interface (todos, appointments)
- No auth gate

**After:**
- `/app` = Auth gate (Sign In / Sign Up) ← **NEW!**
- `/app/dashboard` = Main app interface (todos, appointments) ← **MOVED!**
- Auto-redirects logged-in users to dashboard

## Expected Behavior

✅ **If you're logged in:** See dashboard immediately (fast!)
✅ **If you're NOT logged in:** See auth gate (Sign In / Sign Up)

## Next Steps

1. **Test logout** - Use the hamburger menu → "🚪 Logout"
2. **Verify auth gate** - Should see welcome screen
3. **Test sign up flow** - Create Account → Onboarding → Sign In
4. **Confirm it works!**

If you're still seeing issues after logout, please tell me:
- What URL is in the address bar?
- What exact screen/text do you see?
- Any console logs?

This will help me pinpoint the exact issue!
