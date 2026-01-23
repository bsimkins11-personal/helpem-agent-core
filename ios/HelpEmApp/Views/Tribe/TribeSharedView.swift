import SwiftUI

/// Shared items view - shows all accepted proposals in a tribe
struct TribeSharedView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeSharedViewModel()
    
    var body: some View {
        List {
            if viewModel.items.isEmpty && !viewModel.isLoading {
                ContentUnavailableView(
                    "No Shared Items",
                    systemImage: "checkmark.circle",
                    description: Text("Accepted proposals will appear here")
                )
            } else {
                ForEach(viewModel.items) { item in
                    TribeItemRow(item: item)
                }
            }
        }
        .navigationTitle("Shared Items")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadSharedItems(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadSharedItems(tribeId: tribe.id)
        }
    }
}

// MARK: - Tribe Item Row

struct TribeItemRow: View {
    let item: TribeItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // Item type icon
                Image(systemName: iconForItemType(item.itemType))
                    .foregroundColor(colorForItemType(item.itemType))
                
                Text(itemTitle)
                    .font(.headline)
                
                Spacer()
                
                Text(item.createdAt.formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Item details based on type
            if let details = itemDetails {
                Text(details)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
    
    private var itemTitle: String {
        if let data = item.data.value as? [String: Any],
           let title = data["title"] as? String {
            return title
        }
        return "Untitled \(item.itemType.capitalized)"
    }
    
    private var itemDetails: String? {
        guard let data = item.data.value as? [String: Any] else { return nil }
        
        switch item.itemType {
        case "appointment":
            if let datetime = data["datetime"] as? String {
                return datetime
            }
        case "task":
            if let priority = data["priority"] as? String {
                return "Priority: \(priority)"
            }
        case "grocery":
            if let category = data["category"] as? String {
                return category
            }
        default:
            break
        }
        
        return nil
    }
    
    private func iconForItemType(_ type: String) -> String {
        switch type {
        case "appointment": return "calendar"
        case "task": return "checkmark.circle"
        case "routine": return "repeat"
        case "grocery": return "cart"
        default: return "circle"
        }
    }
    
    private func colorForItemType(_ type: String) -> Color {
        switch type {
        case "appointment": return .blue
        case "task": return .green
        case "routine": return .purple
        case "grocery": return .orange
        default: return .gray
        }
    }
}

// MARK: - View Model

@MainActor
class TribeSharedViewModel: ObservableObject {
    @Published var items: [TribeItem] = []
    @Published var isLoading = false
    
    func loadSharedItems(tribeId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            items = try await TribeAPIClient.shared.getSharedItems(tribeId: tribeId)
        } catch {
            AppLogger.error("Failed to load shared items: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}
