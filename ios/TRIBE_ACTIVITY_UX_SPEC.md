# Tribe Activity – Final UX Recommendation (iOS, Standalone Agent)

## Executive Summary (What We're Optimizing For)

**Tribe Activity should feel like:**

> "Ambient awareness without obligation."

It is **not** chat, **not** a task manager, and **not** a command queue.
It is a calm signal layer that helps users stay connected to people and groups without pressure, guilt, or surveillance.

This design must work equally well for:
- **Family tribes** (high trust, shared logistics)
- **Group tribes** (instructor-led, announcement-heavy, low mutual obligation)

---

## The Three-Layer Model (This Is the Core Insight)

After considering "messages as recovery" idea, the cleanest UX is a **three-layer separation**, each with a different emotional contract:

| Layer | UX Role | User Expectation | Lifetime |
|-------|--------|------------------|----------|
| **Notifications** | Interrupt | "Something changed" | Instant |
| **Activity** | Ambient signal | "What's new?" | ~3 months |
| **Source View** (Calendar / Announcement / Schedule) | Canonical truth | "What exists?" | Long-lived |

❗ **Messages are intentionally excluded from this pipeline**
Messages remain human conversation only.

This separation is what keeps the product calm.

---

## Notifications (Push)

### UX Rules
- Triggered by Activity-worthy events only
- Generic, actor-agnostic copy
- No call-to-action language

### Examples
- "Schedule updated"
- "New class posted for this weekend"
- "Family calendar change"

### Tap Behavior
- Tap → opens Tribe Activity, not Messages
- Notification never deep-links directly to edit flows
- This prevents notifications from feeling like commands.

---

## Tribe Activity (The Heart of This Design)

### What Activity Is
- A read-only bulletin board
- A timeline of relevant changes
- A safe place to glance, ignore, or quietly clear

### What Activity Is Not
- ❌ Not chat
- ❌ Not an audit log
- ❌ Not a place to respond
- ❌ Not a place to prove engagement

### Activity Content Rules

#### Included
- ✅ Calendar changes (create / update / cancel)
- ✅ Admin announcements
- ✅ Select todo changes (family only, conservative)
- ✅ System events (member joined, schedule posted)

#### Excluded
- ❌ Grocery updates
- ❌ Proposal acceptance states
- ❌ Message activity
- ❌ Any "who did what" detail

---

## Visual & Interaction Design (iOS-Specific)

### Visual Tone
- Neutral cards
- Soft hierarchy
- No urgency indicators
- No counters beyond "new"

### Interaction
- **Tap** → read-only detail view of the source if accessible
- **Long-press / swipe** → Hide
- **No reactions.**
- **No comments.**
- **No acknowledgements.**

---

## Silent Deletion (Critical UX Pattern)

### User Action
When a user hides an Activity entry:
1. It disappears immediately
2. A toast appears: **"Activity hidden · Undo"**
3. Undo window: **5 seconds**

### After Undo
- Entry remains hidden only for that user
- Tribe and admins are never notified
- No analytics exposed socially

This preserves:
- **autonomy**
- **forgiveness**
- **trust**

---

## Accidental Deletion: How Recovery Works (Key Decision)

This is where "messages as recovery" instinct was directionally right, but needed refinement.

### Final Recommendation

👉 **Recovery happens from the canonical source, not Activity and not Messages.**

### Example Flow
1. Yoga instructor updates schedule
2. User:
   - sees notification
   - sees Activity
   - taps → read-only schedule view
3. User adds class to calendar
4. User deletes it locally
5. Later:
   - user goes back to the schedule view
   - re-adds if needed

**Activity is not the recovery surface.**
**Messages are not the recovery surface.**
**The thing itself is.**

This avoids:
- social pressure
- chat pollution
- admin dominance
- "did you act on this?" vibes

---

## Messages (Intentionally Separate)

Messages are:
- Human
- Conversational
- Optional
- Pull-based

They:
- Do **not** receive system notifications
- Do **not** act as a command queue
- Do **not** store recoverable system events

If someone wants to respond:
- "Cool, see you there"
- They go to Messages by choice.

---

## Family vs Group UX Differences (Subtle, Not Structural)

### Family Tribes
- More members may create Activity (permissioned)
- Activity feels logistical and shared
- Higher likelihood of calendar deep-links

### Group Tribes
- Activity is admin-owned
- Feels broadcast-like
- Non-admins mostly consume

### But:
- Same UI
- Same rules
- Same calm contract

This consistency is key for long-term scale.

---

## iOS Mental Model (What Users Feel)

- **Notifications** = tap if I care
- **Activity** = scan if I want
- **Source views** = act if I choose
- **Messages** = talk if I feel like it

**No layer demands action.**
**No layer watches compliance.**

---

## Why This Scales to Your Future Vision (TV Command Center)

This model:
- Maps perfectly to a passive display
- Activity becomes the ambient feed
- Messages remain second-screen
- Source views remain interactive on personal devices

You've essentially designed a calm information architecture, not just a feature.

---

## Final UX Recommendation (One Sentence)

> **Keep notifications lightweight, Activity ambient and dismissible, Messages human-only, and recovery anchored to canonical sources — never to social surfaces.**

---

## Implementation Requirements

### Backend
- Activity entries must be user-dismissible (per-user hidden state)
- Activity entries must not include proposal acceptance states
- Activity entries must not include message activity
- Activity entries must be actor-agnostic (no "who did what" detail)

### iOS
- Activity view must be read-only
- Tap → navigate to source view (read-only)
- Long-press / swipe → Hide with undo toast
- No reactions, comments, or acknowledgements
- Separate from Messages (different tab/section)

### Notifications
- Push notifications for Activity-worthy events only
- Tap notification → opens Activity view
- Never deep-link to edit flows
- Generic, actor-agnostic copy

---

**Status:** Final Specification
**Last Updated:** January 2025
