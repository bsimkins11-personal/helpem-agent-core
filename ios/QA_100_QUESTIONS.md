# helpem iOS App - 100 Question QA Test

**Build:** 15  
**Date:** 2026-01-19  
**Platform:** iOS (TestFlight)

---

## Test Categories

1. **Authentication & Onboarding** (5 questions)
2. **Voice Input** (20 questions)
3. **Todos** (15 questions)
4. **Appointments** (15 questions)
5. **Habits/Routines** (10 questions)
6. **Grocery List** (10 questions)
7. **App Lifecycle** (10 questions)
8. **Data Persistence** (5 questions)
9. **Edge Cases** (10 questions)
10. **Performance & Stability** (5 questions)

**Total:** 100 questions

---

## 1. Authentication & Onboarding (5)

### Q1: Fresh Install
- Delete app
- Reinstall from TestFlight
- **Expected:** Sign in with Apple screen shows
- **Result:** ☐ PASS ☐ FAIL

### Q2: Sign In Flow
- Tap "Sign in with Apple"
- Complete Apple authentication
- **Expected:** App opens to main screen
- **Result:** ☐ PASS ☐ FAIL

### Q3: Stay Signed In
- Close app completely
- Reopen app
- **Expected:** No sign-in prompt, goes directly to app
- **Result:** ☐ PASS ☐ FAIL

### Q4: Sign Out
- Tap menu → Logout
- **Expected:** Returns to sign-in screen
- **Result:** ☐ PASS ☐ FAIL

### Q5: Re-Sign In
- Sign in with Apple again
- **Expected:** Works without issues
- **Result:** ☐ PASS ☐ FAIL

---

## 2. Voice Input (20)

### Q6: Microphone Permission (First Time)
- Press mic button for first time
- **Expected:** iOS shows "Allow Microphone Access?" dialog
- **Result:** ☐ PASS ☐ FAIL

### Q7: Speech Recognition Permission
- After granting mic permission
- **Expected:** iOS shows "Allow Speech Recognition?" dialog
- **Result:** ☐ PASS ☐ FAIL

### Q8: Grant Both Permissions
- Tap "OK" on both dialogs
- **Expected:** Mic activates, can record
- **Result:** ☐ PASS ☐ FAIL

### Q9: Basic Voice Input
- Say: "Add a reminder to buy milk"
- **Expected:** Creates todo "buy milk"
- **Result:** ☐ PASS ☐ FAIL

### Q10: Voice with Date
- Say: "Add appointment for dentist tomorrow at 2pm"
- **Expected:** Creates appointment for tomorrow at 2pm
- **Result:** ☐ PASS ☐ FAIL

### Q11: Voice with Priority
- Say: "Add high priority todo to call mom"
- **Expected:** Creates high priority todo
- **Result:** ☐ PASS ☐ FAIL

### Q12: Yellow Dot - Appears During Recording
- Press and hold mic button
- **Expected:** Yellow dot appears in status bar
- **Result:** ☐ PASS ☐ FAIL

### Q13: Yellow Dot - Disappears on Release
- Release mic button
- Wait 2 seconds
- **Expected:** Yellow dot disappears immediately
- **Result:** ☐ PASS ☐ FAIL

### Q14: Yellow Dot - App Backgrounding
- Start recording
- Release mic
- Background app (home button)
- **Expected:** Yellow dot disappears
- **Result:** ☐ PASS ☐ FAIL

### Q15: Yellow Dot - App Close
- Record voice input
- Close app completely (swipe up in app switcher)
- **Expected:** Yellow dot disappears
- **Result:** ☐ PASS ☐ FAIL

### Q16: Voice Accuracy - Simple
- Say: "Add todo to read book"
- **Expected:** Transcribes correctly
- **Result:** ☐ PASS ☐ FAIL

### Q17: Voice Accuracy - Complex
- Say: "Schedule meeting with John about quarterly reports next Wednesday at 3:30pm"
- **Expected:** Transcribes accurately with correct time
- **Result:** ☐ PASS ☐ FAIL

