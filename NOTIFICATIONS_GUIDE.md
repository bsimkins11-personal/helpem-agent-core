# Notifications Guide

Complete guide for local and remote push notifications in HelpEm.

---

## ✅ Local Notifications (Working Now!)

**Already implemented!** Works immediately without Apple Developer approval.

### What You Can Do Right Now

1. **Build and run** the app in Xcode
2. **Tap "Skip for Testing"** to sign in
3. **Tap the blue floating button** → Database Test view
4. **Tap "Test Notification"** button
5. **Wait 5 seconds** → You'll get a notification!

### Uses for Local Notifications

- **Task reminders** - "Your meeting starts in 15 minutes"
- **Habit check-ins** - Daily reminder at 8am to log habits
- **Appointment alerts** - 1 hour before appointments
- **Daily summaries** - "You completed 5 tasks today!"
- **Streak reminders** - "Keep your 7-day streak going!"

### How to Use in Your App

```swift
// Schedule a reminder
await NotificationManager.shared.scheduleNotification(
    id: "task-123",
    title: "Task Due Soon",
    body: "Call dentist - due in 1 hour",
    timeInterval: 3600 // 1 hour
)

// Daily habit reminder at 8am
await NotificationManager.shared.scheduleRepeatingNotification(
    id: "daily-habits",
    title: "Morning Check-in",
    body: "Time to log your habits!",
    hour: 8,
    minute: 0
)

// Cancel when task is completed
NotificationManager.shared.cancelNotification(id: "task-123")
```

---

## 🔔 Push Notifications (After Apple Approval)

**Requires:** Apple Developer Program membership ($99/year)

### When You Need Push Notifications

Use push notifications when:
- Backend needs to alert users (new messages, updates)
- Real-time events (appointment cancelled by other party)
- Server-triggered reminders
- Broadcasting to all users (maintenance notice)

**Don't need push for:**
- User's own reminders (use local notifications)
- Scheduled tasks (use local notifications)
- App-initiated alerts (use local notifications)

### Setup Steps (After Apple Approval)

#### 1. Generate APNs Key in Apple Developer Portal

1. Go to https://developer.apple.com/account
2. Certificates, Identifiers & Profiles → **Keys**
3. Click **+** to create new key
4. Name: `HelpEm Push Notifications`
5. Check **Apple Push Notifications service (APNs)**
6. Click **Continue** → **Register**
7. **Download the .p8 file** (save it securely!)
8. **Note the Key ID** (e.g., `AB12CD34EF`)
9. **Note your Team ID** (in Account → Membership)

#### 2. Enable Push Notifications in Xcode

1. Open Xcode project
2. Select **HelpEmApp target**
3. **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Push Notifications**

#### 3. Update Entitlements

The entitlements file will be updated automatically, should show:

```xml
<key>aps-environment</key>
<string>development</string>
```

(Changes to `production` when you archive for TestFlight)

#### 4. Add Backend Push Notification Service

You'll need to add push notification capability to your Railway backend.

**Option A: Use a service (Easiest)**
- **OneSignal** (Free tier, easiest to set up)
- **Firebase Cloud Messaging** (Free, by Google)
- **Expo Push** (Free)

**Option B: Implement yourself (More control)**
- Use APNs HTTP/2 API directly
- Store device tokens in your database
- Send notifications from backend

---

## Recommended: OneSignal Setup

OneSignal is free and works great for your use case.

### 1. Create OneSignal Account

1. Go to https://onesignal.com
2. Sign up (free)
3. Create new app: "HelpEm"
4. Select **Apple iOS**

### 2. Upload APNs Key to OneSignal

1. In OneSignal dashboard → Settings → Platforms
2. Click **Configure** for iOS
3. Upload your .p8 file from Apple Developer
4. Enter **Key ID** and **Team ID**
5. Click **Save**

### 3. Add OneSignal SDK to iOS

```bash
# In your iOS project directory
cd ios

# Add OneSignal via Swift Package Manager in Xcode:
# File → Add Package Dependencies
# Enter: https://github.com/OneSignal/OneSignal-iOS-SDK
# Version: 5.0.0 or later
```

### 4. Initialize OneSignal in iOS

Update `HelpEmAppApp.swift`:

```swift
import OneSignalFramework

@main
struct HelpEmAppApp: App {
    
    init() {
        // Initialize OneSignal
        OneSignal.initialize("YOUR_ONESIGNAL_APP_ID", withLaunchOptions: nil)
        
        // Request permission
        OneSignal.Notifications.requestPermission({ accepted in
            print("User accepted notifications: \(accepted)")
        })
    }
    
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
```

### 5. Associate Users with Device Tokens

After user signs in, link their user ID:

```swift
// In AuthManager after successful auth
OneSignal.login(userId)
```

### 6. Send Notifications from Backend

```javascript
// In your Railway backend
import fetch from 'node-fetch';

async function sendPushNotification(userId, title, message) {
    await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify({
            app_id: process.env.ONESIGNAL_APP_ID,
            include_external_user_ids: [userId],
            headings: { en: title },
            contents: { en: message },
            data: {
                type: 'reminder',
                taskId: '123'
            }
        })
    });
}

// Use it
await sendPushNotification(
    'user-123',
    'Task Reminder',
    'Your meeting starts in 15 minutes'
);
```

