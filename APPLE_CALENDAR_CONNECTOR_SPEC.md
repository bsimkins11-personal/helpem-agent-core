# Apple Calendar Connector - Implementation Spec

**Status:** 📋 Ready for Implementation  
**Priority:** Future Feature  
**Platform:** iOS (HelpEm)

---

## Objective

Expose Apple Calendar as a first-class **Connector** so users can:

- ✅ Discover calendar integration intentionally
- ✅ Connect / disconnect Apple Calendar explicitly
- ✅ Understand what helpem can and cannot do with their calendar
- ✅ Maintain trust and autonomy

**Core Principle:** Apple Calendar must never feel implicit or hidden.

---

## Connectors UX Requirements

### Placement

**Location:** Menu → Connectors

Apple Calendar appears alongside:
- Google Calendar (future)
- Other external integrations

### Display Row (Collapsed)

**Apple Calendar**
- Icon: system calendar glyph
- Status:
  - Not Connected
  - Connected
- Subtitle:
  - Not connected: "View and add events you approve"
  - Connected: "Syncing your personal calendar"

**Action:** Tapping the row opens Apple Calendar Connector Detail

---

## Apple Calendar Connector – Detail Screen

### States

#### 1. Not Connected

**Show:**
- Short explanation (plain language):
  > "Connect Apple Calendar to let helpem see your schedule and add events you approve."

- Capabilities list:
  - ✓ View your schedule
  - ✓ Add accepted events
  - ✗ Never shared with others

- Primary CTA: **"Connect Apple Calendar"**
  - Triggers EventKit permission request

#### 2. Connected

**Show:**
- Status: Connected
- Account: "This device's calendars"
- Toggles:
  - Show my calendar in helpem (read)
  - Allow helpem to add events (write)
  - **Note:** write toggle only controls usage, not permission; permission is managed by iOS

- Secondary actions:
  - "Manage iOS Permissions" → opens system Settings
  - "Disconnect Apple Calendar"

---

## Permission Handling Rules (Critical)

### ❌ Do NOT
- Request permission on app launch
- Request permission from random flows

### ✅ DO
Request permission **only** when:
- User taps "Connect Apple Calendar"
- User explicitly tries to add an event

### If Permission Denied
- Connector stays **Not Connected**
- Show inline message:
  > "Calendar access is disabled in iOS Settings."
- CTA: "Open Settings"

---

## Technical Implementation

### Connector State Model

```swift
enum ConnectorStatus {
    case notConnected
    case connected(read: Bool, write: Bool)
}
```

### Source of Truth

**CalendarAccessManager**
- checks `EKEventStore.authorizationStatus(for: .event)`
- publishes status to Connectors UI

### Connector ViewModel Responsibilities
- Reflect permission state
- Handle connect/disconnect intents
- **Never** directly call EventKit APIs (delegate to service)

---

## Connect Flow (Step-by-Step)

1. User opens **Menu → Connectors**
2. Taps **Apple Calendar**
3. Taps **"Connect Apple Calendar"**
4. iOS permission sheet appears
5. **If granted:**
   - Update Connector status → Connected
   - Enable calendar-related features
6. **If denied:**
   - Remain Not Connected
   - Provide Settings redirect

---

## Disconnect Behavior

When user taps **"Disconnect Apple Calendar"**:

- ❌ Do not revoke iOS permission (Apple does not allow this)
- ✅ Instead:
  - Disable all calendar reads
  - Disable all calendar writes
  - Clear cached calendar data
  - Connector UI returns to **Not Connected**

**Copy:**
> "Apple Calendar disconnected. helpem will no longer access your schedule."

---

## Interaction With Other Features

### Tribe / Calendar Logic

Before any calendar read/write:
1. Check `ConnectorStatus == connected`
2. If not connected:
   - Prompt user to visit Connectors

### Activity & Proposals

- Never auto-connect Apple Calendar
- Calendar usage always flows from Connector opt-in

---

## Edge Cases (Must Handle)

### Permission granted → later revoked in iOS Settings
- Connector should detect and update to **Not Connected**

### App reinstall
- Re-check permission
- Do not assume connection

### Multiple calendars on device
- Default to primary calendar
- Advanced selection later (not v1)

---

## Analytics (Internal Only)

### ✅ Allowed
- Connector opened
- Connect tapped
- Permission granted / denied
- Disconnect tapped

### ❌ Disallowed
- Logging calendar contents
- Logging event titles or times

---

## Non-Goals (Explicit)

- ❌ No background syncing without connection
- ❌ No automatic calendar writes
- ❌ No silent permission requests
- ❌ No exposure of calendar data to tribes

---

## UX Principle to Encode in Code Reviews

> **"If a user hasn't visited Connectors, we haven't earned calendar access."**

---

## Implementation Checklist

### Phase 1: Core Connector
- [ ] Create `CalendarAccessManager` service
- [ ] Create `ConnectorStatus` enum
- [ ] Build Connectors menu screen
- [ ] Build Apple Calendar detail screen
- [ ] Implement EventKit permission flow

### Phase 2: Integration
- [ ] Connect to Tribe appointments
- [ ] Add "Add to Calendar" for proposals
- [ ] Handle permission changes
- [ ] Test disconnect flow

### Phase 3: Polish
- [ ] Error states
- [ ] Settings deep link
- [ ] Analytics (privacy-safe)
- [ ] Edge case handling

---

**Saved for Future Implementation**  
**Date Saved:** January 23, 2026  
**Next Step:** Finish current build errors, then implement Connectors architecture
