import Foundation

/// Tribe items are invitations. They never become active without explicit acceptance.

// MARK: - Tribe

struct Tribe: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let ownerId: String
    let isOwner: Bool
    let avatarUrl: String?
    let tribeType: TribeType
    let pendingProposals: Int
    let joinedAt: Date

    // Default permissions for members (family tribes)
    // "propose" = members must propose items for approval
    // "add" = members can add items directly
    let defaultTasksPermission: String
    let defaultAppointmentsPermission: String
    let defaultRoutinesPermission: String
    let defaultGroceriesPermission: String

    /// Friend tribes: messages, propose appointments, propose todos only
    /// Family tribes: full access to all categories (configurable by admin)
    var isFriend: Bool { tribeType == .friend }
    var isFamily: Bool { tribeType == .family }

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case ownerId = "ownerId"
        case isOwner = "isOwner"
        case avatarUrl = "avatarUrl"
        case tribeType = "tribeType"
        case pendingProposals = "pendingProposals"
        case pendingProposalsCount = "pendingProposalsCount"
        case joinedAt = "joinedAt"
        case defaultTasksPermission
        case defaultAppointmentsPermission
        case defaultRoutinesPermission
        case defaultGroceriesPermission
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try? container.decode(String.self, forKey: .description)
        ownerId = try container.decode(String.self, forKey: .ownerId)
        isOwner = try container.decode(Bool.self, forKey: .isOwner)
        avatarUrl = try? container.decode(String.self, forKey: .avatarUrl)
        tribeType = (try? container.decode(TribeType.self, forKey: .tribeType)) ?? .family
        joinedAt = try container.decode(Date.self, forKey: .joinedAt)

        if let pending = try? container.decode(Int.self, forKey: .pendingProposals) {
            pendingProposals = pending
        } else if let pendingCount = try? container.decode(Int.self, forKey: .pendingProposalsCount) {
            pendingProposals = pendingCount
        } else {
            pendingProposals = 0
        }

        // Default permissions (default to "propose" if not present)
        defaultTasksPermission = (try? container.decode(String.self, forKey: .defaultTasksPermission)) ?? "propose"
        defaultAppointmentsPermission = (try? container.decode(String.self, forKey: .defaultAppointmentsPermission)) ?? "propose"
        defaultRoutinesPermission = (try? container.decode(String.self, forKey: .defaultRoutinesPermission)) ?? "propose"
        defaultGroceriesPermission = (try? container.decode(String.self, forKey: .defaultGroceriesPermission)) ?? "propose"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(ownerId, forKey: .ownerId)
        try container.encode(isOwner, forKey: .isOwner)
        try container.encode(tribeType, forKey: .tribeType)
        try container.encode(pendingProposals, forKey: .pendingProposals)
        try container.encode(joinedAt, forKey: .joinedAt)
        try container.encode(defaultTasksPermission, forKey: .defaultTasksPermission)
        try container.encode(defaultAppointmentsPermission, forKey: .defaultAppointmentsPermission)
        try container.encode(defaultRoutinesPermission, forKey: .defaultRoutinesPermission)
        try container.encode(defaultGroceriesPermission, forKey: .defaultGroceriesPermission)
    }

    init(
        id: String,
        name: String,
        description: String? = nil,
        ownerId: String,
        isOwner: Bool,
        avatarUrl: String?,
        tribeType: TribeType = .family,
        pendingProposals: Int,
        joinedAt: Date,
        defaultTasksPermission: String = "propose",
        defaultAppointmentsPermission: String = "propose",
        defaultRoutinesPermission: String = "propose",
        defaultGroceriesPermission: String = "propose"
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.ownerId = ownerId
        self.isOwner = isOwner
        self.avatarUrl = avatarUrl
        self.tribeType = tribeType
        self.pendingProposals = pendingProposals
        self.joinedAt = joinedAt
        self.defaultTasksPermission = defaultTasksPermission
        self.defaultAppointmentsPermission = defaultAppointmentsPermission
        self.defaultRoutinesPermission = defaultRoutinesPermission
        self.defaultGroceriesPermission = defaultGroceriesPermission
    }
}

