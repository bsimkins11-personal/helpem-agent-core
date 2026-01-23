# Tribe Message Unread Badges

## Overview

Shows unread message counts on the tribe list (homescreen). When users open a tribe's messages, the unread count clears. Simple, immediate feedback with no push notifications needed.

---

## Features

### ✅ Unread Badges on Tribe List
- Red badge shows unread count next to each tribe
- "5 unread messages" text below tribe name
- Visible immediately from homescreen
- Updates in real-time

### ✅ Smart Read Tracking
- Tracks when user last opened each tribe's messages
- Only counts messages from other members (not self)
- Persists across app restarts
- Auto-marks as read when viewing tribe messages

### ✅ Clear State Management
- Opening tribe list → See which tribes have unread
- Expanding tribe messages → Marks that tribe as read
- Badge disappears immediately
- When all tribes opened → No unread badges anywhere

### ✅ No Push Notifications Needed
- All feedback is in-app
- Users check when convenient
- No interruptions
- Badge is enough signal

---

## Database Schema

### New Columns on `tribe_members`

```sql
-- When user last viewed messages
last_read_messages_at TIMESTAMP DEFAULT NOW()

-- Daily notification preference
daily_unread_notif BOOLEAN DEFAULT TRUE
```

### New Functions

**`get_unread_message_count(user_id, tribe_id)`**
- Returns count of unread messages for user in tribe
- Excludes own messages
- Only counts since last_read_messages_at

**`get_users_with_unread_messages()`**
- Returns all users who have unread messages
- Only includes users with daily_unread_notif = true
- Groups by tribe for efficient notification sending

**`mark_tribe_messages_read(user_id, tribe_id)`**
- Updates last_read_messages_at to NOW()
- Called when user views tribe messages

---

## Backend Implementation

### Cron Job

**File:** `backend/scripts/send-daily-tribe-notifications.js`

**Schedule:** 0 9 * * * (9am daily)

**Logic:**
1. Query `get_users_with_unread_messages()`
2. Group by user (they may have multiple tribes)
3. Create notification message:
   - Single tribe: "5 unread messages in Family Planning"
   - Multiple tribes: "12 unread messages across 3 tribes"
4. Send push notification
5. Log summary

### API Endpoints

**`GET /tribes/:tribeId/unread-count`**
- Returns unread count for specific tribe
- Used by iOS to show badges

**`POST /tribes/:tribeId/mark-read`**
- Marks all messages as read
- Called when user views tribe

**`GET /tribes/unread-summary`**
- Returns unread counts for all user's tribes
- Used for app badge and tribe list

**`PATCH /tribes/:tribeId/notification-preferences`**
- Update daily notification preference
- Per-tribe control

---

## iOS Implementation

### TribeNotificationManager

**Singleton class managing:**
- Unread counts per tribe
- Total unread count
- Badge updates
- Push notification handling
- Preference updates

**Key Methods:**
- `fetchUnreadSummary()` - Get all unread counts
- `fetchUnreadCount(tribeId)` - Get count for one tribe
- `markAsRead(tribeId)` - Mark tribe as read
- `updateDailyNotificationPreference(tribeId, enabled)` - Toggle notifications

### UI Components

**TribeUnreadBadge**
- Red capsule badge with count
- Shows on tribe list and nav bar

**TribeListRowWithBadge**
- Tribe list item with unread indicator
- Shows "5 unread messages" text

**TribeDetailViewWithBadge**
- Shows badge in navigation
- Auto-marks as read on view
- Updates badge in real-time

**TribeNotificationSettingsRow**
- Toggle for daily notifications
- Shows in tribe settings
- Per-tribe control

---

## User Experience

### First Time
1. User receives tribe message while away
2. Next day at 9am, receives notification
3. Taps notification → Opens app → Badge shows count
4. Views tribe → Badge clears → Marked as read

### Notification Messages

**Single Tribe:**
```
📬 5 unread messages in Family Planning
Tap to catch up with your tribe
```

**Multiple Tribes:**
```
📬 12 unread messages across 3 tribes
Family Planning (5), Work Team (4), Book Club (3)
```

### Badge Behavior

**Tribe List:**
```
┌─────────────────────────────────┐
│ 🏠 Family Planning      [5] >   │
│    5 unread messages            │
├─────────────────────────────────┤
│ 💼 Work Team            [4] >   │
│    4 unread messages            │
├─────────────────────────────────┤
│ 📚 Book Club                >   │
│    No unread messages           │
└─────────────────────────────────┘
```

