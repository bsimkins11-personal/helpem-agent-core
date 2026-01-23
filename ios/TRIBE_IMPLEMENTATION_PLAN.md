# Tribe iOS Implementation Plan - Top 5 High-Leverage TODOs

## Status: Specification Complete → Implementation Phase

Based on the [Tribe Standalone Agent Specification](./TRIBE_STANDALONE_AGENT_SPEC.md), these are the critical implementation tasks.

---

## 1. Add `originTribeItemId` + `originTribeProposalId` Everywhere

### Priority: 🔴 Critical
### Impact: Enables silent deletion protection and proper tracking

### Current State
- ✅ Backend schema has `addedByTribeId` and `addedByTribeName` fields
- ❌ iOS models missing `originTribeItemId` and `originTribeProposalId`
- ❌ API responses not including origin IDs
- ❌ Sync logic not preserving origin IDs

### Tasks

#### A. Update iOS Models
**Files to modify:**
- Find/create `Appointment.swift`, `Todo.swift`, `Habit.swift`, `GroceryItem.swift`
- Add fields:
  ```swift
  let originTribeItemId: String?
  let originTribeProposalId: String?
  let addedByTribeId: String?
  let addedByTribeName: String?
  ```

#### B. Update API Client
**File:** `ios/HelpEmApp/Services/TribeAPIClient.swift`
- Ensure API responses include origin fields
- Update decoding to handle new fields

#### C. Update Backend API Responses
**File:** `backend/src/routes/tribe.js`
- When creating proposals, include `originTribeItemId` in response
- When accepting proposals, return `originTribeProposalId`
- Ensure all personal item endpoints return origin fields

#### D. Update Sync Logic
- When accepting proposal → create personal item with origin IDs
- When syncing personal items → preserve origin IDs
- When deleting → check origin IDs for suppression

### Acceptance Criteria
- [ ] All personal item models have origin tracking fields
- [ ] API responses include origin IDs
- [ ] Accepting proposal creates item with origin IDs
- [ ] Sync preserves origin IDs
- [ ] Deletion can identify tribe-origin items

---

## 2. Add Proposal Idempotency (Client + Server)

### Priority: 🔴 Critical
### Impact: Prevents duplicate proposals and actions

### Current State
- ❌ No idempotency keys in iOS
- ❌ Backend doesn't deduplicate proposal actions
- ❌ Retries can create duplicate proposals

### Tasks

#### A. iOS: Generate Idempotency Keys
**File:** `ios/HelpEmApp/Services/TribeAPIClient.swift`
- Generate UUID for each proposal action
- Add `idempotencyKey` to request models:
  ```swift
  struct CreateTribeItemRequest: Codable {
      let itemType: String
      let data: [String: AnyCodable]
      let recipientUserIds: [String]
      let idempotencyKey: String // NEW
  }
  
  struct ProposalActionRequest: Codable {
      let idempotencyKey: String // NEW
  }
  ```

#### B. iOS: Persist Pending Operations
**New File:** `ios/HelpEmApp/Models/PendingOperation.swift`
```swift
struct PendingOperation: Codable, Identifiable {
    let id: String
    let type: OperationType
    let tribeId: String
    let proposalId: String?
    let idempotencyKey: String
    let createdAt: Date
    let retryCount: Int
}

enum OperationType: String, Codable {
    case createProposal
    case acceptProposal
    case notNowProposal
    case dismissProposal
}
```

#### C. Backend: Deduplication
**File:** `backend/src/routes/tribe.js`
- Add idempotency check for proposal creation
- Add idempotency check for proposal actions
- Dedupe on `(userId, idempotencyKey)`
- Return existing result if duplicate

#### D. iOS: Retry Logic
- Store pending operations to disk
- Retry on app launch
- Clear after successful sync
- Exponential backoff

### Acceptance Criteria
- [ ] iOS generates unique idempotency keys
- [ ] Keys survive app restarts
- [ ] Backend deduplicates on (userId, idempotencyKey)
- [ ] Retries don't create duplicates
- [ ] Pending operations persist and retry

---

## 3. Implement Suppression List for Silent Deletion

### Priority: 🔴 Critical
### Impact: Prevents deleted items from reappearing (trust break)

### Current State
- ✅ Backend has silent deletion helper
- ❌ iOS doesn't track suppressed origins
- ❌ Sync can re-add deleted items

### Tasks

#### A. Create SuppressedOrigin Model
**New File:** `ios/HelpEmApp/Models/SuppressedOrigin.swift`
```swift
struct SuppressedOrigin: Codable, Identifiable {
    let id: String
    let originTribeItemId: String
    let userId: String
    let suppressedAt: Date
    
    static func == (lhs: SuppressedOrigin, rhs: SuppressedOrigin) -> Bool {
        lhs.originTribeItemId == rhs.originTribeItemId
    }
}
```

#### B. Create Suppression Manager
**New File:** `ios/HelpEmApp/Services/SuppressionManager.swift`
```swift
@MainActor
class SuppressionManager: ObservableObject {
    static let shared = SuppressionManager()
    
    @Published private(set) var suppressedOrigins: [SuppressedOrigin] = []
    
    func suppress(originTribeItemId: String, userId: String) {
        let suppressed = SuppressedOrigin(
            id: UUID().uuidString,
            originTribeItemId: originTribeItemId,
            userId: userId,
            suppressedAt: Date()
        )
        suppressedOrigins.append(suppressed)
        persist()
    }
    
    func isSuppressed(originTribeItemId: String) -> Bool {
        suppressedOrigins.contains { $0.originTribeItemId == originTribeItemId }
    }
    
    private func persist() {
        // Save to UserDefaults or CoreData
    }
    
    private func load() {
        // Load from UserDefaults or CoreData
    }
}
```

