# Final Pricing & Tier Recommendation for helpem

**Status:** Ready for Beta Launch  
**Target Gross Margin:** 64-65% Year 1, 79% Year 2+  
**Last Updated:** January 19, 2026

---

## 3-Tier Structure

### 🆓 Free (Conversion Engine)

**Price:** $0

**Features:**
- ✅ Premium voice (neural TTS, native STT)
- ✅ 10 active todos
- ✅ 5 appointments
- ✅ 5 habits
- ✅ 50 AI messages/month
- ✅ All notification types
- ✅ Basic help docs

**Goal:** Let users form habits and experience quality before asking for money.

**Cost:** ~$0.05/user/month  
**Conversion Target:** 8-12% to paid within 30 days

---

### ⭐ Basic - $7.99/month

**Price:** 
- **Monthly:** $7.99/month
- **Annual:** $79/year (save $17, ~17% off)
- **7-day free trial** (with explicit confirmation)

**Features:**
- ✅ Everything in Free
- ✅ 100 todos, 50 appointments, 20 habits
- ✅ 300 AI messages/month
- ✅ Data export (CSV, JSON)
- ✅ Cloud backup (automatic daily)
- ✅ Calendar sync (Google, Apple)
- ✅ Email support (24-48hr response)
- ✅ No ads

**Value Proposition:**  
*"Remove all limits and unlock productivity features. Perfect for power users who need more space."*

**Target Audience:** 70-80% of paid users (sweet spot)

**Gross Margin:** 64.6% Year 1 → 79% Year 2+

---

### 💎 Premium - $14.99/month

**Price:**
- **Monthly:** $14.99/month  
- **Annual:** $149/year (save $31, ~17% off)
- **7-day free trial** (with explicit confirmation)

**Features:**
- ✅ Everything in Basic
- ✅ Unlimited todos, appointments, habits
- ✅ Unlimited AI messages (3,000/mo fair use policy)
- ✅ Advanced AI (proactive suggestions, context memory)
- ✅ Voice customization (speed, accent selection)
- ✅ Priority support (4-hour response, chat)
- ✅ Early access to new features
- ✅ Productivity analytics & insights
- ✅ API access (future)

**Value Proposition:**  
*"Superfan tier. Advanced AI, full customization, and priority everything. For those who want the best."*

**Target Audience:** 20-30% of paid users (high ARPU)

**Gross Margin:** 62% Year 1 → 77% Year 2+

---

## Feature Comparison Matrix

| Feature | Free | Basic | Premium |
|---------|------|-------|---------|
| **Core** |
| Todos | 10 | 100 | ∞ |
| Appointments | 5 | 50 | ∞ |
| Habits/Routines | 5 | 20 | ∞ |
| Grocery List | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |
| **Voice** |
| Premium Neural Voice | ✅ | ✅ | ✅ |
| Voice Speed Control | ❌ | ✅ | ✅ |
| Voice Accent Selection | ❌ | ❌ | ✅ |
| **AI Assistant** |
| AI Messages/Month | 50 | 300 | ∞* |
| Context Memory | ❌ | ❌ | ✅ |
| Proactive Suggestions | ❌ | ❌ | ✅ |
| Smart Automation | ❌ | ❌ | ✅ |
| **Data & Sync** |
| Cloud Backup | ❌ | ✅ | ✅ |
| Data Export | ❌ | ✅ | ✅ |
| Calendar Sync | ❌ | ✅ | ✅ |
| **Experience** |
| Ads | Optional | ❌ | ❌ |
| Custom Themes | Default | Basic | Premium |
| Analytics Dashboard | ❌ | ❌ | ✅ |
| **Support** |
| Help Docs | ✅ | ✅ | ✅ |
| Email Support | ❌ | 24-48hr | 4hr |
| Chat Support | ❌ | ❌ | ✅ |
| **Beta Features** |
| Early Access | ❌ | ❌ | ✅ |

\* Fair use policy: 3,000 messages/month soft cap to prevent abuse

---

## Pricing Philosophy

### Why This Works

**Free Tier:**
- Premium voice at all tiers = competitive advantage
- 50 messages = enough to form habits (10-14 days)
- Cost: 3 cents/user (trivial)

**Basic Tier:**
- $7.99 = impulse buy threshold for productivity apps
- Removes all friction (limits, ads)
- 64.6% margin = sustainable + room for growth

**Premium Tier:**
- $14.99 = justified by advanced AI features
- Attracts superfans (high LTV, low churn)
- 62% margin = healthy even with higher feature costs

**Annual Plans:**
- 17% discount (standard in market)
- Locks in users → better retention
- Improves Year 2+ margin (Apple fee drops to 15%)

---

## Revenue Projections (10,000 Users)

### User Distribution

| Tier | Users | % | ARPU |
|------|-------|---|------|
| Free | 7,000 | 70% | $0 |
| Basic | 2,400 | 24% | $7.99 |
| Premium | 600 | 6% | $14.99 |

### Annual Revenue

| Tier | Monthly | Annual |
|------|---------|--------|
| Basic | $19,176 | $230,112 |
| Premium | $8,994 | $107,928 |
| **Total** | **$28,170** | **$338,040** |

### Margins

- **Gross Revenue:** $338,040/year
- **COGS:** $15,480/year (3,000 paid users × $0.43/mo × 12)
- **Infrastructure:** $3,000/year
- **Apple Fees (Year 1):** $101,412 (30%)
- **Gross Profit:** $218,148
- **Gross Margin:** **64.5%** ✅

