import Foundation

/// Use case for marking a proposal as "maybe"
/// Used for appointment proposals where the user is uncertain
class MaybeProposalUseCase {
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
    func execute(tribeId: String, proposalId: String) async throws -> TribeProposal {
        // Step 1: Generate idempotency key
        let idempotencyKey = PendingOperationManager.generateIdempotencyKey()

        // Step 2: Create pending operation
        let operation = PendingOperation(
            id: UUID().uuidString,
            type: .maybeProposal,
            tribeId: tribeId,
            proposalId: proposalId,
            idempotencyKey: idempotencyKey,
            createdAt: Date(),
            retryCount: 0
        )
        pendingOperationManager.add(operation)

        // Step 3: Mark as maybe via repository
        do {
            let proposal = try await repository.maybeProposal(
                tribeId: tribeId,
                proposalId: proposalId,
                idempotencyKey: idempotencyKey
            )

            // Step 4: Remove pending operation on success
            pendingOperationManager.remove(id: operation.id)

            // Step 5: Log success
            AppLogger.info(
                "Proposal marked as maybe: \(proposalId)",
                logger: AppLogger.general
            )

            return proposal

        } catch {
            // Keep pending operation for retry
            AppLogger.error(
                "Failed to mark proposal as maybe \(proposalId): \(error.localizedDescription)",
                logger: AppLogger.general
            )
            throw error
        }
    }
}
