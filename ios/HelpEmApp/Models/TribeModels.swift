import Foundation

/// Tribe items are invitations. They never become active without explicit acceptance.

// MARK: - Tribe

struct Tribe: Codable, Identifiable {
    let id: String
    let name: String
    let ownerId: String
    let isOwner: Bool
    let pendingProposals: Int
    let joinedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case ownerId = "ownerId"
        case isOwner = "isOwner"
        case pendingProposals = "pendingProposals"
        case joinedAt = "joinedAt"
    }
}

// MARK: - Tribe Member

struct TribeMember: Codable, Identifiable {
    let id: String
    let tribeId: String
    let userId: String
    let invitedBy: String
    let invitedAt: Date
    let acceptedAt: Date?
    let leftAt: Date?
    let managementScope: String // "only_shared" or "shared_and_personal"
    let proposalNotifications: Bool
    let digestNotifications: Bool
    let permissions: TribeMemberPermissions?
    
    enum CodingKeys: String, CodingKey {
        case id, userId
        case tribeId = "tribeId"
        case invitedBy = "invitedBy"
        case invitedAt = "invitedAt"
        case acceptedAt = "acceptedAt"
        case leftAt = "leftAt"
        case managementScope = "managementScope"
        case proposalNotifications = "proposalNotifs"
        case digestNotifications = "digestNotifs"
        case permissions
    }
    
    var isAccepted: Bool {
        acceptedAt != nil && leftAt == nil
    }
    
    var isPending: Bool {
        acceptedAt == nil && leftAt == nil
    }
}

// MARK: - Tribe Member Permissions

struct TribeMemberPermissions: Codable {
    let id: String
    let memberId: String
    var canAddTasks: Bool
    var canRemoveTasks: Bool
    var canAddRoutines: Bool
    var canRemoveRoutines: Bool
    var canAddAppointments: Bool
    var canRemoveAppointments: Bool
    var canAddGroceries: Bool
    var canRemoveGroceries: Bool
    
    enum CodingKeys: String, CodingKey {
        case id, memberId
        case canAddTasks = "canAddTasks"
        case canRemoveTasks = "canRemoveTasks"
        case canAddRoutines = "canAddRoutines"
        case canRemoveRoutines = "canRemoveRoutines"
        case canAddAppointments = "canAddAppointments"
        case canRemoveAppointments = "canRemoveAppointments"
        case canAddGroceries = "canAddGroceries"
        case canRemoveGroceries = "canRemoveGroceries"
    }
}

// MARK: - Tribe Item

struct TribeItem: Codable, Identifiable {
    let id: String
    let tribeId: String
    let createdBy: String
    let itemType: String // "task", "routine", "appointment", "grocery"
    let data: [String: AnyCodable] // JSON data
    let createdAt: Date
    let deletedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case createdBy = "createdBy"
        case itemType = "itemType"
        case data
        case createdAt = "createdAt"
        case deletedAt = "deletedAt"
    }
    
    var isDeleted: Bool {
        deletedAt != nil
    }
}

// MARK: - Tribe Proposal

/// Tribe items are invitations. They never become active without explicit acceptance.
struct TribeProposal: Codable, Identifiable {
    let id: String
    let itemId: String
    let recipientId: String
    let state: ProposalState
    let createdAt: Date
    let stateChangedAt: Date
    let notifiedAt: Date?
    let item: TribeItem?
    
    enum CodingKeys: String, CodingKey {
        case id
        case itemId = "itemId"
        case recipientId = "recipientId"
        case state
        case createdAt = "createdAt"
        case stateChangedAt = "stateChangedAt"
        case notifiedAt = "notifiedAt"
        case item
    }
}

// MARK: - Proposal State

enum ProposalState: String, Codable {
    case proposed = "proposed"
    case notNow = "not_now"
    case accepted = "accepted"
    case dismissed = "dismissed"
    
    var displayName: String {
        switch self {
        case .proposed:
            return "New"
        case .notNow:
            return "Not Now"
        case .accepted:
            return "Accepted"
        case .dismissed:
            return "Dismissed"
        }
    }
}

// MARK: - Helper for JSON encoding/decoding

struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

// MARK: - API Response Models

struct TribesResponse: Codable {
    let tribes: [Tribe]
}

struct TribeMembersResponse: Codable {
    let members: [TribeMember]
}

struct TribeProposalsResponse: Codable {
    let proposals: [TribeProposal]
}

struct TribeItemsResponse: Codable {
    let items: [TribeItem]
}

struct TribeInvitationsResponse: Codable {
    let invitations: [TribeInvitation]
}

struct TribeInvitation: Codable, Identifiable {
    let id: String
    let tribeId: String
    let tribeName: String
    let invitedAt: Date
    let invitedBy: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case tribeName = "tribeName"
        case invitedAt = "invitedAt"
        case invitedBy = "invitedBy"
    }
}

// MARK: - Request Models

struct CreateTribeRequest: Codable {
    let name: String
}

struct InviteMemberRequest: Codable {
    let inviteeUserId: String
    let permissions: PermissionsUpdate? // Optional: custom permissions
}

struct CreateTribeItemRequest: Codable {
    let itemType: String
    let data: [String: AnyCodable]
    let recipientUserIds: [String]
    let idempotencyKey: String // REQUIRED for preventing duplicate proposals
}

struct UpdateMemberRequest: Codable {
    let managementScope: String?
    let proposalNotifications: Bool?
    let digestNotifications: Bool?
    let permissions: PermissionsUpdate?
}

struct PermissionsUpdate: Codable {
    let canAddTasks: Bool?
    let canRemoveTasks: Bool?
    let canAddRoutines: Bool?
    let canRemoveRoutines: Bool?
    let canAddAppointments: Bool?
    let canRemoveAppointments: Bool?
    let canAddGroceries: Bool?
    let canRemoveGroceries: Bool?
}

// MARK: - Approve Request Model

struct ApproveMemberRequest: Codable {
    let permissions: PermissionsUpdate?
}

// MARK: - Tribe Member Request

struct TribeMemberRequest: Codable, Identifiable {
    let id: String
    let tribeId: String
    let requestedBy: String
    let requestedUserId: String
    let state: RequestState
    let createdAt: Date
    let reviewedAt: Date?
    let reviewedBy: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case requestedBy = "requestedBy"
        case requestedUserId = "requestedUserId"
        case state
        case createdAt = "createdAt"
        case reviewedAt = "reviewedAt"
        case reviewedBy = "reviewedBy"
    }
}

enum RequestState: String, Codable {
    case pending = "pending"
    case approved = "approved"
    case denied = "denied"
    
    var displayName: String {
        switch self {
        case .pending:
            return "Pending"
        case .approved:
            return "Approved"
        case .denied:
            return "Denied"
        }
    }
}

struct TribeMemberRequestsResponse: Codable {
    let requests: [TribeMemberRequest]
}

// MARK: - Tribe Message

struct TribeMessage: Codable, Identifiable {
    let id: String
    let tribeId: String
    let userId: String
    let message: String
    let createdAt: Date
    let editedAt: Date?
    let deletedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case userId = "userId"
        case message
        case createdAt = "createdAt"
        case editedAt = "editedAt"
        case deletedAt = "deletedAt"
    }
}

struct SendMessageRequest: Codable {
    let message: String
}

struct TribeMessagesResponse: Codable {
    let messages: [TribeMessage]
}

// MARK: - Proposal Action Requests (with idempotency)

struct ProposalActionRequest: Codable {
    let idempotencyKey: String // REQUIRED for preventing duplicate actions
}
