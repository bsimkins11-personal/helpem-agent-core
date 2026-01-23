import Foundation
import SwiftUI
import Combine

/// ViewModel for TribeMembersView
/// Handles member management
@MainActor
class TribeMembersViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var members: [TribeMember] = []
    @Published var memberRequests: [TribeMemberRequest] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    // MARK: - Dependencies
    
    private let repository: TribeRepository
    
    // MARK: - Initialization
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    // MARK: - Public Methods
    
    /// Load members and requests
    func loadMembers(tribeId: String) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        // Load members and requests in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await self.fetchMembers(tribeId: tribeId)
            }
            group.addTask {
                await self.fetchRequests(tribeId: tribeId)
            }
        }
    }
    
    /// Invite a member
    func inviteMember(tribeId: String, userId: String, permissions: PermissionsUpdate? = nil) async throws {
        _ = try await repository.inviteMember(
            tribeId: tribeId,
            userId: userId,
            permissions: permissions
        )
        
        // Reload members
        await loadMembers(tribeId: tribeId)
    }
    
    /// Approve member request
    func approveMemberRequest(tribeId: String, requestId: String, permissions: PermissionsUpdate? = nil) async throws {
        _ = try await repository.approveMemberRequest(
            tribeId: tribeId,
            requestId: requestId,
            permissions: permissions
        )
        
        // Reload members and requests
        await loadMembers(tribeId: tribeId)
    }
    
    /// Deny member request
    func denyMemberRequest(tribeId: String, requestId: String) async throws {
        _ = try await repository.denyMemberRequest(tribeId: tribeId, requestId: requestId)
        
        // Remove from local state
        memberRequests.removeAll { $0.id == requestId }
    }
    
    /// Update member settings
    func updateMemberSettings(
        tribeId: String,
        memberId: String,
        managementScope: String? = nil,
        proposalNotifications: Bool? = nil,
        digestNotifications: Bool? = nil,
        permissions: PermissionsUpdate? = nil
    ) async throws {
        let updatedMember = try await repository.updateMemberSettings(
            tribeId: tribeId,
            memberId: memberId,
            managementScope: managementScope,
            proposalNotifications: proposalNotifications,
            digestNotifications: digestNotifications,
            permissions: permissions
        )
        
        // Update local state
        if let index = members.firstIndex(where: { $0.id == memberId }) {
            members[index] = updatedMember
        }
    }
    
    // MARK: - Private Methods
    
    private func fetchMembers(tribeId: String) async {
        do {
            members = try await repository.getMembers(tribeId: tribeId)
        } catch {
            self.error = error
            AppLogger.error("Failed to load members: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    private func fetchRequests(tribeId: String) async {
        do {
            memberRequests = try await repository.getMemberRequests(tribeId: tribeId)
        } catch {
            AppLogger.error("Failed to load member requests: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}

// MARK: - Computed Properties

extension TribeMembersViewModel {
    var activeMembers: [TribeMember] {
        members.filter { $0.isAccepted }
    }
    
    var pendingMembers: [TribeMember] {
        members.filter { $0.isPending }
    }
    
    var hasPendingRequests: Bool {
        !memberRequests.filter { $0.state == .pending }.isEmpty
    }
    
    var pendingRequestsCount: Int {
        memberRequests.filter { $0.state == .pending }.count
    }
}
