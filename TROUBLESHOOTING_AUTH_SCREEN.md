# Troubleshooting: Auth Screen Not Showing

## Issue
The app still shows the old start screen instead of the new Sign In / Sign Up landing page.

## Root Causes

### 1. Existing Session Cookie
**Most Common Issue:**
- You have a `session_token` cookie from demo mode or previous session
- The page detects this and auto-redirects to `/app/dashboard`
- You never see the auth gate

**Solution:**
```javascript
// Clear cookies in browser console:
document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
localStorage.clear();

// Then refresh the page
window.location.reload();
```

### 2. Browser Cache
Next.js may be serving cached version.

**Solution:**
- **Chrome/Edge:** Ctrl+Shift+R (Cmd+Shift+R on Mac)
- **Firefox:** Ctrl+F5 (Cmd+Shift+R on Mac)
- **Safari:** Cmd+Option+R

### 3. Dev Server Not Restarted
Changes may not be picked up without restart.

**Solution:**
```bash
cd /Users/avpuser/HelpEm_POC/web

# Stop current dev server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### 4. iOS App WebView
If testing in iOS app, the webview might have cached content.

**Solution:**
```swift
// In iOS app, clear webview cache
WKWebsiteDataStore.default().removeData(
    ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
    modifiedSince: Date(timeIntervalSince1970: 0)
) { }
```

## Verification Steps

### Step 1: Check File Structure
```bash
ls -la /Users/avpuser/HelpEm_POC/web/src/app/app/
```

Should show:
```
page.tsx          ← New auth gate
dashboard/        ← Old app (moved here)
onboarding/       ← New onboarding
signin/           ← New sign in
```

### Step 2: Check Browser Console
Open browser console and look for:
```
🔵 App Landing Page - Rendering
Current URL: http://localhost:3000/app
Has session cookie? false    ← Should be FALSE to see auth gate
```

If it says `true`, you have a session and need to clear cookies.

### Step 3: Check Current Route
Look at browser URL bar:
- `/app` → Should show auth gate (Sign In / Sign Up)
- `/app/dashboard` → Shows old app interface

If you're at `/app/dashboard`, you were auto-redirected because of existing session.

## Quick Fix Commands

### Option 1: Clear Everything (Recommended)
```bash
# Terminal 1: Stop and restart dev server
cd /Users/avpuser/HelpEm_POC/web
# Press Ctrl+C to stop
rm -rf .next
npm run dev
```

Then in browser console:
```javascript
// Clear all app data
document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
localStorage.clear();
sessionStorage.clear();

// Force reload
window.location.href = '/app';
```

### Option 2: Incognito/Private Window
- Open incognito/private browsing window
- Navigate to `http://localhost:3000/app`
- Should see auth gate (no cached session)

### Option 3: Different Browser
- Try a different browser you haven't used with the app
- Should see auth gate immediately

## Expected Behavior After Fix

### At `/app`:
```
┌────────────────────────────────┐
│    [helpem logo]               │
│                                │
│    Welcome to helpem          │
│    Your AI-powered assistant  │
│                                │
│  ┌──────────────────────────┐ │
│  │       Sign In            │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │    Create Account        │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

### With Tribe Invite (`/app?invite=xxx`):
```
┌────────────────────────────────┐
│    [helpem logo]               │
│                                │
│  ┌──────────────────────────┐ │
│  │ 👥 You've been invited!  │ │  ← Shows invite banner
│  │ Join your tribe          │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │       Sign In            │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │    Create Account        │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

## Debug Console Logs

Added extensive logging to help debug. Check browser console for:

```javascript
🔵 App Landing Page - Rendering
Current URL: http://localhost:3000/app
Cookies: session_token=...; session_id=...
Has session cookie? true/false
Has native token? true/false
✅ User authenticated, redirecting to dashboard  // OR
❌ No session, showing auth gate
```

## Common Scenarios

### Scenario 1: "I see the dashboard immediately"
**Diagnosis:** You have an active session
**Fix:** Clear cookies (see Option 1 above)

### Scenario 2: "I see blank white screen"
**Diagnosis:** JavaScript error or build issue
**Fix:** 
1. Check browser console for errors
2. Restart dev server
3. Clear `.next` cache

### Scenario 3: "Changes not showing"
**Diagnosis:** Cached content
**Fix:** Hard refresh (Ctrl+Shift+R)

### Scenario 4: "iOS app shows old screen"
**Diagnosis:** WebView cache
**Fix:** 
1. Clear webview cache (see iOS solution above)
2. Or rebuild and reinstall app

## Testing Checklist

After fixing, verify these routes:

- [ ] `/` → Landing page with "Sign In" link
- [ ] `/app` → Auth gate with Sign In / Create Account
- [ ] `/app/signin` → Sign in page with Apple logo
- [ ] `/app/onboarding` → 3-step onboarding
- [ ] `/app/dashboard` → Main app (only when authenticated)

## Still Not Working?

If none of the above works:

1. **Check file contents:**
   ```bash
   head -20 /Users/avpuser/HelpEm_POC/web/src/app/app/page.tsx
   ```
   Should start with `"use client";` and `export default function AppLandingPage()`

2. **Verify Next.js is running:**
   ```bash
   curl http://localhost:3000/app
   ```
   Should return HTML, not error

3. **Check for TypeScript errors:**
   ```bash
   cd /Users/avpuser/HelpEm_POC/web
   npm run build
   ```
   Should complete without errors

4. **Nuclear option:**
   ```bash
   cd /Users/avpuser/HelpEm_POC/web
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

## Contact
If still having issues, provide:
- Browser console logs
- Current URL
- Screenshot of what you see
- Output of `ls -la web/src/app/app/`
