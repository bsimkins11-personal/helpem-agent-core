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
    
    /// Invite a user to a Tribe
    func inviteMember(tribeId: String, userId: String) async throws -> TribeMember {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/members")!
        let request = InviteMemberRequest(inviteeUserId: userId)
        let data = try await authenticatedRequest(url: url, method: "POST", body: request)
        let response = try decoder.decode([String: TribeMember].self, from: data)
        
        guard let member = response["member"] else {
            throw TribeAPIError.invalidResponse
        }
        return member
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
    func acceptProposal(tribeId: String, proposalId: String) async throws -> TribeProposal {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/proposals/\(proposalId)/accept")!
        let data = try await authenticatedRequest(url: url, method: "POST")
        let response = try decoder.decode([String: TribeProposal].self, from: data)
        
        guard let proposal = response["proposal"] else {
            throw TribeAPIError.invalidResponse
        }
        return proposal
    }
    
    /// Mark proposal as "not now"
    func notNowProposal(tribeId: String, proposalId: String) async throws -> TribeProposal {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/proposals/\(proposalId)/not-now")!
        let data = try await authenticatedRequest(url: url, method: "POST")
        let response = try decoder.decode([String: TribeProposal].self, from: data)
        
        guard let proposal = response["proposal"] else {
            throw TribeAPIError.invalidResponse
        }
        return proposal
    }
    
    /// Dismiss/remove a proposal
    func dismissProposal(tribeId: String, proposalId: String) async throws {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/proposals/\(proposalId)")!
        _ = try await authenticatedRequest(url: url, method: "DELETE")
    }
    
    // MARK: - Tribe Items
    
    /// Create a Tribe item and send as proposal to recipients
    /// Tribe items are invitations. They never become active without explicit acceptance.
    func createTribeItem(
        tribeId: String,
        itemType: String,
        data: [String: Any],
        recipientUserIds: [String]
    ) async throws -> TribeItem {
        let url = URL(string: "\(baseURL)/tribes/\(tribeId)/items")!
        
        let dataDict = data.mapValues { AnyCodable($0) }
        let request = CreateTribeItemRequest(
            itemType: itemType,
            data: dataDict,
            recipientUserIds: recipientUserIds
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
    
    // MARK: - Private Helpers
    
    private func authenticatedRequest<T: Encodable>(
        url: URL,
        method: String,
        body: T? = nil
    ) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
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
        }
    }
}

private struct EmptyBody: Encodable {}
