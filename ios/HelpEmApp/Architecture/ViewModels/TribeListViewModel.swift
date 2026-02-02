import Foundation
import SwiftUI
import Combine

/// ViewModel for TribeListView
/// Handles tribe list display and creation
@MainActor
class TribeListViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var tribes: [Tribe] = []
    @Published var invitations: [TribeInvitation] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var showingCreateTribe = false
    
    // MARK: - Dependencies
    
    private let getTribesUseCase: GetTribesUseCase
    private let repository: TribeRepository
    
    // MARK: - Initialization
    
    init(getTribesUseCase: GetTribesUseCase, repository: TribeRepository? = nil) {
        self.getTribesUseCase = getTribesUseCase
        self.repository = repository ?? AppContainer.shared.tribeRepository
    }
    
    // MARK: - Public Methods
    
    /// Load all tribes and invitations
    func loadTribes() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        // Load tribes and invitations in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await self.fetchTribes()
            }
            group.addTask {
                await self.fetchInvitations()
            }
        }
    }
    
    /// Create a new tribe
    func createTribe(name: String, tribeType: TribeType) async throws -> Tribe {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ValidationError.emptyTribeName
        }
        
        let tribe = try await repository.createTribe(name: name, tribeType: tribeType)
        
        // Reload tribes
        await loadTribes()
        
        return tribe
    }
    
    /// Accept tribe invitation
    func acceptInvitation(_ invitation: TribeInvitation) async throws {
        _ = try await repository.acceptInvitation(tribeId: invitation.tribeId)

        // Reload tribes and invitations
        await loadTribes()
    }

    /// Decline tribe invitation
    func declineInvitation(_ invitation: TribeInvitation) async throws {
        // Use leave endpoint to decline (removes pending membership)
        try await repository.leaveTribe(id: invitation.tribeId)

        // Remove from local list immediately
        invitations.removeAll { $0.id == invitation.id }
    }
    
    /// Delete tribe (owner only)
    func deleteTribe(_ tribe: Tribe) async throws {
        try await repository.deleteTribe(id: tribe.id)
        
        // Remove from local list
        tribes.removeAll { $0.id == tribe.id }
    }
    
    /// Leave tribe
    func leaveTribe(_ tribe: Tribe) async throws {
        try await repository.leaveTribe(id: tribe.id)
        
        // Remove from local list
        tribes.removeAll { $0.id == tribe.id }
    }
    
    // MARK: - Private Methods
    
    private func fetchTribes() async {
        do {
            tribes = try await getTribesUseCase.execute()
        } catch {
            self.error = error
            AppLogger.error("Failed to load tribes: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    private func fetchInvitations() async {
        do {
            let fetched = try await repository.getPendingInvitations()
            AppLogger.info("ViewModel: fetched \(fetched.count) invitations", logger: AppLogger.general)
            invitations = fetched
        } catch {
            AppLogger.error("Failed to load invitations: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}

// MARK: - Computed Properties

extension TribeListViewModel {
    var hasInvitations: Bool {
        !invitations.isEmpty
    }
    
    var totalPendingProposals: Int {
        tribes.reduce(0) { $0 + $1.pendingProposals }
    }
    
    var tribesWithPending: [Tribe] {
        tribes.filter { $0.pendingProposals > 0 }
    }
}

// MARK: - Validation Errors

enum ValidationError: LocalizedError {
    case emptyTribeName
    
    var errorDescription: String? {
        switch self {
        case .emptyTribeName:
            return "Tribe name cannot be empty"
        }
    }
}
