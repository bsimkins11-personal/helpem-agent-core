# Tribe Admin - Quick Guide

## Accessing Tribe Admin

### Mobile
1. Tap hamburger menu (☰) in top-left
2. Scroll down to "👥 My Tribes"
3. Tap to open admin dashboard

### Desktop  
*(Currently accessible via direct URL: `/tribe/admin`)*
*Could be added to desktop navigation in future update*

---

## Admin Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  ← Back           Tribe Admin      [+ Create]   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐ │
│  │ MY TRIBES   │  │   Selected Tribe         │ │
│  │             │  │                          │ │
│  │ ● Family    │  │   Tribe Name      [✏️][🗑️]│ │
│  │   (Owner)   │  │   5 members • Joined...  │ │
│  │             │  ├──────────────────────────┤ │
│  │ ○ Work      │  │ Overview │ Members │ ... │ │
│  │   2 members │  ├──────────────────────────┤ │
│  │             │  │                          │ │
│  │ [+ Create]  │  │   [Tab Content Here]     │ │
│  └─────────────┘  └──────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Tab Overview

### 📊 Overview (All Users)
- **Member Count**: How many people in the tribe
- **Pending Proposals**: Items waiting for acceptance
- **Quick Actions**: Links to inbox and other features

### 👥 Members (All Users)
**View all members with status:**
- ✅ Active members
- ⏳ Pending invitations  
- 👋 Left members

**Owner Actions:**
- **[+ Add Member]** button
  - Invite by Email or Phone
  - Optional: Add member name
  - Creates invitation when they sign up
- **[Remove]** button on each member
  - Soft delete (sets leftAt timestamp)
  - Cannot remove owner

**Permission Display:**
- Shows what each member can do
- Color-coded badges for permissions

### 📨 Requests (Owner Only)
- View pending member addition requests
- **[Approve]** - Add member to tribe
- **[Deny]** - Reject request
- Shows who requested and when

### 💬 Messages (All Users)
View all tribe messages with:
- Message content
- Timestamp
- Edit indicators

**Owner Actions:**
- **[🗑️]** Delete button on each message
  - Use for inappropriate content
  - Soft delete (sets deletedAt)
  - No notification to sender

### ⚙️ Settings (Owner Only)
- **Tribe Name**: Currently use rename button in header
- **Description**: Coming soon
- **Danger Zone**: Delete tribe permanently

---

## Common Actions

### Creating a Tribe
1. Click **[+ Create Tribe]** in header
2. Enter tribe name
3. Click **[Create]**
4. ✅ You're now the owner!

### Inviting Members  
1. Select your tribe from sidebar
2. Go to **Members** tab
3. Click **[+ Add Member]**
4. Choose Email or Phone
5. Enter contact info
6. Optional: Add their name
7. Click **[Send Invitation]**

### Removing a Member
1. Select your tribe (must be owner)
2. Go to **Members** tab
3. Find the member
4. Click **[Remove]**
5. Confirm the action

### Deleting Inappropriate Messages
1. Select your tribe (must be owner)
2. Go to **Messages** tab
3. Find the message
4. Click **[🗑️]** delete icon
5. Confirm the action

### Managing Member Requests
1. Select your tribe (must be owner)
2. Go to **Requests** tab
3. Review each request
4. Click **[Approve]** or **[Deny]**

### Renaming a Tribe
1. Select your tribe (must be owner)
2. Click **[✏️]** edit icon in header
3. Enter new name in prompt
4. Confirm

### Deleting a Tribe
1. Select your tribe (must be owner)
2. Click **[🗑️]** delete icon in header
3. Confirm the action
4. ⚠️ This is permanent!

---

## Permission Badges

In the Members tab, you'll see colored badges:

- 🟢 **Can add tasks** - Member can create todos for tribe
- 🔵 **Can add appts** - Member can create appointments  
- 🟠 **Can remove tasks** - Member can delete todo proposals
- More badges for other permissions...

---

## Status Indicators

### Tribe Status
- **Owner** badge - You own this tribe
- **X members** - Active member count

### Member Status  
- ⏳ **Pending** - Invitation not yet accepted
- 👋 **Left** - No longer a member
- *(No badge)* - Active member

### Message Status
- **(edited)** - Message was edited by sender
- **[Message deleted]** - Removed by owner or sender

---

## Tips

✅ **Do:**
- Keep tribe names clear and descriptive
- Review member requests promptly
- Remove inappropriate content quickly
- Add new members by email/phone for easy invites

❌ **Don't:**
- Try to remove yourself as owner (delete tribe instead)
- Delete messages unless truly inappropriate
- Ignore member requests (approve or deny)

---

## Keyboard Shortcuts

*(Future feature)*

---

## Mobile Optimization

The entire interface is mobile-responsive:
- Single column layout on small screens
- Sidebar becomes dropdown on mobile
- Touch-friendly buttons
- Swipe gestures for navigation *(future)*

---

## Need Help?

- **Can't find a tribe?** - Make sure you're logged in and have joined or created tribes
- **Can't see admin features?** - Some features are owner-only
- **Invitation not working?** - Check email/phone format is correct
- **Message deleted by mistake?** - Contact support (soft delete may be recoverable)

---

## Related Pages

- **`/tribe/settings`** - Alternative tribe management (legacy)
- **`/tribe/inbox`** - View pending proposals for acceptance
- **`/app`** - Main app with tribe items displayed

---

## Technical Notes

### API Endpoints Used:
- `GET /api/tribes` - List tribes
- `POST /api/tribes` - Create tribe
- `PATCH /api/tribes/:id` - Rename tribe
- `DELETE /api/tribes/:id` - Delete tribe
- `GET /api/tribes/:id/members` - List members
- `POST /api/tribes/:id/invite-contact` - Invite member
- `DELETE /api/tribes/:id/members/:memberId` - Remove member
- `GET /api/tribes/:id/member-requests` - List requests
- `POST /api/tribes/:id/member-requests/:id/approve` - Approve request
- `POST /api/tribes/:id/member-requests/:id/deny` - Deny request
- `GET /api/tribes/:id/messages` - List messages
- `DELETE /api/tribes/:id/messages/:id` - Delete message

### Authentication:
All requests use session token from `getClientSessionToken()`

### Error Handling:
- Red banner for errors with dismiss button
- Green banner for success with auto-dismiss
- Confirmation dialogs for destructive actions
