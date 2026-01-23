# 25-Question UAT Test Plan - New Functionality
**Date**: January 16, 2026  
**Version**: Post-expand/collapse & chat text display fixes

## Test Objectives
1. ✅ Module expand/collapse functionality
2. ✅ Todos filter expand/shrink behavior
3. ✅ Database persistence across refreshes
4. ✅ Voice responses appearing in chat window
5. ✅ All previous critical fixes (time parsing, grocery logic, etc.)

---

## Section 1: Basic Todo Creation & Time Parsing (5 tests)

### Q1: Basic todo without time
**Input**: "Add call mom to my list"  
**Expected**:
- ✅ Creates todo "Call mom"
- ✅ Returns JSON action
- ✅ Confirmation message appears in chat
- ✅ No unnecessary follow-up questions
- ✅ Medium priority by default

### Q2: Casual time phrasing
**Input**: "Text Jake tomorrow afternoon"  
**Expected**:
- ✅ Creates todo "Text Jake"
- ✅ Parses "tomorrow afternoon" → tomorrow at 2:00 PM
- ✅ NO "When?" question asked
- ✅ Confirmation includes calculated time
- ✅ Appears in todos module immediately

### Q3: Relative time (next week)
**Input**: "Pay bills next Friday"  
**Expected**:
- ✅ Calculates next Friday's date correctly
- ✅ NO date confirmation asked
- ✅ Creates todo with due date
- ✅ Response includes specific date (e.g., "Friday, January 24")

### Q4: Time range (morning)
**Input**: "Workout tomorrow morning"  
**Expected**:
- ✅ Parses "morning" → 9:00 AM
- ✅ Creates todo with time
- ✅ NO follow-up questions
- ✅ Confirmation is complete and natural

### Q5: Complete time + priority hint
**Input**: "Submit report by Monday 5pm - this is urgent"  
**Expected**:
- ✅ Creates todo "Submit report"
- ✅ Due date: Monday at 5:00 PM
- ✅ High priority (inferred from "urgent")
- ✅ Single confirmation, no follow-ups

---

## Section 2: Appointment Scheduling (5 tests)

### Q6: Complete appointment info
**Input**: "Dentist appointment next Monday at 2pm"  
**Expected**:
- ✅ Creates appointment "Dentist"
- ✅ Date: Monday, January 20, 2026 at 2:00 PM
- ✅ NO confirmation questions
- ✅ Returns action immediately
- ✅ Appears in Today/Calendar module

### Q7: Casual appointment time
**Input**: "Coffee with Sarah Wednesday morning"  
**Expected**:
- ✅ Creates appointment
- ✅ Parses "Wednesday morning" → 9:00 AM
- ✅ Confirmation message natural and complete

### Q8: Multiple appointments in one day
**Input**: "Team meeting at 10am and client call at 3pm tomorrow"  
**Expected**:
- ✅ Creates TWO separate appointments
- ✅ Both scheduled for tomorrow
- ✅ Correct times (10:00 AM and 3:00 PM)
- ✅ Confirmation mentions both

### Q9: Recurring appointment
**Input**: "Yoga class every Monday at 6pm"  
**Expected**:
- ✅ Creates routine (not single appointment)
- ✅ Weekly frequency
- ✅ Monday set as day of week
- ✅ Appears in Routines module

### Q10: Ambiguous appointment (should ask)
**Input**: "Meeting with boss"  
**Expected**:
- ✅ Agent asks "When is the meeting?"
- ✅ Follow-up: "Tomorrow at 3pm" → creates appointment
- ✅ NO unnecessary confirmations after follow-up

---

## Section 3: Grocery vs Todo Logic (5 tests)

### Q11: Explicit grocery item
**Input**: "Add milk to grocery list"  
**Expected**:
- ✅ Creates grocery item "Milk"
- ✅ Appears in Groceries module
- ✅ NOT in todos

### Q12: Should be todo, not grocery
**Input**: "Remind me to pick up dry cleaning"  
**Expected**:
- ✅ Creates TODO "Pick up dry cleaning"
- ✅ NOT added to groceries
- ✅ Appears in Todos module

### Q13: Multiple grocery items
**Input**: "Add eggs, bread, and butter to grocery list"  
**Expected**:
- ✅ Creates THREE separate grocery items
- ✅ All appear in Groceries module
- ✅ Confirmation mentions all three

### Q14: Ambiguous grocery mention
**Input**: "I need to get bananas"  
**Expected**:
- ✅ Agent asks "Would you like to add bananas to your grocery list?"
- ✅ User: "Yes" → adds to groceries
- ✅ User: "No" → creates todo instead

