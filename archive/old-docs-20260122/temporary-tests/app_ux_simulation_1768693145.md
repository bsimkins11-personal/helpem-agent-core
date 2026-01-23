# HelpEm App UX Functional Simulation
**Date**: Sat Jan 17 18:39:05 EST 2026
**Purpose**: Test real user interactions, log functional errors, identify UX improvements

---


## ❌ FUNCTIONAL ERROR - Simple todo
**User Input**: "Buy milk"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Todo with priority
**User Input**: "Call mom ASAP"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Todo with due date
**User Input**: "Email team tomorrow"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Appointment with time
**User Input**: "Doctor appointment at 3pm Friday"
**Expected Action**: create_appointment
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Meeting with duration
**User Input**: "Team meeting tomorrow at 10am"
**Expected Action**: create_appointment
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Vague request
**User Input**: "remind me about the thing"
**Expected Action**: clarify
**Expected Response**: clarification
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Missing information
**User Input**: "Schedule meeting"
**Expected Action**: clarify
**Expected Response**: clarification
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Too general
**User Input**: "help me organize"
**Expected Action**: clarify
**Expected Response**: clarification
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Multiple todos
**User Input**: "Add eggs, milk, and bread to my list"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Todo with context
**User Input**: "Buy birthday gift for Sarah next week, something around 50 dollars"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Casual language
**User Input**: "gotta pick up dry cleaning tmrw"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Formal language
**User Input**: "Please schedule a quarterly review meeting for next Monday at 2 PM"
**Expected Action**: create_appointment
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Shorthand
**User Input**: "mtg w/ john 3pm"
**Expected Action**: create_appointment
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - List request
**User Input**: "What do I need to do today?"
**Expected Action**: query_tasks
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Status check
**User Input**: "What's on my calendar?"
**Expected Action**: query_appointments
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Gibberish
**User Input**: "asdfghjkl"
**Expected Action**: clarify
**Expected Response**: clarification
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Special characters
**User Input**: "Buy @#$% for &*()!"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Very long input
**User Input**: "I need to remember to buy groceries including milk eggs bread cheese butter yogurt apples bananas oranges chicken beef pork vegetables carrots broccoli spinach lettuce tomatoes cucumbers onions garlic potatoes rice pasta cereal coffee tea juice soda water and cleaning supplies"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Spoken filler words
**User Input**: "um, I need to, like, buy milk and stuff"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---

## ❌ FUNCTIONAL ERROR - Run-on sentence
**User Input**: "I need to call mom and then pick up the kids from school and also buy groceries on the way home"
**Expected Action**: create_todo
**Expected Response**: confirmation
**Actual**: No response received
**Error Type**: API Failure / Timeout
**Priority**: CRITICAL

---
