# App Authentication Flow - Visual Diagram

## Route Structure

```
/
├── / (Landing)
│   ├── → "Sign In" → /app
│   └── → "Create Account" → /app
│
├── /app (Auth Gate) ⭐ NEW
│   ├── → "Sign In" → /app/signin
│   └── → "Create Account" → /app/onboarding
│
├── /app/onboarding ⭐ NEW
│   ├── Step 1: Welcome & Trial
│   ├── Step 2: Features
│   ├── Step 3: Pricing
│   └── → "Sign Up Free" → /app/signin
│
├── /app/signin ⭐ NEW
│   ├── → iOS: Native Apple Sign In
│   ├── → Web: /api/auth/apple
│   └── → Success → /app/dashboard
│
└── /app/dashboard ⭐ MOVED
    └── (Main app interface)
```

---

## User Journey: New User (No Invite)

```
┌─────────────┐
│   Landing   │  User clicks "Create Account"
│      /      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Auth Gate  │  Shows Sign In / Sign Up
│    /app     │
└──────┬──────┘
       │  Clicks "Create Account"
       ▼
┌─────────────┐
│ Onboarding  │  3-step tour
│ /app/       │  - Welcome & Trial
│  onboarding │  - Features
│             │  - Pricing
└──────┬──────┘
       │  Clicks "Sign Up Free"
       ▼
┌─────────────┐
│  Sign In    │  Apple Sign In flow
│ /app/signin │  (iOS native or web OAuth)
└──────┬──────┘
       │  Auth succeeds
       ▼
┌─────────────┐
│  Dashboard  │  Main app interface
│ /app/       │  - Todos, Appointments
│  dashboard  │  - Habits, Groceries
└─────────────┘
```

---

## User Journey: New User with Tribe Invite

```
┌─────────────────┐
│  Tribe Invite   │  User receives link
│ /join/{token}   │  Token stored in localStorage ⭐
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Auth Gate     │  Shows:
│      /app       │  - Sign In button
│  ?invite=xxx    │  - Create Account button
│                 │  - Tribe invite banner 💜
└────────┬────────┘
         │  Clicks "Create Account"
         ▼
┌─────────────────┐
│   Onboarding    │  Token persists through flow
│  /app/          │  (stored in localStorage)
│   onboarding    │
└────────┬────────┘
         │  Completes onboarding
         ▼
┌─────────────────┐
│    Sign In      │  Apple Sign In
│  /app/signin    │  Checks for pending invite ⭐
└────────┬────────┘
         │  Auth succeeds + invite found
         ▼
┌─────────────────┐
│   Dashboard     │  Shows notification:
│  /app/          │  "Welcome to your tribe!" 🎉
│   dashboard     │  Auto-opens tribes after 2s
│ ?showInvite=    │  Invite visible in tribes list
└─────────────────┘
```

---

## User Journey: Returning User

```
┌─────────────┐
│   Landing   │  User clicks "Sign In"
│      /      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Auth Gate  │  Detects existing session ✓
│    /app     │  Auto-redirects to dashboard
└──────┬──────┘
       │  OR clicks "Sign In"
       ▼
┌─────────────┐
│  Sign In    │  Already authenticated
│ /app/signin │  Skips auth, redirects
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │  Main app
│ /app/       │
│  dashboard  │
└─────────────┘
```

---

## Invite Token Flow

### Storage Points:
```
┌──────────────────────────────────────┐
│  Token Stored in localStorage        │
│  Key: "pendingTribeInvite"           │
└──────────────────────────────────────┘
         ▲
         │
    ┌────┴────┬──────────────────┐
    │         │                  │
┌───┴───┐ ┌──┴────┐ ┌──────────┴─────┐
│ /app  │ │ /join │ │ /app/signin    │
│?invite│ │{token}│ │ (checks token) │
└───────┘ └───────┘ └────────────────┘
```

### Check Points:
```
┌──────────────────────────────────────┐
│  Token Checked from localStorage     │
└──────────────────────────────────────┘
         │
    ┌────┴────┬──────────────────┐
    │         │                  │
┌───┴───────┐ ┌────┴─────────┐ ┌┴────────────┐
│ /app      │ │ /app/signin  │ │ /app/       │
│ (displays │ │ (redirects   │ │  dashboard  │
│  banner)  │ │  with param) │ │ (notifies)  │
└───────────┘ └──────────────┘ └─────────────┘
```

