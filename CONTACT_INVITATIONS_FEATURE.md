# Contact Invitations for Tribes

## Overview

This feature allows users to invite contacts from their phone to join a tribe, even if they're not yet HelpEm users. When the contact later signs up for HelpEm, they automatically become a member of the tribe.

## User Flow

### Inviting a Contact

1. User opens tribe settings and taps "Add Member"
2. App requests Contacts permission (only when user initiates invite)
3. User selects a contact from their phone
4. Contact's email or phone is sent to backend
5. Backend creates a pending invitation
6. Invitation expires after 30 days if not accepted

### Contact Signs Up

1. Contact downloads HelpEm and signs up with Apple
2. Backend checks for pending invitations matching their email/phone
3. If found, automatically creates TribeMember record
4. User sees new member in tribe

## Architecture

### Database

**New Table: `pending_tribe_invitations`**
- Stores invitations to non-members
- Indexed by contact identifier for fast lookup on signup
- Auto-expires after 30 days
- Tracks permissions for when member joins

### Backend API

**New Endpoint: `POST /tribes/:tribeId/invite-contact`**

Request:
```json
{
  "contactIdentifier": "user@example.com",
  "contactType": "email",
  "contactName": "John Doe",
  "permissions": {
    "canAddTasks": true,
    "canRemoveTasks": false,
    ...
  }
}
```

Response:
```json
{
  "success": true,
  "invitation": {
    "id": "...",
    "tribeId": "...",
    "contactIdentifier": "user@example.com",
    "state": "pending",
    "expiresAt": "2026-02-22T...",
    ...
  },
  "message": "Invitation sent. They will be added to the tribe when they sign up."
}
```

**Updated: `POST /auth/apple`**
- Checks for pending invitations on new user signup
- Auto-accepts matching invitations
- Creates TribeMember records

### iOS Implementation

**Enhanced Components:**
- `ContactsPickerView`: Requests permission and displays contacts
- `InviteMemberView`: Uses new invite-contact endpoint
- `TribeRepository`: New `inviteContact()` method
- `TribeAPIClient`: New API integration

**Privacy:**
- Contacts permission only requested when user initiates invite
- No background syncing
- No uploading of contact lists
- Only selected contact's email/phone sent to server

## Security & Privacy

### Contacts Access
- Permission requested only when user taps "Add Member"
- No background access
- No contact list uploads
- One contact sent per invitation

### Data Storage
- Only stores: email/phone, display name, tribe permissions
- Invitations auto-expire after 30 days
- No PII stored beyond what's necessary for matching

### Spam Prevention
- Unique constraint prevents duplicate invitations
- Rate limiting on invitation endpoint
- Only tribe members can invite

## Testing

### Manual Testing

1. **Invite Non-Member**
   ```bash
   # As tribe owner, select contact from phone
   # Verify invitation created in database
   psql $DATABASE_URL -c "SELECT * FROM pending_tribe_invitations;"
   ```

2. **Check Auto-Accept**
   ```bash
   # Have invited contact sign up
   # Verify they're automatically added to tribe
   ```

3. **Expiration**
   ```bash
   # Set invitation to expired state
   # Verify it's not auto-accepted
   ```

### API Testing

```bash
# Test invite-contact endpoint
curl -X POST https://api.helpem.ai/tribes/{tribeId}/invite-contact \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "contactIdentifier": "test@example.com",
    "contactType": "email",
    "contactName": "Test User",
    "permissions": {
      "canAddTasks": true,
      "canRemoveTasks": false
    }
  }'
```

## Future Enhancements

### Phase 2: Email/Phone on User Model
Currently, HelpEm only stores `appleUserId`. To enable better matching:
1. Add optional `email` and `phone` fields to User model
2. Populate from Sign in with Apple (when available)
3. Match pending invitations against these fields
4. Send actual invitation emails/SMS

### Phase 3: Invitation Notifications
- Send email/SMS to invited contact
- Include deep link to download HelpEm
- Show tribe name and inviter name

### Phase 4: Invitation Management
- View pending invitations in tribe settings
- Cancel pending invitations
- Resend expired invitations
- See who has pending invitations

## Migration

Run the migration:
```bash
./run-pending-invitations-migration.sh
```

Or manually:
```bash
psql $DATABASE_URL < migrations/007_pending_tribe_invitations.sql
```

## Files Changed

### Backend
- `migrations/007_pending_tribe_invitations.sql` (new)
- `backend/prisma/schema.prisma` (added PendingTribeInvitation model)
- `backend/src/routes/tribe.js` (added invite-contact endpoint)
- `backend/index.js` (added auto-accept logic to auth endpoint)

### iOS
- `ios/HelpEmApp/Models/TribeModels.swift` (added PendingTribeInvitation model)
- `ios/HelpEmApp/Services/TribeAPIClient.swift` (added inviteContact method)
- `ios/HelpEmApp/Architecture/Repositories/TribeRepository.swift` (added inviteContact)
- `ios/HelpEmApp/Views/Tribe/TribeSettingsView.swift` (updated invite flow)
- `ios/HelpEmApp/Views/Tribe/ContactsPickerView.swift` (already existed)

## Success Metrics

- % of tribe invitations that are contacts vs existing users
- Time-to-accept for pending invitations
- Invitation expiration rate
- Contacts permission grant rate
- User feedback on invitation flow

## Support

For issues or questions:
- Check logs for "pending tribe invitations" errors
- Verify DATABASE_URL is set correctly
- Ensure migration has been applied
- Test with test accounts before production
