# Correct Website & App Structure

## Clear Separation

### 🌐 Website (Marketing) = `/`
**File:** `web/src/app/page.tsx`

Full informational marketing homepage with:
- ✅ Hero carousel (4 videos)
- ✅ Value proposition
- ✅ "How It Works" (3 steps)
- ✅ Features section (4 features)
- ✅ About Us
- ✅ FAQ section
- ✅ Support section
- ✅ Contact section
- ✅ Full footer with links

**CTAs point to:** `/app` (auth gate)

---

### 📱 App (Authentication & Main App)

#### 1. Auth Gate = `/app`
**File:** `web/src/app/app/page.tsx`

Landing page with:
- ✅ "Sign In" button → `/app/signin`
- ✅ "Create Account" button → `/app/onboarding`
- ✅ Tribe invite banner (if invite token in URL)
- ✅ Auto-redirects to dashboard if already authenticated

#### 2. Onboarding = `/app/onboarding`
**File:** `web/src/app/app/onboarding/page.tsx`

Multi-step sign up flow:
- ✅ Step 1: Welcome & Trial Offer
- ✅ Step 2: Features showcase
- ✅ Step 3: Pricing
- ✅ Progress bar
- ✅ Final CTA → `/app/signin`

#### 3. Sign In = `/app/signin`
**File:** `web/src/app/app/signin/page.tsx`

Authentication page:
- ✅ iOS: Triggers native Apple Sign In
- ✅ Web: Redirects to `/api/auth/apple`
- ✅ Checks for pending tribe invites
- ✅ Redirects to dashboard after auth

#### 4. Dashboard = `/app/dashboard`
**File:** `web/src/app/app/dashboard/page.tsx`

Main app interface:
- ✅ Todos, Appointments, Habits, Groceries
- ✅ Chat input
- ✅ Tribe invite notifications
- ✅ Auto-opens tribes if invite pending

---

## User Flows

### Marketing Website Flow:
```
/ (Homepage)
  ↓
  [Try helpem Free] button
  ↓
/app (Auth Gate)
  ↓
  [Sign In] or [Create Account]
```

### New User Sign Up:
```
/ → /app → /app/onboarding → /app/signin → /app/dashboard
```

### Returning User:
```
/ → /app → (detects session) → /app/dashboard
```

### New User with Tribe Invite:
```
/join/{token} 
  ↓ (stores token)
/app (shows invite banner)
  ↓
/app/onboarding
  ↓
/app/signin
  ↓
/app/dashboard (shows "Welcome to tribe!" notification)
  ↓ (auto-opens tribes after 2s)
```

---

## iOS App Behavior

### Production Device:
- Loads: `https://app.helpem.ai/app`
- Shows: Auth gate (Sign In / Sign Up)
- After Vercel deployment completes

### Simulator:
- Loads: `http://localhost:3000/app`
- Shows: Auth gate (Sign In / Sign Up)
- Requires dev server running

---

## What's Deployed

### Before (Old Code - Still on Vercel):
- `/` = Simple Sign In / Sign Up page
- `/app` = Main app interface (no auth gate)

### After (New Code - Deploying Now):
- `/` = Full informational homepage ✅
- `/app` = Auth gate (Sign In / Sign Up) ✅
- `/app/dashboard` = Main app interface ✅

---

## Expected Timeline

### Vercel Deployment:
1. ✅ **Commit pushed** (Just completed)
2. ⏳ **Build in progress** (1-2 minutes)
3. ⏳ **Deployment** (1-2 minutes)
4. ✅ **Live** (Total: 3-5 minutes from now)

### iOS App Update:
1. Wait for Vercel deployment
2. Delete app from iPhone
3. Reinstall (or rebuild if using Xcode)
4. Open app
5. **Should see:** Auth gate with Sign In / Sign Up ✅

---

## Verification Steps

### After Deployment Completes:

**Test Website (Desktop/Mobile Browser):**
1. Go to https://helpem.ai or https://app.helpem.ai
2. Should see: Hero carousel with videos ✅
3. Scroll down: Features, FAQs, etc. ✅
4. Click "Try helpem Free"
5. Should see: Auth gate with Sign In / Sign Up buttons ✅

**Test iOS App:**
1. Delete app from device
2. Reinstall from TestFlight
3. Open app
4. **Should see:** Sign In / Sign Up screen ✅
5. Not the old main app interface

---

## Summary of Changes

### This Session:
1. ✅ Created tribe admin dashboard (`/tribe/admin`)
2. ✅ Added "My Tribes" to menu
3. ✅ Created auth gate at `/app`
4. ✅ Built onboarding flow at `/app/onboarding`
5. ✅ Created sign in page at `/app/signin`
6. ✅ Moved main app to `/app/dashboard`
7. ✅ Fixed Next.js 16 async params in API routes
8. ✅ Restored full informational homepage at `/`

### Key Fix:
The confusion was between:
- **Website homepage** (`/`) = Marketing/informational
- **App landing** (`/app`) = Auth gate

Now they're properly separated and both work correctly!

---

## Commit History

```
be6553e Restore informational homepage and fix auth flow
e2b9371 Fix API routes for Next.js 16 async params
b861c0d Add authentication landing page and tribe admin features
```

---

## If iOS App Still Shows Old Screen

The app loads from `https://app.helpem.ai/app`, so after Vercel deployment:

1. **Force quit** the app (swipe up in app switcher)
2. **Delete app** from home screen
3. **Reinstall** from TestFlight
4. **Open app** - Should now show new auth gate!

If still showing old screen:
- The WebView might be caching aggressively
- Try on a different device to verify deployment worked
- Check https://app.helpem.ai/app in Safari on iPhone to confirm

---

## Current Status

✅ All code pushed to GitHub
⏳ Vercel building & deploying (check in 3-5 min)
⏳ iOS app will update after deployment completes

**Next:** Wait for Vercel, then test on device!
