import XCTest
@testable import HelpEmApp

// MARK: - Repository Tests

@available(iOS 15.0, *)
final class TribeRepositoryTests: XCTestCase {
    var repository: TribeAPIRepository!
    var mockAPIClient: MockTribeAPIClient!
    var mockCacheService: MockCacheService!
    
    override func setUp() async throws {
        mockAPIClient = MockTribeAPIClient()
        mockCacheService = MockCacheService()
        repository = TribeAPIRepository(
            apiClient: mockAPIClient,
            cacheService: mockCacheService
        )
    }
    
    func testGetTribes_withCache_doesNotCallAPI() async throws {
        // Arrange
        let cachedTribes = [
            Tribe(id: "1", name: "Family", ownerId: "user1", isOwner: true, pendingProposals: 0, joinedAt: Date())
        ]
        await mockCacheService.set("tribes", value: cachedTribes, ttl: 300)
        
        // Act
        let tribes = try await repository.getTribes()
        
        // Assert
        XCTAssertEqual(tribes.count, 1)
        XCTAssertEqual(tribes[0].name, "Family")
        XCTAssertEqual(mockAPIClient.getTribesCallCount, 0, "Should not call API when cached")
    }
    
    func testGetTribes_withoutCache_callsAPI() async throws {
        // Arrange
        mockAPIClient.tribesResponse = [
            Tribe(id: "1", name: "Work", ownerId: "user1", isOwner: false, pendingProposals: 2, joinedAt: Date())
        ]
        
        // Act
        let tribes = try await repository.getTribes()
        
        // Assert
        XCTAssertEqual(tribes.count, 1)
        XCTAssertEqual(tribes[0].name, "Work")
        XCTAssertEqual(mockAPIClient.getTribesCallCount, 1, "Should call API when not cached")
    }
    
    func testCreateTribe_invalidatesCache() async throws {
        // Arrange
        await mockCacheService.set("tribes", value: [], ttl: 300)
        mockAPIClient.createTribeResponse = Tribe(
            id: "2",
            name: "New Tribe",
            ownerId: "user1",
            isOwner: true,
            pendingProposals: 0,
            joinedAt: Date()
        )
        
        // Act
        _ = try await repository.createTribe(name: "New Tribe")
        
        // Assert
        let cached = await mockCacheService.get("tribes")
        XCTAssertNil(cached, "Cache should be invalidated after create")
    }
}

// MARK: - Use Case Tests

@available(iOS 15.0, *)
@MainActor
final class AcceptProposalUseCaseTests: XCTestCase {
    var useCase: AcceptProposalUseCase!
    var mockRepository: MockTribeRepository!
    var mockSuppressionManager: MockSuppressionManager!
    var mockPendingOperationManager: MockPendingOperationManager!
    
    override func setUp() async throws {
        mockRepository = MockTribeRepository()
        mockSuppressionManager = MockSuppressionManager()
        mockPendingOperationManager = MockPendingOperationManager()
        
        useCase = AcceptProposalUseCase(
            repository: mockRepository,
            suppressionManager: mockSuppressionManager,
            pendingOperationManager: mockPendingOperationManager
        )
    }
    
    func testExecute_success_removesPendingOperation() async throws {
        // Arrange
        let proposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .proposed,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: nil
        )
        mockRepository.proposals = [proposal]
        mockRepository.acceptedProposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .accepted,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: nil
        )
        
        // Act
        let result = try await useCase.execute(tribeId: "t1", proposalId: "p1")
        
        // Assert
        XCTAssertEqual(result.state, .accepted)
        XCTAssertEqual(mockPendingOperationManager.addedCount, 1, "Should add pending operation")
        XCTAssertEqual(mockPendingOperationManager.removedCount, 1, "Should remove pending operation on success")
    }
    
    func testExecute_whenSuppressed_throwsError() async throws {
        // Arrange
        let item = TribeItem(
            id: "item1",
            tribeId: "t1",
            createdBy: "user2",
            itemType: "task",
            data: [:],
            createdAt: Date(),
            deletedAt: nil
        )
        let proposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .proposed,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: item
        )
        mockRepository.proposals = [proposal]
        mockSuppressionManager.suppressedIds = ["item1"]
        
        // Act & Assert
        do {
            _ = try await useCase.execute(tribeId: "t1", proposalId: "p1")
            XCTFail("Should throw itemSuppressed error")
        } catch UseCaseError.itemSuppressed {
            // Expected
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }
    
    func testExecute_createsIdempotencyKey() async throws {
        // Arrange
        let proposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .proposed,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: nil
        )
        mockRepository.proposals = [proposal]
        mockRepository.acceptedProposal = proposal
        
        // Act
        _ = try await useCase.execute(tribeId: "t1", proposalId: "p1")
        
        // Assert
        XCTAssertNotNil(mockRepository.lastIdempotencyKey, "Should generate idempotency key")
        XCTAssertFalse(mockRepository.lastIdempotencyKey!.isEmpty, "Idempotency key should not be empty")
    }
}

