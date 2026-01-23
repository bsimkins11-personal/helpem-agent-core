import Foundation

/// Use case for dismissing a tribe proposal
/// Enforces idempotency and tracks dismissal permanently
class DismissProposalUseCase {
    private let repository: TribeRepository
    private let pendingOperationManager: PendingOperationManager
    
    init(
        repository: TribeRepository,
        pendingOperationManager: PendingOperationManager = .shared
    ) {
        self.repository = repository
        self.pendingOperationManager = pendingOperationManager
    }
    
    /// Execute the use case
    @MainActor
    func execute(tribeId: String, proposalId: String) async throws {
        // Step 1: Generate idempotency key
        let idempotencyKey = PendingOperationManager.generateIdempotencyKey()
        
        // Step 2: Create pending operation
        let operation = PendingOperation(
            id: UUID().uuidString,
            type: .dismissProposal,
            tribeId: tribeId,
            proposalId: proposalId,
            idempotencyKey: idempotencyKey,
            createdAt: Date(),
            retryCount: 0
        )
        pendingOperationManager.add(operation)
        
        // Step 3: Dismiss via repository
        do {
            try await repository.dismissProposal(
                tribeId: tribeId,
                proposalId: proposalId,
                idempotencyKey: idempotencyKey
            )
            
            // Step 4: Remove pending operation on success
            pendingOperationManager.remove(id: operation.id)
            
            // Step 5: Log success
            AppLogger.info(
                "Proposal dismissed successfully: \(proposalId)",
                logger: AppLogger.general
            )
            
        } catch {
            // Keep pending operation for retry
            AppLogger.error(
                "Failed to dismiss proposal \(proposalId): \(error.localizedDescription)",
                logger: AppLogger.general
            )
            throw error
        }
    }
}
