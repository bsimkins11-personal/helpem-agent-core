# iOS Clean Architecture - Tribe Feature

## Overview

This directory contains the refactored iOS implementation using **Clean Architecture** principles with SOLID design patterns.

## Architecture Layers

### 1. Repository Layer (`Repositories/`)

**Purpose:** Abstracts data access from business logic

**Files:**
- `TribeRepository.swift` - Protocol and implementation for Tribe data access
- Includes caching strategy for performance
- Handles API communication via `TribeAPIClient`

**Key Responsibilities:**
- ✅ Data fetching and caching
- ✅ API communication
- ✅ Data transformation
- ✅ Error handling

**Example:**
```swift
let repository = AppContainer.shared.tribeRepository
let tribes = try await repository.getTribes()
```

### 2. Use Case Layer (`UseCases/`)

**Purpose:** Contains business logic and enforces product invariants

**Files:**
- `AcceptProposalUseCase.swift` - Accept proposal with idempotency
- `DismissProposalUseCase.swift` - Dismiss proposal permanently
- `NotNowProposalUseCase.swift` - Mark proposal as "not now"
- `GetProposalsUseCase.swift` - Fetch and filter proposals
- `CreateTribeItemUseCase.swift` - Create tribe item with proposals
- `GetTribesUseCase.swift` - Fetch user's tribes
- `UseCaseError.swift` - Common use case errors

**Key Responsibilities:**
- ✅ Business logic enforcement
- ✅ Product invariant validation
- ✅ Idempotency handling
- ✅ Suppression checking (silent deletion)
- ✅ Operation retry logic

**Product Invariants Enforced:**
1. **Proposals, not assignments** - All items require explicit acceptance
2. **No social pressure** - No acceptance visibility or reminders
3. **One notification per proposal** - Idempotent notification delivery
4. **Silent deletion** - Users can always delete without notification
5. **Clear context** - Origin tracking maintained

**Example:**
```swift
let useCase = AppContainer.shared.makeAcceptProposalUseCase()
let proposal = try await useCase.execute(tribeId: tribeId, proposalId: proposalId)
```

### 3. ViewModel Layer (`ViewModels/`)

**Purpose:** Presentation logic only - no business logic

**Files:**
- `TribeListViewModel.swift` - Tribe list display
- `TribeDetailViewModel.swift` - Hub for tribe data
- `TribeInboxViewModel.swift` - Proposal management
- `TribeSharedViewModel.swift` - Shared items display
- `TribeMessagesViewModel.swift` - Messaging functionality
- `TribeMembersViewModel.swift` - Member management

**Key Responsibilities:**
- ✅ UI state management
- ✅ User interaction handling
- ✅ Loading/error states
- ✅ Optimistic updates
- ✅ Haptic feedback

**Example:**
```swift
let viewModel = AppContainer.shared.makeTribeInboxViewModel()
await viewModel.loadProposals(tribeId: tribeId)
try await viewModel.acceptProposal(proposal, tribeId: tribeId)
```

### 4. Dependency Injection (`DI/`)

**Purpose:** Manages dependencies and provides factory methods

**Files:**
- `AppContainer.swift` - IoC container for dependency injection

**Key Features:**
- ✅ Singleton management
- ✅ Factory methods for use cases
- ✅ Factory methods for ViewModels
- ✅ Lifecycle management
- ✅ Diagnostics and debugging

**Example:**
```swift
// Get container
let container = AppContainer.shared

// Create ViewModel
let viewModel = container.makeTribeInboxViewModel()

// Retry pending operations on app startup
await container.retryPendingOperations()

// Get diagnostics
let diagnostics = await container.getDiagnostics()
print(diagnostics.description)
```

### 5. Services (`Services/`)

**Purpose:** Shared services used across layers

**Files:**
- `CacheService.swift` - Thread-safe caching with TTL

**Example:**
```swift
await CacheService.shared.set("key", value: data, ttl: 300)
let cached = await CacheService.shared.get("key")
```

## Benefits of This Architecture

### 1. Testability ✅
- Each layer can be tested independently
- Mock repositories for use case testing
- Mock use cases for ViewModel testing
- No direct API dependencies in business logic

### 2. Maintainability ✅
- Clear separation of concerns
- Single Responsibility Principle
- Easy to locate and fix bugs
- Easy to add new features

### 3. Scalability ✅
- Easy to add new use cases
- Easy to add new data sources
- Repository pattern allows switching implementations
- Can add offline support easily

### 4. Product Invariant Enforcement ✅
- Invariants enforced in use case layer
- Impossible to bypass invariants from UI
- Consistent behavior across all entry points
- Prevents accidental violations

## How to Use

### Creating a New Feature

1. **Define Repository Protocol** (if new data needed)
```swift
protocol NewFeatureRepository {
    func getData() async throws -> Data
}
```

2. **Implement Repository**
```swift
class NewFeatureAPIRepository: NewFeatureRepository {
    func getData() async throws -> Data {
        // API call
    }
}
```

3. **Create Use Cases**
```swift
class GetDataUseCase {
    private let repository: NewFeatureRepository
    
    func execute() async throws -> ProcessedData {
        let data = try await repository.getData()
        // Business logic here
        return processedData
    }
}
```