// MARK: - Tribe Type

enum TribeType: String, Codable, CaseIterable, Identifiable {
    case friend
    case family
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .friend: return "Friends"
        case .family: return "Family"
        }
    }
    
    var description: String {
        switch self {
        case .friend: return "Share tasks, appointments, and chat only."
        case .family: return "Share everything: tasks, routines, groceries, chat."
        }
    }
}

// MARK: - Tribe Member

struct TribeMember: Codable, Identifiable {
    let id: String
    let tribeId: String
    let userId: String
    let invitedBy: String
    let displayName: String?
    let avatarUrl: String?
    let isAdmin: Bool
    let useTribeDefaults: Bool
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
        case displayName = "displayName"
        case avatarUrl = "avatarUrl"
        case isAdmin = "isAdmin"
        case useTribeDefaults = "useTribeDefaults"
        case invitedAt = "invitedAt"
        case acceptedAt = "acceptedAt"
        case leftAt = "leftAt"
        case managementScope = "managementScope"
        case proposalNotifications = "proposalNotifs"
        case digestNotifications = "digestNotifs"
        case permissions
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        tribeId = try container.decode(String.self, forKey: .tribeId)
        userId = try container.decode(String.self, forKey: .userId)
        invitedBy = try container.decode(String.self, forKey: .invitedBy)
        displayName = try? container.decode(String.self, forKey: .displayName)
        avatarUrl = try? container.decode(String.self, forKey: .avatarUrl)
        isAdmin = (try? container.decode(Bool.self, forKey: .isAdmin)) ?? false
        useTribeDefaults = (try? container.decode(Bool.self, forKey: .useTribeDefaults)) ?? true
        invitedAt = try container.decode(Date.self, forKey: .invitedAt)
        acceptedAt = try? container.decode(Date.self, forKey: .acceptedAt)
        leftAt = try? container.decode(Date.self, forKey: .leftAt)
        managementScope = (try? container.decode(String.self, forKey: .managementScope)) ?? "only_shared"
        proposalNotifications = (try? container.decode(Bool.self, forKey: .proposalNotifications)) ?? true
        digestNotifications = (try? container.decode(Bool.self, forKey: .digestNotifications)) ?? false
        permissions = try? container.decode(TribeMemberPermissions.self, forKey: .permissions)
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
    case maybe = "maybe"
    case accepted = "accepted"
    case dismissed = "dismissed"