### Q18: Voice - Multiple Items
- Say: "Add eggs, milk, and bread to grocery list"
- **Expected:** Creates 3 separate grocery items
- **Result:** ☐ PASS ☐ FAIL

### Q19: Voice - Habit Creation
- Say: "Add a daily habit to exercise"
- **Expected:** Creates daily habit
- **Result:** ☐ PASS ☐ FAIL

### Q20: Voice - Natural Language Dates
- Say: "Remind me to take out trash tonight at 8pm"
- **Expected:** Creates reminder for today at 8pm
- **Result:** ☐ PASS ☐ FAIL

### Q21: Voice - Relative Dates
- Say: "Add appointment for coffee with Sarah in 2 days at noon"
- **Expected:** Creates appointment 2 days from now at 12pm
- **Result:** ☐ PASS ☐ FAIL

### Q22: Voice - Update Item
- Say: "Change the meeting with John to 4pm"
- **Expected:** Updates existing appointment time
- **Result:** ☐ PASS ☐ FAIL

### Q23: Voice - Delete Item
- Say: "Delete the reminder about trash"
- **Expected:** Removes the item
- **Result:** ☐ PASS ☐ FAIL

### Q24: Voice - Feedback Thumbs Up
- Create item via voice
- Tap thumbs up
- **Expected:** "Thanks for the feedback!" confirmation
- **Result:** ☐ PASS ☐ FAIL

### Q25: Voice - Feedback Thumbs Down
- Create item via voice  
- Tap thumbs down
- **Expected:** Prompt asks "What can I do better?"
- **Result:** ☐ PASS ☐ FAIL

---

## 3. Todos (15)

### Q26: Create Todo - Simple
- Say: "Add todo to water plants"
- **Expected:** Todo appears in list
- **Result:** ☐ PASS ☐ FAIL

### Q27: Create Todo - With Priority
- Say: "Add high priority todo to finish report"
- **Expected:** Shows with high priority badge
- **Result:** ☐ PASS ☐ FAIL

### Q28: Create Todo - With Due Date
- Say: "Add todo to submit invoice by Friday"
- **Expected:** Shows due date on Friday
- **Result:** ☐ PASS ☐ FAIL

### Q29: Priority Filter - All
- Tap "All" priority filter
- **Expected:** Shows all todos
- **Result:** ☐ PASS ☐ FAIL

### Q30: Priority Filter - High
- Tap "High" filter
- **Expected:** Shows only high priority todos
- **Result:** ☐ PASS ☐ FAIL

### Q31: Priority Filter - Medium
- Tap "Med" filter
- **Expected:** Shows only medium priority todos
- **Result:** ☐ PASS ☐ FAIL

### Q32: Priority Filter - Low
- Tap "Low" filter
- **Expected:** Shows only low priority todos
- **Result:** ☐ PASS ☐ FAIL

### Q33: Change Priority - Via UI
- Tap on todo
- Change priority from medium to high
- **Expected:** Priority updates and saves
- **Result:** ☐ PASS ☐ FAIL

### Q34: Change Priority - Via Voice
- Say: "Change water plants to high priority"
- **Expected:** Updates priority
- **Result:** ☐ PASS ☐ FAIL

### Q35: Complete Todo
- Tap checkbox on todo
- **Expected:** Strikethrough, marked complete
- **Result:** ☐ PASS ☐ FAIL

### Q36: Uncomplete Todo
- Tap checkbox on completed todo
- **Expected:** Removes strikethrough, back to active
- **Result:** ☐ PASS ☐ FAIL

### Q37: Delete Todo
- Swipe todo left
- Tap delete
- **Expected:** Todo disappears
- **Result:** ☐ PASS ☐ FAIL

### Q38: Convert Todo to Appointment
- Tap todo
- Select "Convert to Appointment"
- **Expected:** Moves to appointments, prompts for time
- **Result:** ☐ PASS ☐ FAIL

