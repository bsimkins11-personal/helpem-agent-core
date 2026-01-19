# helpem iOS UAT Test Plan
**Build 15 - Production Readiness Validation**

---

## Overview

**Total Tests:** 100 questions organized into 4 phases  
**Total Time:** ~60 minutes (all phases)  
**Approach:** Progressive depth - stop at any phase if critical issues found

---

## Phase 1: SMOKE TEST (10 min) ⚡
**Goal:** Verify app is stable enough to continue testing  
**Pass Criteria:** 100% pass rate required  
**Tests:** 12 critical path questions

### 🔴 BLOCKER: Auth & App Launch
- [ ] **Q1** Fresh install from TestFlight → Sign in screen shows
- [ ] **Q2** Sign in with Apple → App opens to main screen
- [ ] **Q3** Close & reopen → Stays signed in (no re-auth)

**If ANY fail:** STOP - Fix before continuing

---

### 🟡 CRITICAL: Voice & Microphone
- [ ] **Q6** First mic button press → iOS permission dialogs appear
- [ ] **Q7** Grant mic & speech permissions → Both granted
- [ ] **Q8** Press mic button → Recording starts
- [ ] **Q12** During recording → Yellow dot appears ✅
- [ ] **Q13** Release mic button → Yellow dot disappears in <1 second ⚡
- [ ] **Q15** Close app completely → Yellow dot disappears ⚡

**If Q13 or Q15 fail:** CRITICAL BUG - This was our main fix

---

### 🟢 BASELINE: Core Creation
- [ ] **Q9** Voice: "Add a reminder to buy milk" → Todo created
- [ ] **Q41** Voice: "Schedule dentist tomorrow at 2pm" → Appointment created
- [ ] **Q56** Voice: "Add habit to meditate daily" → Habit created

**Pass:** 12/12 = Continue to Phase 2  
**Fail:** ≤11/12 = STOP, document issues, fix before Phase 2

---

## Phase 2: CORE FUNCTIONALITY (20 min) 🎯
**Goal:** Validate main user workflows  
**Pass Criteria:** ≥90% pass rate (32/36)  
**Tests:** 36 questions covering primary features

### Voice Input Quality (8 tests)
- [ ] **Q10** Voice with date → "dentist tomorrow at 2pm" works
- [ ] **Q11** Voice with priority → "high priority todo" works
- [ ] **Q16** Simple transcription → "read book" accurate
- [ ] **Q17** Complex transcription → Long sentence accurate
- [ ] **Q18** Multiple items → "eggs, milk, bread" creates 3 items
- [ ] **Q20** Natural language → "tonight at 8pm" works
- [ ] **Q21** Relative dates → "in 2 days at noon" works
- [ ] **Q22** Voice update → "change meeting to 4pm" works

**Critical:** Q17 (complex), Q18 (multiple items)

---

### Todos - CRUD & Priorities (10 tests)
- [ ] **Q26** Create simple todo
- [ ] **Q27** Create with priority
- [ ] **Q28** Create with due date
- [ ] **Q29-32** All priority filters work (All/High/Med/Low)
- [ ] **Q33** Change priority via UI → Saves
- [ ] **Q34** Change priority via voice → Updates
- [ ] **Q35** Complete todo → Strikethrough
- [ ] **Q37** Delete todo → Disappears

**Critical:** Q29-32 (filtering), Q33 (persistence)

---

### Appointments - Calendar Navigation (8 tests)
- [ ] **Q42** Create on specific date → "January 25 at 10am"
- [ ] **Q43** Day view → Shows today only
- [ ] **Q44** Week view → Shows full week
- [ ] **Q45** Month view → Shows full month
- [ ] **Q46** Navigate next day → Advances correctly
- [ ] **Q47** Navigate previous day → Goes back
- [ ] **Q49** Return to today → Jumps to current date
- [ ] **Q50** Edit appointment time → Saves

**Critical:** Q43-45 (view switching), Q50 (editing)

---

