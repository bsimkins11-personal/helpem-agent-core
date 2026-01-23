import Foundation

// MARK: - Personal Item Models with Tribe Origin Tracking

/// Base protocol for all personal items that can be added by tribes
protocol PersonalItemWithOrigin: Identifiable, Codable {
    var id: String { get }
    var originTribeItemId: String? { get }
    var originTribeProposalId: String? { get }
    var addedByTribeId: String? { get }
    var addedByTribeName: String? { get }
    
    /// Returns true if this item was added by a tribe
    var isTribeItem: Bool { get }
}

extension PersonalItemWithOrigin {
    var isTribeItem: Bool {
        addedByTribeId != nil || originTribeItemId != nil
    }
}

// MARK: - Appointment

struct Appointment: PersonalItemWithOrigin, Codable, Identifiable {
    let id: String
    let userId: String
    let title: String
    let withWhom: String?
    let topic: String?
    let location: String?
    let datetime: Date
    let durationMinutes: Int
    let createdAt: Date
    
    // Tribe origin tracking - REQUIRED for silent deletion protection
    let originTribeItemId: String?
    let originTribeProposalId: String?
    let addedByTribeId: String?
    let addedByTribeName: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case withWhom = "with_whom"
        case topic
        case location
        case datetime
        case durationMinutes = "duration_minutes"
        case createdAt = "created_at"
        case originTribeItemId = "origin_tribe_item_id"
        case originTribeProposalId = "origin_tribe_proposal_id"
        case addedByTribeId = "added_by_tribe_id"
        case addedByTribeName = "added_by_tribe_name"
    }
}

// MARK: - Todo

struct Todo: PersonalItemWithOrigin, Codable, Identifiable {
    let id: String
    let userId: String
    let title: String
    let priority: String // "low", "medium", "high"
    let dueDate: Date?
    let reminderTime: Date?
    let completedAt: Date?
    let createdAt: Date
    
    // Tribe origin tracking - REQUIRED for silent deletion protection
    let originTribeItemId: String?
    let originTribeProposalId: String?
    let addedByTribeId: String?
    let addedByTribeName: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case priority
        case dueDate = "due_date"
        case reminderTime = "reminder_time"
        case completedAt = "completed_at"
        case createdAt = "created_at"
        case originTribeItemId = "origin_tribe_item_id"
        case originTribeProposalId = "origin_tribe_proposal_id"
        case addedByTribeId = "added_by_tribe_id"
        case addedByTribeName = "added_by_tribe_name"
    }
    
    var isCompleted: Bool {
        completedAt != nil
    }
}

// MARK: - Habit (Routine)

struct Habit: PersonalItemWithOrigin, Codable, Identifiable {
    let id: String
    let userId: String
    let title: String
    let frequency: String // "daily", "weekly", "custom"
    let daysOfWeek: [String] // ["monday", "tuesday", ...]
    let completions: [String: AnyCodable] // JSON data for completion tracking
    let createdAt: Date
    
    // Tribe origin tracking - REQUIRED for silent deletion protection
    let originTribeItemId: String?
    let originTribeProposalId: String?
    let addedByTribeId: String?
    let addedByTribeName: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case frequency
        case daysOfWeek = "days_of_week"
        case completions
        case createdAt = "created_at"
        case originTribeItemId = "origin_tribe_item_id"
        case originTribeProposalId = "origin_tribe_proposal_id"
        case addedByTribeId = "added_by_tribe_id"
        case addedByTribeName = "added_by_tribe_name"
    }
}

// MARK: - Grocery Item

struct GroceryItem: PersonalItemWithOrigin, Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let category: String?
    let completedAt: Date?
    let createdAt: Date
    
    // Tribe origin tracking - REQUIRED for silent deletion protection
    let originTribeItemId: String?
    let originTribeProposalId: String?
    let addedByTribeId: String?
    let addedByTribeName: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case category
        case completedAt = "completed_at"
        case createdAt = "created_at"
        case originTribeItemId = "origin_tribe_item_id"
        case originTribeProposalId = "origin_tribe_proposal_id"
        case addedByTribeId = "added_by_tribe_id"
        case addedByTribeName = "added_by_tribe_name"
    }
    
    var isCompleted: Bool {
        completedAt != nil
    }
}