### Q39: Long Todo Title
- Create todo with 100+ character description
- **Expected:** Displays without breaking UI
- **Result:** ☐ PASS ☐ FAIL

### Q40: Special Characters in Todo
- Create todo: "Buy @#$% for $50"
- **Expected:** Saves and displays correctly
- **Result:** ☐ PASS ☐ FAIL

---

## 4. Appointments (15)

### Q41: Create Appointment - Basic
- Say: "Schedule dentist appointment tomorrow at 2pm"
- **Expected:** Appears in calendar on correct day/time
- **Result:** ☐ PASS ☐ FAIL

### Q42: Create Appointment - Specific Date
- Say: "Schedule haircut on January 25th at 10am"
- **Expected:** Shows on January 25 at 10am
- **Result:** ☐ PASS ☐ FAIL

### Q43: Calendar View - Day
- Tap "Day" view
- **Expected:** Shows only today's appointments
- **Result:** ☐ PASS ☐ FAIL

### Q44: Calendar View - Week
- Tap "Week" view
- **Expected:** Shows full week
- **Result:** ☐ PASS ☐ FAIL

### Q45: Calendar View - Month
- Tap "Month" view
- **Expected:** Shows full month
- **Result:** ☐ PASS ☐ FAIL

### Q46: Navigate Calendar - Next Day
- Tap right arrow in day view
- **Expected:** Advances to tomorrow
- **Result:** ☐ PASS ☐ FAIL

### Q47: Navigate Calendar - Previous Day
- Tap left arrow
- **Expected:** Goes back one day
- **Result:** ☐ PASS ☐ FAIL

### Q48: Jump to Specific Date
- Tap date picker
- Select date 2 weeks from now
- **Expected:** Jumps to that date
- **Result:** ☐ PASS ☐ FAIL

### Q49: Return to Today
- From future date, tap "Today" button
- **Expected:** Returns to current date
- **Result:** ☐ PASS ☐ FAIL

### Q50: Edit Appointment Time
- Tap appointment
- Change time from 2pm to 3pm
- **Expected:** Updates and saves
- **Result:** ☐ PASS ☐ FAIL

### Q51: Edit Appointment Title
- Tap appointment
- Change title
- **Expected:** Updates and saves
- **Result:** ☐ PASS ☐ FAIL

### Q52: Delete Appointment
- Tap appointment
- Tap delete
- **Expected:** Removes from calendar
- **Result:** ☐ PASS ☐ FAIL

### Q53: Appointment Notification
- Create appointment 5 minutes in future
- Wait for notification time
- **Expected:** Notification appears 1 hour before
- **Result:** ☐ PASS ☐ FAIL ☐ SKIP

### Q54: All-Day Event
- Say: "Block out all day Friday for conference"
- **Expected:** Shows as all-day event
- **Result:** ☐ PASS ☐ FAIL

### Q55: Multiple Appointments Same Day
- Create 3 appointments on same day
- **Expected:** All show in correct time order
- **Result:** ☐ PASS ☐ FAIL

---

## 5. Habits/Routines (10)

### Q56: Create Daily Habit
- Say: "Add a habit to meditate daily"
- **Expected:** Creates daily habit
- **Result:** ☐ PASS ☐ FAIL

### Q57: Create Weekly Habit
- Say: "Add a habit to review finances weekly"
- **Expected:** Creates weekly habit
- **Result:** ☐ PASS ☐ FAIL

### Q58: Complete Habit - Today
- Tap checkbox on habit
- **Expected:** Marks complete for today
- **Result:** ☐ PASS ☐ FAIL

### Q59: Habit Streak Display
- Complete habit multiple days
- **Expected:** Shows streak count
- **Result:** ☐ PASS ☐ FAIL

### Q60: Uncomplete Habit
- Tap checkbox on completed habit
- **Expected:** Removes completion for today
- **Result:** ☐ PASS ☐ FAIL

