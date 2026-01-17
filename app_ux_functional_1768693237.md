# HelpEm App UX Functional Test
**Date**: Sat Jan 17 18:40:37 EST 2026
**Endpoint**: /api/chat

---


## ✅ PASSED - Simple todo creation
**User Input**: "Buy milk"
**Expected**: Should create todo with title 'Buy milk', medium priority
**Actual Action**: add
**Task Title**: Buy milk
**AI Response** (6 words):
> I'll remind you to buy milk.

---

## ✅ PASSED - Todo with urgency
**User Input**: "Call mom ASAP"
**Expected**: Should create todo with high priority (ASAP keyword)
**Actual Action**: add
**Task Title**: Call mom
**AI Response** (9 words):
> Got it. I'll remind you to call mom ASAP.

---

## ⚠️  WARNING - Todo with time
**User Input**: "Email team tomorrow"
**Expected**: Should create todo for tomorrow
**Actual Action**: add
**Task Title**: Email team
**AI Response** (9 words):
> I've got you down to email the team tomorrow.

**⚠️  WARNINGS**:
⚠️ UX: Missing confirmation in response. ⚠️ UX: Confirmation doesn't mention the task title. 

---

## ✅ PASSED - Natural language todo
**User Input**: "Remind me to pick up dry cleaning"
**Expected**: Should create todo 'pick up dry cleaning'
**Actual Action**: add
**Task Title**: Pick up dry cleaning
**AI Response** (11 words):
> I've got it. I'll remind you to pick up dry cleaning.

---

## ✅ PASSED - Appointment with full info
**User Input**: "Doctor appointment tomorrow at 3pm"
**Expected**: Should create appointment for tomorrow 3pm
**Actual Action**: add
**Task Title**: Doctor appointment
**AI Response** (12 words):
> Okay. I've got your doctor appointment down for tomorrow at 3 PM.

---