**Year 2+ Margin:** 78.2% (Apple fee drops to 15%)

---

## Implementation Strategy

### Phase 1: Alpha (Current)

**Status:** Free for everyone, no subscriptions

**Focus:**
- Polish core features
- Gather feedback
- Fix bugs
- Build retention metrics

**Duration:** 2-4 weeks

---

### Phase 2: Beta Launch (Paid)

**Status:** Implement subscriptions with RevenueCat

**Week 1:**
- Set up RevenueCat account
- Configure products & entitlements
- Implement `SubscriptionManager.swift`
- Build paywall UI

**Week 2:**
- Implement 7-day trial with explicit confirmation
- Add feature gating logic
- Test in Sandbox
- Polish & QA

**Week 3:**
- Submit to App Store Review
- Launch paid beta
- Monitor conversion metrics

**Duration:** 3 weeks

---

### Phase 3: Optimize (Post-Launch)

**Goals:**
- Monitor Free → Paid conversion (target: 8-12%)
- Track churn rate (target: <5%/month)
- A/B test pricing ($6.99 vs $7.99 vs $8.99)
- Optimize onboarding flow
- Build retention campaigns

**Duration:** Ongoing

---

## Competitive Positioning

### vs. Todoist

| Feature | Todoist Pro | helpem Basic |
|---------|-------------|--------------|
| Price | $4/mo | $7.99/mo |
| Voice | ❌ | ✅ Premium |
| AI | ❌ | ✅ Conversational |
| Tasks | Unlimited | 100 |
| **Advantage** | Cheaper | Voice-first, AI-native |

### vs. Things 3

| Feature | Things 3 | helpem |
|---------|----------|--------|
| Price | $49.99 (one-time) | $7.99/mo |
| Voice | ❌ | ✅ Premium |
| AI | ❌ | ✅ Native |
| Cross-platform | iOS/Mac only | iOS (Android future) |
| **Advantage** | One-time payment | AI + Voice, cloud sync |

### vs. Notion

| Feature | Notion Personal | helpem Premium |
|---------|-----------------|----------------|
| Price | $10/mo | $14.99/mo |
| Voice | ❌ | ✅ Premium |
| AI | ✅ Bolt-on | ✅ Native |
| Complexity | High (power users) | Low (everyone) |
| **Advantage** | Docs/databases | Voice-first, simpler UX |

**helpem's Unique Position:**  
*"Only voice-first life assistant with premium AI and neural voice at every tier. Stay organized without typing."*

---

## Key Metrics to Track

### Conversion Funnel

| Stage | Metric | Target |
|-------|--------|--------|
| Install → Active | DAU/MAU ratio | 40% |
| Active → Free Trial | Trial start rate | 80% |
| Free Trial → Paid | Trial conversion | 40-50% |
| **Overall Free → Paid** | Conversion rate | **8-12%** |

### Retention

| Cohort | Metric | Target |
|--------|--------|--------|
| Day 7 | Still active | 60% |
| Day 30 | Still active | 40% |
| Month 2 | Still subscribed | 95% |
| Month 6 | Still subscribed | 85% |

### Revenue

| Metric | Target |
|--------|--------|
| MRR | $10K by Month 3 |
| ARPU (paid) | $9.50 |
| LTV:CAC | >3:1 |
| Churn (monthly) | <5% |

---

## Final Recommendation Summary

### Pricing

✅ **Free:** $0 (50 AI messages, 10 todos, premium voice)  
✅ **Basic:** $7.99/month or $79/year (7-day free trial)  
✅ **Premium:** $14.99/month or $149/year (7-day free trial)

### Implementation

✅ Use **RevenueCat** (not custom backend)  
✅ Implement **explicit trial confirmation** (Day 7 modal)  
✅ Launch **after alpha stabilizes** (2-4 weeks)

### Success Criteria

✅ **Gross margin:** 64-65% Year 1 → 79% Year 2+  
✅ **Free → Paid:** 8-12% conversion  
✅ **Churn:** <5% monthly  
✅ **LTV:CAC:** >3:1

---

## When You're Ready to Implement

### Resources Created

1. **REVENUECAT_IMPLEMENTATION.md** - Complete Swift code + setup guide
2. **TRIAL_CONFIRMATION_FLOW.md** - Ethical 7-day trial UX with Day 7 modal
3. **MONETIZATION_STRATEGY_2026.md** - Full financial analysis
4. **This document** - Quick reference for final decision

### Estimated Implementation Time

- RevenueCat setup: **2 days**
- Trial confirmation flow: **3 days**
- Polish & testing: **2 days**
- **Total: 1 week** (vs 6-8 weeks custom backend)

---

## Questions to Answer Before Launch

1. **User base size:** How many alpha users do you have? (Need baseline for conversion projections)
2. **Target launch date:** When do you want to exit alpha? (Determines timeline)
3. **Support capacity:** Do you have resources for 24-48hr email support? (Basic tier requirement)
4. **Analytics:** Do you have event tracking set up? (Need to measure conversion funnel)
5. **Legal:** Do you have Terms of Service + Privacy Policy? (Apple requirement)

---

**Final Word:** Don't implement until alpha is stable and you're confident in core features. When ready, use RevenueCat to launch in 1 week instead of 2 months. Your pricing is competitive, your margins are healthy, and your value proposition (voice-first + AI) is unique.

**You're ready to build a profitable business.** 🚀
