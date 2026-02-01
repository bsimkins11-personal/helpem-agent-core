import SwiftUI
import Combine

/// Share with Tribe component
/// 
/// NON-NEGOTIABLE RULES:
/// - Sharing with Tribe is explicit and selective
/// - Recipients must be selected (no "send to all" default)
/// - Appointments include warning: "This will be sent as a proposal. Everyone decides for themselves."
struct ShareWithTribeView: View {
    let itemType: String // "task", "routine", "appointment", "grocery"
    let itemData: [String: Any]
    let onShare: (String, [String]) -> Void // (tribeId, recipientUserIds)
    
    @StateObject private var viewModel = ShareWithTribeViewModel()
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedTribeId: String?
    @State private var selectedRecipients: Set<String> = []
    
    var body: some View {
        NavigationStack {
            Form {
                // Tribe selection
                Section("Select Tribe") {
                    if viewModel.tribes.isEmpty {
                        Text("No Tribes available")
                            .foregroundColor(.secondary)
                    } else {
                        Picker("Tribe", selection: $selectedTribeId) {
                            Text("Select...").tag(String?.none)
                            ForEach(viewModel.tribes) { tribe in
                                Text(tribe.name).tag(String?.some(tribe.id))
                            }
                        }
                    }
                }
                
                // Recipient selection (mandatory)
                if selectedTribeId != nil {
                    Section {
                        if viewModel.isLoadingMembers {
                            ProgressView()
                        } else if viewModel.members.isEmpty {
                            Text("No members to share with")
                                .foregroundColor(.secondary)
                        } else {
                            ForEach(viewModel.members) { member in
                                Toggle(isOn: Binding(
                                    get: { selectedRecipients.contains(member.userId) },
                                    set: { isSelected in
                                        if isSelected {
                                            selectedRecipients.insert(member.userId)
                                        } else {
                                            selectedRecipients.remove(member.userId)
                                        }
                                    }
                                )) {
                                    Text(viewModel.displayName(for: member))
                                        .font(.body)
                                }
                            }
                        }
                    } header: {
                        Text("Select Recipients (Required)")
                    } footer: {
                        Text("No 'send to all' default. You must select who receives this.")
                    }
                }
                
                // Appointment notice
                if itemType == "appointment" {
                    Section {
                        HStack(spacing: 12) {
                            Image(systemName: "info.circle")
                                .foregroundColor(.blue)
                            
                            Text("This will be sent as a proposal. Everyone decides for themselves.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Item preview
                Section("Preview") {
                    ItemPreview(itemType: itemType, data: itemData)
                }
            }
            .navigationTitle("Share with Tribe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Share") {
                        handleShare()
                    }
                    .disabled(!canShare)
                }
            }
            .task {
                await viewModel.loadTribes()
            }
            .onChange(of: selectedTribeId) { _, newValue in
                if let tribeId = newValue {
                    selectedRecipients.removeAll()
                    Task {
                        await viewModel.loadMembers(tribeId: tribeId)
                    }
                }
            }
        }
    }
    
    private var canShare: Bool {
        guard selectedTribeId != nil else { return false }
        guard !selectedRecipients.isEmpty else { return false }
        return true
    }
    
    private func handleShare() {
        guard let tribeId = selectedTribeId else { return }
        let recipients = Array(selectedRecipients)
        onShare(tribeId, recipients)
        dismiss()
    }
}

// MARK: - Item Preview

struct ItemPreview: View {
    let itemType: String
    let data: [String: Any]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(itemType.capitalized, systemImage: iconForType)
                .font(.headline)
            
            if let title = data["title"] as? String {
                Text(title)
                    .font(.body)
            }
            
            if let name = data["name"] as? String {
                Text(name)
                    .font(.body)
            }
            
            // Type-specific details
            switch itemType {
            case "appointment":
                appointmentDetails
            case "task":
                taskDetails
            case "routine":
                routineDetails
            case "grocery":
                groceryDetails
            default:
                EmptyView()
            }
        }
        .padding(.vertical, 4)
    }
    
    private var iconForType: String {
        switch itemType {
        case "task":
            return "checkmark.circle"
        case "routine":
            return "repeat"
        case "appointment":
            return "calendar"
        case "grocery":
            return "cart"
        default:
            return "doc"
        }
    }
    
    @ViewBuilder
    private var appointmentDetails: some View {
        if let withWhom = data["withWhom"] as? String {
            Text("With: \(withWhom)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    @ViewBuilder
    private var taskDetails: some View {
        if let priority = data["priority"] as? String {
            Text("Priority: \(priority.capitalized)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    @ViewBuilder
    private var routineDetails: some View {
        if let frequency = data["frequency"] as? String {
            Text("Frequency: \(frequency.capitalized)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    @ViewBuilder
    private var groceryDetails: some View {
        if let category = data["category"] as? String {
            Text("Category: \(category)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - View Model

@MainActor
class ShareWithTribeViewModel: ObservableObject {
    @Published var tribes: [Tribe] = []
    @Published var members: [TribeMember] = []
    @Published var isLoadingMembers = false
    @Published private(set) var currentUserId: String?

    init() {
        // Get current user ID from auth
        currentUserId = AuthManager.shared.currentUserId
    }

    func loadTribes() async {
        // Refresh current user ID
        currentUserId = AuthManager.shared.currentUserId

        do {
            tribes = try await TribeAPIClient.shared.getTribes()
            AppLogger.info("Loaded \(tribes.count) tribes for sharing", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to load tribes: \(error)", logger: AppLogger.general)
        }
    }

    func loadMembers(tribeId: String) async {
        isLoadingMembers = true
        defer { isLoadingMembers = false }

        do {
            let allMembers = try await TribeAPIClient.shared.getTribeMembers(tribeId: tribeId)

            // Filter out current user (can't share with yourself) and only accepted members
            members = allMembers.filter { member in
                member.userId != currentUserId && member.isAccepted
            }

            AppLogger.info("Loaded \(members.count) members for sharing (filtered self)", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to load members: \(error)", logger: AppLogger.general)
        }
    }

    func displayName(for member: TribeMember) -> String {
        if let name = member.displayName, !name.isEmpty {
            return name
        }
        // Fallback: use a truncated userId or generic label
        let shortId = String(member.userId.prefix(8))
        return "Member (\(shortId))"
    }
}

// MARK: - Helper View for Adding "Share with Tribe" toggle to item creation

struct ShareWithTribeToggle: View {
    @Binding var isEnabled: Bool
    @State private var showingShareSheet = false
    
    let itemType: String
    let itemData: [String: Any]
    let onShare: (String, [String]) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("Share with Tribe", isOn: $isEnabled)
            
            if isEnabled {
                Button {
                    showingShareSheet = true
                } label: {
                    HStack {
                        Text("Select Tribe and Recipients")
                            .font(.subheadline)
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .sheet(isPresented: $showingShareSheet) {
                    ShareWithTribeView(
                        itemType: itemType,
                        itemData: itemData,
                        onShare: onShare
                    )
                }
            }
        }
    }
}