// MARK: - ViewModel Tests

@available(iOS 15.0, *)
@MainActor
final class TribeInboxViewModelTests: XCTestCase {
    var viewModel: TribeInboxViewModel!
    var mockGetProposalsUseCase: MockGetProposalsUseCase!
    var mockAcceptProposalUseCase: MockAcceptProposalUseCase!
    var mockNotNowProposalUseCase: MockNotNowProposalUseCase!
    var mockDismissProposalUseCase: MockDismissProposalUseCase!
    
    override func setUp() async throws {
        mockGetProposalsUseCase = MockGetProposalsUseCase()
        mockAcceptProposalUseCase = MockAcceptProposalUseCase()
        mockNotNowProposalUseCase = MockNotNowProposalUseCase()
        mockDismissProposalUseCase = MockDismissProposalUseCase()
        
        viewModel = TribeInboxViewModel(
            getProposalsUseCase: mockGetProposalsUseCase,
            acceptProposalUseCase: mockAcceptProposalUseCase,
            notNowProposalUseCase: mockNotNowProposalUseCase,
            dismissProposalUseCase: mockDismissProposalUseCase
        )
    }
    
    func testLoadProposals_success_updatesState() async throws {
        // Arrange
        let newProposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .proposed,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: nil
        )
        mockGetProposalsUseCase.result = ProposalsByState(
            new: [newProposal],
            later: [],
            accepted: []
        )
        
        // Act
        await viewModel.loadProposals(tribeId: "t1")
        
        // Assert
        XCTAssertFalse(viewModel.isLoading, "Loading should be false after completion")
        XCTAssertNil(viewModel.error, "Error should be nil on success")
        XCTAssertEqual(viewModel.newProposals.count, 1, "Should have 1 new proposal")
        XCTAssertEqual(viewModel.laterProposals.count, 0, "Should have 0 later proposals")
    }
    
    func testAcceptProposal_success_removesFromList() async throws {
        // Arrange
        let proposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .proposed,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: nil
        )
        viewModel.newProposals = [proposal]
        mockAcceptProposalUseCase.result = proposal
        
        // Act
        try await viewModel.acceptProposal(proposal, tribeId: "t1")
        
        // Assert
        XCTAssertEqual(viewModel.newProposals.count, 0, "Should remove proposal from list")
        XCTAssertEqual(mockAcceptProposalUseCase.executeCallCount, 1, "Should call use case")
    }
    
    func testAcceptProposal_processing_updatesState() async throws {
        // Arrange
        let proposal = TribeProposal(
            id: "p1",
            itemId: "item1",
            recipientId: "user1",
            state: .proposed,
            createdAt: Date(),
            stateChangedAt: Date(),
            notifiedAt: Date(),
            item: nil
        )
        mockAcceptProposalUseCase.delay = 0.5 // Simulate network delay
        
        // Act
        Task {
            try await viewModel.acceptProposal(proposal, tribeId: "t1")
        }
        
        // Assert - during processing
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1s
        XCTAssertTrue(viewModel.isProcessing(proposal.id), "Should be processing")
        
        // Wait for completion
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5s
        XCTAssertFalse(viewModel.isProcessing(proposal.id), "Should not be processing after completion")
    }
}

// MARK: - Mock Objects

class MockTribeAPIClient {
    var getTribesCallCount = 0
    var tribesResponse: [Tribe] = []
    var createTribeResponse: Tribe?
    
    func getTribes() async throws -> [Tribe] {
        getTribesCallCount += 1
        return tribesResponse
    }
    
    func createTribe(name: String) async throws -> Tribe {
        guard let response = createTribeResponse else {
            throw NSError(domain: "Mock", code: -1, userInfo: nil)
        }
        return response
    }
}

