# 🧪 Complete UAT Testing Checklist - Before Production Deploy

## DO NOT DEPLOY UNTIL ALL TESTS PASS ✋

**Status:** 🟡 Testing in Progress  
**Tester:** ___________  
**Date:** ___________

---

## ✅ Tests Completed So Far

- [x] **Appointments CREATE** - "Dentist tomorrow at 3pm" ✅
- [x] **Appointments DELETE** - "Delete dentist" ✅
- [ ] Appointments UPDATE (reschedule)
- [ ] Appointments UPDATE (rename)
- [ ] Todos CREATE
- [ ] Todos UPDATE (complete)
- [ ] Todos UPDATE (priority)
- [ ] Todos DELETE
- [ ] Habits CREATE
- [ ] Habits UPDATE (log completion)
- [ ] Habits UPDATE (rename)
- [ ] Habits DELETE
- [ ] Groceries CREATE
- [ ] Groceries UPDATE (complete)
- [ ] Groceries UPDATE (rename)
- [ ] Groceries DELETE
- [ ] Persistence test (refresh page)
- [ ] Database migration completed

---

## 📋 Full Test Suite (Execute in Order)

### PHASE 1: Appointments (Partially Complete)

#### Test 1.1: CREATE Appointment ✅ DONE
- [x] Command: "Dentist appointment tomorrow at 3pm"
- [x] Result: Created successfully
- [x] Visible in calendar: YES
- [x] Navigate to tomorrow works: YES

#### Test 1.2: DELETE Appointment ✅ DONE
- [x] Command: "Delete dentist appointment"
- [x] Confirmation prompt: YES
- [x] Reply "yes"
- [x] Removed from calendar: YES

#### Test 1.3: CREATE Another Appointment
- [ ] Command: **"Team standup next Monday at 10am"**
- [ ] Expected: Appointment created for next Monday 10:00 AM
- [ ] Verify: Navigate to Monday, see appointment
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 1.4: UPDATE Appointment (Reschedule)
- [ ] Command: **"Reschedule team standup to Tuesday at 11am"**
- [ ] Expected: Date changes to Tuesday, time to 11am
- [ ] Verify: Navigate to Tuesday, see updated appointment
- [ ] Verify: Monday no longer shows appointment
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 1.5: UPDATE Appointment (Rename)
- [ ] Command: **"Rename team standup to daily standup"**
- [ ] Expected: Title changes to "Daily standup"
- [ ] Verify: New name shows immediately
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 1.6: DELETE with Cancel
- [ ] Command: **"Delete daily standup"**
- [ ] Confirmation prompt: "Are you sure..."
- [ ] Reply: **"no"**
- [ ] Expected: Appointment NOT deleted
- [ ] Verify: Still visible in calendar
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

---

### PHASE 2: Todos

#### Test 2.1: CREATE Todo
- [ ] Command: **"Remind me to call mom"**
- [ ] Expected: Todo created with title "Call mom"
- [ ] Verify: Appears in Todos section immediately
- [ ] Priority: Medium (default)
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 2.2: UPDATE Todo (Complete)
- [ ] Command: **"Mark call mom as complete"**
- [ ] Expected: Todo marked complete
- [ ] Verify: Shows checkmark or strikethrough
- [ ] Verify: completedAt timestamp set
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 2.3: CREATE High Priority Todo
- [ ] Command: **"URGENT: Finish report by Friday"**
- [ ] Expected: Todo created with HIGH priority (red)
- [ ] Verify: Appears in high priority section
- [ ] Verify: Red badge visible
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 2.4: UPDATE Todo (Change Priority)
- [ ] Command: **"Change finish report to medium priority"**
- [ ] Expected: Priority changes from high to medium
- [ ] Verify: Badge color changes from red to amber
- [ ] Verify: Moves to medium section
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 2.5: CREATE Another Todo
- [ ] Command: **"Remind me to buy groceries"**
- [ ] Expected: Todo created
- [ ] Verify: Appears in list
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 2.6: DELETE Todo
- [ ] Command: **"Delete buy groceries"**
- [ ] Confirmation: "Are you sure..."
- [ ] Reply: **"yes"**
- [ ] Expected: Todo removed
- [ ] Verify: No longer in list
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

