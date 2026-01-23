import Foundation

/// API Client for Tribe operations
/// 
/// Enforces non-negotiable product invariants:
/// - All Tribe items are proposals until accepted
/// - No auto-add for any category
/// - Permission checks enforced server-side
class TribeAPIClient {
    static let shared = TribeAPIClient()
    
    private let baseURL: String
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        self.baseURL = AppEnvironment.apiURL
        
        self.decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        self.encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - Tribe CRUD
    
    /// Get all Tribes for the current user
    func getTribes() async throws -> [Tribe] {
        let url = URL(string: "\(baseURL)/tribes")!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribesResponse.self, from: data)
        return response.tribes
    }

    /// Get pending Tribe invitations for the current user
    func getPendingInvitations() async throws -> [TribeInvitation] {
        let url = URL(string: "\(baseURL)/tribes/invitations")!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribeInvitationsResponse.self, from: data)
        return response.invitations
    }
    
    /// Create a new Tribe
    func createTribe(name: String) async throws -> Tribe {
        let url = URL(string: "\(baseURL)/tribes")!
        let request = CreateTribeRequest(name: name)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: Tribe].self, from: data)
        
        guard let tribe = response["tribe"] else {
            throw TribeAPIError.invalidResponse
        }
        return tribe
    }
    
    /// Rename a Tribe (owner only)
    func renameTribe(tribeId: String, newName: String) async throws -> Tribe {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)")!
        let request = CreateTribeRequest(name: newName)
        let data = try await authenticatedRequest(url: url, method: "PATCH", body: request)
        let response = try decoder.decode([String: Tribe].self, from: data)
        
        guard let tribe = response["tribe"] else {
            throw TribeAPIError.invalidResponse
        }
        return tribe
    }
    
    /// Delete a Tribe (owner only, soft delete)
    func deleteTribe(tribeId: String) async throws {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)")!
        _ = try await authenticatedRequest(url: url, method: "DELETE")
    }
    
    /// Accept Tribe invitation
    func acceptTribeInvitation(tribeId: String) async throws -> TribeMember {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/accept")!
        let data = try await authenticatedRequest(url: url, method: "POST")
        let response = try decoder.decode([String: TribeMember].self, from: data)
        
        guard let member = response["member"] else {
            throw TribeAPIError.invalidResponse
        }
        return member
    }
    
    /// Leave a Tribe
    func leaveTribe(tribeId: String) async throws {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/leave")!
        _ = try await authenticatedRequest(url: url, method: "POST")
    }
    
    // MARK: - Tribe Members
    
    /// Get all members of a Tribe
    func getTribeMembers(tribeId: String) async throws -> [TribeMember] {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/members")!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribeMembersResponse.self, from: data)
        return response.members
    }
    
    /// Invite a user to a Tribe (owner can directly add, members create requests)
    func inviteMember(tribeId: String, userId: String, permissions: PermissionsUpdate? = nil) async throws -> TribeMember {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/members")!
        let request = InviteMemberRequest(inviteeUserId: userId, permissions: permissions)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        
        // Try to decode as member first (owner direct add)
        if let memberResponse = try? decoder.decode([String: TribeMember].self, from: data),
           let member = memberResponse["member"] {
            return member
        }
        
        // If not a member, check if it's a request (non-owner)
        if let requestResponse = try? decoder.decode([String: TribeMemberRequest].self, from: data),
           let memberRequest = requestResponse["request"] {
            // Non-owner created a request - throw special error
            throw TribeAPIError.memberRequestCreated(memberRequest)
        }
        
        throw TribeAPIError.invalidResponse
    }
    
    /// Invite a contact (by email or phone) to a Tribe
    /// Creates a pending invitation that auto-accepts when they sign up
    func inviteContact(
        tribeId: String,
        contactIdentifier: String,
        contactType: String,
        contactName: String?,
        permissions: PermissionsUpdate?
    ) async throws -> PendingTribeInvitation {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/invite-contact")!
        let request = InviteContactRequest(
            contactIdentifier: contactIdentifier,
            contactType: contactType,
            contactName: contactName,
            permissions: permissions
        )
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode(InviteContactResponse.self, from: data)
        return response.invitation
    }
    
    /// Request to add a member (for non-owners)
    func requestToAddMember(tribeId: String, userId: String) async throws -> TribeMemberRequest {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/members")!
        let request = InviteMemberRequest(inviteeUserId: userId, permissions: nil)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeMemberRequest].self, from: data)
        
        guard let memberRequest = response["request"] else {
            throw TribeAPIError.invalidResponse
        }
        return memberRequest
    }
    
    /// Get member add requests
    func getMemberRequests(tribeId: String) async throws -> [TribeMemberRequest] {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/member-requests")!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribeMemberRequestsResponse.self, from: data)
        return response.requests
    }
    
    /// Approve a member add request (owner only)
    func approveMemberRequest(tribeId: String, requestId: String, permissions: PermissionsUpdate? = nil) async throws -> TribeMember {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/member-requests/\(requestId)/approve")!
        let request = ApproveMemberRequest(permissions: permissions)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeMember].self, from: data)
        
        guard let member = response["member"] else {
            throw TribeAPIError.invalidResponse
        }
        return member
    }
    
    /// Deny a member add request (owner only)
    func denyMemberRequest(tribeId: String, requestId: String) async throws -> TribeMemberRequest {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/member-requests/\(requestId)/deny")!
        let data = try await authenticatedRequest(url: url, method: "POST")
        let response = try decoder.decode([String: TribeMemberRequest].self, from: data)
        
        guard let request = response["request"] else {
            throw TribeAPIError.invalidResponse
        }
        return request
    }
    
    /// Update member settings
    func updateMemberSettings(
        tribeId: String,
        memberId: String,
        managementScope: String? = nil,
        proposalNotifications: Bool? = nil,
        digestNotifications: Bool? = nil,
        permissions: PermissionsUpdate? = nil
    ) async throws -> TribeMember {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/members/\(memberId)")!
        let request = UpdateMemberRequest(
            managementScope: managementScope,
            proposalNotifications: proposalNotifications,
            digestNotifications: digestNotifications,
            permissions: permissions
        )
        let data = try await authenticatedRequest(url: url, method: "PATCH", body: request)
        let response = try decoder.decode([String: TribeMember].self, from: data)
        
        guard let member = response["member"] else {
            throw TribeAPIError.invalidResponse
        }
        return member
    }
    
    // MARK: - Tribe Inbox & Proposals
    
    /// Get all proposals for current user in a Tribe
    func getInbox(tribeId: String) async throws -> [TribeProposal] {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/inbox")!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribeProposalsResponse.self, from: data)
        return response.proposals
    }
    
    /// Accept a proposal
    /// Tribe items are invitations. They never become active without explicit acceptance.
    /// Generates idempotency key to prevent duplicates on retry.
    func acceptProposal(tribeId: String, proposalId: String, idempotencyKey: String? = nil) async throws -> TribeProposal {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/proposals/\(proposalId)/accept")!
        let key = idempotencyKey ?? PendingOperationManager.generateIdempotencyKey()
        let request = ProposalActionRequest(idempotencyKey: key)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeProposal].self, from: data)
        
        guard let proposal = response["proposal"] else {
            throw TribeAPIError.invalidResponse
        }
        return proposal
    }
    
    /// Mark proposal as "not now"
    /// Generates idempotency key to prevent duplicates on retry.
    func notNowProposal(tribeId: String, proposalId: String, idempotencyKey: String? = nil) async throws -> TribeProposal {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/proposals/\(proposalId)/not-now")!
        let key = idempotencyKey ?? PendingOperationManager.generateIdempotencyKey()
        let request = ProposalActionRequest(idempotencyKey: key)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeProposal].self, from: data)
        
        guard let proposal = response["proposal"] else {
            throw TribeAPIError.invalidResponse
        }
        return proposal
    }
    
    /// Dismiss/remove a proposal
    /// Generates idempotency key to prevent duplicates on retry.
    func dismissProposal(tribeId: String, proposalId: String, idempotencyKey: String? = nil) async throws {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/proposals/\(proposalId)")!
        let key = idempotencyKey ?? PendingOperationManager.generateIdempotencyKey()
        let request = ProposalActionRequest(idempotencyKey: key)
        _ = try await authenticatedRequest(url: url, method: "DELETE", body: request)
    }
    
    // MARK: - Tribe Items
    
    /// Create a Tribe item and send as proposal to recipients
    /// Tribe items are invitations. They never become active without explicit acceptance.
    /// Generates idempotency key to prevent duplicates on retry.
    func createTribeItem(
        tribeId: String,
        itemType: String,
        data: [String: Any],
        recipientUserIds: [String],
        idempotencyKey: String? = nil
    ) async throws -> TribeItem {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/items")!
        
        let key = idempotencyKey ?? PendingOperationManager.generateIdempotencyKey()
        let dataDict = data.mapValues { AnyCodable($0) }
        let request = CreateTribeItemRequest(
            itemType: itemType,
            data: dataDict,
            recipientUserIds: recipientUserIds,
            idempotencyKey: key
        )
        
        let responseData = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeItem].self, from: responseData)
        
        guard let item = response["item"] else {
            throw TribeAPIError.invalidResponse
        }
        return item
    }
    
    /// Get all shared (accepted) items in a Tribe
    func getSharedItems(tribeId: String) async throws -> [TribeItem] {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/shared")!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribeItemsResponse.self, from: data)
        return response.items
    }
    
    // MARK: - Tribe Messages
    
    /// Get messages for a tribe
    func getMessages(tribeId: String, limit: Int = 50, before: Date? = nil) async throws -> [TribeMessage] {
        var urlComponents = URLComponents(string: "\(baseURL)/tribes/\(tribeId)/messages")!
        var queryItems: [URLQueryItem] = [URLQueryItem(name: "limit", value: "\(limit)")]
        if let before = before {
            let formatter = ISO8601DateFormatter()
            queryItems.append(URLQueryItem(name: "before", value: formatter.string(from: before)))
        }
        urlComponents.queryItems = queryItems
        
        let url = urlComponents.url!
        let data = try await authenticatedRequest(url: url, method: "GET")
        let response = try decoder.decode(TribeMessagesResponse.self, from: data)
        return response.messages
    }
    
    /// Send a message to a tribe
    func sendMessage(tribeId: String, message: String) async throws -> TribeMessage {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/messages")!
        let request = SendMessageRequest(message: message)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeMessage].self, from: data)
        
        guard let message = response["message"] else {
            throw TribeAPIError.invalidResponse
        }
        return message
    }
    
    /// Edit a message
    func editMessage(tribeId: String, messageId: String, newMessage: String) async throws -> TribeMessage {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/messages/\(messageId)")!
        let request = SendMessageRequest(message: newMessage)
        let data = try await authenticatedRequest(url: url, method: "PATCH", body: request)
        let response = try decoder.decode([String: TribeMessage].self, from: data)
        
        guard let message = response["message"] else {
            throw TribeAPIError.invalidResponse
        }
        return message
    }
    
    /// Delete a message
    func deleteMessage(tribeId: String, messageId: String) async throws {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/messages/\(messageId)")!
        _ = try await authenticatedRequest(url: url, method: "DELETE")
    }
    
    // MARK: - Private Helpers
    
    private func authenticatedRequest<T: Encodable>(
        url: URL,
        method: String,
        body: T? = nil
    ) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30 // PERFORMANCE: 30 second timeout
        
        // Get session token from Keychain
        guard let token = KeychainHelper.shared.sessionToken else {
            throw TribeAPIError.notAuthenticated
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TribeAPIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            // Try to decode error message
            if let errorResponse = try? decoder.decode([String: String].self, from: data),
               let errorMessage = errorResponse["error"] {
                throw TribeAPIError.serverError(errorMessage)
            }
            throw TribeAPIError.httpError(httpResponse.statusCode)
        }
        
        return data
    }
    
    private func authenticatedRequest(
        url: URL,
        method: String
    ) async throws -> Data {
        return try await authenticatedRequest(url: url, method: method, body: EmptyBody?.none)
    }
}

// MARK: - Errors

enum TribeAPIError: LocalizedError {
    case notAuthenticated
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    case memberRequestCreated(TribeMemberRequest)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated. Please sign in."
        case .invalidResponse:
            return "Invalid response from server."
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .serverError(let message):
            return message
        case .memberRequestCreated:
            return "Request to add member sent to tribe owner"
        }
    }
}

private struct EmptyBody: Encodable {}
