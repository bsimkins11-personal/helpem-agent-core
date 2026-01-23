# Tribe (Standalone Agent) – iOS Implementation Summary

## Product Invariants (Must Never Break)

### 1. Proposals, Not Assignments
- **Explicit accept required**: All tribe items are proposals that require explicit acceptance
- **No auto-add**: Items never automatically appear in personal lists without user action
- **User choice**: Every proposal is a choice, not an obligation

### 2. No Social Pressure

#### Visibility Rules
- ❌ **No acceptance visibility**: Other members cannot see who accepted/declined
- ❌ **No acceptance counts**: No "3 of 5 accepted" displays
- ❌ **No read receipts**: No indicators of who has seen proposals
- ❌ **No analytics tied to acceptance**: Acceptance rates not tracked or displayed

#### Reminder Rules
- ❌ **No reminders**: No push notifications or in-app nudges for pending proposals
- ❌ **No "you have X pending" badges**: Only show count, not pressure
- ❌ **No time-based escalation**: Proposals don't become "urgent" over time

#### Activity Feed Rules
- ❌ **No "X accepted" events**: Activity feed never shows acceptance events
- ❌ **No acceptance counts**: No aggregated statistics
- ❌ **Only actor-neutral or creator-only events allowed**

### 3. One Notification Per Proposal (Idempotent)
- **Single notification**: User receives exactly one notification when proposal is created
- **Idempotent**: Retries don't create duplicate notifications
- **No follow-ups**: No reminders or follow-up notifications

### 4. Silent Deletion

#### Core Principle
- **Users can ALWAYS delete tribe-added personal items**
- **No notifications**: Deletion never triggers notifications to tribe or creator
- **No activity logs**: Deletion events not logged in activity feed
- **No re-adding**: Deleted items cannot be automatically re-added
- **User autonomy > tribe consistency**: User's right to delete trumps all permissions

#### Implementation Requirements
- Delete immediately (optimistic UI)
- Persist `SuppressedOrigin(originTribeItemId)` locally
- Sync merge rule: If incoming update matches suppressed origin → ignore
- Prevents "deleted item reappeared" trust break

### 5. Clear Context

#### Visual Distinction
- **Personal items**: Blue color scheme
- **Tribe items**: Green color scheme + badge
- **Badge shows**: Which tribe added the item
- **Origin context**: Always clear where item came from

## iOS Architecture (Standalone Agent)

### Module Boundaries

#### Domain (Pure, Testable)
**Core Models:**
- `Tribe`: Group coordination entity
- `TribeMember`: Membership with permissions
- `TribeItem`: Shared item (task, routine, appointment, grocery)
- `TribeProposal`: Invitation to accept item
- `TribeMessage`: Chat message
- `TribeActivity`: Coordination event

**Permissions:**
- `TribePermissions`: Controls what member can do in tribe-space
- `PersonalItemPermissions`: Controls what tribe can do to personal-space
- `ManagementScope`: `.sharedOnly` vs `.sharedAndPersonal`

**REQUIRED Fields:**
- `originTribeItemId`: Links personal item back to tribe item
- `originTribeProposalId`: Links personal item back to proposal that created it

#### Data Layer

**TribeAPI → HTTP Only**
- Pure HTTP client
- No caching logic
- No business logic
- Returns DTOs only

**TribeRepository → DTO → Domain + Caching**
- Converts DTOs to domain models
- Handles local caching
- Manages offline state
- Provides unified interface to ViewModels

**TribeSyncEngine → Refresh, Polling, Retries, Backoff**
- Centralized sync logic
- Handles network failures
- Implements retry with exponential backoff
- Manages polling intervals
- Prevents duplicate requests

#### ViewModels

**@MainActor**
- All ViewModels run on main actor
- UI updates always on main thread
- Thread-safe state management

**No Direct API Calls**
- ViewModels call Repository, not API
- Repository handles all network operations
- Clear separation of concerns

**No Polling in Subviews**
- Only hub ViewModel (TribeDetailViewModel) polls
- Subviews request refresh from hub
- Prevents duplicate network requests

**One Sync Owner Per Tribe**
- `TribeDetailViewModel` owns sync for its tribe
- Subviews request data from hub
- Centralized state management

## Critical iOS Safeguards (Non-Negotiable)

### Silent Deletion Protection

**Implementation:**
```swift
struct SuppressedOrigin {
    let originTribeItemId: String
    let suppressedAt: Date
}

// When user deletes a tribe-added personal item:
// 1. Delete immediately (optimistic)
// 2. Persist SuppressedOrigin(originTribeItemId)
// 3. Sync merge rule: If incoming update matches suppressed origin → ignore
```

