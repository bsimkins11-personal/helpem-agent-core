# Meta Ads Optimization Strategy - Beta Launch

**Date:** January 19, 2026  
**Status:** Ready for Beta Implementation  
**Budget:** $100/month (~$3.33/day)  
**Timeline:** 2-3 weeks to full optimization

---

## Executive Summary

**Goal:** Optimize Meta Ads for **activated users**, not just installs.

**Activation Definition:** User completes first successful voice interaction (speech → AI response → confirmation).

**Strategy:** Start with install optimization (cold start), then switch to `FirstVoiceInteraction` optimization once Meta has enough signal.

**Why This Works:** Meta learns to find users who actually use the app, not just download it.

---

## Campaign Setup

### Campaign Objective

**Use:** `App Installs`

**Why:** You cannot directly optimize for custom events at campaign creation on iOS. Start here, then optimize deeper.

---

### Optimization Event (What Meta Actually Learns From)

**Target:** `FirstVoiceInteraction`

**Definition:** User successfully completes one voice interaction:
1. User speaks (STT)
2. AI responds
3. User hears/sees confirmation
4. Fires **once per user, never again**

---

## Rollout Plan - DO NOT SKIP STEPS

### Phase 1: Cold Start (Week 1)

**Goal:** Gather signal volume for Meta to learn from.

**Setup:**
- Campaign objective: `App Installs`
- Optimization: `Install`
- Budget: `$100/month` (~$3.33/day)
- Audience: Broad targeting (let Meta learn)

**Why:**
- Meta requires ~30-50 `FirstVoiceInteraction` events before it can optimize for that event
- Jumping straight to a deep event with no data = delivery failure
- Cold start with installs gets you the initial signal

**Expected Results (Week 1):**
- 30-80 installs
- 10-30 FirstVoiceInteraction events
- CPI: $1.25-$3.00 (broad, unoptimized)

**Action at End of Week 1:**
- Check: Do you have ≥50 `FirstVoiceInteraction` events (lifetime)?
- If YES → Move to Phase 2
- If NO → Continue 1 more week

---

### Phase 2: Switch Optimization (Week 2-3)

**When:** After you have ≥50 `FirstVoiceInteraction` events (lifetime, not per campaign)

**Setup:**
1. **Duplicate the Phase 1 campaign** (keeps learning history)
2. Change optimization event: `Install` → `FirstVoiceInteraction`
3. **Pause the old install-optimized campaign**
4. Let new campaign run for 7-14 days

**Why:**
- Meta now has enough signal to find users who actually activate
- Algorithm converges on "people who talk to AI apps"
- CPI may rise, but Cost per Activated User drops

**Expected Results (Week 2-3):**
- CPI increases: $2.50-$3.50 (more qualified users)
- Cost per FirstVoiceInteraction: $3.00-$4.00
- Install → Voice rate: 30-40% (vs 15-25% in Phase 1)
- Better quality users (more likely to convert to paid)

---

### Phase 3: Steady State (Week 4+)

**Optimization:** `FirstVoiceInteraction` (locked in)

**Budget:** Continue $100/month, or scale if profitable

**Ongoing:**
- Monitor KPIs weekly
- Let Meta's algorithm learn (don't touch for 7 days after changes)
- Scale budget only after 14-day profitability confirmed

---

## Event Implementation

### Exact Event Definition

**Event Name:** `FirstVoiceInteraction`

**When to Fire:**
1. ✅ User speaks (STT succeeds)
2. ✅ AI response generated
3. ✅ Response delivered (TTS starts or text shown)
4. ✅ User sees/hears confirmation ("Got it")

**When NOT to Fire:**
- ❌ On app install
- ❌ On onboarding complete
- ❌ On permission granted
- ❌ On failed voice attempts
- ❌ On text-only usage
- ❌ Ever again after first time

**Fire Exactly Once Per User.**

---

## Implementation Guide

### Step 1: Define Activation State

**iOS (UserDefaults + Backend Sync):**

```swift
// In User model or AppState
@AppStorage("hasCompletedFirstVoiceInteraction") 
private var hasCompletedFirstVoiceInteraction = false
```

**Backend (Database):**