**App Icon:**
- Red badge with total count (e.g., "9")
- Updates when fetching unread summary
- Clears when all marked as read

---

## Settings Integration

### Tribe Settings Screen

Add section:

```
┌─────────────────────────────────┐
│ NOTIFICATIONS                   │
├─────────────────────────────────┤
│ ☑ Proposal Notifications        │
│ ☐ Digest Notifications          │
│ ☑ Daily Unread Digest          │
│                                 │
│ Get a daily notification if     │
│ there are unread messages in    │
│ this tribe                      │
└─────────────────────────────────┘
```

---

## Notification Payload

### Push Notification Data

```json
{
  "notification": {
    "title": "5 unread messages in Family Planning",
    "body": "Tap to catch up with your tribe"
  },
  "data": {
    "type": "tribe_messages_unread",
    "tribes": "[
      {
        \"tribeId\": \"abc-123\",
        \"tribeName\": \"Family Planning\",
        \"unreadCount\": 5
      }
    ]"
  }
}
```

### Handling in iOS

```swift
func handleNotification(_ userInfo: [AnyHashable: Any]) {
    guard let type = userInfo["type"] as? String,
          type == "tribe_messages_unread" else {
        return
    }
    
    // Refresh unread counts
    Task {
        await fetchUnreadSummary()
    }
}
```

---

## Migration

### Run Migration

```bash
psql $DATABASE_URL < migrations/009_tribe_message_read_tracking.sql
```

### Set Up Cron Job (Railway)

1. Go to Railway dashboard
2. Add scheduled task:
   - **Name:** Daily Tribe Notifications
   - **Cron:** `0 9 * * *` (9am daily)
   - **Command:** `node backend/scripts/send-daily-tribe-notifications.js`

### Configure Push Notifications

**Option 1: Firebase Cloud Messaging (Recommended)**

```bash
npm install firebase-admin
```

```javascript
// In send-daily-tribe-notifications.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

async function sendPushNotification(userId, title, body, data) {
  const token = await getUserPushToken(userId); // Fetch from DB
  
  const message = {
    notification: { title, body },
    data,
    token,
  };
  
  await admin.messaging().send(message);
}
```

**Option 2: Apple Push Notification Service (APNS)**

```bash
npm install apn
```

```javascript
const apn = require('apn');

const apnProvider = new apn.Provider({
  token: {
    key: process.env.APNS_KEY,
    keyId: process.env.APNS_KEY_ID,
    teamId: process.env.APNS_TEAM_ID,
  },
  production: true,
});
```

---

## Testing

### Manual Testing

**1. Create Test Scenario**
```sql
-- Create test tribe with messages
INSERT INTO tribe_messages (tribe_id, user_id, message)
VALUES ('test-tribe-id', 'other-user-id', 'Test message');

-- Set last_read_at to yesterday
UPDATE tribe_members
SET last_read_messages_at = NOW() - INTERVAL '1 day'
WHERE user_id = 'your-user-id'
  AND tribe_id = 'test-tribe-id';
```

**2. Test Unread Count**
```bash
curl https://api.helpem.ai/tribes/test-tribe-id/unread-count \
  -H "Authorization: Bearer {token}"

# Expected: { "unreadCount": 1 }
```

**3. Test Mark as Read**
```bash
curl -X POST https://api.helpem.ai/tribes/test-tribe-id/mark-read \
  -H "Authorization: Bearer {token}"

# Expected: { "success": true }
```

**4. Run Cron Job**
```bash
node backend/scripts/send-daily-tribe-notifications.js

# Should output notification details
```

### iOS Testing

**1. Badge Updates**
- Open app → See badge on tribe with unread
- Tap tribe → Badge should clear
- Navigate away → Check tribe list (no badge)

**2. Push Notifications**
- Close app
- Send test notification via Firebase Console
- Should receive push
- Tap push → Opens app with updated badges

**3. Preferences**
- Go to tribe settings
- Toggle "Daily Unread Digest" off
- Next day → Should NOT receive notification for that tribe
- Toggle back on → Should receive notifications again

---

## Analytics

### Track These Events

```javascript
analytics.track('tribe_message_notification_sent', {
  userId,
  tribeCount: tribes.length,
  totalUnread: unreadCount,
});

analytics.track('tribe_message_notification_opened', {
  userId,
  tribeId,
});

analytics.track('tribe_messages_marked_read', {
  userId,
  tribeId,
  unreadCount,
});

analytics.track('daily_digest_preference_changed', {
  userId,
  tribeId,
  enabled,
});
```