---

## Testing Notifications

### Test Local Notifications

1. **In Database Test view** → Tap "Test Notification"
2. **Close the app** (swipe up to background)
3. **Wait 5 seconds** → Notification should appear!
4. **Tap the notification** → App reopens

### Test Push Notifications (After Setup)

1. **Send test from OneSignal dashboard**
   - Go to Messages → New Push
   - Select your device
   - Send test message

2. **Test from backend**
   ```bash
   # In Railway
   railway run node test-push-notification.js
   ```

3. **Test with curl**
   ```bash
   curl -X POST https://your-api.railway.app/api/test-push \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"userId": "test-123", "message": "Test notification"}'
   ```

---

## Best Practices

### 1. Request Permission at the Right Time

**Don't:** Request on app launch (too aggressive)

**Do:** Request when user creates first task/reminder
```swift
// When user creates their first task
if NotificationManager.shared.authorizationStatus == .notDetermined {
    let granted = await NotificationManager.shared.requestAuthorization()
    if granted {
        // Schedule reminder for this task
    }
}
```

### 2. Respect User Preferences

```swift
// Check if notifications are enabled before scheduling
if NotificationManager.shared.authorizationStatus == .authorized {
    await scheduleReminder()
} else {
    // Show UI hint: "Enable notifications to get reminders"
}
```

### 3. Clear Badge Counts

```swift
// When user opens app
NotificationManager.shared.clearBadge()

// When user views the relevant content
NotificationManager.shared.clearBadge()
```

### 4. Don't Over-Notify

- **Max 3-5 notifications per day** for most users
- **Let users customize** notification times
- **Provide quiet hours** (e.g., 10pm-7am)
- **Bundle related notifications** when possible

---

## Notification Types for HelpEm

### Task Reminders
```swift
// 1 hour before task due time
await NotificationManager.shared.scheduleNotification(
    id: "task-\(taskId)",
    title: "Task Due Soon",
    body: task.title,
    date: task.dueDate.addingTimeInterval(-3600),
    userInfo: ["type": "task", "taskId": taskId]
)
```

### Daily Habit Check-in
```swift
// Every morning at 8am
await NotificationManager.shared.scheduleRepeatingNotification(
    id: "daily-habits",
    title: "Good Morning!",
    body: "Ready to log today's habits?",
    hour: 8,
    minute: 0
)
```

### Appointment Reminders
```swift
// Multiple reminders
let reminders = [
    (24 * 3600, "1 day before"),
    (3600, "1 hour before"),
    (900, "15 minutes before")
]

for (interval, label) in reminders {
    await NotificationManager.shared.scheduleNotification(
        id: "appt-\(appointment.id)-\(interval)",
        title: "Appointment \(label)",
        body: appointment.title,
        date: appointment.date.addingTimeInterval(-interval)
    )
}
```

### Streak Reminders
```swift
// Evening reminder if user hasn't logged today
if !user.loggedToday && currentHour > 19 {
    await NotificationManager.shared.scheduleNotification(
        id: "streak-reminder",
        title: "Keep Your Streak!",
        body: "Log today's activities to maintain your \(user.streakDays)-day streak",
        timeInterval: 3600 // 1 hour
    )
}
```

---

## Cost Comparison

### Local Notifications
- **Cost:** FREE
- **Limitations:** Can't send from server, max 64 pending
- **Best for:** User's own reminders and schedules

### Push Notifications via OneSignal
- **Free tier:** Up to 10,000 subscribers
- **Paid:** $9/month for unlimited
- **Best for:** Server-triggered notifications

### Push Notifications via Firebase
- **Cost:** FREE (unlimited)
- **Complexity:** Slightly more setup
- **Best for:** Large scale apps

---

## Current Implementation Status

✅ **Local Notifications**
- Permission request
- Schedule by time interval
- Schedule by date
- Repeating notifications
- Cancel notifications
- Handle notification taps
- Test button in app

⏳ **Push Notifications** (After Apple Developer approval)
- Need to generate APNs key
- Need to add push capability
- Need to integrate OneSignal or Firebase
- Need backend push endpoint

---

## Next Steps

### Right Now (With Free Account)
1. ✅ Test local notifications (already working!)
2. ✅ Build notification scheduling into your app features
3. ✅ Test on your physical device

### After Apple Developer Approval
1. Generate APNs authentication key
2. Enable push notifications capability
3. Set up OneSignal (30 minutes)
4. Add backend push endpoints
5. Test push notifications

---

## Questions?

**Q: Can I test notifications in simulator?**
A: Local notifications yes, push notifications require physical device.

**Q: Do I need push notifications for my MVP?**
A: No! Local notifications handle 90% of use cases for personal productivity apps.

**Q: When should I add push notifications?**
A: When you need server-triggered alerts or real-time features. For scheduled reminders, local notifications are better.

**Q: Can users disable notifications?**
A: Yes, always. They control it in iOS Settings → HelpEm → Notifications.

---

**Ready to test? Build the app and try the "Test Notification" button!**
