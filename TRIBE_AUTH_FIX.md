# Tribe Loading Authentication Fix

**Date:** January 24, 2026  
**Issue:** "Failed to load tribes" error when clicking Tribes from home screen

---

## Problem

User clicks "Tribes" → sees empty screen → clicks "Create Tribe" → gets "failed to load tribes" error.

**Root Cause:** Session token is missing or expired in Keychain.

The tribe API requires authentication:
```swift
// TribeAPIClient.swift line 371
guard let token = KeychainHelper.shared.sessionToken else {
    throw TribeAPIError.notAuthenticated
}
```

When token is missing:
1. `getTribes()` fails with `TribeAPIError.notAuthenticated`
2. Error message shown: "Your session has expired. Please sign in again."
3. User is stuck - no automatic redirect to sign-in

---

## Why Session Token Might Be Missing

1. **App reinstall** - Keychain data cleared
2. **Fresh install** - Never signed in
3. **Token expired** - 30-day session token expired
4. **Keychain access issue** - iOS security restrictions
5. **Manual logout** - User logged out but state not updated

---

## Solution

### 1. Add Auth Error Detection
Detect when tribe loading fails due to authentication and automatically trigger sign-in flow.

### 2. Auto-Redirect to Sign-In
When auth error detected, navigate user back to sign-in screen.

### 3. Better Error Messages
Show clear, actionable messages:
- "Your session expired. Please sign in again."
- "Sign in required to access Tribes."

---

## Implementation Plan

### File: `ios/HelpEmApp/Views/Tribe/TribeListView.swift`

**Changes needed:**

1. Add state for auth error detection:
```swift
@State private var showingSignInRequired = false
```

2. Handle auth errors in `.onReceive(viewModel.$error)`:
```swift
.onReceive(viewModel.$error) { newError in
    if let error = newError {
        // Check if it's an auth error
        if let tribeError = error as? TribeAPIError, 
           tribeError == .notAuthenticated {
            showingSignInRequired = true
        } else {
            showError = true
        }
    }
}
```

3. Show sign-in alert:
```swift
.alert("Sign In Required", isPresented: $showingSignInRequired) {
    Button("Sign In", role: .none) {
        AuthManager.shared.signInWithApple()
    }
    Button("Cancel", role: .cancel) {}
} message: {
    Text("Your session has expired. Please sign in to access Tribes.")
}
```

4. Listen for auth state changes:
```swift
.onReceive(AuthManager.shared.$isAuthenticated) { isAuth in
    if isAuth {
        // Reload tribes when auth completes
        Task {
            await viewModel.loadTribes()
        }
    }
}
```

---

## Alternative Quick Fix

For immediate relief, ensure user is signed in before accessing Tribes:

### File: `ios/HelpEmApp/RootView.swift`

Add auth check to Tribes navigation:
```swift
Button("Tribes") {
    if AuthManager.shared.isAuthenticated {
        showTribes = true
    } else {
        // Show sign-in prompt
        showSignInRequired = true
    }
}
```

---

## Testing Steps

1. **Test fresh install:**
   - Install app
   - Don't sign in
   - Click "Tribes"
   - Should see "Sign In Required" alert

2. **Test expired session:**
   - Clear Keychain manually (or wait 30 days)
   - Click "Tribes"
   - Should auto-prompt for sign-in

3. **Test successful sign-in:**
   - Click "Sign In" from alert
   - Complete Sign in with Apple
   - Should automatically load tribes

4. **Test after sign-in:**
   - Close app
   - Reopen app
   - Click "Tribes"
   - Should load tribes without error

---

## Future Enhancements

1. **Background token refresh** - Refresh token before it expires
2. **Persistent session** - Store token securely across app restarts
3. **Better UX** - Show loading state during re-auth
4. **Graceful degradation** - Show cached tribes even if API fails

---

## Status

- [x] Root cause identified
- [x] Fix implemented
- [ ] Tested on device
- [ ] Deployed to TestFlight

## What Was Fixed

### Changes to `ios/HelpEmApp/Views/Tribe/TribeListView.swift`

1. **Added auth state tracking:**
   - `@State private var showingSignInRequired`
   - `@ObservedObject private var authManager`

2. **Smart error handling:**
   - Detects `TribeAPIError.notAuthenticated`
   - Shows "Sign In Required" alert instead of generic error
   - Automatically hides create tribe sheet on auth error

3. **Automatic retry after sign-in:**
   - Listens to `authManager.isAuthenticated` changes
   - Automatically reloads tribes when user completes sign-in
   - Seamless UX - user doesn't need to manually refresh

4. **Better UX for create tribe:**
   - If auth fails during tribe creation, closes the sheet
   - Shows sign-in prompt
   - Prevents confusion from error appearing in wrong context

## User Experience

**Before Fix:**
- User clicks "Tribes" → sees empty screen
- User clicks "Create Tribe" → generic error: "Failed to load tribes"
- User is stuck, doesn't know what to do

**After Fix:**
- User clicks "Tribes" → automatic check for auth
- If not authenticated → clear alert: "Sign In Required - Your session has expired. Please sign in to access your Tribes."
- User clicks "Sign In" → completes Apple Sign In
- Tribes automatically load → user can see their tribes!
- Same experience from both "Manage Tribes" and "Tribe Settings" (they use the same view)