**Prevents:**
- "Deleted item reappeared" trust break
- Accidental re-sync of deleted items
- User confusion about control

### Proposal Idempotency

**iOS generates `idempotencyKey` for:**
- Proposal creation
- Accept action
- Not-now action
- Dismiss action

**Requirements:**
- Key must survive retries
- Key must be unique per user action
- Backend dedupes on `(creatorId, idempotencyKey)`

**Implementation:**
```swift
struct ProposalAction {
    let proposalId: String
    let action: ProposalActionType
    let idempotencyKey: String // UUID generated client-side
}
```

### No Social Pressure Enforcement

**Activity Feed Rules:**
- ❌ No "X accepted" events
- ❌ No acceptance counts
- ❌ No read receipts
- ❌ No "pending proposals" reminders
- ✅ Only actor-neutral or creator-only events allowed

**Allowed Activity Types:**
- Member added/removed (actor-neutral)
- Tribe deleted (actor-neutral)
- Admin announcement (creator-only)
- Item created (creator-only)

## Local Persistence (Minimum Viable)

### PendingOperation
**Purpose:** Survive network failure + app restart

**Stores:**
- Accept actions
- Not-now actions
- Dismiss actions
- Proposal creation

**Requirements:**
- Persist to disk
- Retry on app launch
- Clear after successful sync

### SuppressedOrigin
**Purpose:** Enforce silent deletion invariant

**Stores:**
- `originTribeItemId` for deleted items
- `suppressedAt` timestamp
- User ID (for multi-user devices)

**Requirements:**
- Persist to disk
- Check on every sync
- Never expire (permanent suppression)

## SwiftUI Structure

### Navigation

**One NavigationStack Per Tribe Tab**
- Each major section has its own navigation stack
- Avoid nested stacks per section
- Clear navigation hierarchy

**Sheet Only for Creation Flows**
- Create tribe → sheet
- Invite member → sheet
- Propose item → sheet
- Avoid sheets for navigation

### Tribe Detail (Hub)

**Single `TribeDetailViewModel` Owns Data + Sync**
- Centralized state management
- Single source of truth
- Coordinates all subviews

**Subviews:**
1. **Inbox (Proposals)**
   - Displays pending proposals
   - Handles accept/not-now/dismiss
   - No independent polling

2. **Shared Items**
   - Shows all tribe items
   - Filtered by category
   - No independent polling

3. **Messages**
   - Chat interface
   - Pull-to-refresh
   - Foreground polling (10-20s) or push notifications

4. **Members**
   - Member list
   - Permission management
   - Invite functionality

5. **Settings**
   - Tribe settings
   - Personal permissions
   - Management scope

**Subviews Must Not Start Their Own Polling**
- All data requests go through hub ViewModel
- Hub coordinates refresh timing
- Prevents duplicate network requests

## Inbox Semantics

### Proposal States

**State Machine:**
```
proposed → accepted
proposed → not_now
proposed → dismissed
not_now → accepted (user can change mind)
not_now → dismissed
```

**States:**
- `proposed`: New, awaiting action
- `not_now`: User marked as "later"
- `accepted`: User accepted, item added to personal list
- `dismissed`: User permanently removed from inbox

### UX Patterns

**"New" vs "Later" (not_now)**
- New proposals: Highlighted, top of list
- Not-now proposals: Muted, separate section
- Clear visual distinction

**Not-now Does NOT Resurface Automatically**
- Once marked "not now", stays in "Later" section
- User must manually revisit
- No automatic promotion

**Dismiss = Permanent Removal**
- Dismissed proposals never return
- No undo (by design)
- Clear confirmation before dismiss

## Messaging (iOS-Specific)

### ❌ 3s Polling Long-Term
- Too aggressive for battery
- Too many network requests
- Poor user experience

### Short-Term Solution
**Foreground Refresh:**
- 10-20 second intervals when app is active
- Pull-to-refresh always available
- Background refresh disabled

### Preferred Solution
**Push Notification → "New Messages Available"**
- Server sends push when new messages arrive
- Single fetch on receipt
- No continuous polling
- Battery efficient

**Implementation:**
```swift
// On push notification receipt:
func handleNewMessagesNotification(tribeId: String) {
    Task {
        await viewModel.refreshMessages(for: tribeId)
    }
}
```

## Permissions UX (Mobile-Friendly)

### Default View
**Simple Toggles:**
- Add / Edit / Remove per category
- Quick enable/disable
- Clear labels

### Advanced View
**Per-Category Grid:**
- Detailed permissions
- Personal vs tribe permissions
- Management scope setting

