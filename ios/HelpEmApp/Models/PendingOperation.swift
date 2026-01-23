import Foundation
import Combine

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
/// Persists operations to secure storage and retries on app launch
/// Thread-safe using serial queue for synchronization
/// 
/// SECURITY: Uses SecureStorage instead of UserDefaults
/// to prevent exposure of idempotency keys and tribe/proposal IDs
class PendingOperationManager: ObservableObject {
    static let shared = PendingOperationManager()
    
    private let queue = DispatchQueue(label: "com.helpem.pendingops", qos: .userInitiated)
    private let secureStorage = SecureStorage.shared
    
    @Published private(set) var pendingOperations: [PendingOperation] = []
    private let storageKey = "pending_tribe_operations"
    
    private init() {
        load()
    }
    
    /// Add a pending operation
    func add(_ operation: PendingOperation) {
        queue.sync {
            pendingOperations.append(operation)
            persist()
        }
    }
    
    /// Remove a completed operation
    func remove(id: String) {
        queue.sync {
            pendingOperations.removeAll { $0.id == id }
            persist()
        }
    }
    
    /// Remove operations by idempotency key (for deduplication)
    func remove(idempotencyKey: String) {
        queue.sync {
            pendingOperations.removeAll { $0.idempotencyKey == idempotencyKey }
            persist()
        }
    }
    
    /// Get operations that need retry
    func getOperationsToRetry() -> [PendingOperation] {
        queue.sync {
            return pendingOperations.filter { $0.retryCount < 5 } // Max 5 retries
        }
    }
    
    /// Increment retry count for an operation
    func incrementRetry(id: String) {
        queue.sync {
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
    }
    
    /// Persist to secure storage (Keychain)
    private func persist() {
        do {
            try secureStorage.save(pendingOperations, forKey: storageKey)
        } catch {
            AppLogger.error("Failed to persist pending operations: \(error)", logger: AppLogger.general)
            // Fallback to UserDefaults as last resort
            if let encoded = try? JSONEncoder().encode(pendingOperations) {
                UserDefaults.standard.set(encoded, forKey: "\(storageKey)_fallback")
            }
        }
    }
    
    /// Load from secure storage (with fallback to UserDefaults for migration)
    private func load() {
        do {
            // Try secure storage first
            if let operations = try secureStorage.load(forKey: storageKey, as: [PendingOperation].self) {
                pendingOperations = operations
                return
            }
            
            // Fallback: check old UserDefaults location (for migration)
            if let data = UserDefaults.standard.data(forKey: storageKey),
               let decoded = try? JSONDecoder().decode([PendingOperation].self, from: data) {
                pendingOperations = decoded
                // Migrate to secure storage
                try? secureStorage.save(decoded, forKey: storageKey)
                // Remove from UserDefaults
                UserDefaults.standard.removeObject(forKey: storageKey)
                AppLogger.info("Migrated pending operations to secure storage", logger: AppLogger.general)
            }
        } catch {
            AppLogger.error("Failed to load pending operations: \(error)", logger: AppLogger.general)
        }
    }
    
    /// Generate a unique idempotency key
    static func generateIdempotencyKey() -> String {
        return UUID().uuidString
    }
}
