# Tribe Display Discrepancy - Diagnostic Guide

## Issue
"Norayne tribe" appears in menu but not on home screen tribes list.

## Where Tribes Appear

### iOS App:
1. **Menu → "Tribes"** → Shows `TribeListView`
   - Fetches from: `/tribes` API endpoint
   - Shows: All accepted tribes (where `acceptedAt IS NOT NULL` and `leftAt IS NULL`)
   - Also shows: Pending invitations in separate "Invitations" section

2. **Home Screen** (iOS)
   - There is NO tribe list on iOS home screen
   - Home screen is the chat interface
   - Must tap menu → "Tribes" to see tribes

### Web App:
1. **Home Screen `/app`** → Has "My Tribes" button
   - Does NOT show tribe list on home screen
   - Button navigates to `/tribe/inbox`

2. **Tribe Inbox `/tribe/inbox`** → Shows tribe list
   - Fetches from: `/api/tribes` endpoint
   - Shows: All accepted tribes
   - Auto-selects first tribe to show messages

## Possible Causes

### 1. Pending Invitation (Most Likely)
**Scenario:** You were invited to "norayne" tribe but haven't accepted yet

**Where it shows:**
- ✅ Menu → Tribes → "Invitations" section (with Accept/Decline buttons)
- ❌ NOT in main tribe list until accepted

**Solution:**
1. Open menu → Tribes
2. Look for "Invitations" section at top
3. Accept the norayne tribe invitation
4. It will then appear in main tribe list

### 2. Left Tribe
**Scenario:** You left the tribe but cache hasn't cleared

**Where it shows:**
- ✅ Cached in one view
- ❌ Backend filters it out (leftAt IS NOT NULL)

**Solution:**
1. Pull to refresh in tribe list
2. Clear app cache
3. Logout and login again

### 3. Soft Deleted Tribe
**Scenario:** Tribe owner deleted the tribe

**Where it shows:**
- ✅ Might show in cached menu
- ❌ Backend filters it out (deletedAt IS NOT NULL)

**Solution:**
1. Pull to refresh
2. Tribe should disappear everywhere

## How to Debug

### Step 1: Check API Response
```bash
# Get your session token from iOS app or web app
# Then call the tribes API

curl -X GET "https://helpem.ai/api/tribes" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "tribes": [
    {
      "id": "...",
      "name": "norayne",
      "isOwner": false,
      "pendingProposals": 0
    }
  ]
}
```

If "norayne" is NOT in this response → It's filtered out (pending, left, or deleted)

### Step 2: Check for Pending Invitation
Look at the TribeListView in iOS:
- Is there an "Invitations" section above the tribe list?
- Is "norayne" listed there?
- If yes → Accept the invitation

### Step 3: Check Database Directly
```sql
-- Check your tribe membership status
SELECT 
  t.name,
  tm.accepted_at,
  tm.left_at,
  t.deleted_at,
  CASE 
    WHEN tm.accepted_at IS NULL THEN 'Pending Invitation'
    WHEN tm.left_at IS NOT NULL THEN 'Left Tribe'
    WHEN t.deleted_at IS NOT NULL THEN 'Tribe Deleted'
    ELSE 'Active Member'
  END as status
FROM tribe_members tm
JOIN tribes t ON t.id = tm.tribe_id
WHERE tm.user_id = 'YOUR_USER_ID'
  AND t.name ILIKE '%norayne%'
ORDER BY tm.invited_at DESC;
```

## Quick Fix

**If it's a pending invitation:**
1. iOS: Open menu → Tribes → Accept invitation
2. Web: Go to /tribe/inbox → Accept invitation (if shown)

**If it's a cache issue:**
1. iOS: Pull down to refresh in tribe list
2. Web: Hard refresh (Cmd+Shift+R)
3. Or: Logout and login again

**If tribe was deleted:**
- It will disappear from all views after refresh
- This is expected behavior

## Backend Filtering Logic

```javascript
// backend/src/lib/tribePermissions.js - getUserTribes()
return await prisma.tribeMember.findMany({
  where: {
    userId,
    acceptedAt: { not: null },  // ← Must be accepted
    leftAt: null,               // ← Must not have left
    tribe: {
      deletedAt: null,          // ← Tribe must not be deleted
    },
  },
  // ...
});
```

**Tribes are hidden if:**
- ❌ Invitation not accepted (acceptedAt IS NULL)
- ❌ User left tribe (leftAt IS NOT NULL)
- ❌ Tribe was deleted (deletedAt IS NOT NULL)

## Files to Check

- Backend: `backend/src/lib/tribePermissions.js` (getUserTribes function)
- iOS: `ios/HelpEmApp/Views/Tribe/TribeListView.swift`
- Web: `web/src/app/tribe/inbox/page.tsx`

All three should show the same tribes (from same API endpoint).
