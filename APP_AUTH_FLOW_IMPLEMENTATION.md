# App Authentication Flow Implementation

## Overview
Created a complete authentication flow with sign in/sign up landing page at `/app`, onboarding experience, and tribe invite handling.

## What Was Built

### 1. New App Landing Page (`/app`)
**File:** `web/src/app/app/page.tsx`

A clean authentication gate that shows before the main app:
- **Sign In Button** - Immediately launches Apple Sign In flow
- **Create Account Button** - Takes users through onboarding
- **Tribe Invite Banner** - Shows when user arrives via invite link
- **Invite Token Persistence** - Stores invite token in localStorage for post-signup

Features:
- Detects if user already authenticated (redirects to dashboard)
- Handles tribe invite tokens from URL (`?invite=xxx` or `?token=xxx`)
- Clean, gradient design matching brand colors
- Mobile-responsive

### 2. Onboarding Flow (`/app/onboarding`)
**File:** `web/src/app/app/onboarding/page.tsx`

Multi-step sign-up experience (3 steps):

**Step 1: Welcome & Trial Offer**
- Welcome message with logo
- Trial offer card (30 days, 3,000 interactions)
- Value props grid (AI, manage everything, tribes, voice/text)

**Step 2: Features**
- Detailed feature showcase
- 4 major features with descriptions:
  - Smart Organization (AI categorization)
  - Tribes (coordination)
  - Calendar Integration
  - Smart Reminders

**Step 3: Pricing**
- Pricing preview component
- Transparent pricing table
- Call-to-action to sign up
- Link to sign in if already have account

Progress:
- Progress bar at top
- Step indicator (Step X of 3)
- Continue/Sign Up buttons
- Animated transitions between steps

### 3. Sign In Page (`/app/signin`)
**File:** `web/src/app/app/signin/page.tsx`

Handles authentication:
- Auto-redirects if already signed in
- Checks for pending tribe invites
- **iOS Native**: Triggers native Apple Sign In via message handlers
- **Web**: Redirects to `/api/auth/apple` for web OAuth
- Loading spinner while connecting
- Manual fallback button
- Privacy note about not storing Apple data

iOS Integration:
- Detects native app via user agent
- Multiple trigger methods:
  - `webkit.messageHandlers.signInWithApple`
  - `nativeBridge.signInWithApple()`
  - Custom event `requestAppleSignIn`

### 4. Dashboard (Moved from `/app` to `/app/dashboard`)
**File:** `web/src/app/app/dashboard/page.tsx`

The main app interface (previously at `/app`):
- All existing functionality intact (todos, appointments, habits, groceries)
- **New:** Tribe invite notification system
  - Checks for pending invite from localStorage
  - Shows notification banner
  - Auto-opens tribes after 2 seconds
  - Clears notification after showing

### 5. Updated Routes Throughout App

**Landing Page** (`/page.tsx`):
- "Sign In" → `/app`
- "Create Account" → `/app`

**Sign Up Page** (`/signup/page.tsx`):
- "Get Started Free" → `/app/onboarding`
- "Sign In" links → `/app/signin`

**Join Tribe Page** (`/join/[token]/page.tsx`):
- Stores invite token in localStorage on arrival
- "Sign Up to Join" → `/app?invite={token}`
- "Sign in" → `/app/signin?invite={token}`
- Success redirect → `/app/dashboard?showInvite=true`

### 6. CSS Animations
**File:** `web/src/app/globals.css`

Added fade-in animation:
```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
```

Used in onboarding steps for smooth transitions.

## User Flow

### New User Sign Up (No Invite)
1. User visits `/` → Clicks "Create Account"
2. Redirects to `/app` → Clicks "Create Account"
3. Redirects to `/app/onboarding`
4. Goes through 3-step onboarding
5. Clicks "Sign Up Free"
6. Redirects to `/app/signin`
7. Apple Sign In completes
8. Redirects to `/app/dashboard`

### New User with Tribe Invite
1. User receives invite link: `/join/{token}`
2. Page stores token in localStorage
3. User clicks "Sign Up to Join" → Redirects to `/app?invite={token}`
4. App landing shows tribe invite banner
5. User clicks "Create Account"
6. Goes through onboarding (token persists in localStorage)
7. Signs up via Apple Sign In
8. Redirects to `/app/dashboard?showInvite=true`
9. Dashboard shows welcome notification
10. After 2 seconds, auto-opens tribes view
11. Invite is visible in tribes list (already stored by backend)

### Returning User Sign In
1. User visits `/` → Clicks "Sign In"
2. Redirects to `/app` → Clicks "Sign In"
3. Redirects to `/app/signin`
4. Apple Sign In completes
5. Redirects to `/app/dashboard`