### Data Persistence (5 tests)
- [ ] **Q86** Create 10 items, restart → All exist ⚡
- [ ] **Q87** Edit item, restart → Edit saved
- [ ] **Q88** Delete item, restart → Stays deleted
- [ ] **Q61** Create habit, restart → Habit exists
- [ ] **Q75** Grocery list, restart → Items preserved

**Critical:** ALL - This is fundamental stability

---

### Yellow Dot - Extended (5 tests)
- [ ] **Q14** Background app while recording → Dot disappears
- [ ] **Q91** Empty voice input → No crash, no empty item
- [ ] Record voice → Release → Wait 5 seconds → Dot still gone?
- [ ] Record voice → Kill app from switcher → Dot gone immediately?
- [ ] Open app → Dot never appears unless actively recording?

**Critical:** Last 3 (our Build 15 fixes)

---

**Phase 2 Results:**
- Pass: ___/36 (need ≥32 to continue)
- Critical failures: _______________
- Minor issues: _______________

**Decision:** ☐ Continue to Phase 3  ☐ Fix issues first

---

## Phase 3: EXTENDED FEATURES (20 min) 🔧
**Goal:** Validate secondary features & edge cases  
**Pass Criteria:** ≥80% pass rate (32/40)  
**Tests:** 40 questions for depth validation

