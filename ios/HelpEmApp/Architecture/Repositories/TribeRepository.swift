import Foundation

// MARK: - Repository Protocol

/// Repository protocol for Tribe data access
/// Abstracts the data layer from business logic
protocol TribeRepository {
    // MARK: - Tribe Operations
    func getTribes() async throws -> [Tribe]
    func getTribe(id: String) async throws -> Tribe
    func createTribe(name: String) async throws -> Tribe
    func renameTribe(id: String, newName: String) async throws -> Tribe
    func deleteTribe(id: String) async throws
    func acceptInvitation(tribeId: String) async throws -> TribeMember
    func leaveTribe(id: String) async throws
    
    // MARK: - Member Operations
    func getMembers(tribeId: String) async throws -> [TribeMember]
    func inviteMember(tribeId: String, userId: String, permissions: PermissionsUpdate?) async throws -> TribeMember
    func inviteContact(tribeId: String, contactIdentifier: String, contactType: String, contactName: String?, permissions: PermissionsUpdate?) async throws -> PendingTribeInvitation
    func getMemberRequests(tribeId: String) async throws -> [TribeMemberRequest]
    func approveMemberRequest(tribeId: String, requestId: String, permissions: PermissionsUpdate?) async throws -> TribeMember
    func denyMemberRequest(tribeId: String, requestId: String) async throws -> TribeMemberRequest
    func updateMemberSettings(
        tribeId: String,
        memberId: String,
        managementScope: String?,
        proposalNotifications: Bool?,
        digestNotifications: Bool?,
        permissions: PermissionsUpdate?
    ) async throws -> TribeMember
    
    // MARK: - Proposal Operations
    func getProposals(tribeId: String) async throws -> [TribeProposal]
    func acceptProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws -> TribeProposal
    func notNowProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws -> TribeProposal
    func dismissProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws
    
    // MARK: - Item Operations
    func createTribeItem(
        tribeId: String,
        itemType: String,
        data: [String: Any],
        recipientUserIds: [String],
        idempotencyKey: String
    ) async throws -> TribeItem
    func getSharedItems(tribeId: String) async throws -> [TribeItem]
    
    // MARK: - Message Operations
    func getMessages(tribeId: String, limit: Int, before: Date?) async throws -> [TribeMessage]
    func sendMessage(tribeId: String, message: String) async throws -> TribeMessage
    func editMessage(tribeId: String, messageId: String, newMessage: String) async throws -> TribeMessage
    func deleteMessage(tribeId: String, messageId: String) async throws
    
    // MARK: - Invitation Operations
    func getPendingInvitations() async throws -> [TribeInvitation]
}

// MARK: - API Implementation

/// Production implementation using TribeAPIClient
class TribeAPIRepository: TribeRepository {
    private let apiClient: TribeAPIClient
    private let cacheService: CacheService
    
    init(apiClient: TribeAPIClient = .shared, cacheService: CacheService = .shared) {
        self.apiClient = apiClient
        self.cacheService = cacheService
    }
    
    // MARK: - Tribe Operations
    
    func getTribes() async throws -> [Tribe] {
        // Check cache first
        if let cached = await cacheService.get("tribes") as? [Tribe],
           !(await cacheService.isExpired("tribes")) {
            return cached
        }
        
        // Fetch from API
        let tribes = try await apiClient.getTribes()
        await cacheService.set("tribes", value: tribes, ttl: 300) // 5 min cache
        return tribes
    }
    
    func getTribe(id: String) async throws -> Tribe {
        let cacheKey = "tribe_\(id)"
        if let cached = await cacheService.get(cacheKey) as? Tribe,
           !(await cacheService.isExpired(cacheKey)) {
            return cached
        }
        
        // Fetch from tribes list
        let tribes = try await getTribes()
        guard let tribe = tribes.first(where: { $0.id == id }) else {
            throw TribeRepositoryError.tribeNotFound(id)
        }
        
        await cacheService.set(cacheKey, value: tribe, ttl: 300)
        return tribe
    }
    