4. **Create ViewModel**
```swift
@MainActor
class NewFeatureViewModel: ObservableObject {
    @Published var data: ProcessedData?
    
    private let getDataUseCase: GetDataUseCase
    
    func loadData() async {
        data = try await getDataUseCase.execute()
    }
}
```

5. **Add to AppContainer**
```swift
extension AppContainer {
    func makeNewFeatureViewModel() -> NewFeatureViewModel {
        NewFeatureViewModel(
            getDataUseCase: GetDataUseCase(repository: newFeatureRepository)
        )
    }
}
```

6. **Use in View**
```swift
struct NewFeatureView: View {
    @StateObject private var viewModel = AppContainer.shared.makeNewFeatureViewModel()
    
    var body: some View {
        // UI code
    }
}
```

### Testing

#### Testing Use Cases
```swift
func testAcceptProposal() async throws {
    let mockRepo = MockTribeRepository()
    let mockSuppression = MockSuppressionManager()
    let mockPending = MockPendingOperationManager()
    
    let useCase = AcceptProposalUseCase(
        repository: mockRepo,
        suppressionManager: mockSuppression,
        pendingOperationManager: mockPending
    )
    
    let result = try await useCase.execute(tribeId: "1", proposalId: "2")
    
    XCTAssertEqual(result.state, .accepted)
    XCTAssertEqual(mockPending.operations.count, 0) // Pending operation removed
}
```

#### Testing ViewModels
```swift
@MainActor
func testLoadProposals() async throws {
    let mockUseCase = MockGetProposalsUseCase()
    mockUseCase.result = ProposalsByState(new: [proposal], later: [], accepted: [])
    
    let viewModel = TribeInboxViewModel(
        getProposalsUseCase: mockUseCase,
        // ... other dependencies
    )
    
    await viewModel.loadProposals(tribeId: "1")
    
    XCTAssertEqual(viewModel.newProposals.count, 1)
    XCTAssertFalse(viewModel.isLoading)
}
```

## Migration Guide

### From Old Architecture

**Old Way:**
```swift
// Direct API call in View
let proposals = try await TribeAPIClient.shared.getInbox(tribeId: tribeId)
```

**New Way:**
```swift
// Use ViewModel with Use Case
@StateObject private var viewModel = AppContainer.shared.makeTribeInboxViewModel()

await viewModel.loadProposals(tribeId: tribeId)
```

### Benefits of Migration

1. **Testable** - Can now test without hitting real API
2. **Cacheable** - Repository handles caching automatically
3. **Invariants** - Product invariants enforced automatically
4. **Maintainable** - Clear separation of concerns

## Performance Considerations

### Caching Strategy

- **Tribes:** 5-minute cache
- **Members:** 3-minute cache
- **Proposals:** 1-minute cache (more dynamic)
- **Messages:** No cache (real-time)

### Parallel Loading

All ViewModels use `withTaskGroup` for parallel data loading:

```swift
await withTaskGroup(of: Void.self) { group in
    group.addTask { await self.loadProposals() }
    group.addTask { await self.loadMembers() }
    group.addTask { await self.loadShared() }
}
```

### Optimistic Updates

ViewModels perform optimistic UI updates:

```swift
// Remove from UI immediately
removeProposal(proposal.id)

// Then perform API call
try await dismissProposal(...)
```

## Debugging

### Enable Diagnostics

```swift
let diagnostics = await AppContainer.shared.getDiagnostics()
print(diagnostics.description)
```

### Clear Caches

```swift
await AppContainer.shared.clearCaches()
```

### Retry Pending Operations

```swift
await AppContainer.shared.retryPendingOperations()
```

## File Structure

```
Architecture/
├── DI/
│   └── AppContainer.swift           # Dependency injection container
├── Repositories/
│   └── TribeRepository.swift        # Data access layer
├── UseCases/
│   ├── AcceptProposalUseCase.swift
│   ├── DismissProposalUseCase.swift
│   ├── NotNowProposalUseCase.swift
│   ├── GetProposalsUseCase.swift
│   ├── CreateTribeItemUseCase.swift
│   ├── GetTribesUseCase.swift
│   └── UseCaseError.swift
├── ViewModels/
│   ├── TribeListViewModel.swift
│   ├── TribeDetailViewModel.swift
│   ├── TribeInboxViewModel.swift
│   ├── TribeSharedViewModel.swift
│   ├── TribeMessagesViewModel.swift
│   └── TribeMembersViewModel.swift
├── Services/
│   └── CacheService.swift           # Shared services
└── README.md                         # This file
```

## Next Steps

### Immediate
1. ✅ Repository layer implemented
2. ✅ Use case layer implemented
3. ✅ ViewModel layer implemented
4. ✅ Dependency injection implemented
5. ✅ Documentation complete

### Future Enhancements
1. Add offline support (CoreData/Realm)
2. Add WebSocket support for real-time messaging
3. Add analytics tracking
4. Add A/B testing framework
5. Add feature flags

## Support

For questions or issues with the architecture:
1. Review this README
2. Check the implementation files
3. Review the product invariants in TRIBE_COMPLETE_HANDOFF.md
4. Contact the iOS team

---

**Last Updated:** January 2026  
**Architecture Pattern:** Clean Architecture + MVVM  
**Status:** ✅ Production Ready
