# Tribe Unread Messages - Complete Implementation

## How It Works

### 1. In-App Badges (Real-Time)

**Tribe List View (Homescreen):**
```
┌─────────────────────────────────┐
│ Tribes                      [+] │
├─────────────────────────────────┤
│ 🏠 Family Planning      [5] >   │
│    5 unread messages            │
├─────────────────────────────────┤
│ 💼 Work Team            [3] >   │
│    3 unread messages            │
├─────────────────────────────────┤
│ 📚 Book Club                >   │
│    No unread messages           │
└─────────────────────────────────┘
```

**State Changes:**
1. User opens tribe list → Badges show unread counts
2. User taps "Family Planning" → Opens messages
3. Messages view loads → **Marks tribe as read**
4. User goes back to tribe list → Badge on "Family Planning" is GONE
5. "Work Team" still shows [3] badge (not opened yet)
6. User taps "Work Team" → Opens messages → Badge clears
7. All tribes opened → No badges anywhere

### 2. Daily Push Notification (9am)

**Logic:**
```javascript
// Cron runs at 9am daily
const usersWithUnread = await get_users_with_unread_messages();

if (usersWithUnread.length === 0) {
  console.log('✅ No unread messages - no notifications sent');
  return; // EXIT - No push notifications sent
}

// Only users with at least 1 unread message get notification
for (const user of usersWithUnread) {
  await sendPushNotification(user);
}
```

**When Notification Fires:**
✅ User has unread in 1+ tribes → **Notification sent**
❌ User has 0 unread in all tribes → **NO notification**
❌ User opened all tribe messages → **NO notification**

**Notification Examples:**

*Single tribe with unread:*
```
📬 5 unread messages in Family Planning
Tap to catch up with your tribe
```

*Multiple tribes with unread:*
```
📬 8 unread messages across 2 tribes
Family Planning (5), Work Team (3)
```

*All tribes read (0 unread):*
```
(No notification sent at all)
```

---

## Complete User Flow

### Scenario 1: Active User (Opens All Tribes Daily)

**Day 1 - 8am:**
- Family Planning: 5 new messages
- Work Team: 3 new messages
- Tribe list shows badges [5] and [3]

**Day 1 - 8:30am:**
- User opens app
- Sees badges on tribe list
- Opens Family Planning → Messages load → **Marked as read** → Badge clears
- Opens Work Team → Messages load → **Marked as read** → Badge clears
- All tribes read, no badges

**Day 2 - 9am:**
- Cron job runs
- Checks for unread messages → **NONE found**
- **NO push notification sent** ✅

---

### Scenario 2: Inactive User (Doesn't Open App)

**Day 1 - 8am:**
- Family Planning: 5 new messages
- Work Team: 3 new messages
- User doesn't open app

**Day 2 - 9am:**
- Cron job runs
- Checks for unread messages → **8 found (5 + 3)**
- **Push notification sent**: "8 unread messages across 2 tribes"
- User's phone: 🔔 Notification appears

**Day 2 - 10am:**
- User opens app from notification
- Sees badges: Family Planning [5], Work Team [3]
- Opens Family Planning → Badge clears
- Doesn't open Work Team (still busy)

**Day 3 - 9am:**
- Cron job runs
- Checks for unread messages → **3 found (Work Team only)**
- **Push notification sent**: "3 unread messages in Work Team"
- User's phone: 🔔 Notification appears

**Day 3 - 2pm:**
- User opens app
- Sees badge: Work Team [3]
- Opens Work Team → Badge clears
- All tribes read

**Day 4 - 9am:**
- Cron job runs
- Checks for unread messages → **NONE found**
- **NO push notification sent** ✅

---

### Scenario 3: Selective Reader (Opens Some, Not All)

**Day 1:**
- User in 3 tribes: A, B, C
- A: 2 unread, B: 5 unread, C: 1 unread
- User opens A and B (reads those)
- C remains unopened

**Day 2 - 9am:**
- Cron job runs
- Checks for unread: **1 found (C only)**
- **Push notification sent**: "1 unread message in Book Club"

