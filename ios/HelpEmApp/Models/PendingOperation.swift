import Foundation

/// Pending operations that need to be retried after network failure or app restart
/// Ensures idempotency and prevents duplicate actions
struct PendingOperation: Codable, Identifiable {
    let id: String
    let type: OperationType
    let tribeId: String
    let proposalId: String?
    let idempotencyKey: String
    let createdAt: Date
    var retryCount: Int
    
    enum OperationType: String, Codable {
        case createProposal
        case acceptProposal
        case notNowProposal
        case dismissProposal
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case type
        case tribeId = "tribe_id"
        case proposalId = "proposal_id"
        case idempotencyKey = "idempotency_key"
        case createdAt = "created_at"
        case retryCount = "retry_count"
    }
}

/// Manager for pending operations
/// Persists operations to disk and retries on app launch
@MainActor
class PendingOperationManager: ObservableObject {
    static let shared = PendingOperationManager()
    
    @Published private(set) var pendingOperations: [PendingOperation] = []
    private let storageKey = "pending_tribe_operations"
    
    private init() {
        load()
    }
    
    /// Add a pending operation
    func add(_ operation: PendingOperation) {
        pendingOperations.append(operation)
        persist()
    }
    
    /// Remove a completed operation
    func remove(id: String) {
        pendingOperations.removeAll { $0.id == id }
        persist()
    }
    
    /// Remove operations by idempotency key (for deduplication)
    func remove(idempotencyKey: String) {
        pendingOperations.removeAll { $0.idempotencyKey == idempotencyKey }
        persist()
    }
    
    /// Get operations that need retry
    func getOperationsToRetry() -> [PendingOperation] {
        return pendingOperations.filter { $0.retryCount < 5 } // Max 5 retries
    }
    
    /// Increment retry count for an operation
    func incrementRetry(id: String) {
        if let index = pendingOperations.firstIndex(where: { $0.id == id }) {
            var operation = pendingOperations[index]
            operation = PendingOperation(
                id: operation.id,
                type: operation.type,
                tribeId: operation.tribeId,
                proposalId: operation.proposalId,
                idempotencyKey: operation.idempotencyKey,
                createdAt: operation.createdAt,
                retryCount: operation.retryCount + 1
            )
            pendingOperations[index] = operation
            persist()
        }
    }
    
    /// Persist to UserDefaults
    private func persist() {
        if let encoded = try? JSONEncoder().encode(pendingOperations) {
            UserDefaults.standard.set(encoded, forKey: storageKey)
        }
    }
    
    /// Load from UserDefaults
    private func load() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let decoded = try? JSONDecoder().decode([PendingOperation].self, from: data) {
            pendingOperations = decoded
        }
    }
    
    /// Generate a unique idempotency key
    static func generateIdempotencyKey() -> String {
        return UUID().uuidString
    }
}
