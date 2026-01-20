# Appointment Flow QA Analysis

## Test Scenarios & Expected Behavior

### CORE REQUIREMENT
**Array to complete:** `[day, time, duration, withWhom, topic, location]`
- **Mandatory:** day, time, duration
- **Optional:** withWhom, topic, location

---

## Issues Identified from User Logs

### Issue 1: Infinite Loop on "No" Decline ✅ FIXED
**Problem:**
```
User: "No that's fine" → isCorrection: TRUE → Clears builder → Loop
User: "No" → isCorrection: TRUE → Clears builder → Loop
```

**Root Cause:** Simple "No" responses to optional field questions were flagged as corrections.

**Fix Applied:**
- Added `isSimpleDecline` check that returns FALSE for:
  - "no", "nope", "no thanks", "no that's fine", etc.
- Only flag as correction if "No" is followed by correction context ("No I said...", "No actually...")

---

### Issue 2: withWhom Lost on Decline ✅ FIXED
**Problem:**
```
AI returns: withWhom: "AMS team"
Client asks optional fields
User: "No" (declining)
System: Sets withWhom = null ❌ (overwrites existing value!)
```

**Root Cause:** Decline logic cleared ALL optional fields, including ones already set.

**Fix Applied:**
```typescript
// OLD
if (declined) {
  builder.withWhom = null;  // ❌ Overwrites existing!
}

// NEW
if (declined) {
  if (!builder.withWhom) builder.withWhom = null;  // ✅ Only null if missing
}
```

---

## Remaining Issues to Fix

### Issue 3: AI Sometimes Confirms Without Creating
**Pattern from logs:**
```
User: "11 AM"
AI: "Got it. I've scheduled your meeting..." 
Action: "respond" ❌ (should be "add")
```

**Needs:** Stronger enforcement that after answering "How long?", AI MUST return `action: "add"`

---

### Issue 4: Initial Request with "at [entity]" Not Handled
**Pattern:**
```
User: "Set an appointment tomorrow with the AMS team"
→ AI asks: "What time?" ✅
User: "Set it at noon" ✅
→ But "set it at" might confuse extraction
```

**Note:** Logs show this works, but "at" without entity shouldn't trigger ambiguity check.

---

## Test Coverage Matrix

### Scenario Type | Expected Flow | Status
1. **Complete upfront** (`tomorrow at 2pm for 30min with John about X`) → Immediate `action: "add"` | ✅
2. **Missing time** (`tomorrow with John for 30min`) → Ask "What time?" | ✅
3. **Missing duration** (`tomorrow at 2pm with John`) → Ask "How long?" | ✅
4. **Missing both** (`tomorrow with John`) → Ask time, then duration | ✅
5. **Ambiguous "at"** (`at the AMS team`) → Ask clarification | ✅
6. **Clear location** (`at Conference Room A`) → Extract location | ✅
7. **Filler words** (`at um 2pm`) → Filter "um" | ❌ (extracted as location)
8. **Correction** (`No I said 3pm`) → Clear builder, re-process | ✅ (JUST FIXED)
9. **Decline optional** (`No thanks`) → Finalize with nulls | ✅ (JUST FIXED)
10. **Time parsing** (`noon`, `midnight`, `morning`) → Correct times | ⚠️ (needs verification)

---

## Critical Fixes Needed

### Fix 1: AI Must Create After Duration ⚠️ NEEDS STRENGTHENING
Current instruction is good but needs more emphasis:

```typescript
// Add to route.ts after step 5
🚨🚨🚨 ABSOLUTE REQUIREMENT 🚨🚨🚨
After user provides duration (step 4 answer), you MUST:
- Return action: "add" with full appointment JSON
- Include message: "[confirmation text]"
- DO NOT return action: "respond"
- DO NOT just say "Got it!" without the JSON
  
If you do NOT return action: "add", the appointment will NOT be created!
```

### Fix 2: Context Tracking in Multi-turn Conversations
AI loses track of previously mentioned fields across turns.

**Solution:** Explicitly tell AI to reference earlier messages:

```
When user answers your question, CHECK THE CONVERSATION HISTORY:
- If user mentioned "with [person]" earlier → Include in withWhom
- If user mentioned "about [topic]" earlier → Include in topic
- Don't lose information from earlier messages!
```

---

## Recommended Changes

### Change 1: Simplify Optional Field Handling
Current: Client asks optional fields after AI creates appointment
Problem: Creates complexity with interception logic

**Alternative:** Let AI handle EVERYTHING, remove client-side interception entirely.

Pros:
- Single source of truth
- No interception bugs
- Simpler flow

Cons:
- Relies on AI consistency (but temp=0 helps)
- Previous duplicate question issues

### Change 2: Add Explicit State Tracking
Add a hidden `__appointmentState` field to AI responses:

```json
{
  "action": "respond",
  "message": "What time?",
  "__appointmentState": {
    "withWhom": "AMS team",
    "topic": null,
    "hasAskedTime": false,
    "hasAskedDuration": false
  }
}
```

This ensures AI maintains context across turns.

---

## Quick Wins for Next Deployment

1. ✅ Fixed infinite "No" loop
2. ✅ Fixed withWhom overwrite on decline
3. ⚠️ Need to strengthen "must create after duration" rule
4. ⚠️ Need to add context retention instructions

---

## Test Scenarios to Manually Verify

### Happy Path
1. "Set appointment tomorrow at 2pm for 30min with John" → Immediate creation ✅
2. "Meeting with Sarah" → Ask time → Ask duration → Create ✅

### Edge Cases  
3. "Meeting at um 2pm" → Filter "um" ❌ (still extracts as location)
4. "No I said 3pm" (correction) → Reset and re-process ✅
5. "No thanks" (decline) → Finalize appointment ✅ (JUST FIXED)

### Critical Path
6. Complete flow with all questions → Should maintain withWhom throughout ✅ (JUST FIXED)