---

### PHASE 3: Habits/Routines

#### Test 3.1: CREATE Daily Habit
- [ ] Command: **"Add morning meditation as a daily routine"**
- [ ] Expected: Habit created with "daily" frequency
- [ ] Verify: Appears in Routines section
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 3.2: CREATE Weekly Habit
- [ ] Command: **"Add workout routine Monday Wednesday Friday"**
- [ ] Expected: Habit with specific days
- [ ] Verify: Days shown correctly (M, W, F)
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 3.3: UPDATE Habit (Log Completion)
- [ ] Command: **"Log completion for morning meditation"**
- [ ] Expected: Today's date logged
- [ ] Verify: Completion indicator shows
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 3.4: UPDATE Habit (Rename)
- [ ] Command: **"Rename morning meditation to daily meditation"**
- [ ] Expected: Title changes
- [ ] Verify: New name displays
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 3.5: DELETE Habit
- [ ] Command: **"Remove workout routine"**
- [ ] Confirmation: "Are you sure..."
- [ ] Reply: **"yes"**
- [ ] Expected: Habit removed
- [ ] Verify: No longer in routines section
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

---

### PHASE 4: Groceries

#### Test 4.1: CREATE Grocery Item
- [ ] Command: **"Add milk to grocery list"**
- [ ] Expected: "Milk" added to groceries
- [ ] Verify: Shows in Groceries section
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 4.2: CREATE Multiple Items
- [ ] Command: **"Add bread to groceries"**
- [ ] Command: **"Add eggs to grocery list"**
- [ ] Expected: All 3 items visible (milk, bread, eggs)
- [ ] Verify: All show in list
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 4.3: UPDATE Grocery (Mark Complete)
- [ ] Command: **"Mark milk as complete"**
- [ ] Expected: Milk shows checkmark/strikethrough
- [ ] Verify: Visually marked as complete
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 4.4: UPDATE Grocery (Rename)
- [ ] Command: **"Rename bread to whole wheat bread"**
- [ ] Expected: Item name updates
- [ ] Verify: Shows new name
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 4.5: DELETE Grocery
- [ ] Command: **"Delete eggs from grocery list"**
- [ ] Confirmation: "Are you sure..."
- [ ] Reply: **"yes"**
- [ ] Expected: Item removed
- [ ] Verify: Only milk and bread remain
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

---

### PHASE 5: Persistence & Data Integrity

#### Test 5.1: Page Refresh Persistence
- [ ] **Action:** Refresh the page (Ctrl+R or Cmd+R)
- [ ] **Verify:** All created items still exist:
  - [ ] Appointments: YES / NO
  - [ ] Todos: YES / NO
  - [ ] Habits: YES / NO
  - [ ] Groceries: YES / NO (requires migration)
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 5.2: Full Browser Restart
- [ ] **Action:** Close browser completely
- [ ] **Action:** Reopen and navigate to /app
- [ ] **Verify:** All data retained:
  - [ ] Appointments: YES / NO
  - [ ] Todos: YES / NO
  - [ ] Habits: YES / NO
  - [ ] Groceries: YES / NO (requires migration)
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 5.3: Verify Deletions Are Permanent
- [ ] **Action:** Refresh page
- [ ] **Verify:** Previously deleted items are still gone:
  - [ ] Deleted appointments: GONE / STILL THERE
  - [ ] Deleted todos: GONE / STILL THERE
  - [ ] Deleted habits: GONE / STILL THERE
  - [ ] Deleted groceries: GONE / STILL THERE
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 5.4: Verify Updates Are Permanent
- [ ] **Action:** Refresh page
- [ ] **Verify:** All updates retained:
  - [ ] Completed todos still marked complete: YES / NO
  - [ ] Rescheduled appointments show new time: YES / NO
  - [ ] Renamed items show new names: YES / NO
  - [ ] Habit completions retained: YES / NO
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

