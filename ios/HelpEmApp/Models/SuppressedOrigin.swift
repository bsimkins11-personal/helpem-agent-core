import Foundation
import Combine

/// Tracks suppressed origins for silent deletion protection
/// When a user deletes a tribe-added personal item, we store the origin
/// to prevent it from reappearing on sync
struct SuppressedOrigin: Codable, Identifiable, Equatable {
    let id: String
    let originTribeItemId: String
    let userId: String
    let suppressedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case originTribeItemId = "origin_tribe_item_id"
        case userId = "user_id"
        case suppressedAt = "suppressed_at"
    }
    
    static func == (lhs: SuppressedOrigin, rhs: SuppressedOrigin) -> Bool {
        lhs.originTribeItemId == rhs.originTribeItemId && lhs.userId == rhs.userId
    }
}

/// Manager for suppressed origins
/// Persists to disk and checks on sync to prevent deleted items from reappearing
/// Thread-safe using serial queue for synchronization
class SuppressionManager: ObservableObject {
    static let shared = SuppressionManager()
    
    private let queue = DispatchQueue(label: "com.helpem.suppression", qos: .userInitiated)
    
    @Published private(set) var suppressedOrigins: [SuppressedOrigin] = []
    private let storageKey = "suppressed_tribe_origins"
    
    private init() {
        load()
    }
    
    /// Suppress an origin (when user deletes a tribe-added item)
    func suppress(originTribeItemId: String, userId: String) {
        queue.sync {
            // Check if already suppressed
            if suppressedOrigins.contains(where: { $0.originTribeItemId == originTribeItemId }) {
                return
            }
            
            let suppressed = SuppressedOrigin(
                id: UUID().uuidString,
                originTribeItemId: originTribeItemId,
                userId: userId,
                suppressedAt: Date()
            )
            suppressedOrigins.append(suppressed)
            persist()
        }
    }
    
    /// Check if an origin is suppressed
    func isSuppressed(originTribeItemId: String) -> Bool {
        queue.sync {
            return suppressedOrigins.contains { $0.originTribeItemId == originTribeItemId }
        }
    }
    
    /// Remove suppression (for undo scenarios, if needed)
    func removeSuppression(originTribeItemId: String) {
        queue.sync {
            suppressedOrigins.removeAll { $0.originTribeItemId == originTribeItemId }
            persist()
        }
    }
    
    /// Clear all suppressions (for testing or user reset)
    func clearAll() {
        queue.sync {
            suppressedOrigins.removeAll()
            persist()
        }
    }
    
    /// Persist to UserDefaults
    private func persist() {
        if let encoded = try? JSONEncoder().encode(suppressedOrigins) {
            UserDefaults.standard.set(encoded, forKey: storageKey)
        }
    }
    
    /// Load from UserDefaults
    private func load() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let decoded = try? JSONDecoder().decode([SuppressedOrigin].self, from: data) {
            suppressedOrigins = decoded
        }
    }
}