### Q15: Grocery store task
**Input**: "Go to grocery store tomorrow"  
**Expected**:
- ✅ Creates TODO "Go to grocery store"
- ✅ NOT a grocery item
- ✅ Includes tomorrow's date

---

## Section 4: Module Expand/Collapse & UI Behavior (5 tests)

### Q16: Collapse all modules
**Action**: Click "Collapse all" button  
**Expected**:
- ✅ All 4 modules collapse (Today, Todos, Routines, Groceries)
- ✅ Only headers visible
- ✅ Chevron icons point right
- ✅ Button changes to "Expand all"

### Q17: Individual module toggle
**Action**: Click individual "Todos" header  
**Expected**:
- ✅ Todos module expands/collapses
- ✅ Other modules unchanged
- ✅ Chevron rotates

### Q18: Todos filter - expand when "All" selected
**Setup**: Create 10+ todos with mixed priorities  
**Action**: Click priority filters, then click back to "All"  
**Expected**:
- ✅ High filter: Shows max 5 high-priority todos, fixed height
- ✅ Medium filter: Shows max 5 medium-priority todos, fixed height
- ✅ All filter: Shows ALL todos, module expands, pushes other modules down
- ✅ No scroll restriction when filter = "All"

### Q19: Grocery list strikethrough
**Setup**: Have 3+ grocery items  
**Action**: Check off 2 items  
**Expected**:
- ✅ Checked items show strikethrough
- ✅ Items remain in list (NOT deleted immediately)
- ✅ "Clear list" button appears at bottom
- ✅ Click "Clear list" → removes all checked items

### Q20: Data persistence after refresh
**Setup**: Create 2 todos and 1 appointment  
**Action**: Refresh the page (cmd+R or F5)  
**Expected**:
- ✅ All todos still visible
- ✅ Appointment still visible
- ✅ Data loaded from database
- ✅ No data loss

---

## Section 5: Voice Mode & Chat Window (5 tests)

### Q21: Voice todo creation - first response
**Mode**: Voice (native app)  
**Input**: "Add workout to my list"  
**Expected**:
- ✅ Text appears in chat window
- ✅ Audio plays confirmation
- ✅ BOTH text AND audio happen

### Q22: Voice todo creation - second response
**Mode**: Voice (native app)  
**Input**: "Remind me to call dentist tomorrow at 10am"  
**Expected**:
- ✅ Confirmation text appears in chat
- ✅ Audio plays
- ✅ Todo created with correct time
- ✅ NO missing text in chat

### Q23: Multiple back-and-forth conversation
**Mode**: Voice  
**Input**: 
1. "What's on my schedule today?"
2. "Add team meeting at 2pm"
3. "What about tomorrow?"  
**Expected**:
- ✅ All 3 responses appear as text in chat
- ✅ All 3 responses spoken
- ✅ Conversation flows naturally
- ✅ Context maintained across turns

### Q24: Switch between Type and Talk modes
**Action**: 
1. Type mode: "Add buy groceries"
2. Talk mode: "Add call mom"
3. Back to Type mode: "What's my day look like?"  
**Expected**:
- ✅ All messages appear in chat history
- ✅ Chat history persists across mode switches
- ✅ No duplicate messages
- ✅ Smooth transitions

### Q25: Daily overview with all data types
**Input**: "What's my day look like?"  
**Context**: Have 2 todos (1 with time), 1 appointment, 1 routine  
**Expected**:
- ✅ Response includes appointment with time
- ✅ Response includes todo WITH due date/time
- ✅ Response includes routine (if today is scheduled day)
- ✅ Natural, conversational summary
- ✅ Text appears in chat AND spoken (if voice mode)

---

## Scoring Guide
- ✅ **Pass**: Feature works as expected
- ⚠️ **Partial**: Feature works but with minor issues
- ❌ **Fail**: Feature doesn't work or has major issues

## Success Criteria
- **Excellent**: 23-25 passes (92%+)
- **Good**: 20-22 passes (80%+)
- **Needs Work**: <20 passes (<80%)

---

## Notes Section
Use this space to document any issues, edge cases, or observations:

```
Issue #1:
Expected: 
Actual:
Severity: [Critical / Major / Minor]

Issue #2:
...
```

---

## Summary
**Total Passes**: ___ / 25  
**Total Partials**: ___ / 25  
**Total Fails**: ___ / 25  
**Overall Score**: ____%  
**Status**: [Excellent / Good / Needs Work]

**Critical Issues Found**:
1. 
2. 
3. 

**Recommended Next Steps**:
1. 
2. 
3. 
