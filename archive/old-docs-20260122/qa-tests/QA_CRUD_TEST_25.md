# QA CRUD Test - 25 Comprehensive Tests
## All Categories: Todos, Appointments, Habits/Routines

**Test Date:** _____________  
**Tester:** _____________  
**Device:** iOS / Web (circle one)  
**Build:** _____________

---

## Test Instructions
1. Complete each test in order
2. Mark ✅ for PASS, ❌ for FAIL
3. Note any issues in the "Notes" column
4. After each test, verify data persists after page refresh
5. Check console logs for errors

---

## SECTION 1: CREATE Operations (Todos)

### Test 1: Create Basic Todo via Voice
- [ ] **Action:** Say "Remind me to buy milk"
- [ ] **Expected:** Todo created with title "Buy milk", priority "medium", no due date
- [ ] **Verify:** Appears in todo list immediately
- [ ] **Persist:** Refresh page - todo still exists
- [ ] **Database:** Check console for "✅ Todo saved to database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 2: Create High Priority Todo via Voice
- [ ] **Action:** Say "URGENT: Call boss ASAP about deadline"
- [ ] **Expected:** Todo created with HIGH priority (red badge)
- [ ] **Verify:** Shows in HIGH priority section
- [ ] **Persist:** Refresh page - priority retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 3: Create Todo with Due Date
- [ ] **Action:** Say "Finish report by Friday"
- [ ] **Expected:** Todo created with due date set to this Friday
- [ ] **Verify:** Date shows in todo card
- [ ] **Persist:** Refresh page - date retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 2: CREATE Operations (Appointments)

### Test 4: Create Simple Appointment
- [ ] **Action:** Say "Dentist appointment tomorrow at 3pm"
- [ ] **Expected:** Appointment created for tomorrow 3pm
- [ ] **Verify:** Shows in calendar/appointments page
- [ ] **Persist:** Refresh page - appointment still exists
- [ ] **Database:** Check console for "✅ Appointment saved to database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 5: Create Appointment with Specific Date
- [ ] **Action:** Say "Team meeting next Monday at 10am"
- [ ] **Expected:** Appointment for next Monday 10:00 AM
- [ ] **Verify:** Correct date and time displayed
- [ ] **Persist:** Refresh page - appointment retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 6: Create Appointment Later Today
- [ ] **Action:** Say "Coffee with Sarah at 5pm today"
- [ ] **Expected:** Appointment for today at 5pm
- [ ] **Verify:** Shows as "Today" in calendar
- [ ] **Persist:** Refresh page - appointment exists
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 3: CREATE Operations (Habits/Routines)

### Test 7: Create Daily Habit
- [ ] **Action:** Say "Add morning meditation as a daily routine"
- [ ] **Expected:** Habit created with frequency "daily"
- [ ] **Verify:** Shows in habits/routines section
- [ ] **Persist:** Refresh page - habit still exists
- [ ] **Database:** Check console for "✅ Habit created successfully"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 8: Create Weekly Habit with Days
- [ ] **Action:** Say "Add workout routine Monday Wednesday Friday"
- [ ] **Expected:** Habit with specific days of week
- [ ] **Verify:** Days shown correctly
- [ ] **Persist:** Refresh page - habit retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 4: READ Operations (Verify Persistence)

### Test 9: Load All Todos on Fresh Launch
- [ ] **Action:** Close app completely, reopen
- [ ] **Expected:** All previously created todos load
- [ ] **Verify:** Count matches, titles correct, priorities correct
- [ ] **Console:** Check for "✅ Loaded X todos from database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 10: Load All Appointments on Fresh Launch
- [ ] **Action:** Refresh page / relaunch app
- [ ] **Expected:** All appointments load with correct dates/times
- [ ] **Verify:** Calendar shows all appointments
- [ ] **Console:** Check for "✅ Loaded X appointments from database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 11: Load All Habits on Fresh Launch
- [ ] **Action:** Refresh page / relaunch app
- [ ] **Expected:** All habits load with frequency/days
- [ ] **Verify:** Habits section populated correctly
- [ ] **Console:** Check for "✅ Loaded X habits from database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 5: UPDATE Operations (Todos)

### Test 12: Mark Todo Complete
- [ ] **Action:** Say "Mark buy milk as complete"
- [ ] **Expected:** Todo marked with checkmark/strikethrough
- [ ] **Verify:** completedAt timestamp set
- [ ] **Persist:** Refresh page - completion status retained
- [ ] **Console:** Check for "✅ Todo updated in database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 13: Change Todo Priority
- [ ] **Action:** Say "Change finish report to high priority"
- [ ] **Expected:** Priority changes to HIGH (red badge)
- [ ] **Verify:** Moves to HIGH priority section
- [ ] **Persist:** Refresh page - priority retained
- [ ] **Database:** Check for PATCH request in console
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 14: Rename Todo
- [ ] **Action:** Say "Rename call boss to call Sarah"
- [ ] **Expected:** Todo title updates
- [ ] **Verify:** New title displays immediately
- [ ] **Persist:** Refresh page - new title retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 6: UPDATE Operations (Appointments)