### Always Show Copy
**"You can always delete anything from your lists."**
- Prominent display
- Reassures user control
- Builds trust

## Presentation Model (Avoid UI Logic Sprawl)

### Centralize Rendering Logic

**Personal vs Tribe Color:**
```swift
func itemColor(isTribeItem: Bool) -> Color {
    isTribeItem ? .green : .blue
}
```

**Badge Text:**
```swift
func badgeText(for item: PersonalItem) -> String? {
    item.addedByTribeName
}
```

**Origin Context:**
```swift
func originContext(for item: PersonalItem) -> String {
    if let tribeName = item.addedByTribeName {
        return "Added by \(tribeName)"
    }
    return "Personal item"
}
```

**No Inline Logic in Row Views**
- All presentation logic in ViewModel or helper
- Row views are pure SwiftUI
- Easy to test and maintain

## Observability (Without Social Pressure)

### Allowed Logging (Non-User-Visible)

**Technical Metrics:**
- Request IDs
- Idempotency keys
- Error codes
- Timing data
- App version
- TribeId hashes (optional, for debugging)

### ❌ Never Log Deletions as Social Events
- Deletions are private actions
- No analytics on deletion patterns
- No "X deleted Y" events
- Respect user privacy

### Logging Strategy
```swift
// ✅ Allowed
logger.info("Proposal created", metadata: [
    "proposalId": proposalId,
    "tribeId": tribeId,
    "requestId": requestId
])

// ❌ Not allowed
logger.info("User deleted tribe item", metadata: [
    "userId": userId,  // Privacy violation
    "itemId": itemId,
    "tribeId": tribeId
])
```

## Top 5 High-Leverage TODOs

### 1. Add `originTribeItemId` + `originTribeProposalId` Everywhere
**Priority:** Critical
**Impact:** Enables silent deletion protection and proper tracking

**Tasks:**
- [ ] Add fields to all personal item models (Appointment, Todo, Habit, GroceryItem)
- [ ] Update API responses to include origin IDs
- [ ] Update database schema (already done)
- [ ] Update iOS models
- [ ] Update sync logic to preserve origin IDs

### 2. Add Proposal Idempotency (Client + Server)
**Priority:** Critical
**Impact:** Prevents duplicate proposals and actions

**Tasks:**
- [ ] Generate `idempotencyKey` client-side for all proposal actions
- [ ] Add `idempotencyKey` to API requests
- [ ] Backend deduplication on `(userId, idempotencyKey)`
- [ ] Handle retry scenarios
- [ ] Test idempotency across app restarts

### 3. Implement Suppression List for Silent Deletion
**Priority:** Critical
**Impact:** Prevents deleted items from reappearing

**Tasks:**
- [ ] Create `SuppressedOrigin` model
- [ ] Persist to local storage
- [ ] Check suppression list on sync
- [ ] Ignore updates matching suppressed origins
- [ ] Test deletion → sync → verify item doesn't reappear

### 4. Split API / Repository / SyncEngine
**Priority:** High
**Impact:** Better architecture, testability, maintainability

**Tasks:**
- [ ] Extract `TribeAPI` (pure HTTP client)
- [ ] Create `TribeRepository` (DTO → Domain + caching)
- [ ] Create `TribeSyncEngine` (refresh, polling, retries)
- [ ] Update ViewModels to use Repository
- [ ] Add unit tests for each layer

### 5. Inbox = New vs Later (not_now)
**Priority:** Medium
**Impact:** Better UX, clearer organization

**Tasks:**
- [ ] Separate "New" and "Later" sections in inbox
- [ ] Visual distinction between sections
- [ ] Update proposal state handling
- [ ] Test state transitions
- [ ] Update UI to match spec

## Positioning (Standalone Agent)

### Job To Be Done (JTBD)
**"Coordinate with my people without pressure, while keeping my personal space mine."**

### Core Value Propositions
1. **Inbox = Heartbeat**
   - Proposals appear in inbox
   - User controls when to check
   - No pressure, no guilt

2. **No Nudging**
   - No reminders
   - No "you have X pending" pressure
   - User-driven engagement

3. **No Guilt**
   - Silent deletion
   - No acceptance tracking
   - No social pressure

4. **No Surveillance**
   - No analytics on acceptance
   - No read receipts
   - Privacy-first design

### User Experience Principles
- **Autonomy**: User is always in control
- **Privacy**: Actions are private by default
- **Clarity**: Always clear what's personal vs tribe
- **Trust**: Deleted items stay deleted
- **Respect**: No pressure, no guilt, no surveillance

---

**Status:** Specification Complete
**Next Steps:** Implement Top 5 High-Leverage TODOs
**Last Updated:** January 2025
