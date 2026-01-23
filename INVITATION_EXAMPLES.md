# Invitation Flow - Complete Example

## Scenario: Sarah invites her friend Mike to "Family Planning" tribe

---

## Step 1: Sarah Opens Tribe Settings

**Screen:** Tribe Detail → Members → + Button

---

## Step 2: Permission Request (First Time Only)

```
┌─────────────────────────────────────┐
│                                     │
│         🎉 (person icon)            │
│                                     │
│     Invite Someone Special          │
│                                     │
│  Choose someone to join your        │
│  HelpEm tribe. They'll get a        │
│  personal invitation from you       │
│  when they sign up!                 │
│                                     │
│     [Continue Button - Blue]        │
│                                     │
│  No background sync.                │
│  No uploading contacts.             │
│                                     │
└─────────────────────────────────────┘
```

---

## Step 3: Contact Selection

```
┌─────────────────────────────────────┐
│  Invite to Tribe              [×]   │
├─────────────────────────────────────┤
│  🔍 Search contacts                 │
├─────────────────────────────────────┤
│  👤 Mike Johnson                    │
│     mike.j@email.com              > │
├─────────────────────────────────────┤
│  👤 Emily Chen                      │
│     emily@example.com             > │
├─────────────────────────────────────┤
│  👤 David Park                      │
│     (555) 123-4567                > │
└─────────────────────────────────────┘

Footer: "Your personal invitation will be 
waiting for them when they join HelpEm! 
They'll see it's from you and can choose 
to accept."
```

Sarah taps "Mike Johnson"

---

## Step 4: Set Permissions

```
┌─────────────────────────────────────┐
│  Invite Member              [Cancel]│
├─────────────────────────────────────┤
│  SELECT CONTACT                     │
│  ✓ Contact Selected                 │
│     Mike Johnson                    │
│                                     │
│  Your personal invitation will be   │
│  waiting for them when they join    │
│  HelpEm! They'll see it's from you  │
│  and can choose to accept.          │
├─────────────────────────────────────┤
│  PERMISSIONS                        │
│  ☑ Can Add Tasks                    │
│  ☐ Can Remove Tasks                 │
│  ☑ Can Add Routines                 │
│  ☐ Can Remove Routines              │
│  ☑ Can Add Appointments             │
│  ☐ Can Remove Appointments          │
│  ☑ Can Add Groceries                │
│  ☐ Can Remove Groceries             │
│                                     │
│  Permissions can be updated any     │
│  time after the invite is sent.     │
├─────────────────────────────────────┤
│        [Send Invite - Blue]         │
└─────────────────────────────────────┘
```

Sarah taps "Send Invite"

---

## Step 5: Success Confirmation

```
┌─────────────────────────────────────┐
│                                     │
│     Invitation Ready! 🎉            │
│                                     │
│  Mike Johnson will see your         │
│  personal invitation to join        │
│  'Family Planning' when they        │
│  sign up for HelpEm. They'll be     │
│  excited to collaborate with you!   │
│                                     │
│           [Done - Blue]             │
│                                     │
└─────────────────────────────────────┘
```

Sarah taps "Done"

---

## Step 6: Tribe Activity Feed

```
┌─────────────────────────────────────┐
│  Family Planning - Activity         │
├─────────────────────────────────────┤
│  🎉 Sarah invited Mike Johnson to   │
│     join the tribe!                 │
│     Just now                        │
├─────────────────────────────────────┤
│  📝 Sarah added "Doctor appt" to    │
│     shared calendar                 │
│     2 hours ago                     │
└─────────────────────────────────────┘
```

---

## Backend: What Actually Happens

### 1. API Request
```json
POST /tribes/abc-123/invite-contact
Authorization: Bearer [Sarah's token]

{
  "contactIdentifier": "mike.j@email.com",
  "contactType": "email",
  "contactName": "Mike Johnson",
  "permissions": {
    "canAddTasks": true,
    "canRemoveTasks": false,
    "canAddRoutines": true,
    "canRemoveRoutines": false,
    "canAddAppointments": true,
    "canRemoveAppointments": false,
    "canAddGroceries": true,
    "canRemoveGroceries": false
  }
}
```

### 2. Backend Processing
```javascript
// Normalize email
const normalizedEmail = "mike.j@email.com"

// Get inviter name
const inviterName = "Sarah Wilson" // from getUserDisplayName()

// Create pending invitation
const invitation = {
  id: "inv-456",
  tribeId: "abc-123",
  invitedBy: "user-sarah-id",
  contactIdentifier: "mike.j@email.com",
  contactType: "email",
  contactName: "Mike Johnson",
  inviterName: "Sarah Wilson",
  permissions: { ... },
  state: "pending",
  expiresAt: "2026-02-22T12:00:00Z" // 30 days
}

// Create activity
{
  message: "Sarah Wilson invited Mike Johnson to join the tribe! 🎉"
}
```