    func createTribe(name: String) async throws -> Tribe {
        let tribe = try await apiClient.createTribe(name: name)
        await cacheService.invalidate("tribes") // Invalidate cache
        return tribe
    }
    
    func renameTribe(id: String, newName: String) async throws -> Tribe {
        let tribe = try await apiClient.renameTribe(tribeId: id, newName: newName)
        await cacheService.invalidate("tribes")
        await cacheService.invalidate("tribe_\(id)")
        return tribe
    }
    
    func deleteTribe(id: String) async throws {
        try await apiClient.deleteTribe(tribeId: id)
        await cacheService.invalidate("tribes")
        await cacheService.invalidate("tribe_\(id)")
    }
    
    func acceptInvitation(tribeId: String) async throws -> TribeMember {
        let member = try await apiClient.acceptTribeInvitation(tribeId: tribeId)
        await cacheService.invalidate("tribes")
        await cacheService.invalidate("invitations")
        return member
    }
    
    func leaveTribe(id: String) async throws {
        try await apiClient.leaveTribe(tribeId: id)
        await cacheService.invalidate("tribes")
        await cacheService.invalidate("tribe_\(id)")
    }
    
    // MARK: - Member Operations
    
    func getMembers(tribeId: String) async throws -> [TribeMember] {
        let cacheKey = "members_\(tribeId)"
        if let cached = await cacheService.get(cacheKey) as? [TribeMember],
           !(await cacheService.isExpired(cacheKey)) {
            return cached
        }
        
        let members = try await apiClient.getTribeMembers(tribeId: tribeId)
        await cacheService.set(cacheKey, value: members, ttl: 180) // 3 min cache
        return members
    }
    
    func inviteMember(tribeId: String, userId: String, permissions: PermissionsUpdate?) async throws -> TribeMember {
        let member = try await apiClient.inviteMember(tribeId: tribeId, userId: userId, permissions: permissions)
        await cacheService.invalidate("members_\(tribeId)")
        return member
    }
    
    func inviteContact(tribeId: String, contactIdentifier: String, contactType: String, contactName: String?, permissions: PermissionsUpdate?) async throws -> PendingTribeInvitation {
        let invitation = try await apiClient.inviteContact(
            tribeId: tribeId,
            contactIdentifier: contactIdentifier,
            contactType: contactType,
            contactName: contactName,
            permissions: permissions
        )
        await cacheService.invalidate("members_\(tribeId)")
        return invitation
    }
    
    func getMemberRequests(tribeId: String) async throws -> [TribeMemberRequest] {
        let cacheKey = "member_requests_\(tribeId)"
        if let cached = await cacheService.get(cacheKey) as? [TribeMemberRequest],
           !(await cacheService.isExpired(cacheKey)) {
            return cached
        }
        
        let requests = try await apiClient.getMemberRequests(tribeId: tribeId)
        await cacheService.set(cacheKey, value: requests, ttl: 60) // 1 min cache
        return requests
    }
    
    func approveMemberRequest(tribeId: String, requestId: String, permissions: PermissionsUpdate?) async throws -> TribeMember {
        let member = try await apiClient.approveMemberRequest(tribeId: tribeId, requestId: requestId, permissions: permissions)
        await cacheService.invalidate("members_\(tribeId)")
        await cacheService.invalidate("member_requests_\(tribeId)")
        return member
    }
    
    func denyMemberRequest(tribeId: String, requestId: String) async throws -> TribeMemberRequest {
        let request = try await apiClient.denyMemberRequest(tribeId: tribeId, requestId: requestId)
        await cacheService.invalidate("member_requests_\(tribeId)")
        return request
    }
    
    func updateMemberSettings(
        tribeId: String,
        memberId: String,
        managementScope: String?,
        proposalNotifications: Bool?,
        digestNotifications: Bool?,
        permissions: PermissionsUpdate?
    ) async throws -> TribeMember {
        let member = try await apiClient.updateMemberSettings(
            tribeId: tribeId,
            memberId: memberId,
            managementScope: managementScope,
            proposalNotifications: proposalNotifications,
            digestNotifications: digestNotifications,
            permissions: permissions
        )
        await cacheService.invalidate("members_\(tribeId)")
        return member
    }
    