---

### PHASE 6: Edge Cases & Error Handling

#### Test 6.1: Update Non-Existent Item
- [ ] Command: **"Reschedule doctor appointment to next week"**
- [ ] Expected: Error message "I couldn't find..."
- [ ] Verify: Clear error shown, no crash
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 6.2: Delete Non-Existent Item
- [ ] Command: **"Delete zombie appointment"**
- [ ] Expected: Error message "I couldn't find..."
- [ ] Verify: Clear error shown, no crash
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 6.3: Rapid Sequential Operations
- [ ] Command: **"Add test1 to todos"**
- [ ] Command: **"Add test2 to todos"** (immediately)
- [ ] Command: **"Add test3 to todos"** (immediately)
- [ ] Expected: All 3 created without errors
- [ ] Verify: All appear in list
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

#### Test 6.4: Console Error Check
- [ ] **Action:** Open console (F12)
- [ ] **Verify:** No red errors during all tests
- [ ] **Check:** All API calls return 200 OK
- [ ] **Result:** ☐ PASS ☐ FAIL
- [ ] **Notes:** ___________________________________________

---

## 🚨 CRITICAL: Database Migration

### Groceries Migration Status
- [ ] **Migration Run:** YES / NO
- [ ] **SQL Executed Successfully:** YES / NO
- [ ] **Table Exists:** Verified via `SELECT COUNT(*) FROM groceries;`
- [ ] **Groceries Persist After Refresh:** YES / NO

**If NOT done:**
```sql
CREATE TABLE IF NOT EXISTS groceries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_groceries_user_id ON groceries(user_id);
CREATE INDEX idx_groceries_completed ON groceries(user_id, completed);
```

---

## 📊 Test Summary

### Completion Status
- **Total Tests:** 30
- **Tests Completed:** _____ / 30
- **Tests Passed:** _____ ✅
- **Tests Failed:** _____ ❌
- **Pass Rate:** _____ %

### Category Breakdown
- **Appointments:** _____ / 6 tests ☐ PASS ☐ FAIL
- **Todos:** _____ / 6 tests ☐ PASS ☐ FAIL
- **Habits:** _____ / 5 tests ☐ PASS ☐ FAIL
- **Groceries:** _____ / 5 tests ☐ PASS ☐ FAIL
- **Persistence:** _____ / 4 tests ☐ PASS ☐ FAIL
- **Edge Cases:** _____ / 4 tests ☐ PASS ☐ FAIL

### Critical Issues Found
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Minor Issues Found
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before removing debug panel and deploying:

- [ ] All 30 tests executed
- [ ] Pass rate ≥ 95% (28+ tests passing)
- [ ] No critical issues blocking deployment
- [ ] Groceries migration completed
- [ ] Database persistence verified for all categories
- [ ] Console shows no errors
- [ ] All CRUD operations working
- [ ] Voice commands functional
- [ ] Inline confirmations working
- [ ] Data survives refresh/relaunch

---

## 🚀 DEPLOYMENT GO/NO-GO

### ✅ GO FOR DEPLOYMENT IF:
- All tests passed (or only minor non-blocking issues)
- Groceries migration completed
- No console errors
- Data persistence confirmed
- Voice control working

### ❌ NO-GO IF:
- Any CREATE operations failing
- Data not persisting
- Console shows critical errors
- Database migration not completed
- Pass rate < 95%

---

## 📝 Sign-Off

**Tester Name:** ___________  
**Test Date:** ___________  
**Test Duration:** ___________

**Decision:** ☐ APPROVED FOR DEPLOYMENT ☐ NEEDS FIXES

**Signature:** ___________

---

## 🎯 After Sign-Off

Once all tests pass:
1. Remove debug panel
2. Remove excessive console logging
3. Commit changes
4. Deploy to production
5. Deploy to iOS TestFlight
6. Run smoke test in production

**DO NOT DEPLOY UNTIL THIS CHECKLIST IS 100% COMPLETE**
