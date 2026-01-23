import Foundation
import SwiftUI
import Combine

/// ViewModel for TribeSharedView
/// Displays shared (accepted) tribe items
@MainActor
class TribeSharedViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var items: [TribeItem] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedCategory: ItemCategory?
    
    // MARK: - Dependencies
    
    private let repository: TribeRepository
    
    // MARK: - Initialization
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    // MARK: - Public Methods
    
    /// Load shared items for a tribe
    func loadSharedItems(tribeId: String) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            items = try await repository.getSharedItems(tribeId: tribeId)
        } catch {
            self.error = error
            AppLogger.error("Failed to load shared items: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    /// Filter items by category
    func selectCategory(_ category: ItemCategory?) {
        selectedCategory = category
    }
}

// MARK: - Computed Properties

extension TribeSharedViewModel {
    var filteredItems: [TribeItem] {
        guard let category = selectedCategory else {
            return items
        }
        
        return items.filter { $0.itemType == category.rawValue }
    }
    
    var taskItems: [TribeItem] {
        items.filter { $0.itemType == "task" }
    }
    
    var routineItems: [TribeItem] {
        items.filter { $0.itemType == "routine" }
    }
    
    var appointmentItems: [TribeItem] {
        items.filter { $0.itemType == "appointment" }
    }
    
    var groceryItems: [TribeItem] {
        items.filter { $0.itemType == "grocery" }
    }
    
    var isEmpty: Bool {
        items.isEmpty
    }
    
    var categoryCounts: [ItemCategory: Int] {
        var counts: [ItemCategory: Int] = [:]
        for category in ItemCategory.allCases {
            counts[category] = items.filter { $0.itemType == category.rawValue }.count
        }
        return counts
    }
}

// MARK: - Item Category

enum ItemCategory: String, CaseIterable, Identifiable {
    case task = "task"
    case routine = "routine"
    case appointment = "appointment"
    case grocery = "grocery"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .task: return "Tasks"
        case .routine: return "Routines"
        case .appointment: return "Appointments"
        case .grocery: return "Grocery"
        }
    }
    
    var icon: String {
        switch self {
        case .task: return "checkmark.circle.fill"
        case .routine: return "repeat.circle.fill"
        case .appointment: return "calendar.circle.fill"
        case .grocery: return "cart.circle.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .task: return .blue
        case .routine: return .purple
        case .appointment: return .orange
        case .grocery: return .green
        }
    }
}