#### C. Update Deletion Logic
**Files:** Personal item deletion ViewModels
- When deleting tribe-origin item:
  1. Delete immediately (optimistic)
  2. Call `SuppressionManager.shared.suppress(originTribeItemId: ...)`
  3. Persist suppression

#### D. Update Sync Logic
**File:** Sync engine or repository
- Before adding/updating personal item:
  1. Check if `originTribeItemId` exists
  2. If exists, check `SuppressionManager.isSuppressed()`
  3. If suppressed, ignore the update
  4. Log suppression (for debugging, not user-visible)

### Acceptance Criteria
- [ ] SuppressionManager created and tested
- [ ] Deletion triggers suppression
- [ ] Suppressions persist to disk
- [ ] Sync ignores suppressed origins
- [ ] Test: Delete → Sync → Verify item doesn't reappear

---

## 4. Split API / Repository / SyncEngine

### Priority: 🟡 High
### Impact: Better architecture, testability, maintainability

### Current State
- ❌ `TribeAPIClient` mixes HTTP, caching, and business logic
- ❌ ViewModels call API directly
- ❌ No clear separation of concerns

### Tasks

#### A. Extract TribeAPI (Pure HTTP Client)
**New File:** `ios/HelpEmApp/Services/TribeAPI.swift`
```swift
/// Pure HTTP client, no caching, no business logic
class TribeAPI {
    func getTribes() async throws -> TribesResponse
    func createTribe(_ request: CreateTribeRequest) async throws -> Tribe
    // ... all HTTP methods
}
```

#### B. Create TribeRepository (DTO → Domain + Caching)
**New File:** `ios/HelpEmApp/Services/TribeRepository.swift`
```swift
/// Converts DTOs to domain models, handles caching
@MainActor
class TribeRepository: ObservableObject {
    private let api: TribeAPI
    private var cache: [String: Tribe] = [:]
    
    func getTribes() async throws -> [Tribe] {
        // Check cache first
        // Call API if needed
        // Update cache
        // Return domain models
    }
}
```

#### C. Create TribeSyncEngine (Refresh, Polling, Retries)
**New File:** `ios/HelpEmApp/Services/TribeSyncEngine.swift`
```swift
/// Handles sync, polling, retries, backoff
@MainActor
class TribeSyncEngine: ObservableObject {
    private let repository: TribeRepository
    private var syncTasks: [String: Task<Void, Never>] = [:]
    
    func startSyncing(tribeId: String) {
        // Start polling for this tribe
        // Handle retries with exponential backoff
    }
    
    func stopSyncing(tribeId: String) {
        // Stop polling
    }
    
    func refresh(tribeId: String) async {
        // Force refresh
    }
}
```

#### D. Update ViewModels
- ViewModels call Repository, not API
- Repository handles all network operations
- SyncEngine manages polling (only in hub ViewModel)

### Acceptance Criteria
- [ ] TribeAPI is pure HTTP client
- [ ] TribeRepository handles DTO → Domain + caching
- [ ] TribeSyncEngine manages sync/polling
- [ ] ViewModels use Repository only
- [ ] Unit tests for each layer

---

## 5. Inbox = New vs Later (not_now)

### Priority: 🟢 Medium
### Impact: Better UX, clearer organization

### Current State
- ✅ Proposal states include `not_now`
- ❌ Inbox doesn't separate "New" vs "Later"
- ❌ Not-now proposals mixed with new

### Tasks

#### A. Update Inbox View
**File:** `ios/HelpEmApp/Views/Tribe/TribeInboxView.swift` (or similar)
- Separate sections:
  - "New" (state == `.proposed`)
  - "Later" (state == `.not_now`)
- Visual distinction (muted for "Later")
- Clear section headers

#### B. Update Proposal State Handling
- Ensure `not_now` state persists
- Ensure `not_now` doesn't auto-promote
- Allow user to move from "Later" to "New" (change state back to `.proposed`)

#### C. Update UI
- Highlight "New" section
- Mute "Later" section
- Show counts for each section
- Empty states for each section

### Acceptance Criteria
- [ ] Inbox has "New" and "Later" sections
- [ ] Visual distinction between sections
- [ ] Not-now proposals stay in "Later"
- [ ] User can move items between sections
- [ ] Empty states for both sections

---

## Implementation Order

### Phase 1: Critical Safeguards (Week 1)
1. ✅ Add origin tracking fields (#1)
2. ✅ Implement suppression list (#3)
3. ✅ Add proposal idempotency (#2)

### Phase 2: Architecture (Week 2)
4. ✅ Split API/Repository/SyncEngine (#4)

### Phase 3: UX Polish (Week 3)
5. ✅ Inbox New vs Later (#5)

---

## Testing Strategy

### Unit Tests
- SuppressionManager
- Idempotency key generation
- Repository caching
- SyncEngine retry logic

### Integration Tests
- Delete → Sync → Verify suppression
- Retry → Verify idempotency
- Cache → Verify persistence

### Manual Testing
- Delete tribe item → Sync → Verify doesn't reappear
- Create proposal → Retry → Verify no duplicate
- Network failure → Retry → Verify success
- App restart → Verify pending operations retry

---

## Success Metrics

- **Silent Deletion**: 0% of deleted items reappear
- **Idempotency**: 0% duplicate proposals/actions
- **Architecture**: 100% test coverage for new layers
- **UX**: User feedback on inbox organization

---

**Last Updated:** January 2025
**Status:** Ready for Implementation
**Next Action:** Start with #1 (Origin Tracking)
