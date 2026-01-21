import SwiftUI

/// Tribe Detail screen with three sections:
/// 1. Inbox (proposals)
/// 2. Shared (accepted items)
/// 3. Settings (Tribe management)
struct TribeDetailView: View {
    let tribe: Tribe
    
    @State private var selectedTab: TribeTab = .inbox
    
    enum TribeTab: String, CaseIterable {
        case inbox = "Inbox"
        case shared = "Shared"
        case settings = "Settings"
        
        var icon: String {
            switch self {
            case .inbox:
                return "envelope.fill"
            case .shared:
                return "person.3.fill"
            case .settings:
                return "gear"
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab selector
            Picker("View", selection: $selectedTab) {
                ForEach(TribeTab.allCases, id: \.self) { tab in
                    Label(tab.rawValue, systemImage: tab.icon)
                        .tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Content
            TabView(selection: $selectedTab) {
                TribeInboxView(tribe: tribe)
                    .tag(TribeTab.inbox)
                
                TribeSharedView(tribe: tribe)
                    .tag(TribeTab.shared)
                
                TribeSettingsView(tribe: tribe)
                    .tag(TribeTab.settings)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .navigationTitle(tribe.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Tribe Shared View

/// Shows all accepted Tribe items (green context)
struct TribeSharedView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeSharedViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView("Loading shared items...")
            } else if viewModel.items.isEmpty {
                emptyState
            } else {
                itemsList
            }
        }
        .task {
            await viewModel.loadSharedItems(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadSharedItems(tribeId: tribe.id)
        }
    }
    
    private var itemsList: some View {
        List {
            ForEach(viewModel.items) { item in
                TribeItemRow(item: item)
                    .contextAccent(.tribe) // Green accent for Tribe items
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 50))
                .foregroundColor(.gray)
            
            Text("No Shared Items")
                .font(.title3)
                .fontWeight(.semibold)
            
            Text("When you accept proposals, they'll appear here.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Tribe Item Row

struct TribeItemRow: View {
    let item: TribeItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(itemTitle)
                .font(.body)
            
            Text(item.itemType.capitalized)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
    
    private var itemTitle: String {
        // Extract title from data
        if let titleValue = item.data["title"],
           case .string(let title) = titleValue {
            return title
        }
        if let nameValue = item.data["name"],
           case .string(let name) = nameValue {
            return name
        }
        return "Untitled"
    }
}

// MARK: - View Models

@MainActor
class TribeSharedViewModel: ObservableObject {
    @Published var items: [TribeItem] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    func loadSharedItems(tribeId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            items = try await TribeAPIClient.shared.getSharedItems(tribeId: tribeId)
            AppLogger.info("Loaded \(items.count) shared items", logger: AppLogger.general)
        } catch {
            self.error = error
            AppLogger.error("Failed to load shared items: \(error)", logger: AppLogger.general)
        }
    }
}

// MARK: - Preview

#if DEBUG
struct TribeDetailView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            TribeDetailView(tribe: Tribe(
                id: "1",
                name: "Family",
                ownerId: "user1",
                isOwner: true,
                pendingProposals: 3,
                joinedAt: Date()
            ))
        }
    }
}
#endif
