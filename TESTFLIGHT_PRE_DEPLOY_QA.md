# TestFlight Pre-Deploy QA Checklist

## 🎯 Critical Tests (Must Pass Before Deploy)

### ✅ 1. Microphone Permissions (NEW FIX)
**Why:** This was the bug for norayne - must verify it's fixed

- [ ] Delete app from device
- [ ] Reinstall from Xcode
- [ ] Press mic button for first time
- [ ] **Verify:** iOS shows "helpem Would Like to Access the Microphone" → Tap OK
- [ ] **Verify:** iOS shows "helpem Would Like to Access Speech Recognition" → Tap OK
- [ ] **Verify:** Voice input works
- [ ] Close and reopen app
- [ ] Press mic button again
- [ ] **Verify:** Works immediately without permission dialog

**If this fails, DO NOT deploy to TestFlight!**

---

### ✅ 2. Voice Input Flow (Core Feature)

- [ ] Press and hold mic button
- [ ] Speak: "Add a reminder to buy milk tomorrow at 3pm"
- [ ] **Verify:** Transcription appears
- [ ] **Verify:** AI responds and creates todo
- [ ] **Verify:** Todo appears in list with correct time
- [ ] Press mic button again
- [ ] Speak: "Add an appointment for dentist on Tuesday at 2pm"
- [ ] **Verify:** Appointment created and shows in calendar

**If voice doesn't work, DO NOT deploy!**

---

### ✅ 3. Authentication Flow

- [ ] Delete app
- [ ] Reinstall
- [ ] **Verify:** Sign in screen appears with "Sign in with Apple"
- [ ] Tap "Sign in with Apple"
- [ ] **Verify:** Apple sign-in sheet appears
- [ ] Sign in
- [ ] **Verify:** App opens to main page (no re-auth prompt)
- [ ] Close app completely
- [ ] Reopen
- [ ] **Verify:** Goes directly to app (stays signed in)

**If auth fails or re-prompts, investigate before deploy!**

---

### ✅ 4. CRUD Operations (All 4 Categories)

#### Todos
- [ ] Create: "Add todo to call mom"
- [ ] **Verify:** Appears in todo list
- [ ] Update: Tap todo, change priority to High
- [ ] **Verify:** Priority changes and persists
- [ ] Delete: Swipe todo, tap delete
- [ ] **Verify:** Disappears from list
- [ ] Close app, reopen
- [ ] **Verify:** Changes persisted

#### Appointments
- [ ] Create: "Schedule lunch with Sarah on Friday at noon"
- [ ] **Verify:** Shows in calendar on Friday
- [ ] Update: Tap appointment, edit time
- [ ] **Verify:** Time updates
- [ ] Delete: Tap delete on appointment
- [ ] **Verify:** Removes from calendar
- [ ] Close app, reopen
- [ ] **Verify:** Changes persisted

#### Habits/Routines
- [ ] Create: "Add a habit to meditate daily"
- [ ] **Verify:** Appears in habits section
- [ ] Complete: Check off habit for today
- [ ] **Verify:** Checkmark shows
- [ ] Close app, reopen
- [ ] **Verify:** Habit still exists, completion persisted

#### Groceries
- [ ] Create: "Add eggs, milk, and bread to grocery list"
- [ ] **Verify:** All 3 items appear
- [ ] Complete: Check off milk
- [ ] **Verify:** Strikethrough appears
- [ ] Delete: Tap "Clear list"
- [ ] **Verify:** All items removed
- [ ] Close app, reopen
- [ ] **Verify:** Grocery list state persisted

---

### ✅ 5. Data Persistence (Critical!)

- [ ] Create 1 todo, 1 appointment, 1 habit, 2 groceries
- [ ] **Close app completely** (swipe up in app switcher)
- [ ] **Restart phone**
- [ ] Open app
- [ ] **Verify:** All data still there
- [ ] **Verify:** Dates/times correct
- [ ] **Verify:** Priorities correct

**If data doesn't persist, DO NOT deploy!**

---