### Test 15: Reschedule Appointment
- [ ] **Action:** Say "Reschedule dentist to next week Wednesday at 2pm"
- [ ] **Expected:** Appointment date/time updates
- [ ] **Verify:** Shows new date in calendar
- [ ] **Persist:** Refresh page - reschedule retained
- [ ] **Console:** Check for "✅ Appointment updated in database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 16: Move Appointment to Tomorrow
- [ ] **Action:** Say "Move team meeting to tomorrow at same time"
- [ ] **Expected:** Appointment moves to tomorrow, time preserved
- [ ] **Verify:** Calendar updated
- [ ] **Persist:** Refresh page - change retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 17: Rename Appointment
- [ ] **Action:** Say "Rename coffee with Sarah to lunch with Sarah"
- [ ] **Expected:** Appointment title updates
- [ ] **Verify:** New title shows in calendar
- [ ] **Persist:** Refresh page - rename retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 7: UPDATE Operations (Habits)

### Test 18: Log Habit Completion
- [ ] **Action:** Say "Log completion for morning meditation"
- [ ] **Expected:** Completion logged for today
- [ ] **Verify:** Habit shows completion indicator
- [ ] **Persist:** Refresh page - completion retained
- [ ] **Console:** Check for "✅ Habit updated in database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 19: Change Habit Frequency
- [ ] **Action:** Say "Change workout to daily instead of 3 days"
- [ ] **Expected:** Frequency updates to "daily"
- [ ] **Verify:** Days of week cleared/updated
- [ ] **Persist:** Refresh page - frequency retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 20: Rename Habit
- [ ] **Action:** Say "Rename morning meditation to daily meditation"
- [ ] **Expected:** Habit title updates
- [ ] **Verify:** New name displays
- [ ] **Persist:** Refresh page - rename retained
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 8: DELETE Operations (All Categories)

### Test 21: Delete Todo with Confirmation
- [ ] **Action:** Say "Delete buy milk"
- [ ] **Expected:** Inline confirmation "Are you sure...?"
- [ ] **Action:** Reply "yes"
- [ ] **Verify:** Todo removed from list
- [ ] **Persist:** Refresh page - todo gone permanently
- [ ] **Console:** Check for "✅ Todo deleted from database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 22: Delete Appointment with Confirmation
- [ ] **Action:** Say "Delete dentist appointment"
- [ ] **Expected:** Inline confirmation message
- [ ] **Action:** Reply "yes"
- [ ] **Verify:** Appointment removed from calendar
- [ ] **Persist:** Refresh page - appointment gone
- [ ] **Console:** Check for "✅ Appointment deleted from database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 23: Delete Habit with Confirmation
- [ ] **Action:** Say "Remove workout routine"
- [ ] **Expected:** Confirmation prompt
- [ ] **Action:** Reply "yes"
- [ ] **Verify:** Habit removed from list
- [ ] **Persist:** Refresh page - habit gone
- [ ] **Console:** Check for "✅ Habit deleted from database"
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

### Test 24: Cancel Deletion
- [ ] **Action:** Say "Delete team meeting"
- [ ] **Expected:** Confirmation prompt
- [ ] **Action:** Reply "no"
- [ ] **Verify:** Appointment NOT deleted, still in list
- [ ] **Persist:** Refresh page - appointment still exists
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## SECTION 9: Error Handling & Edge Cases

### Test 25: Update Non-Existent Item
- [ ] **Action:** Say "Reschedule doctor appointment to next week"
- [ ] **Expected:** Error message "I couldn't find an appointment called doctor"
- [ ] **Verify:** Clear error message displayed
- [ ] **No Crash:** App remains functional
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________

---

## BONUS TESTS (Optional)

### Bonus Test 26: Rapid Sequential Operations
- [ ] **Action:** Create 5 todos rapidly in succession
- [ ] **Expected:** All 5 created without errors
- [ ] **Verify:** All appear in list
- [ ] **Persist:** Refresh - all 5 exist
- **Result:** ☐ PASS ☐ FAIL

### Bonus Test 27: Update Immediately After Create
- [ ] **Action:** Say "Remind me to call mom"
- [ ] **Action:** Immediately say "Change call mom to high priority"
- [ ] **Expected:** Both operations succeed
- [ ] **Verify:** Todo exists with high priority
- **Result:** ☐ PASS ☐ FAIL

### Bonus Test 28: Authentication After CRUD
- [ ] **Action:** Perform several CRUD operations
- [ ] **Action:** Log out and log back in
- [ ] **Expected:** All data retained after re-authentication
- [ ] **Verify:** No data loss
- **Result:** ☐ PASS ☐ FAIL

---

## TEST SUMMARY

**Total Tests Run:** _____ / 25  
**Tests Passed:** _____ ✅  
**Tests Failed:** _____ ❌  
**Pass Rate:** _____ %

### Critical Issues Found:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Minor Issues Found:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Database Verification Checklist:
- [ ] All CREATE operations save to database
- [ ] All READ operations load from database
- [ ] All UPDATE operations persist to database
- [ ] All DELETE operations remove from database
- [ ] Data survives page refresh/app relaunch
- [ ] No orphaned data in database
- [ ] Console logs show successful DB operations

### Console Log Analysis:
- [ ] No JavaScript errors during tests
- [ ] No 401 authentication errors
- [ ] No 500 server errors
- [ ] All API calls return 200 OK
- [ ] Auth token present in all requests
- [ ] Database queries succeed

### Performance Notes:
- **Average response time:** _____ ms
- **UI responsiveness:** Good / Fair / Poor
- **Database sync speed:** Fast / Moderate / Slow
- **Any lag noticed:** Yes / No - Details: _____________

---

## SIGN-OFF

**Tester Signature:** _____________  
**Date Completed:** _____________  
**Overall Status:** ☐ APPROVED FOR PRODUCTION ☐ NEEDS FIXES

**Recommended Next Steps:**
_____________________________________________
_____________________________________________
_____________________________________________