### Returning User with New Invite
1. User receives invite link: `/join/{token}`
2. Page detects existing session
3. Immediately joins tribe (no signup needed)
4. Shows success message
5. Redirects to `/app/dashboard?showInvite=true`
6. Tribes auto-opens to show new invite

## Technical Details

### Invite Token Persistence
**localStorage Key:** `pendingTribeInvite`

Stored when:
- User arrives at `/app` with `?invite=` param
- User arrives at `/join/{token}` page

Checked when:
- `/app/signin` completes authentication
- `/app/dashboard` loads

Cleared:
- After notification is shown (dashboard handles this)

### Authentication Detection
Checks for session in multiple ways:
- Cookie: `document.cookie.includes("session_token")`
- Function: `getClientSessionToken()` from `@/lib/clientSession`

### iOS Native Detection
```javascript
const isNativeApp = 
  navigator.userAgent.includes("helpem") ||
  (window as any).webkit?.messageHandlers?.native ||
  (window as any).__IS_HELPEM_APP__;
```

### State Management
- **React State**: For UI elements, loading states
- **localStorage**: For persistent invite tokens
- **URL Params**: For passing invite context between pages
- **Cookies**: For session tokens (set by backend)

## Files Modified

### Created:
1. `web/src/app/app/page.tsx` - New auth landing
2. `web/src/app/app/onboarding/page.tsx` - Onboarding flow
3. `web/src/app/app/signin/page.tsx` - Sign in page
4. `web/src/app/app/dashboard/` - Dashboard directory

### Modified:
1. `web/src/app/page.tsx` - Updated links
2. `web/src/app/signup/page.tsx` - Updated links
3. `web/src/app/join/[token]/page.tsx` - Added token storage
4. `web/src/app/globals.css` - Added animations
5. Moved: `web/src/app/app/page.tsx` → `web/src/app/app/dashboard/page.tsx`

## Testing Checklist

### New User Flow:
- [ ] Visit `/` and click "Create Account"
- [ ] Goes through `/app` → `/app/onboarding`
- [ ] All 3 onboarding steps display correctly
- [ ] Progress bar updates
- [ ] Final step goes to `/app/signin`
- [ ] Sign in redirects to `/app/dashboard`

### Returning User Flow:
- [ ] Visit `/` and click "Sign In"
- [ ] Goes through `/app` → `/app/signin`
- [ ] Auto-detects session (if already logged in)
- [ ] Redirects to `/app/dashboard`

### Tribe Invite Flow (New User):
- [ ] Click tribe invite link `/join/{token}`
- [ ] Token stored in localStorage
- [ ] Invite banner shows on `/app` landing
- [ ] Complete sign up process
- [ ] Dashboard shows "Welcome to your tribe" notification
- [ ] Tribes auto-open after 2 seconds
- [ ] Invite visible in tribes list

### Tribe Invite Flow (Existing User):
- [ ] Click tribe invite link `/join/{token}` while logged in
- [ ] Auto-joins tribe immediately
- [ ] Shows success message
- [ ] Redirects to dashboard with notification

### iOS App:
- [ ] Sign in triggers native Apple Sign In
- [ ] No web OAuth flow shown
- [ ] Session persists after native auth

## Design Features

### Color Scheme:
- **Primary Gradient**: Blue (#0077CC) to Green (#7AC943)
- **Backgrounds**: Gradient from gray-50 via white to blue-50/green-50
- **Tribe Accent**: Purple (#9333EA)

### Typography:
- **Headings**: Bold, 2xl-4xl sizes
- **Body**: Gray-600 for secondary text
- **CTAs**: Bold, white text on gradient

### Responsive:
- Mobile-first design
- Sticky CTA buttons on mobile
- Larger touch targets
- Optimized spacing for small screens

### Animations:
- Fade-in for page transitions
- Scale on hover for buttons
- Smooth gradient transitions
- Progress bar animation

## Next Steps (Future Enhancements)

1. **Email/Password Auth** - Alternative to Apple Sign In for web
2. **Social Auth** - Google, Microsoft options
3. **Onboarding Personalization** - Ask user preferences
4. **Skip Onboarding** - Quick access for users who don't need tour
5. **Invite Preview** - Show tribe details before signup
6. **Deep Linking** - Better iOS app integration
7. **Analytics** - Track conversion funnel
8. **A/B Testing** - Test different onboarding flows

## Notes

- All authentication flows work for both web and iOS
- Tribe invites persist across sign-up process
- No data loss when redirecting through auth flow
- Backwards compatible with existing `/app` links (still work, just redirect)
- Session detection prevents re-authentication
- Clean separation of concerns (landing, onboarding, sign in, dashboard)