```sql
ALTER TABLE users 
ADD COLUMN has_completed_first_voice_interaction BOOLEAN DEFAULT FALSE;
```

**Sync Logic:**
- iOS writes to UserDefaults immediately (fast, offline-safe)
- iOS syncs to backend on next API call (redundancy)
- Backend becomes source of truth across devices

---

### Step 2: Detect Voice Success

**In `WebViewContainer.swift` or Speech Manager:**

```swift
// After successful voice interaction
func onVoiceInteractionComplete(success: Bool) {
    guard success else { return }
    
    // Check if this is the first time
    if !hasCompletedFirstVoiceInteraction {
        // Fire Meta event
        fireMetaFirstVoiceInteraction()
        
        // Mark as complete (never fire again)
        hasCompletedFirstVoiceInteraction = true
        
        // Sync to backend
        syncActivationToBackend()
    }
}
```

**Trigger Points:**
- After `webView.evaluateJavaScript("window.updateUserText(...)")` succeeds
- After AI response is received and spoken/displayed
- NOT on transcription start, only on completion

---

### Step 3: Fire Meta SDK Event

**Install Meta SDK (if not already):**

```bash
# In ios/ directory
pod 'FBSDKCoreKit'
pod install
```

**Initialize in `AppDelegate.swift`:**

```swift
import FBSDKCoreKit

func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
    ApplicationDelegate.shared.application(
        application,
        didFinishLaunchingWithOptions: launchOptions
    )
    return true
}
```

**Fire Event:**

```swift
import FBSDKCoreKit

func fireMetaFirstVoiceInteraction() {
    AppEvents.shared.logEvent(.init("FirstVoiceInteraction"))
    
    print("✅ Meta Event: FirstVoiceInteraction fired")
}
```

**That's it.** No parameters needed. Keep it simple.

---

### Step 4: Backend Mirror (Optional but Recommended)

**In `/api/chat/route.ts` or wherever voice success is confirmed:**

```typescript
// After AI response is sent and confirmed delivered
if (user && !user.hasCompletedFirstVoiceInteraction) {
  await prisma.user.update({
    where: { id: user.id },
    data: { hasCompletedFirstVoiceInteraction: true }
  });
  
  // Log for analytics
  console.log(`✅ User ${user.id} completed FirstVoiceInteraction`);
}
```

**Why Backend Mirror?**
- Redundancy (if iOS event fails to send)
- Cross-device consistency
- Server-side analytics
- Attribution validation

---

### Step 5: QA Checklist

Before launching Meta Ads:

- [ ] Event fires once per user (test with new install)
- [ ] Event does NOT fire on failed voice attempts
- [ ] Event survives app restart (check UserDefaults persistence)
- [ ] Event does NOT fire for text-only usage
- [ ] Event visible in Meta Events Manager (test with test device)
- [ ] Backend flag syncs correctly

**Test Script:**
```
1. Install app (fresh)
2. Complete onboarding
3. Say "Remind me to test" (voice input)
4. Confirm AI responds
5. Check Xcode console: "✅ Meta Event: FirstVoiceInteraction fired"
6. Close app, reopen
7. Say "Remind me to test again"
8. Confirm event does NOT fire again
```

---

## KPI Targets (So You Know It's Working)

### Healthy Metrics (After Phase 2)

| Metric | Target | Status |
|--------|--------|--------|
| **CPI** | $2.50–$3.50 | ✅ Acceptable (qualified users cost more) |
| **Cost / FirstVoiceInteraction** | ≤ $4.00 | ✅ Key metric |
| **Install → Voice Rate** | ≥ 30% | ✅ Quality signal |
| **Voice → Paid (14 days)** | ≥ 7% | ✅ Monetization health |

### Red Flags

| Metric | Red Flag | Action |
|--------|----------|--------|
| **Install → Voice Rate** | < 25% | Fix onboarding, not ads |
| **Cost / FirstVoiceInteraction** | > $6.00 | Poor targeting or creative |
| **Voice → Paid** | < 3% | Product or pricing issue |
| **CPI** | > $5.00 | Audience too narrow |

---

## Budget Reality Check (CFO Perspective)

### With $100/month:

**Week 1 (Install optimization):**
- ~30-80 installs
- ~10-30 FirstVoiceInteraction events
- Cost per FirstVoiceInteraction: ~$3-10 (unoptimized)

