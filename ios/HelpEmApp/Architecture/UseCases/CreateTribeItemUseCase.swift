import Foundation

/// Use case for creating a tribe item and sending proposals
/// Enforces permissions and idempotency
class CreateTribeItemUseCase {
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
    /// Creates a tribe item and sends proposals to recipients
    func execute(
        tribeId: String,
        itemType: String,
        data: [String: Any],
        recipientUserIds: [String]
    ) async throws -> TribeItem {
        // Step 1: Validate recipients
        guard !recipientUserIds.isEmpty else {
            throw UseCaseError.noRecipients
        }
        
        // Step 2: Validate item type
        let validTypes = ["task", "routine", "appointment", "grocery"]
        guard validTypes.contains(itemType) else {
            throw UseCaseError.invalidItemType(itemType)
        }
        
        // Step 3: Generate idempotency key
        let idempotencyKey = PendingOperationManager.generateIdempotencyKey()
        
        // Step 4: Create pending operation
        let operation = PendingOperation(
            id: UUID().uuidString,
            type: .createProposal,
            tribeId: tribeId,
            proposalId: nil,
            idempotencyKey: idempotencyKey,
            createdAt: Date(),
            retryCount: 0
        )
        pendingOperationManager.add(operation)
        
        // Step 5: Create item via repository
        do {
            let item = try await repository.createTribeItem(
                tribeId: tribeId,
                itemType: itemType,
                data: data,
                recipientUserIds: recipientUserIds,
                idempotencyKey: idempotencyKey
            )
            
            // Step 6: Remove pending operation on success
            pendingOperationManager.remove(id: operation.id)
            
            // Step 7: Log success (INVARIANT: One notification per proposal)
            AppLogger.info(
                "Tribe item created successfully: \(item.id), proposals sent to \(recipientUserIds.count) recipients",
                logger: AppLogger.general
            )
            
            return item
            
        } catch {
            // Keep pending operation for retry
            AppLogger.error(
                "Failed to create tribe item: \(error.localizedDescription)",
                logger: AppLogger.general
            )
            throw error
        }
    }
}