### Q61: Habit Persists After Restart
- Create habit
- Close app
- Reopen
- **Expected:** Habit still exists
- **Result:** ☐ PASS ☐ FAIL

### Q62: Edit Habit Frequency
- Tap habit
- Change from daily to weekly
- **Expected:** Updates and saves
- **Result:** ☐ PASS ☐ FAIL

### Q63: Delete Habit
- Swipe habit left
- Tap delete
- **Expected:** Habit disappears
- **Result:** ☐ PASS ☐ FAIL

### Q64: Multiple Habits
- Create 5+ habits
- **Expected:** All display without UI issues
- **Result:** ☐ PASS ☐ FAIL

### Q65: Habit Reset at Midnight
- Complete habit today
- Wait until after midnight (or change device date)
- **Expected:** Habit shows as incomplete for new day
- **Result:** ☐ PASS ☐ FAIL ☐ SKIP

---

## 6. Grocery List (10)

### Q66: Add Single Item
- Say: "Add milk to grocery list"
- **Expected:** Milk appears in list
- **Result:** ☐ PASS ☐ FAIL

### Q67: Add Multiple Items
- Say: "Add eggs, bread, and butter to grocery list"
- **Expected:** All 3 items appear
- **Result:** ☐ PASS ☐ FAIL

### Q68: Check Off Item
- Tap checkbox on grocery item
- **Expected:** Strikethrough, marked as purchased
- **Result:** ☐ PASS ☐ FAIL

### Q69: Uncheck Item
- Tap checkbox on checked item
- **Expected:** Removes strikethrough
- **Result:** ☐ PASS ☐ FAIL

### Q70: Delete Single Item
- Say: "Remove milk from grocery list"
- **Expected:** Milk disappears
- **Result:** ☐ PASS ☐ FAIL

### Q71: Clear All Items
- Tap "Clear List" button
- **Expected:** All items removed
- **Result:** ☐ PASS ☐ FAIL

### Q72: Duplicate Items
- Say: "Add milk to grocery list" (when milk already exists)
- **Expected:** Either prevents duplicate or shows warning
- **Result:** ☐ PASS ☐ FAIL

### Q73: Long Grocery Item Name
- Add item with 50+ character name
- **Expected:** Displays without breaking UI
- **Result:** ☐ PASS ☐ FAIL

### Q74: Special Characters in Grocery
- Add: "½ lb @organic #cheese"
- **Expected:** Saves and displays correctly
- **Result:** ☐ PASS ☐ FAIL

### Q75: Grocery List Persistence
- Add items
- Close app
- Reopen
- **Expected:** All items still there
- **Result:** ☐ PASS ☐ FAIL

---

## 7. App Lifecycle (10)

### Q76: Background App
- Use app for 30 seconds
- Press home button
- **Expected:** App backgrounds smoothly
- **Result:** ☐ PASS ☐ FAIL

### Q77: Foreground App
- From backgrounded state, tap app icon
- **Expected:** Returns to exact same state
- **Result:** ☐ PASS ☐ FAIL

### Q78: Force Close App
- Swipe up in app switcher to close
- **Expected:** App closes cleanly
- **Result:** ☐ PASS ☐ FAIL

### Q79: Reopen After Force Close
- Open app again
- **Expected:** Opens normally, data intact
- **Result:** ☐ PASS ☐ FAIL

### Q80: Restart Phone
- Restart iPhone
- Open app
- **Expected:** All data preserved
- **Result:** ☐ PASS ☐ FAIL

### Q81: Low Battery Mode
- Enable low battery mode
- Use app normally
- **Expected:** Works without issues
- **Result:** ☐ PASS ☐ FAIL ☐ SKIP

### Q82: Airplane Mode
- Enable airplane mode
- Try to create item
- **Expected:** Shows appropriate offline message
- **Result:** ☐ PASS ☐ FAIL

