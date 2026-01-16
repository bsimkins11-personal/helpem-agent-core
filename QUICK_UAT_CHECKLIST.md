# ⚡ Quick 25-Question UAT Checklist
**App URL**: https://helpem-fh1ddvnwr-bryan-simkins-projects.vercel.app  
**Test Date**: January 16, 2026

---

## 🎯 Section 1: Todo Creation & Time Parsing (5 tests)

### ✅ Q1: Basic todo
- **Say/Type**: "Add call mom to my list"
- **Pass if**: Creates todo, no follow-ups, appears immediately

### ✅ Q2: Casual time
- **Say/Type**: "Text Jake tomorrow afternoon"
- **Pass if**: Creates todo with time (tomorrow 2pm), NO "When?" question

### ✅ Q3: Next week
- **Say/Type**: "Pay bills next Friday"
- **Pass if**: Calculates Jan 23, NO confirmation question

### ✅ Q4: Morning time
- **Say/Type**: "Workout tomorrow morning"
- **Pass if**: Sets 9am, immediate creation

### ✅ Q5: Urgent priority
- **Say/Type**: "Submit report by Monday 5pm - this is urgent"
- **Pass if**: High priority, Monday 5pm, single response

---

## 📅 Section 2: Appointments (5 tests)

### ✅ Q6: Complete appointment
- **Say/Type**: "Dentist appointment next Monday at 2pm"
- **Pass if**: Creates appointment, NO questions, appears in calendar

### ✅ Q7: Casual appointment
- **Say/Type**: "Coffee with Sarah Wednesday morning"
- **Pass if**: Wednesday 9am, immediate creation

### ✅ Q8: Multiple appointments
- **Say/Type**: "Team meeting at 10am and client call at 3pm tomorrow"
- **Pass if**: Creates BOTH appointments

### ✅ Q9: Recurring
- **Say/Type**: "Yoga class every Monday at 6pm"
- **Pass if**: Creates routine (not appointment)

### ✅ Q10: Ambiguous (should ask)
- **Say/Type**: "Meeting with boss"
- **Pass if**: Agent asks "When?", then follow-up creates it

---

## 🛒 Section 3: Grocery Logic (5 tests)

### ✅ Q11: Explicit grocery
- **Say/Type**: "Add milk to grocery list"
- **Pass if**: Goes to Groceries module, NOT todos

### ✅ Q12: Todo not grocery
- **Say/Type**: "Remind me to pick up dry cleaning"
- **Pass if**: Creates TODO, NOT grocery

### ✅ Q13: Multiple groceries
- **Say/Type**: "Add eggs, bread, and butter to grocery list"
- **Pass if**: 3 separate items in Groceries

### ✅ Q14: Ambiguous
- **Say/Type**: "I need to get bananas"
- **Pass if**: Agent asks if it's for grocery list

### ✅ Q15: Grocery store task
- **Say/Type**: "Go to grocery store tomorrow"
- **Pass if**: Creates TODO (with date), NOT grocery item

---

## 🎛️ Section 4: UI/UX Features (5 tests)

### ✅ Q16: Collapse all
- **Action**: Click "Collapse all" button (top right)
- **Pass if**: All 4 modules collapse, button says "Expand all"

### ✅ Q17: Individual toggle
- **Action**: Click "Todos" header
- **Pass if**: Only Todos expands/collapses, others unchanged

### ✅ Q18: **Filter expand/shrink** (NEW FEATURE!)
- **Setup**: Create 10+ todos with mixed priorities
- **Action**: 
  1. Click "High" filter → should show max 5, fixed height
  2. Click "High" again → should expand to ALL todos, module grows
- **Pass if**: Module size changes based on filter state

### ✅ Q19: **Grocery strikethrough** (NEW FEATURE!)
- **Setup**: Add 3 grocery items
- **Action**: Check 2 items
- **Pass if**: 
  - Checked items have strikethrough (NOT deleted)
  - "Clear list" button appears
  - Clicking "Clear list" removes checked items

### ✅ Q20: **Database persistence** (NEW FEATURE!)
- **Setup**: Create 2 todos and 1 appointment
- **Action**: Refresh page (Cmd+R)
- **Pass if**: All items still visible after refresh

---

## 🎤 Section 5: Voice & Chat Window (5 tests)

### ✅ Q21: **Voice first response** (NEW FIX!)
- **Mode**: Switch to "Talk" mode
- **Say**: "Add workout to my list"
- **Pass if**: Text appears in chat AND audio plays

### ✅ Q22: **Voice second response** (NEW FIX!)
- **Mode**: Voice mode
- **Say**: "Remind me to call dentist tomorrow at 10am"
- **Pass if**: Confirmation text appears in chat AND audio plays

### ✅ Q23: Multi-turn conversation
- **Mode**: Voice
- **Say**: 
  1. "What's on my schedule today?"
  2. "Add team meeting at 2pm"
  3. "What about tomorrow?"
- **Pass if**: All 3 responses show as text + audio

### ✅ Q24: Mode switching
- **Action**: 
  1. Type mode: "Add buy groceries"
  2. Talk mode: "Add call mom"
  3. Type mode: "What's my day look like?"
- **Pass if**: All messages in chat history, no duplicates

### ✅ Q25: Daily overview
- **Context**: Have 2 todos (1 with time), 1 appointment, 1 routine
- **Say/Type**: "What's my day look like?"
- **Pass if**: Response includes appointment, todo with time, natural summary

---

## 📊 Results

**Passes**: ___ / 25  
**Fails**: ___ / 25  
**Score**: ____%

### Critical Issues:
1. 
2. 
3. 

### Notes:
