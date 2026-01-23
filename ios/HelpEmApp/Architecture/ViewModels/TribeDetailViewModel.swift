import Foundation
import SwiftUI

/// ViewModel for TribeDetailView
/// Hub for tribe data and coordination between sub-views
@MainActor
class TribeDetailViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var pendingCount = 0
    @Published var memberCount = 0
    @Published var sharedCount = 0
    @Published var unreadCount = 0
    @Published var isLoading = false
    @Published var error: Error?
    
    // MARK: - Dependencies
    
    private let repository: TribeRepository
    
    // MARK: - Initialization
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    // MARK: - Public Methods
    
    /// Load all tribe data in parallel
    func loadTribeData(tribeId: String) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        // Load all data in parallel for better performance
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadProposalCount(tribeId: tribeId) }
            group.addTask { await self.loadMemberCount(tribeId: tribeId) }
            group.addTask { await self.loadSharedCount(tribeId: tribeId) }
            group.addTask { await self.loadUnreadCount(tribeId: tribeId) }
        }
    }
    
    /// Refresh all counts
    func refresh(tribeId: String) async {
        await loadTribeData(tribeId: tribeId)
    }
    
    // MARK: - Private Methods
    
    private func loadProposalCount(tribeId: String) async {
        do {
            let proposals = try await repository.getProposals(tribeId: tribeId)
            pendingCount = proposals.filter { $0.state == .proposed }.count
        } catch {
            AppLogger.error("Failed to load proposal count: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    private func loadMemberCount(tribeId: String) async {
        do {
            let members = try await repository.getMembers(tribeId: tribeId)
            memberCount = members.filter { $0.isAccepted }.count
        } catch {
            AppLogger.error("Failed to load member count: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    private func loadSharedCount(tribeId: String) async {
        do {
            let items = try await repository.getSharedItems(tribeId: tribeId)
            sharedCount = items.count
        } catch {
            AppLogger.error("Failed to load shared count: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    private func loadUnreadCount(tribeId: String) async {
        // TODO: Implement unread message tracking
        // This would require message read receipts to be implemented
        unreadCount = 0
    }
}