**Week 2-3 (FirstVoiceInteraction optimization):**
- ~20-40 installs (fewer, but better quality)
- ~10-15 FirstVoiceInteraction events
- Cost per FirstVoiceInteraction: ~$3-4 (optimized)

**Week 4+ (Steady state):**
- ~8-12 activated users/week
- ~$4 per activated user
- **If 7% convert → $57 per paid user**

### Unit Economics Check

**At $4.99 Basic, 7% conversion:**

```
100 installs → 30 activate → 2 convert (7%)
Spend: $400
Revenue: $9.98 (2 × $4.99)
Month 1 ROAS: -$390

BUT: LTV over 12 months
2 users × $4.99 × 6 months average = $59.88
Breakeven at ~7 months
Profitable at 12 months
```

**This is normal for consumer apps.** Optimize for LTV, not Month 1 ROAS.

---

## Meta Campaign Settings

### Targeting (Start Broad)

**Location:**
- United States (or your primary market)

**Age:**
- 25-65 (adults with disposable income)

**Interests:**
- Productivity apps
- AI / ChatGPT
- Task management
- Voice assistants
- Notion / Todoist users

**Detailed Targeting:**
- Let Meta's algorithm find the audience
- Do NOT over-narrow (kills learning)

**Placement:**
- Automatic placements (let Meta optimize)
- Facebook Feed
- Instagram Feed
- Instagram Stories
- Audience Network

---

### Creative Guidelines

**Static Image Ad:**
- Show voice input UI
- "Say it. Done." or "Your AI assistant that listens"
- Premium voice quality callout: "Premium voice. Free."

**Video Ad (5-15 seconds):**
- Show user speaking
- Show AI response
- Show task created
- Text overlay: "Try helpem free. No typing required."

**Copy:**
- "Tired of typing todos? Just say it."
- "Premium AI voice assistant. Free tier available."
- "100 AI messages/month free. Upgrade for unlimited."

**CTA:**
- "Install Now"
- "Try Free"

---

## Monitoring & Iteration

### Check Daily (Week 1-2)
- Meta Events Manager: Is `FirstVoiceInteraction` firing?
- Delivery: Is campaign spending budget?
- CPI: Is it within $1-5 range?

### Check Weekly (Week 3+)
- Cost per FirstVoiceInteraction: Trending down?
- Install → Voice rate: Improving?
- Voice → Paid rate: Above 5%?

### Monthly Review
- ROAS (6-month LTV)
- Cohort retention (do activated users stay?)
- Scale decision: Increase budget or pause?

---

## Troubleshooting

### "Campaign Not Delivering"
- **Cause:** Audience too narrow or budget too low
- **Fix:** Expand targeting, increase budget to $5/day

### "CPI Too High (>$5)"
- **Cause:** Poor creative or wrong audience
- **Fix:** Test new creatives, broaden targeting