---

## Authentication State

### Before Sign In:
```
🔴 No Session
├─ /app → Shows auth gate
├─ /app/onboarding → Accessible
├─ /app/signin → Shows sign in form
└─ /app/dashboard → Should redirect to /app
```

### After Sign In:
```
🟢 Has Session
├─ /app → Auto-redirect to dashboard
├─ /app/onboarding → Skip (already signed in)
├─ /app/signin → Auto-redirect to dashboard
└─ /app/dashboard → Accessible ✓
```

---

## Mobile vs Desktop

### Mobile Flow:
```
Small Screen (< 768px)
├─ Sticky CTA at bottom
├─ Single column layouts
├─ Larger touch targets
└─ Simplified navigation
```

### Desktop Flow:
```
Large Screen (≥ 768px)
├─ Inline CTAs
├─ Multi-column layouts
├─ Hover effects
└─ Extended navigation
```

---

## iOS Native vs Web

### iOS App:
```
Native Detection ✓
├─ User agent: "helpem"
├─ webkit.messageHandlers.native
└─ __IS_HELPEM_APP__

Sign In Flow:
├─ Triggers: webkit.messageHandlers.signInWithApple
├─ Native Apple Sign In UI
└─ Returns session to webview
```

### Web Browser:
```
Standard Web
├─ No native detection
└─ Standard HTML/JS

Sign In Flow:
├─ Redirects: /api/auth/apple
├─ Apple OAuth web flow
└─ Returns session via cookies
```

---

## Error Handling

### Invalid Invite:
```
/join/{bad-token}
├─ Shows error message
├─ "Sign Up to Join" button
│   └─ Still allows signup
└─ Token stored anyway
    └─ Backend will validate later
```

### Session Expired:
```
/app/dashboard (no session)
├─ Should redirect to /app
└─ User re-authenticates
    └─ Returns to dashboard
```

### Network Error:
```
Sign In Failed
├─ Error message displayed
├─ Retry button
└─ Manual fallback option
```

---

## Data Flow

### localStorage:
```javascript
// Set
localStorage.setItem("pendingTribeInvite", token);

// Get
const token = localStorage.getItem("pendingTribeInvite");

// Remove (after use)
localStorage.removeItem("pendingTribeInvite");
```

### URL Parameters:
```
?invite=xxx      → Invite token
?showInvite=true → Show notification
?token=xxx       → Alternative invite param
```

### Cookies:
```
session_token    → User session (set by backend)
session_id       → Session identifier
```

---

## Visual States

### Auth Gate (`/app`):
```
┌────────────────────────────────┐
│         Welcome to helpem      │
│                                │
│    ┌──────────────────────┐   │
│    │   👥 Tribe Invite    │   │  ← Only if ?invite=xxx
│    │  You've been invited!│   │
│    └──────────────────────┘   │
│                                │
│    ┌──────────────────────┐   │
│    │      Sign In         │   │
│    └──────────────────────┘   │
│                                │
│    ┌──────────────────────┐   │
│    │   Create Account     │   │
│    └──────────────────────┘   │
└────────────────────────────────┘
```

### Onboarding Progress:
```
Step 1/3: ████░░░░░░░░ 33%
Step 2/3: ████████░░░░ 67%
Step 3/3: ████████████ 100%
```

### Dashboard Notification:
```
┌────────────────────────────────┐
│  👥 Welcome to your tribe!     │
│  Opening your tribes now...    │
└────────────────────────────────┘
        ↓ (auto-opens after 2s)
┌────────────────────────────────┐
│         My Tribes              │
│  ┌──────────────────────────┐ │
│  │  Family                  │ │
│  │  5 members • NEW         │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

---

## Key Features

✅ **Smooth Transitions** - Fade-in animations between pages
✅ **Token Persistence** - Invite survives entire sign-up flow  
✅ **Auto-Detection** - Recognizes existing sessions
✅ **iOS Integration** - Native Apple Sign In support
✅ **Error Recovery** - Graceful fallbacks
✅ **Mobile First** - Optimized for touch
✅ **Brand Consistent** - Blue/green gradients throughout
✅ **Clear CTAs** - Always visible, prominent buttons