### 3. API Response
```json
{
  "success": true,
  "invitation": {
    "id": "inv-456",
    "tribeId": "abc-123",
    "contactIdentifier": "mike.j@email.com",
    "contactName": "Mike Johnson",
    "inviterName": "Sarah Wilson",
    "state": "pending",
    "expiresAt": "2026-02-22T12:00:00Z"
  },
  "inviterName": "Sarah Wilson",
  "message": "Mike Johnson will receive a personal invitation from you to join the Family Planning tribe when they sign up for HelpEm!"
}
```

---

## Future: When Mike Signs Up (Phase 2)

### 1. Mike Downloads HelpEm

```
App Store listing or link from web
```

### 2. Sign in with Apple

```
┌─────────────────────────────────────┐
│                                     │
│         Welcome to HelpEm           │
│                                     │
│    Your personal life assistant     │
│                                     │
│    [Continue with Apple - Black]    │
│                                     │
└─────────────────────────────────────┘
```

### 3. Backend Matches Email

```javascript
// Mike signs in, backend gets: mike.j@email.com from Apple

// Check for pending invitations
const pendingInvites = await prisma.pendingTribeInvitation.findMany({
  where: {
    contactIdentifier: "mike.j@email.com",
    state: "pending",
    expiresAt: { gte: new Date() }
  }
});

// Found Sarah's invitation!
// Auto-create TribeMember record
await prisma.tribeMember.create({
  data: {
    tribeId: "abc-123",
    userId: "user-mike-id",
    invitedBy: "user-sarah-id",
    acceptedAt: new Date(),
    permissions: { ... }
  }
});

// Mark invitation as accepted
await prisma.pendingTribeInvitation.update({
  where: { id: "inv-456" },
  data: {
    state: "accepted",
    acceptedAt: new Date(),
    acceptedBy: "user-mike-id"
  }
});
```

### 4. Welcome Screen for Mike

```
┌─────────────────────────────────────┐
│                                     │
│      Welcome to HelpEm! 🎉          │
│                                     │
│  Sarah Wilson invited you to join   │
│  "Family Planning"                  │
│                                     │
│  You're all set! You can now:       │
│  • See shared items                 │
│  • Add tasks & appointments         │
│  • Collaborate with Sarah           │
│                                     │
│     [Get Started - Blue]            │
│                                     │
└─────────────────────────────────────┘
```

### 5. Sarah Gets Notification

```
┌─────────────────────────────────────┐
│  🎉 Mike Johnson joined your        │
│     "Family Planning" tribe!        │
│                                     │
│     [View Tribe]                    │
└─────────────────────────────────────┘
```

### 6. Updated Activity Feed

```
┌─────────────────────────────────────┐
│  Family Planning - Activity         │
├─────────────────────────────────────┤
│  ✅ Mike Johnson joined the tribe!  │
│     Just now                        │
├─────────────────────────────────────┤
│  🎉 Sarah invited Mike Johnson to   │
│     join the tribe!                 │
│     5 days ago                      │
└─────────────────────────────────────┘
```

---

## Edge Cases

### Contact Has No Email

```
┌─────────────────────────────────────┐
│                                     │
│     Invalid Contact                 │
│                                     │
│  This contact doesn't have an       │
│  email address or phone number.     │
│  Please select a contact with at    │
│  least one of these.                │
│                                     │
│           [OK - Blue]               │
│                                     │
└─────────────────────────────────────┘
```

### Already Invited

```
Backend returns 400:
{
  "error": "An invitation has already been sent to this contact"
}

iOS shows:
"Mike Johnson has already been invited to this tribe."
```

### Invitation Expired (After 30 Days)

```
Database:
state = "expired"

When Mike signs up:
- No auto-join
- Invitation ignored
- Sarah would need to re-invite
```

---

## Key Messaging Principles Applied

1. **Personal Connection**
   - ✅ "Sarah Wilson invited you"
   - ✅ "personal invitation from you"
   - ✅ Shows inviter name everywhere

2. **Clear Expectations**
   - ✅ "when they sign up" (not "we'll send email")
   - ✅ "waiting for them" (stored, not sent yet)
   - ✅ "can choose to accept" (opt-in)

3. **Positive Framing**
   - ✅ "Invitation Ready!" not "Sent"
   - ✅ "Excited to collaborate"
   - ✅ Celebration emojis (🎉)

4. **Trust Building**
   - ✅ "No background sync"
   - ✅ Shows exactly what info is shared
   - ✅ Permissions explained clearly

5. **Action-Oriented**
   - ✅ Clear CTAs at each step
   - ✅ Progress indication
   - ✅ Immediate feedback