### "Install → Voice Rate Low (<20%)"
- **Cause:** Onboarding friction, not ads
- **Fix:** Improve onboarding flow (not Meta's fault)

### "FirstVoiceInteraction Not Firing"
- **Cause:** Event implementation bug
- **Fix:** Check QA checklist, verify Meta Events Manager

---

## Cursor Implementation Prompt

**Paste this directly into Cursor:**

```
# TASK: Implement Meta Optimization for First Voice Interaction (iOS)

## Context
We are running Meta Ads for an iOS app.
We want Meta to optimize for *activated users*, not installs.
Activation = user completes their first successful voice interaction.

## Objective
Implement a Meta App Event called `FirstVoiceInteraction` and wire it so:
- It fires exactly once per user
- It fires only after a successful voice round-trip
- It becomes the primary optimization signal for Meta Ads

## Implementation Steps

### Step 1: Define Activation State
Add a persistent flag to the user model:
- hasCompletedFirstVoiceInteraction: boolean (default false)

This flag must persist across sessions (UserDefaults + backend sync if available).

### Step 2: Fire Event on Success
In the native iOS layer (where voice success is confirmed):
- After speech recognition completes
- After AI response is received
- After TTS playback starts or text response is shown

If `hasCompletedFirstVoiceInteraction == false`:
- Fire Meta event: `FirstVoiceInteraction`
- Set flag to true
- Do NOT fire again

### Step 3: Meta SDK Event
Use Meta SDK to log:

Event name: `FirstVoiceInteraction`
No parameters required (keep it simple).

### Step 4: Backend (Optional but Preferred)
If backend analytics exist:
- Mirror the event server-side for redundancy
- Ensure user_id consistency

### Step 5: QA Checklist
- Event fires once per user
- Event does NOT fire on failed voice attempts
- Event survives app restarts
- Event does NOT fire for text-only usage

## Constraints
- Do not fire on install
- Do not fire on onboarding
- Do not fire on permission grant
- Only fire on actual voice usage success
```

---

## Final Confirmation Checklist

Before launching Meta Ads:

- [ ] `FirstVoiceInteraction` event implemented (iOS + backend)
- [ ] QA passed (fires once, survives restart, only on success)
- [ ] Meta SDK installed and initialized
- [ ] Meta Events Manager shows test events
- [ ] Meta Ads account set up
- [ ] Creative assets ready (image + video)
- [ ] Budget approved: $100/month
- [ ] Phase 1 campaign created (Install optimization)
- [ ] Monitoring dashboard set up (Meta + internal analytics)

---

## Timeline Summary

| Week | Phase | Optimization | Expected Outcome |
|------|-------|--------------|------------------|
| **1** | Cold Start | Install | 30-80 installs, 10-30 voice events |
| **2-3** | Switch | FirstVoiceInteraction | Learning period, CPI rises, quality improves |
| **4+** | Steady State | FirstVoiceInteraction | Optimized: ~8-12 activated users/week @ $4 each |

---

## Economics Summary

**Month 1:**
- Spend: $100
- Activated users: ~30-50
- Cost per activation: ~$2-3.33
- Paid conversions: 2-4 (7% rate)
- Revenue: $10-20
- **Net: -$80 to -$90** (expected)

**Month 6 (same cohort):**
- LTV per user: ~$30 (6 months × $4.99)
- 2-4 paid users × $30 = $60-120
- **Approaching breakeven**

**Month 12:**
- LTV per user: ~$60 (12 months × $4.99)
- 2-4 paid users × $60 = $120-240
- **Profitable: +$20 to +$140**

---

## Key Insights

### Why This Works
1. **Meta learns quality** - Algorithm finds users who actually use voice
2. **Cheaper than broad installs** - Activated users cost $4 vs $15+ with poor targeting
3. **Better retention** - Users who voice interact are 3x more likely to stay
4. **Scalable** - Once optimized, you can increase budget confidently

### Why $100/month Is Smart for Beta
- ✅ Enough signal for Meta to learn
- ✅ Low risk if economics don't work
- ✅ Forces focus on product quality (not just ad spend)
- ✅ Proves unit economics before scaling

### When to Scale
**Only after:**
- 6-month LTV > $30 (6x cost per activation)
- 14-day paid conversion > 7%
- Product NPS > 8/10

**Then scale to:**
- $500/month (5x)
- Then $1,000/month (10x)
- Then $5,000/month (50x)

---

## Summary

✅ **Strategy Locked:**
- Start with Install optimization (Week 1)
- Switch to FirstVoiceInteraction (Week 2-3)
- Optimize for activated users, not installs

✅ **Budget Locked:**
- $100/month (~$3.33/day)
- Expect ~8-12 activated users/week
- Cost per activation: ~$4

✅ **KPIs Locked:**
- CPI: $2.50-$3.50
- Install → Voice: ≥30%
- Voice → Paid: ≥7%

✅ **Implementation Ready:**
- Clear event definition
- iOS + backend code guidelines
- QA checklist
- Meta campaign setup

---

**Ready to implement when beta launches.** 🚀

**Next Steps:**
1. Implement `FirstVoiceInteraction` event (use Cursor prompt)
2. QA thoroughly (test event firing)
3. Set up Meta Ads account
4. Create Phase 1 campaign (Install optimization)
5. Launch with $100/month
6. Monitor for 7 days
7. Switch to FirstVoiceInteraction optimization
8. Let it learn for 14 days
9. Review economics and scale decision