### Habits & Routines (8 tests)
- [ ] **Q57** Weekly habit creation
- [ ] **Q58** Complete habit for today
- [ ] **Q59** Streak display
- [ ] **Q60** Uncomplete habit
- [ ] **Q62** Edit frequency (daily → weekly)
- [ ] **Q63** Delete habit
- [ ] **Q64** Multiple habits (5+) display
- [ ] **Q65** Habit resets at midnight (skip if can't wait)

---

### Grocery List (8 tests)
- [ ] **Q66** Single item
- [ ] **Q67** Multiple items voice input
- [ ] **Q68** Check off item
- [ ] **Q69** Uncheck item
- [ ] **Q70** Delete single item
- [ ] **Q71** Clear all items
- [ ] **Q72** Duplicate detection
- [ ] **Q74** Special characters

---

### App Lifecycle (8 tests)
- [ ] **Q76** Background app → Smooth
- [ ] **Q77** Foreground app → Same state
- [ ] **Q78** Force close → Clean exit
- [ ] **Q79** Reopen after force close → Data intact
- [ ] **Q80** Restart phone → Data preserved
- [ ] **Q82** Airplane mode → Graceful offline message
- [ ] **Q85** Memory pressure → No crash
- [ ] **Q89** Clear all data → Works, no crash

---

### Advanced Editing (6 tests)
- [ ] **Q36** Uncomplete todo
- [ ] **Q38** Convert todo to appointment
- [ ] **Q51** Edit appointment title
- [ ] **Q52** Delete appointment
- [ ] **Q55** Multiple appointments same day
- [ ] **Q23** Voice delete item

---

### User Feedback (4 tests)
- [ ] **Q24** Thumbs up → Confirmation
- [ ] **Q25** Thumbs down → Correction prompt
- [ ] Try correction → Agent retries
- [ ] Second thumbs up → Success

---

### UI Edge Cases (6 tests)
- [ ] **Q39** Long todo title (100+ chars) → No break
- [ ] **Q40** Special characters in todo → Displays correctly
- [ ] **Q73** Long grocery name → No break
- [ ] **Q100** 50+ items across categories → Still responsive
- [ ] Scroll through all sections → Smooth
- [ ] Switch between tabs rapidly → No lag

---

**Phase 3 Results:**
- Pass: ___/40 (need ≥32 to continue)
- Issues found: _______________

**Decision:** ☐ Continue to Phase 4  ☐ Document & deploy with known issues

---

## Phase 4: STRESS & EDGE CASES (10 min) 💣
**Goal:** Find breaking points & document limitations  
**Pass Criteria:** ≥60% pass rate (7/12) - many expected fails  
**Tests:** 12 adversarial questions

### Invalid Input Handling (6 tests)
- [ ] **Q92** 200+ word voice input → Handles or clips gracefully
- [ ] **Q93** Nonsense input → Appropriate response
- [ ] **Q94** Ambiguous date → Clarifies or picks reasonable
- [ ] **Q95** Past date → Blocks or clarifies
- [ ] **Q96** Invalid time ("25 o'clock") → Handles gracefully
- [ ] **Q97** Rapid button presses (10x) → No crash

---

### Concurrency & Timing (3 tests)
- [ ] **Q98** Create while loading → Both succeed
- [ ] **Q99** Change timezone → Consistent time handling (skip if complex)
- [ ] **Q53** Appointment notification → Fires 1hr before (skip if no time)

---

### Auth Edge Cases (3 tests)
- [ ] **Q4** Sign out → Returns to sign-in
- [ ] **Q5** Re-sign in → Works
- [ ] Sign out → Force close → Reopen → Still signed out

---

**Phase 4 Results:**
- Pass: ___/12 (≥7 is good)
- Expected limitations: _______________
- Unexpected failures: _______________

---

## Final Assessment

### Overall Results
- **Phase 1 (Smoke):** ___/12 (Must be 12/12)
- **Phase 2 (Core):** ___/36 (Must be ≥32)
- **Phase 3 (Extended):** ___/40 (Must be ≥32)
- **Phase 4 (Stress):** ___/12 (Target ≥7)

**TOTAL:** ___/100

---

### Production Readiness Decision

#### ✅ READY FOR ALPHA (85+ total, Phase 1 = 12/12, Phase 2 ≥32)
- All critical paths work
- Core features stable
- Minor issues acceptable for alpha feedback

**Action:** Deploy Build 15 to alpha testers

---

#### ⚠️ NEEDS FIXES (70-84 total, or Phase 2 <32)
- Core features mostly work
- Some critical issues need fixing
- Can deploy with known limitations documented

**Action:** 
1. Document known issues
2. Fix critical bugs (list: _____________)
3. Re-run failed tests
4. Deploy when Phase 2 ≥32

---

#### 🔴 NOT READY (<70 total, or Phase 1 <12)
- Critical functionality broken
- Stability issues
- User experience severely impacted

**Action:**
1. Fix all Phase 1 failures
2. Fix critical Phase 2 failures
3. Re-run full Phase 1 & 2
4. Do NOT deploy until ≥85 total

---

## Critical Bug Log

**Blockers (Must fix before alpha):**
1. _________________________________
2. _________________________________
3. _________________________________

**High Priority (Fix within 1 week):**
1. _________________________________
2. _________________________________
3. _________________________________

**Medium Priority (Monitor in alpha):**
1. _________________________________
2. _________________________________
3. _________________________________

**Known Limitations (Document for users):**
1. _________________________________
2. _________________________________
3. _________________________________

---

## Testing Notes

**Device:** iPhone _____ (iOS ___)  
**Build:** 15  
**Tester:** ___________  
**Date:** ___________  
**Duration:** _____ minutes

**Environment:**
- [ ] WiFi
- [ ] Cellular
- [ ] Low battery mode: Yes / No

**General Observations:**
_________________________________________
_________________________________________
_________________________________________

---

## Next Steps After UAT

### If Pass (≥85):
1. ✅ Document any minor issues
2. ✅ Deploy Build 15 to norayne
3. ✅ Add 3-5 more alpha testers
4. ✅ Monitor for 3-5 days
5. ✅ Collect feedback
6. ✅ Plan fixes for next build

### If Conditional Pass (70-84):
1. ⚠️ Fix critical bugs (list above)
2. ⚠️ Re-run failed sections
3. ⚠️ Deploy with known issues doc
4. ⚠️ Limited alpha (2-3 testers)
5. ⚠️ Daily monitoring

### If Fail (<70):
1. 🔴 Halt deployment
2. 🔴 Fix all Phase 1 issues immediately
3. 🔴 Fix Phase 2 critical issues
4. 🔴 Re-run full UAT
5. 🔴 Do not add testers until stable

---

**Remember:** Alpha is for finding issues. 85% pass is excellent for first alpha build.
