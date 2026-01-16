# Notification & Grocery List Updates
**Date:** January 16, 2026 at 1:20 AM  
**Deployment:** 1f12027 to production

---

## 🎯 THREE CRITICAL UPDATES

### 1. Appointment Notifications (Automatic) 🔔

**Feature:**
- ALL appointments automatically notify **15 minutes before** the appointment time
- System handles scheduling automatically
- No need to mention notification timing to user

**Examples:**
- Dentist at 3pm → Notification at 2:45pm
- Meeting at 9:30am → Notification at 9:15am
- Flight at 6:45am → Notification at 6:30am

**Implementation:**
- Added to agent instructions under appointment section
- Silent feature (user doesn't need to know timing)
- Backend will handle actual notification scheduling

---

### 2. Todo Notifications (Automatic) 🔔

**Feature:**
- Todos with datetime notify **AT that exact time**
- Different from appointments (not 15 minutes before)
- System handles scheduling automatically

**Examples:**
- "Call mom at 5pm" → Notification at 5:00pm (not 4:45pm)
- "Pick up dry cleaning by 6pm" → Notification at 6:00pm
- "Email report this afternoon" (2pm) → Notification at 2:00pm

**Implementation:**
- Added to agent instructions under todo section
- Silent feature (user doesn't need to know timing)
- Backend will handle actual notification scheduling

---

### 3. Grocery List Logic (Explicit Only) 🛒

**Problem Before:**
- Any mention of grocery items would add to grocery list
- "Remind me to pick up milk at the store" → Added to grocery list ❌
- Caused confusion between reminders and list items

**Solution:**
- **ONLY** add to grocery list if user explicitly says:
  - "Add [item] to grocery list"
  - "Add [item] to shopping list"
  - "Put [item] on grocery list"
  - "Put [item] on shopping list"

**Clear Distinction:**

| User Says | Category | Why |
|-----------|----------|-----|
| "Remind me to pick up milk at the grocery store" | **TODO** | Has "remind me" + timing |
| "Add milk to my grocery list" | **GROCERY** | Explicit "add to grocery" |
| "I need to get eggs from the store" | **TODO** | Action with time element |
| "Put eggs on shopping list" | **GROCERY** | Explicit "on shopping list" |
| "Pick up bread on the way home" | **TODO** | Has timing context |
| "Add bread to groceries" | **GROCERY** | Explicit "add to groceries" |

**Edge Case Handling:**
- If user just says "milk" or "eggs" with no context → Ask: "Would you like me to add that to your grocery list, or set a reminder to pick it up?"

---

## ✅ VALIDATION TEST RESULTS

| Test # | User Input | Expected | Result | Status |
|--------|------------|----------|--------|--------|
| 1 | "Remind me to pick up milk at the grocery store" | TODO | Asked "When?" | ✅ PASS |
| 2 | "Add milk to my grocery list" | GROCERY | Created grocery item | ✅ PASS |
| 3 | "Pick up bread on my way home" | TODO | Asked "When?" | ✅ PASS |
| 4 | "Put eggs on my shopping list" | GROCERY | Created grocery item | ✅ PASS |

**Pass Rate:** 4/4 (100%) ✅

---

## 🔧 TECHNICAL IMPLEMENTATION

### Changes Made to Agent Instructions:

**1. Appointment Section (Line ~230):**
```
🔔 APPOINTMENT NOTIFICATIONS (automatic):
- ALL appointments automatically notify 15 minutes before the appointment time
- You don't need to mention this to the user
- System handles notification scheduling automatically
```

**2. Todo Section (Line ~210):**
```
🔔 TODO NOTIFICATIONS (automatic):
- If a todo has a datetime, system will notify AT that exact time
- You don't need to mention notification timing to the user
- Example: Todo at 5pm → notification at 5pm (not before)
```

**3. Grocery Category Selection (Line ~286):**
```
- Grocery: ONLY when user EXPLICITLY says "add to grocery list" or "add to shopping list"
  CRITICAL GROCERY VS TODO DISTINCTION:
    WRONG: "Remind me to pick up milk at grocery" = TODO (has "remind me")
    RIGHT: "Add milk to my grocery list" = GROCERY ITEM (explicit)
    WRONG: "Pick up bread on way home" = TODO (has timing)
    RIGHT: "Put bread on shopping list" = GROCERY ITEM (explicit)
```

---

## 📋 BACKEND IMPLEMENTATION NEEDED

**Note:** These changes update the agent's categorization logic. The **actual notification scheduling** needs to be implemented in the backend:

### Appointments:
```typescript
// When appointment created
const notificationTime = new Date(appointment.datetime);
notificationTime.setMinutes(notificationTime.getMinutes() - 15);
scheduleNotification(notificationTime, appointment);
```

### Todos:
```typescript
// When todo with datetime created
if (todo.datetime) {
  scheduleNotification(new Date(todo.datetime), todo);
}
```

### Notification System:
- Use iOS Local Notifications or Push Notifications
- Store notification IDs with appointments/todos for cancellation
- Handle timezone conversions
- Update notifications when items are edited/deleted

---

## 🎯 USER EXPERIENCE IMPACT

**Before:**
- Unclear when notifications would fire
- "Remind me to get milk" added to grocery list (confusing)
- Users had to specify notification timing

**After:**
- Predictable notification timing (15min before appointments, at time for todos)
- Clear distinction: shopping reminders vs grocery list items
- Better aligned with user mental models

---

## 💡 DESIGN RATIONALE

**Why 15 minutes before for appointments?**
- Standard notification timing used by most calendar apps
- Gives user time to prepare/travel
- Not too early (won't forget) or too late (no time to act)

**Why at exact time for todos?**
- Todos are action items, not scheduled events
- User sets specific time they want to do something
- "Call mom at 5pm" = they want reminder at 5pm, not 4:45pm

**Why explicit grocery list?**
- Users naturally say "remind me to pick up X" for shopping trips
- Grocery list is for tracking items, not scheduling trips
- Prevents pollution of grocery list with time-based reminders

---

## 🚀 NEXT STEPS

### Immediate:
1. ✅ Agent instructions updated
2. ✅ Changes deployed to production
3. ✅ Validation tests passing

### Backend Implementation Needed:
1. Add notification scheduling system
2. Implement 15-minute-before logic for appointments
3. Implement at-time logic for todos
4. Test notification delivery on iOS
5. Handle notification permissions

### Future Enhancements:
1. Allow users to customize appointment notification timing (5min, 15min, 30min, 1hr)
2. Add recurring todo notifications
3. Add snooze functionality
4. Add notification history/log

---

**Report Generated:** 2026-01-16 at 1:25 AM  
**Status:** Agent logic implemented ✅ | Backend notifications pending ⏳