### Key Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Daily notification open rate | 40-60% | How many tap the notification |
| Time to open after notification | <30 min | How quickly they engage |
| Preference opt-out rate | <20% | How many disable per tribe |
| Badge clear rate | 80%+ | % who view and clear badges |

---

## Cost Considerations

### Push Notification Costs

**Firebase Cloud Messaging:** FREE
- Unlimited messages
- No cost per notification
- Recommended for iOS + Android

**Apple APNS:** FREE
- Direct to Apple
- No third-party fees
- iOS only

### Database Impact

- ~1-2ms per unread count query
- ~1000 users = 1-2 seconds total query time
- Negligible storage (~8 bytes per member)

---

## Future Enhancements

### Phase 2: Smart Scheduling
- Send at user's preferred time
- Detect timezone from device
- Skip notifications on weekends (optional)

### Phase 3: Digest Content
- Include message previews
- Show who sent messages
- Quick reply from notification

### Phase 4: Priority Messages
- Mark some messages as urgent
- Immediate notification for priority
- Daily digest for regular messages

---

## Files Created

### Backend
- `migrations/009_tribe_message_read_tracking.sql`
- `backend/scripts/send-daily-tribe-notifications.js`
- `backend/src/routes/tribe-notifications.js`

### iOS
- `ios/tribe-implementation/TribeNotificationManager.swift`
- `ios/tribe-implementation/TribeUnreadBadgeView.swift`

### Documentation
- `DAILY_TRIBE_NOTIFICATIONS.md` (this file)

---

## Deployment Checklist

Backend:
- [ ] Run migration: `psql $DATABASE_URL < migrations/009_tribe_message_read_tracking.sql`
- [ ] Add notification routes: `app.use('/tribes', tribeNotificationRoutes)`
- [ ] Set up Firebase/APNS credentials
- [ ] Configure cron job in Railway (9am daily)
- [ ] Test cron job manually
- [ ] Monitor logs for first week

iOS:
- [ ] Copy notification manager to project
- [ ] Add to App initialization
- [ ] Request notification permission on first launch
- [ ] Integrate badges into tribe views
- [ ] Add settings toggle
- [ ] Test push notification handling
- [ ] Submit app update with notification entitlement

---

## Success Criteria

✅ **Functional:**
- Users receive ONE notification per day max
- Notifications only sent if unread messages exist
- Badges update in real-time
- Mark as read works correctly
- Preferences persist correctly

✅ **User Experience:**
- Non-intrusive (once daily)
- Easy to control (per-tribe toggle)
- Clear messaging (tribe name + count)
- Fast badge updates (<1 second)

✅ **Performance:**
- Cron job completes in <10 seconds
- Unread queries return in <100ms
- No battery drain from background checks
- Efficient database queries

---

## Support

### Common Issues

**"Notifications not received"**
1. Check notification permission in iOS Settings
2. Verify push token is registered in database
3. Check cron job logs
4. Verify dailyUnreadNotif = true for tribe

**"Badge not clearing"**
1. Verify mark-read API is called
2. Check last_read_messages_at timestamp
3. Ensure fetchUnreadSummary() called after mark-read

**"Wrong unread count"**
1. Check last_read_messages_at vs message created_at
2. Verify excluding own messages in query
3. Check for deleted messages (should be excluded)

### Debug Queries

```sql
-- Check user's last read timestamps
SELECT 
  t.name,
  tm.last_read_messages_at,
  COUNT(tmsg.id) as unread_count
FROM tribe_members tm
JOIN tribes t ON t.id = tm.tribe_id
LEFT JOIN tribe_messages tmsg ON 
  tmsg.tribe_id = tm.tribe_id
  AND tmsg.created_at > tm.last_read_messages_at
  AND tmsg.deleted_at IS NULL
  AND tmsg.user_id != tm.user_id
WHERE tm.user_id = 'user-id'
GROUP BY t.name, tm.last_read_messages_at;
```

---

## Conclusion

A respectful, non-intrusive daily notification system that:
- ✅ Keeps users engaged with tribes
- ✅ Doesn't spam with constant notifications
- ✅ Gives users full control
- ✅ Updates badges in real-time
- ✅ Easy to implement and maintain

**Ready to deploy!** 🔔
