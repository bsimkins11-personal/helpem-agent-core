# Tribes Alpha User Guide

**Status**: Ready for Alpha Testing  
**Date**: January 23, 2026  
**Version**: 1.0

---

## Quick Start

### For Existing Users (Token Issue Fix)

If you're seeing "Invalid session token" errors or tribes aren't loading:

**Solution: Sign Out and Back In**

1. **Open the HelpEm app**
2. **Tap the menu icon** (top-left corner)
3. **Tap "Logout"** at the bottom of the menu
4. **Sign in with Apple** again
5. **Check "My Tribes"** section on home screen

**Why this is needed**: The JWT secret was updated during development. Your app has an old token that needs to be refreshed.

**Time**: 30 seconds

---

### For New Alpha Users

1. **Install HelpEm** from TestFlight or Xcode
2. **Launch the app**
3. **Sign in with Apple**
4. **Scroll to "My Tribes" section**

**Expected Result**: You'll automatically see 3 demo tribes:
- 🏠 My Family (with Sarah, Mom, and Alex)
- 💼 Work Team (with Jordan, Casey, and Morgan)
- 🏘️ Roommates (with Taylor, Jamie, and Chris)

---

## What Are Demo Tribes?

Demo tribes are **synthetic preview tribes** that let you:
- See how tribes work
- Test tribe messaging
- Explore proposals and coordination features
- Understand the tribe experience

**Key features**:
- Demo tribes appear automatically for new users
- They include synthetic members (not real people)
- They auto-delete when you create your first real tribe
- Purple "Preview Mode" banner shows they're demos

---

## Testing Tribes Features

### 1. View Tribes
- **Location**: Home screen → "My Tribes" section
- **Expected**: See 3 demo tribes with member counts
- **Test**: Tap any tribe to open tribe inbox

### 2. Tribe Messaging
- **Location**: Tap tribe → opens inbox
- **Expected**: See synthetic messages from demo members
- **Test**: Send a message and see it appear

### 3. Create Your First Real Tribe
- **Location**: Menu → Tribes button OR go to `/tribe/settings`
- **Action**: Click "Create New Tribe" button
- **Enter**: Tribe name (e.g., "Book Club")
- **Result**: Demo tribes automatically disappear, your real tribe appears

### 4. Invite Members
- **Location**: Tribe settings page
- **Coming soon**: Contact invitations by email/phone
- **Current**: Members are added via backend (alpha limitation)

### 5. Proposals & Coordination
- **Location**: Tribe inbox → pending proposals
- **Test**: Accept/reject proposals from synthetic members
- **Expected**: Proposals move items to your personal lists

---

## Troubleshooting

### Problem: Tribes Not Showing

**Solution 1: Sign Out and Back In**
1. Menu → Logout
2. Sign in with Apple again
3. Check home screen

**Solution 2: Reinstall App**
1. Delete HelpEm app
2. Reinstall from TestFlight/Xcode
3. Sign in with Apple
4. Check home screen

**Solution 3: Test in Browser**
1. Open https://app.helpem.ai/app in Safari
2. Sign in with Apple
3. Scroll to "My Tribes"
4. If tribes show here but not in app → reinstall app

---

### Problem: "Invalid Session Token" Error

**Cause**: Stale authentication token

**Solution**: Sign out and back in (see above)

**Why**: During development, the JWT secret was updated. Your cached token needs refreshing.

---

### Problem: Demo Tribes Won't Go Away

**Solution**: Create a real tribe
1. Go to tribe settings
2. Click "Create New Tribe"
3. Enter a name
4. Submit
5. Demo tribes auto-delete

**Alternative**: Manual cleanup via API
```bash
# Contact developer for manual cleanup if needed
```

---

### Problem: Can't See Messages

**Check**:
1. Are you signed in?
2. Is tribe inbox open (tap tribe card)?
3. Try refreshing (pull down)

**Known Issue**: Messages poll every 3 seconds. Wait a moment for updates.

---

## Known Limitations (Alpha)

1. **No contact invitations yet**: Members must be added via backend
2. **No push notifications**: Message alerts coming soon
3. **Demo users only**: Real invitations in next version
4. **Basic permissions**: Advanced permission controls coming
5. **No file sharing**: Text-only for alpha

---

## Testing Checklist for Alpha Users

- [ ] Sign in with Apple successfully
- [ ] See 3 demo tribes on home screen
- [ ] Tap tribe and see inbox
- [ ] View demo messages from synthetic members
- [ ] Send a message in tribe inbox
- [ ] See pending proposals (if any)
- [ ] Accept/reject a proposal
- [ ] Create your first real tribe
- [ ] Verify demo tribes disappear
- [ ] Verify real tribe persists
- [ ] Log out and back in
- [ ] Verify tribes still load correctly

---

## Feedback

**What to Test**:
- Does the tribe UX make sense?
- Are demo tribes helpful or confusing?
- Is the auto-cleanup intuitive?
- Do you understand proposals vs. direct additions?
- Is the messaging interface clear?

**How to Report Issues**:
- Use in-app feedback button
- Note: specific steps to reproduce
- Include: tribe name, error messages, screenshots

---

## Technical Details (for developers)

### Architecture
- **Backend**: Railway (https://api-production-2989.up.railway.app)
- **Frontend**: Vercel (https://app.helpem.ai)
- **Database**: PostgreSQL on Railway
- **Auth**: Apple Sign In + JWT session tokens (30-day expiry)

### API Endpoints
- `GET /api/tribes` - List user's tribes
- `POST /api/tribes` - Create tribe
- `GET /api/tribes/:id/messages` - Get messages
- `POST /api/tribes/:id/messages` - Send message

### Demo Tribe Logic
- **Auto-seed**: Triggered when user has 0 tribes
- **Auto-cleanup**: Triggered when first real tribe created
- **Synthetic users**: `demo-<name>-<role>-001` pattern

### Session Token
- **Stored**: iOS Keychain
- **Injected**: WebView via JavaScript
- **Expiry**: 30 days
- **Refresh**: Sign out and back in

---

## FAQ

**Q: Are demo tribes real people?**  
A: No, they're synthetic users for preview purposes.

**Q: Will my demo tribe data be saved?**  
A: No, demo tribes auto-delete when you create a real tribe.

**Q: Can I keep demo tribes?**  
A: No, they're designed to disappear for a clean experience.

**Q: How do I invite real people?**  
A: Coming in next alpha version - contact invitations by email/phone.

**Q: What happens if I delete a tribe?**  
A: Owner can soft-delete tribes. Members can leave tribes.

**Q: Are messages private?**  
A: Yes, only tribe members can see messages.

**Q: Can I edit messages?**  
A: Yes, tap and hold your message to edit or delete.

---

## Next Steps After Alpha

- Real contact invitations
- Push notifications for messages
- Advanced permissions
- File sharing
- Calendar integration
- Proposal templates

---

**Ready to Test**: All systems deployed and functional  
**Estimated Test Time**: 15-20 minutes  
**Support**: Use in-app feedback or contact developer

---

**Last Updated**: January 23, 2026, 4:00 PM EST