### Q83: Poor Network
- Use app on weak WiFi/cellular
- **Expected:** Handles gracefully with retries
- **Result:** ☐ PASS ☐ FAIL ☐ SKIP

### Q84: App Update from TestFlight
- Update to newer build
- **Expected:** All data preserved after update
- **Result:** ☐ PASS ☐ FAIL ☐ SKIP

### Q85: Memory Pressure
- Open many other apps
- Return to helpem
- **Expected:** Doesn't crash, data intact
- **Result:** ☐ PASS ☐ FAIL

---

## 8. Data Persistence (5)

### Q86: Create 10 Items, Restart
- Create 2 todos, 2 appointments, 2 habits, 4 groceries
- Close app completely
- Reopen
- **Expected:** All 10 items still exist
- **Result:** ☐ PASS ☐ FAIL

### Q87: Edit Item, Restart
- Edit a todo title
- Close app
- Reopen
- **Expected:** Edit is saved
- **Result:** ☐ PASS ☐ FAIL

### Q88: Delete Item, Restart
- Delete an appointment
- Close app
- Reopen
- **Expected:** Item stays deleted
- **Result:** ☐ PASS ☐ FAIL

### Q89: Clear All Data
- Tap menu → Clear All Data
- Confirm
- **Expected:** All data removed, no crash
- **Result:** ☐ PASS ☐ FAIL

### Q90: Data After Clear
- Clear all data
- Create new items
- **Expected:** Works normally, no ghost data
- **Result:** ☐ PASS ☐ FAIL

---

## 9. Edge Cases (10)

### Q91: Empty Voice Input
- Press mic, say nothing, release
- **Expected:** No error, no empty item created
- **Result:** ☐ PASS ☐ FAIL

### Q92: Very Long Voice Input
- Say 200+ word paragraph
- **Expected:** Transcribes or handles gracefully
- **Result:** ☐ PASS ☐ FAIL

### Q93: Nonsense Voice Input
- Say: "asdfghjkl qwerty xyz"
- **Expected:** Agent responds appropriately
- **Result:** ☐ PASS ☐ FAIL

### Q94: Ambiguous Date
- Say: "Add meeting next Tuesday" (on a Tuesday)
- **Expected:** Clarifies or picks reasonable date
- **Result:** ☐ PASS ☐ FAIL

### Q95: Past Date
- Say: "Add appointment yesterday"
- **Expected:** Either blocks or asks for clarification
- **Result:** ☐ PASS ☐ FAIL

### Q96: Invalid Time
- Say: "Schedule meeting at 25 o'clock"
- **Expected:** Handles gracefully
- **Result:** ☐ PASS ☐ FAIL

### Q97: Rapid Button Presses
- Press mic button 10 times rapidly
- **Expected:** No crash, handles gracefully
- **Result:** ☐ PASS ☐ FAIL

### Q98: Concurrent Operations
- Create appointment while loading previous one
- **Expected:** Both complete successfully
- **Result:** ☐ PASS ☐ FAIL

### Q99: Change Time Zone
- Create appointment
- Change device timezone
- **Expected:** Appointment time adjusts or stays consistent
- **Result:** ☐ PASS ☐ FAIL ☐ SKIP

### Q100: Maximum Data Load
- Create 50+ items across all categories
- **Expected:** UI remains responsive, no lag
- **Result:** ☐ PASS ☐ FAIL

---

## Scoring

**Pass:** _____ / 100  
**Fail:** _____ / 100  
**Skip:** _____ / 100  

**Pass Rate:** _____%

---

## Critical Failures (Must Fix Before Alpha)

List any FAIL results that would block release:

1. _________________________________
2. _________________________________
3. _________________________________

---

## Minor Issues (Can Fix Post-Alpha)

List any FAIL results that are acceptable for alpha:

1. _________________________________
2. _________________________________
3. _________________________________

---

## Notes

_________________________________________
_________________________________________
_________________________________________
_________________________________________