**Day 2 - User opens C:**
- Badge clears

**Day 3 - 9am:**
- Cron job runs
- Checks for unread: **NONE**
- **NO push notification sent** ✅

---

## Backend Logic (Crystal Clear)

### Cron Job Query

```javascript
// backend/scripts/send-daily-tribe-notifications.js

async function sendDailyTribeNotifications() {
  // Get ALL users with ANY unread messages
  const result = await query(`
    SELECT * FROM get_users_with_unread_messages()
  `);
  
  console.log(`Found ${result.rows.length} users with unread messages`);
  
  // If NO users have unread messages → EXIT (no notifications)
  if (result.rows.length === 0) {
    console.log('✅ No unread messages across any tribes - no notifications sent');
    return; // EXITS HERE - No push notifications sent
  }
  
  // Only if there ARE unread messages → send notifications
  for (const user of users) {
    await sendPushNotification(user);
  }
}
```

### Database Function

```sql
CREATE OR REPLACE FUNCTION get_users_with_unread_messages()
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM tribe_members tm
  LEFT JOIN tribe_messages tmsg ON 
    tmsg.tribe_id = tm.tribe_id
    AND tmsg.created_at > tm.last_read_messages_at  -- Only NEW messages
    AND tmsg.deleted_at IS NULL
    AND tmsg.user_id != tm.user_id  -- Exclude own messages
  WHERE tm.daily_unread_notif = TRUE  -- User wants notifications
  GROUP BY tm.user_id, tm.tribe_id
  HAVING COUNT(tmsg.id) > 0;  -- ONLY users with at least 1 unread
END;
$$ LANGUAGE plpgsql;
```

**Key Line:** `HAVING COUNT(tmsg.id) > 0`
- Only returns users who have **at least 1 unread message**
- If count = 0 → User NOT included in results
- If no users returned → No notifications sent

---

## Summary

### ✅ In-App Experience
1. Tribe list shows badges for each tribe with unread
2. Opening tribe messages → Marks that tribe as read
3. Badge disappears immediately
4. Real-time feedback, no delays

### ✅ Daily Push Notification
- **Runs:** 9am daily (cron job)
- **Checks:** All users for ANY unread messages
- **Sends:** ONLY if user has 1+ unread messages
- **Doesn't send:** If all tribes have been read (0 unread)

### ✅ Complete Logic

```
Daily at 9am:
├─ Query: Users with unread messages?
│  
├─ Result: 0 users
│  └─> EXIT (no push notifications sent) ✅
│
├─ Result: 15 users  
│  └─> Send 15 push notifications ✅
│     ├─ User A: "5 unread in Family Planning"
│     ├─ User B: "12 unread across 3 tribes"
│     └─ User C: "2 unread in Work Team"
```

### ✅ User Control
- Toggle daily notifications per tribe (settings)
- Badges always shown (can't be disabled)
- Opening tribe always marks as read

---

## Files

All implementation files are ready:
- ✅ Migration: `migrations/009_tribe_message_read_tracking.sql`
- ✅ Cron job: `backend/scripts/send-daily-tribe-notifications.js`
- ✅ API routes: `backend/src/routes/tribe-notifications.js`
- ✅ iOS manager: `ios/tribe-implementation/TribeNotificationManager.swift`
- ✅ iOS badges: `ios/tribe-implementation/TribeUnreadBadgeView.swift`
- ✅ iOS list: `ios/tribe-implementation/TribeListWithUnreadBadges.swift`

---

## Testing Checklist

- [ ] User A sends message in tribe
- [ ] User B sees badge on tribe list
- [ ] User B opens tribe → Badge clears
- [ ] User B closes app (doesn't read other tribes)
- [ ] Next day 9am → User B gets push notification
- [ ] User B opens all tribes → All badges clear
- [ ] Next day 9am → User B gets NO notification ✅

**Key Test:** If no unread messages exist, cron job exits without sending ANY notifications.

Ready to deploy! 🔔