actor MockCacheService {
    private var cache: [String: Any] = [:]
    
    func set(_ key: String, value: Any, ttl: TimeInterval) {
        cache[key] = value
    }
    
    func get(_ key: String) -> Any? {
        return cache[key]
    }
    
    func invalidate(_ key: String) {
        cache.removeValue(forKey: key)
    }
    
    func isExpired(_ key: String) -> Bool {
        return cache[key] == nil
    }
}

@MainActor
class MockTribeRepository: TribeRepository {
    var proposals: [TribeProposal] = []
    var acceptedProposal: TribeProposal?
    var lastIdempotencyKey: String?
    
    func getTribes() async throws -> [Tribe] { [] }
    func getTribe(id: String) async throws -> Tribe { 
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func createTribe(name: String) async throws -> Tribe {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func renameTribe(id: String, newName: String) async throws -> Tribe {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func deleteTribe(id: String) async throws {}
    func acceptInvitation(tribeId: String) async throws -> TribeMember {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func leaveTribe(id: String) async throws {}
    func getMembers(tribeId: String) async throws -> [TribeMember] { [] }
    func inviteMember(tribeId: String, userId: String, permissions: PermissionsUpdate?) async throws -> TribeMember {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func getMemberRequests(tribeId: String) async throws -> [TribeMemberRequest] { [] }
    func approveMemberRequest(tribeId: String, requestId: String, permissions: PermissionsUpdate?) async throws -> TribeMember {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func denyMemberRequest(tribeId: String, requestId: String) async throws -> TribeMemberRequest {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func updateMemberSettings(tribeId: String, memberId: String, managementScope: String?, proposalNotifications: Bool?, digestNotifications: Bool?, permissions: PermissionsUpdate?) async throws -> TribeMember {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    
    func getProposals(tribeId: String) async throws -> [TribeProposal] {
        return proposals
    }
    
    func acceptProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws -> TribeProposal {
        lastIdempotencyKey = idempotencyKey
        guard let proposal = acceptedProposal else {
            throw NSError(domain: "Mock", code: -1, userInfo: nil)
        }
        return proposal
    }
    
    func notNowProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws -> TribeProposal {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func dismissProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws {}
    func createTribeItem(tribeId: String, itemType: String, data: [String: Any], recipientUserIds: [String], idempotencyKey: String) async throws -> TribeItem {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func getSharedItems(tribeId: String) async throws -> [TribeItem] { [] }
    func getMessages(tribeId: String, limit: Int, before: Date?) async throws -> [TribeMessage] { [] }
    func sendMessage(tribeId: String, message: String) async throws -> TribeMessage {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func editMessage(tribeId: String, messageId: String, newMessage: String) async throws -> TribeMessage {
        throw NSError(domain: "Mock", code: -1, userInfo: nil)
    }
    func deleteMessage(tribeId: String, messageId: String) async throws {}
    func getPendingInvitations() async throws -> [TribeInvitation] { [] }
}

@MainActor
class MockSuppressionManager {
    var suppressedIds: Set<String> = []
    
    func isSuppressed(originTribeItemId: String) -> Bool {
        return suppressedIds.contains(originTribeItemId)
    }
}

@MainActor
class MockPendingOperationManager {
    var addedCount = 0
    var removedCount = 0
    
    func add(_ operation: PendingOperation) {
        addedCount += 1
    }
    
    func remove(id: String) {
        removedCount += 1
    }
}

@MainActor
class MockGetProposalsUseCase {
    var result: ProposalsByState?
    
    func execute(tribeId: String) async throws -> ProposalsByState {
        guard let result = result else {
            throw NSError(domain: "Mock", code: -1, userInfo: nil)
        }
        return result
    }
}

@MainActor
class MockAcceptProposalUseCase {
    var result: TribeProposal?
    var executeCallCount = 0
    var delay: TimeInterval = 0
    
    func execute(tribeId: String, proposalId: String) async throws -> TribeProposal {
        executeCallCount += 1
        
        if delay > 0 {
            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        }
        
        guard let result = result else {
            throw NSError(domain: "Mock", code: -1, userInfo: nil)
        }
        return result
    }
}

@MainActor
class MockNotNowProposalUseCase {
    var result: TribeProposal?
    
    func execute(tribeId: String, proposalId: String) async throws -> TribeProposal {
        guard let result = result else {
            throw NSError(domain: "Mock", code: -1, userInfo: nil)
        }
        return result
    }
}

@MainActor
class MockDismissProposalUseCase {
    func execute(tribeId: String, proposalId: String) async throws {
        // Success
    }
}