    var displayName: String {
        switch self {
        case .proposed:
            return "New"
        case .notNow:
            return "Not Now"
        case .maybe:
            return "Maybe"
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
    let tribeType: TribeType?
}

struct UpdateTribeRequest: Codable {
    let name: String?
    let description: String?
    let tribeType: TribeType?
    let avatarUrl: String?
    let defaultTasksPermission: String?
    let defaultAppointmentsPermission: String?
    let defaultRoutinesPermission: String?
    let defaultGroceriesPermission: String?

    init(
        name: String? = nil,
        description: String? = nil,
        tribeType: TribeType? = nil,
        avatarUrl: String? = nil,
        defaultTasksPermission: String? = nil,
        defaultAppointmentsPermission: String? = nil,
        defaultRoutinesPermission: String? = nil,
        defaultGroceriesPermission: String? = nil
    ) {
        self.name = name
        self.description = description
        self.tribeType = tribeType
        self.avatarUrl = avatarUrl
        self.defaultTasksPermission = defaultTasksPermission
        self.defaultAppointmentsPermission = defaultAppointmentsPermission
        self.defaultRoutinesPermission = defaultRoutinesPermission
        self.defaultGroceriesPermission = defaultGroceriesPermission
    }
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
    let isAdmin: Bool?
    let useTribeDefaults: Bool?
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
    let senderName: String?
    let senderAvatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case userId = "userId"
        case message
        case createdAt = "createdAt"
        case editedAt = "editedAt"
        case deletedAt = "deletedAt"
        case senderName = "senderName"
        case senderAvatarUrl = "senderAvatarUrl"
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

// MARK: - Pending Tribe Invitation

struct PendingTribeInvitation: Codable, Identifiable {
    let id: String
    let tribeId: String
    let invitedBy: String
    let contactIdentifier: String
    let contactType: String // "email" or "phone"
    let contactName: String?
    let inviterName: String? // Name of person who sent the invite
    let permissions: [String: AnyCodable]
    let createdAt: Date
    let expiresAt: Date
    let state: String // "pending", "accepted", "expired"
    let acceptedAt: Date?
    let acceptedBy: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case invitedBy = "invitedBy"
        case contactIdentifier = "contactIdentifier"
        case contactType = "contactType"
        case contactName = "contactName"
        case inviterName = "inviterName"
        case permissions
        case createdAt = "createdAt"
        case expiresAt = "expiresAt"
        case state
        case acceptedAt = "acceptedAt"
        case acceptedBy = "acceptedBy"
    }
}

struct InviteContactRequest: Codable {
    let contactIdentifier: String
    let contactType: String // "email" or "phone"
    let contactName: String?
    let permissions: PermissionsUpdate?
}

struct InviteContactResponse: Codable {
    let success: Bool
    let invitation: PendingTribeInvitation
    let inviterName: String
    let message: String
}

// MARK: - Sent Items (for proposer to see responses)

/// A sent item with proposal responses (for appointments only)
struct SentTribeItem: Codable, Identifiable {
    let id: String
    let tribeId: String
    let createdBy: String
    let itemType: String
    let data: [String: AnyCodable]
    let createdAt: Date

    // For appointments: detailed responses
    let responses: [ProposalResponse]?

    // For non-appointments: just the count (privacy)
    let recipientCount: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case tribeId = "tribeId"
        case createdBy = "createdBy"
        case itemType = "itemType"
        case data
        case createdAt = "createdAt"
        case responses
        case recipientCount = "recipientCount"
    }

    /// Whether this is an appointment (has detailed responses)
    var isAppointment: Bool {
        itemType == "appointment"
    }

    /// Get the title from item data
    var title: String {
        if let titleCodable = data["title"],
           case let title as String = titleCodable.value {
            return title
        }
        if let nameCodable = data["name"],
           case let name as String = nameCodable.value {
            return name
        }
        let capitalized = itemType.prefix(1).uppercased() + itemType.dropFirst()
        return "Untitled \(capitalized)"
    }
}

/// A single recipient's response to a proposal
struct ProposalResponse: Codable {
    let recipientId: String
    let recipientUserId: String
    let recipientName: String
    let state: ProposalState
    let stateChangedAt: Date

    enum CodingKeys: String, CodingKey {
        case recipientId = "recipientId"
        case recipientUserId = "recipientUserId"
        case recipientName = "recipientName"
        case state
        case stateChangedAt = "stateChangedAt"
    }
}

struct SentItemsResponse: Codable {
    let items: [SentTribeItem]
}

// MARK: - Referral/Evangelist Program

/// User's referral information and Evangelist badge status
struct ReferralInfo: Codable {
    let referralCode: String?
    let hasBadge: Bool
    let signupCount: Int             // How many people signed up with their code
    let earnedPremiumMonths: Int     // Premium months earned (lifetime total)
    let premiumMonthsThisYear: Int   // Premium months earned this calendar year
    let premiumMonthsRemainingThisYear: Int  // Can still earn this year
    let maxPremiumMonthsPerYear: Int // The yearly cap (3)
    let signupsToNextMonth: Int      // Back-compat (unused)
    let wasReferred: Bool
    let referredAt: Date?
    let hasFreeMonths: Bool          // If user has active referral bonus
    let freeMonthsExpiresAt: Date?   // When their 2 free months expire
    let freeMonthsInProgress: Int?
    let freeMonthsAvailable: Int?
    let freeMonthActiveUntil: Date?
}

/// Response for generating a referral code
struct GenerateCodeResponse: Codable {
    let referralCode: String
    let isNew: Bool
}

/// Response for applying a referral code
struct ApplyCodeResponse: Codable {
    let success: Bool
    let message: String
}
