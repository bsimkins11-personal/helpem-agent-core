# Auth Screen Not Showing - Troubleshooting

## Current Status
✅ Code deployed to production (commit `ab03e61`)
✅ Vercel build succeeded
✅ New routes exist: `/app`, `/app/dashboard`, `/app/onboarding`, `/app/signin`
❌ iOS app still shows old main app screen instead of auth gate

## What Should Happen

When you open the iOS app, it should load:
1. `https://app.helpem.ai/app` (production URL)
2. Show **loading spinner** (Suspense fallback)
3. Then show **Sign In / Sign Up buttons** (auth gate)

## What's Actually Happening

The app is showing the old main app interface (todos, appointments, etc.) directly.

## Possible Causes

### 1. Existing Session Auto-Redirect
The auth gate checks for an existing session and redirects to `/app/dashboard`:

```typescript
const hasSession = document.cookie.includes("session_token");
const hasNativeToken = (window as any).__nativeSessionToken;

if (hasSession || hasNativeToken) {
  router.push("/app/dashboard");
}
```

**Solution:** Clear session by:
- **iOS Settings → Safari → Clear History and Website Data**
- **Delete and reinstall app** (but this hasn't worked yet)

### 2. iOS WebView Cache
WKWebView aggressively caches content. Even after reinstalling, it may serve cached content.

**Solution:**
```swift
// In iOS code, clear WKWebView cache
let dataStore = WKWebsiteDataStore.default()
dataStore.fetchDataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes()) { records in
    dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), 
                        for: records, 
                        completionHandler: {})
}
```

### 3. CDN/Edge Caching
Vercel edge cache might still serve old content despite new deployment.

**Verified:**
- Deployment ID changed to `dpl_4ZhztrpcFovHaefm1QiaDtmEjdJ1`
- HTML shows Suspense boundary (new code)
- BUT: The Suspense is bailing out to client-side rendering

### 4. Client-Side Routing Issue
The new `/app/page.tsx` uses Suspense with `useSearchParams()`. This causes client-side rendering bailout:

```html
<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>
```

This means the auth gate **IS** rendering client-side, but might not be visible due to:
- Session auto-redirect happening too fast
- JavaScript not executing properly
- Race condition

## Recommended Testing Steps

### Step 1: Test in Safari (Device)
1. Open **Safari** on iPhone
2. Go to `https://app.helpem.ai/app`
3. Should see auth gate
4. If YES → Problem is iOS app specific
5. If NO → Problem is web deployment

### Step 2: Check Session
1. Open **Safari Developer Tools** (Mac)
2. Connect iPhone
3. Go to **Develop → [Your iPhone] → app.helpem.ai**
4. Check **Console** for debug logs:
   - `🔵 App Landing Page - Rendering`
   - `Has session cookie?`
   - `✅ User authenticated, redirecting to dashboard`

### Step 3: Test Without Session
1. In Safari console, run:
   ```javascript
   document.cookie.split(';').forEach(c => {
     document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC';
   });
   localStorage.clear();
   location.reload();
   ```
2. Should now see auth gate

### Step 4: iOS App Cache Clear
Add this to iOS app initialization:

```swift
// Clear WKWebView cache on app launch
let dataStore = WKWebsiteDataStore.default()
dataStore.fetchDataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes()) { records in
    records.forEach { record in
        print("Clearing cache for: \(record.displayName)")
    }
    dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), 
                        for: records) {
        print("✅ WKWebView cache cleared")
    }
}
```

## Quick Fix Options

### Option A: Force Cache Clear in Web
Add cache-busting to the app URL in iOS:

```swift
// In AppEnvironment.swift
static var webAppURL: String {
    let timestamp = Int(Date().timeIntervalSince1970)
    switch current {
    case .production:
        return "https://app.helpem.ai/app?_t=\(timestamp)"
    // ...
    }
}
```

### Option B: Add Debug Mode
Add a way to force logout in the app:
1. Shake device to open debug menu
2. "Clear Session & Reload" option

### Option C: Check Environment
Verify iOS app is actually loading production URL:

```swift
print("🔵 Loading WebView URL: \(AppEnvironment.webAppURL)")
```

## Current File Structure (Confirmed Correct)

```
/app/page.tsx           ← Auth gate (Sign In / Sign Up)
/app/dashboard/page.tsx ← Main app (todos, appointments)
/app/onboarding/page.tsx ← Onboarding flow
/app/signin/page.tsx    ← Sign in page
```

## Deployment Info

**Latest Commit:** `ab03e61` - "Wrap useSearchParams in Suspense boundary"
**Deployment:** https://helpem-agent-core-3ev5a7krs-bryan-simkins.vercel.app
**Production URL:** https://app.helpem.ai/app
**Aliases Confirmed:**
- app.helpem.ai ✅
- helpem.ai ✅
- www.helpem.ai ✅

## Next Actions

1. **Test in Safari on device** - Verify web deployment is correct
2. **Check console logs** - See if session is causing auto-redirect
3. **Add cache busting** - If needed, add timestamp to iOS URL
4. **Clear WKWebView cache** - Add code to iOS app init

---

**Note:** The deployment is confirmed live and correct. The issue is likely iOS app caching or session persistence, not the web deployment.
