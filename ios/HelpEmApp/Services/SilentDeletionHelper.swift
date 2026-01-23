import Foundation

/// Helper for silent deletion of tribe-added personal items
/// Ensures deletions are private and items don't reappear on sync
@MainActor
class SilentDeletionHelper {
    static let shared = SilentDeletionHelper()
    
    private let suppressionManager = SuppressionManager.shared
    
    private init() {}
    
    /// Delete a personal item silently (no notifications to tribe)
    /// If the item was added by a tribe, suppresses the origin to prevent re-sync
    func deletePersonalItem<T: PersonalItemWithOrigin>(
        _ item: T,
        userId: String,
        deleteAction: () async throws -> Void
    ) async throws {
        // Perform the deletion
        try await deleteAction()
        
        // If item was added by a tribe, suppress the origin
        if let originTribeItemId = item.originTribeItemId {
            suppressionManager.suppress(
                originTribeItemId: originTribeItemId,
                userId: userId
            )
        }
    }
    
    /// Check if an item should be filtered out during sync
    /// Returns true if the item's origin is suppressed
    func shouldFilterItem<T: PersonalItemWithOrigin>(_ item: T) -> Bool {
        guard let originTribeItemId = item.originTribeItemId else {
            return false // Not a tribe item, don't filter
        }
        
        return suppressionManager.isSuppressed(originTribeItemId: originTribeItemId)
    }
    
    /// Filter out suppressed items from a list
    func filterSuppressed<T: PersonalItemWithOrigin>(_ items: [T]) -> [T] {
        items.filter { !shouldFilterItem($0) }
    }
}
