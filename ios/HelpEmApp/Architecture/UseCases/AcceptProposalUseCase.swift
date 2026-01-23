import Foundation

/// Use case for accepting a tribe proposal
/// Enforces product invariants and handles idempotency
class AcceptProposalUseCase {
    private let repository: TribeRepository
    private let suppressionManager: SuppressionManager
    private let pendingOperationManager: PendingOperationManager
    
    init(
        repository: TribeRepository,
        suppressionManager: SuppressionManager = .shared,
        pendingOperationManager: PendingOperationManager = .shared
    ) {
        self.repository = repository
        self.suppressionManager = suppressionManager
        self.pendingOperationManager = pendingOperationManager
    }
    
    /// Execute the use case
    /// Returns the updated proposal
    func execute(tribeId: String, proposalId: String) async throws -> TribeProposal {
        // Step 1: Generate idempotency key
        let idempotencyKey = PendingOperationManager.generateIdempotencyKey()
        
        // Step 2: Create pending operation (for retry on failure)
        let operation = PendingOperation(
            id: UUID().uuidString,
            type: .acceptProposal,
            tribeId: tribeId,
            proposalId: proposalId,
            idempotencyKey: idempotencyKey,
            createdAt: Date(),
            retryCount: 0
        )
        pendingOperationManager.add(operation)
        
        // Step 3: Get proposal to check if item is suppressed
        let proposals = try await repository.getProposals(tribeId: tribeId)
        guard let proposal = proposals.first(where: { $0.id == proposalId }) else {
            throw UseCaseError.proposalNotFound(proposalId)
        }
        
        // Step 4: Check suppression list (INVARIANT: Silent Deletion)
        // If user previously deleted this item, don't accept it again
        if let item = proposal.item,
           suppressionManager.isSuppressed(originTribeItemId: item.id) {
            throw UseCaseError.itemSuppressed
        }
        
        // Step 5: Accept proposal via repository
        do {
            let acceptedProposal = try await repository.acceptProposal(
                tribeId: tribeId,
                proposalId: proposalId,
                idempotencyKey: idempotencyKey
            )
            
            // Step 6: Remove pending operation on success
            pendingOperationManager.remove(id: operation.id)
            
            // Step 7: Log success
            AppLogger.info(
                "Proposal accepted successfully: \(proposalId)",
                logger: AppLogger.general
            )
            
            return acceptedProposal
            
        } catch {
            // Keep pending operation for retry
            AppLogger.error(
                "Failed to accept proposal \(proposalId): \(error.localizedDescription)",
                logger: AppLogger.general
            )
            throw error
        }
    }
    
    /// Retry pending operations with exponential backoff
    /// Called on app startup or network reconnect
    func retryPendingOperations() async {
        // Check network connectivity first
        guard NetworkMonitor.shared.isConnected else {
            AppLogger.info("Skipping retry: no network connection", logger: AppLogger.general)
            return
        }
        
        let operations = pendingOperationManager.getOperationsToRetry()
            .filter { $0.type == .acceptProposal }
        
        for operation in operations {
            guard let proposalId = operation.proposalId else { continue }
            
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            let backoffDelay = pow(2.0, Double(operation.retryCount))
            let delayNanoseconds = UInt64(backoffDelay * 1_000_000_000)
            
            // Wait before retry (skip delay on first attempt)
            if operation.retryCount > 0 {
                AppLogger.info("Waiting \(backoffDelay)s before retry attempt \(operation.retryCount + 1)", logger: AppLogger.general)
                try? await Task.sleep(nanoseconds: delayNanoseconds)
            }
            
            do {
                _ = try await repository.acceptProposal(
                    tribeId: operation.tribeId,
                    proposalId: proposalId,
                    idempotencyKey: operation.idempotencyKey
                )
                pendingOperationManager.remove(id: operation.id)
                AppLogger.info("Successfully retried proposal accept: \(proposalId)", logger: AppLogger.general)
            } catch {
                pendingOperationManager.incrementRetry(id: operation.id)
                AppLogger.error("Retry attempt \(operation.retryCount + 1) failed for proposal \(proposalId): \(error.localizedDescription)", logger: AppLogger.general)
            }
        }
    }
}