    // MARK: - Proposal Operations
    
    func getProposals(tribeId: String) async throws -> [TribeProposal] {
        let cacheKey = "proposals_\(tribeId)"
        if let cached = await cacheService.get(cacheKey) as? [TribeProposal],
           !(await cacheService.isExpired(cacheKey)) {
            return cached
        }
        
        let proposals = try await apiClient.getInbox(tribeId: tribeId)
        await cacheService.set(cacheKey, value: proposals, ttl: 60) // 1 min cache
        return proposals
    }
    
    func acceptProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws -> TribeProposal {
        let proposal = try await apiClient.acceptProposal(
            tribeId: tribeId,
            proposalId: proposalId,
            idempotencyKey: idempotencyKey
        )
        await cacheService.invalidate("proposals_\(tribeId)")
        await cacheService.invalidate("shared_\(tribeId)")
        return proposal
    }
    
    func notNowProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws -> TribeProposal {
        let proposal = try await apiClient.notNowProposal(
            tribeId: tribeId,
            proposalId: proposalId,
            idempotencyKey: idempotencyKey
        )
        await cacheService.invalidate("proposals_\(tribeId)")
        return proposal
    }
    
    func dismissProposal(tribeId: String, proposalId: String, idempotencyKey: String) async throws {
        try await apiClient.dismissProposal(
            tribeId: tribeId,
            proposalId: proposalId,
            idempotencyKey: idempotencyKey
        )
        await cacheService.invalidate("proposals_\(tribeId)")
    }
    
    // MARK: - Item Operations
    
    func createTribeItem(
        tribeId: String,
        itemType: String,
        data: [String: Any],
        recipientUserIds: [String],
        idempotencyKey: String
    ) async throws -> TribeItem {
        let item = try await apiClient.createTribeItem(
            tribeId: tribeId,
            itemType: itemType,
            data: data,
            recipientUserIds: recipientUserIds,
            idempotencyKey: idempotencyKey
        )
        await cacheService.invalidate("shared_\(tribeId)")
        return item
    }
    
    func getSharedItems(tribeId: String) async throws -> [TribeItem] {
        let cacheKey = "shared_\(tribeId)"
        if let cached = await cacheService.get(cacheKey) as? [TribeItem],
           !(await cacheService.isExpired(cacheKey)) {
            return cached
        }
        
        let items = try await apiClient.getSharedItems(tribeId: tribeId)
        await cacheService.set(cacheKey, value: items, ttl: 120) // 2 min cache
        return items
    }
    
    // MARK: - Message Operations
    
    func getMessages(tribeId: String, limit: Int = 50, before: Date? = nil) async throws -> [TribeMessage] {
        // Messages typically not cached due to real-time nature
        return try await apiClient.getMessages(tribeId: tribeId, limit: limit, before: before)
    }
    
    func sendMessage(tribeId: String, message: String) async throws -> TribeMessage {
        return try await apiClient.sendMessage(tribeId: tribeId, message: message)
    }
    
    func editMessage(tribeId: String, messageId: String, newMessage: String) async throws -> TribeMessage {
        return try await apiClient.editMessage(tribeId: tribeId, messageId: messageId, newMessage: newMessage)
    }
    
    func deleteMessage(tribeId: String, messageId: String) async throws {
        try await apiClient.deleteMessage(tribeId: tribeId, messageId: messageId)
    }
    
    // MARK: - Invitation Operations
    
    func getPendingInvitations() async throws -> [TribeInvitation] {
        let cacheKey = "invitations"
        if let cached = await cacheService.get(cacheKey) as? [TribeInvitation],
           !(await cacheService.isExpired(cacheKey)) {
            return cached
        }
        
        let invitations = try await apiClient.getPendingInvitations()
        await cacheService.set(cacheKey, value: invitations, ttl: 60)
        return invitations
    }
}

// MARK: - Repository Errors

enum TribeRepositoryError: LocalizedError {
    case tribeNotFound(String)
    case cacheError
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .tribeNotFound(let id):
            return "Tribe with ID \(id) not found"
        case .cacheError:
            return "Cache error occurred"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