## 🎨 UI/UX Tests (Important But Not Blocking)

### ✅ 6. Recent UI Changes

- [ ] **Verify:** Header is compact (20% tighter) - more screen space
- [ ] **Verify:** Greeting module is smaller (25% smaller) - more screen space
- [ ] **Verify:** Logo navigates home when tapped
- [ ] **Verify:** "Built for you." tagline shows under logo
- [ ] **Verify:** App looks clean and not cramped

---

### ✅ 7. iOS Navigation

- [ ] Tap menu button (top right)
- [ ] **Verify:** Dropdown shows: Support, Logout
- [ ] Tap Support
- [ ] **Verify:** Support modal opens
- [ ] Close modal
- [ ] Tap menu → Logout
- [ ] **Verify:** Returns to sign-in screen
- [ ] Sign back in
- [ ] Tap logo
- [ ] **Verify:** Scrolls to top / navigates home

---

### ✅ 8. Feedback System (Thumbs Up/Down)

- [ ] Create a todo via voice
- [ ] **Verify:** Thumbs up and thumbs down buttons appear after AI response
- [ ] Tap thumbs up
- [ ] **Verify:** Confirmation message: "Thanks for the feedback!"
- [ ] Create another todo
- [ ] Tap thumbs down
- [ ] **Verify:** Prompt asks: "What can I do better?"
- [ ] Type correction: "You should have asked about priority"
- [ ] **Verify:** AI retries with your feedback
- [ ] **Verify:** AI asks: "Did I get it right this time? 👍 or 👎"
- [ ] Tap thumbs up
- [ ] **Verify:** Feedback loop complete

---

### ✅ 9. Notifications (If Enabled)

- [ ] Create a reminder: "Remind me to take out trash at 8pm tonight"
- [ ] **Verify:** App asks for notification permissions (if first time)
- [ ] Grant permissions
- [ ] **Verify:** Confirmation that notification is scheduled
- [ ] Wait until 7pm (1 hour before)
- [ ] **Verify:** Notification appears on device
- [ ] Tap notification
- [ ] **Verify:** Opens app

**Note:** This is time-dependent - test with near-term times

---

## 🔍 Edge Cases (Quick Checks)

### ✅ 10. Network Issues

- [ ] Turn on Airplane Mode
- [ ] Try to create a todo
- [ ] **Verify:** Appropriate error message (not a crash)
- [ ] Turn off Airplane Mode
- [ ] Try again
- [ ] **Verify:** Works normally

---

### ✅ 11. Long Content

- [ ] Create todo with 200+ character description
- [ ] **Verify:** Doesn't break UI
- [ ] Create appointment with very long title
- [ ] **Verify:** Title truncates gracefully
- [ ] Add 20+ grocery items
- [ ] **Verify:** List scrolls properly

---

### ✅ 12. Priority Filters

- [ ] Create 3 todos: one high, one medium, one low
- [ ] Tap "High" filter
- [ ] **Verify:** Only high-priority todo shows
- [ ] Tap "All" filter
- [ ] **Verify:** All todos show
- [ ] Tap "Med" filter
- [ ] **Verify:** Only medium-priority todo shows

---

### ✅ 13. Calendar Views

- [ ] Tap Day view
- [ ] **Verify:** Shows only today's appointments
- [ ] Tap Week view
- [ ] **Verify:** Shows full week
- [ ] Tap Month view
- [ ] **Verify:** Shows full month
- [ ] Navigate to different dates
- [ ] **Verify:** Appointments filter correctly

---

### ✅ 14. Clear All Data

- [ ] Create some test data
- [ ] Tap menu → (if you added this feature)
- [ ] Tap "Clear All Data"
- [ ] Confirm
- [ ] **Verify:** All data cleared
- [ ] **Verify:** App doesn't crash
- [ ] **Verify:** Can create new data

---

## 🚨 Known Issues to Watch For

### Issues From Recent Fixes:

1. **502 Backend Error** ✅ FIXED
   - Was: Backend crashing on startup
   - Fix: Corrected database migration script
   - Test: Create/read/update/delete anything - should work

2. **500 Chat Retry Error** ✅ FIXED
   - Was: Retry after thumbs down caused 500
   - Fix: Serialize Date objects to ISO strings
   - Test: Thumbs down → retry → should work

3. **404 Delete Error** ✅ FIXED
   - Was: Deleting just-created items caused 404
   - Fix: Treat 404 as successful delete (item already gone)
   - Test: Create appointment → immediately delete → should work

4. **Habit/Routine Not Persisting** ✅ FIXED
   - Was: Habits disappeared on app restart
   - Fix: Added database persistence to addHabit
   - Test: Create habit → restart app → should still be there

---

## ⏱️ Quick 5-Minute Smoke Test

If you're short on time, run this minimal test before deploy:

1. **Delete and reinstall app**
2. **Sign in with Apple** - works?
3. **Press mic button** - permission dialogs appear?
4. **Grant permissions** - voice works?
5. **Say:** "Add a reminder to test voice at 2pm tomorrow"
6. **Verify:** Todo created
7. **Close app completely**
8. **Reopen app**
9. **Verify:** Todo still there
10. **Create appointment, habit, grocery item**
11. **Verify:** All 4 categories working
12. **Tap thumbs up on AI response**
13. **Verify:** Feedback recorded

**If ALL 13 steps pass → SAFE TO DEPLOY!** ✅

---

## 📱 TestFlight-Specific Checks

### After Uploading to TestFlight:

- [ ] Wait for processing (~10 min)
- [ ] Install on your device from TestFlight
- [ ] **Verify:** App installs and runs
- [ ] **Verify:** Sign in works
- [ ] **Verify:** Voice works
- [ ] **Verify:** Data persists
- [ ] Send to norayne
- [ ] Ask her to confirm:
  - [ ] Can install
  - [ ] Can sign in
  - [ ] Gets mic permission dialogs
  - [ ] Voice input works

---

## ✅ Ready to Deploy Checklist

Before uploading to App Store Connect:

- [ ] All Critical Tests (1-5) passed
- [ ] Microphone permissions working
- [ ] Voice input working
- [ ] Auth flow working
- [ ] CRUD operations working
- [ ] Data persistence working
- [ ] Build number incremented (now 8)
- [ ] Info.plist has microphone permissions
- [ ] No crash logs during testing
- [ ] At least 5-minute smoke test passed

**If ANY critical test fails, fix before deploying!**

---

## 🎯 Priority Order

1. **Microphone permissions** - THE reason for this build
2. **Voice input** - Core feature
3. **Data persistence** - Critical for user trust
4. **CRUD operations** - Basic functionality
5. **Everything else** - Nice to have

---

## 📝 Test Results Template

Copy this to record your results:

```
Date: ___________
Build: 1.0 (8)
Tester: ___________

CRITICAL TESTS:
[ ] 1. Microphone permissions - PASS/FAIL
[ ] 2. Voice input - PASS/FAIL
[ ] 3. Authentication - PASS/FAIL
[ ] 4. CRUD operations - PASS/FAIL
[ ] 5. Data persistence - PASS/FAIL

UI/UX TESTS:
[ ] 6. UI changes - PASS/FAIL
[ ] 7. Navigation - PASS/FAIL
[ ] 8. Feedback system - PASS/FAIL
[ ] 9. Notifications - PASS/FAIL

EDGE CASES:
[ ] 10. Network issues - PASS/FAIL
[ ] 11. Long content - PASS/FAIL
[ ] 12. Priority filters - PASS/FAIL
[ ] 13. Calendar views - PASS/FAIL
[ ] 14. Clear data - PASS/FAIL

DEPLOY DECISION:
[ ] READY TO DEPLOY ✅
[ ] NEEDS FIXES ⚠️
[ ] DO NOT DEPLOY ❌

Notes:
_____________________________________
_____________________________________
_____________________________________
```

---

**Minimum to deploy: Tests 1-5 must all pass!** 🎯
