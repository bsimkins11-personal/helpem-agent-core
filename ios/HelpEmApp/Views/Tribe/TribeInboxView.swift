import SwiftUI
import Combine

/// Tribe Inbox - A buffer between social input and personal responsibility
/// 
/// NON-NEGOTIABLE PRODUCT INVARIANTS:
/// - Proposals do NOT appear in Today
/// - Proposals do NOT trigger reminders
/// - Proposals do NOT affect analytics
/// - Only recipient can accept or decline
/// - No social pressure signals
struct TribeInboxView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeInboxViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.proposals.isEmpty {
                ProgressView("Loading inbox...")
            } else if viewModel.proposals.isEmpty {
                emptyState
            } else {
                proposalsList
            }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = viewModel.error {
                Text(error.localizedDescription)
            }
        }
        .task {
            await viewModel.loadInbox(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadInbox(tribeId: tribe.id)
        }
    }
    
    private var proposalsList: some View {
        List {
            ForEach(viewModel.proposals) { proposal in
                ProposalCard(
                    proposal: proposal,
                    onAccept: {
                        await viewModel.acceptProposal(tribeId: tribe.id, proposalId: proposal.id)
                    },
                    onNotNow: {
                        await viewModel.notNowProposal(tribeId: tribe.id, proposalId: proposal.id)
                    },
                    onDismiss: {
                        await viewModel.dismissProposal(tribeId: tribe.id, proposalId: proposal.id)
                    }
                )
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            Text("All Caught Up")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("You have no pending proposals. When someone shares something with you, it will appear here.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Proposal Card

struct ProposalCard: View {
    let proposal: TribeProposal
    let onAccept: () async -> Void
    let onNotNow: () async -> Void
    let onDismiss: () async -> Void
    
    @State private var isProcessing = false
    @State private var showingMenu = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Item info
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(itemTitle)
                        .font(.headline)
                    
                    Text(itemType)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Context indicator (neutral for proposals)
                ItemContextIndicator(context: .proposal, showLabel: true)
            }
            
            // Item details
            if let item = proposal.item {
                ItemDetailsView(item: item)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            // State badge
            if proposal.state == .notNow {
                HStack {
                    Image(systemName: "clock")
                    Text("Not Now")
                }
                .font(.caption)
                .foregroundColor(.orange)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
            
            // Actions
            HStack(spacing: 12) {
                // Accept button (primary action)
                Button {
                    Task {
                        await handleAccept()
                    }
                } label: {
                    Label("Accept", systemImage: "checkmark")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .disabled(isProcessing)
                
                // Not Now button
                Button {
                    Task {
                        await handleNotNow()
                    }
                } label: {
                    Text("Not Now")
                        .font(.subheadline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.gray.opacity(0.2))
                        .foregroundColor(.primary)
                        .cornerRadius(10)
                }
                .disabled(isProcessing)
                
                // More menu (dismiss option)
                Button {
                    showingMenu = true
                } label: {
                    Image(systemName: "ellipsis")
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                }
                .disabled(isProcessing)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .contextAccent(.proposal)
        .confirmationDialog("Proposal Options", isPresented: $showingMenu, titleVisibility: .hidden) {
            Button("Remove", role: .destructive) {
                Task {
                    await handleDismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        }
        .overlay {
            if isProcessing {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black.opacity(0.1))
                    .cornerRadius(12)
            }
        }
    }
    
    private var itemTitle: String {
        guard let item = proposal.item else { return "Untitled" }
        
        if let titleValue = item.data["title"],
           case let value as String = titleValue.value {
            return value
        }
        if let nameValue = item.data["name"],
           case let value as String = nameValue.value {
            return value
        }
        return "Untitled"
    }
    
    private var itemType: String {
        guard let item = proposal.item else { return "Item" }
        return item.itemType.capitalized
    }
    
    private func handleAccept() async {
        isProcessing = true
        defer { isProcessing = false }
        await onAccept()
    }
    
    private func handleNotNow() async {
        isProcessing = true
        defer { isProcessing = false }
        await onNotNow()
    }
    
    private func handleDismiss() async {
        isProcessing = true
        defer { isProcessing = false }
        await onDismiss()
    }
}

// MARK: - Item Details View

struct ItemDetailsView: View {
    let item: TribeItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            switch item.itemType {
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
    }
    
    @ViewBuilder
    private var appointmentDetails: some View {
        if let datetime = item.data["datetime"],
           case let dateString as String = datetime.value,
           let date = ISO8601DateFormatter().date(from: dateString) {
            HStack {
                Image(systemName: "calendar")
                Text(date.formatted(date: .abbreviated, time: .shortened))
            }
        }
        
        if let withWhom = item.data["withWhom"],
           case let name as String = withWhom.value {
            HStack {
                Image(systemName: "person")
                Text(name)
            }
        }
    }
    
    @ViewBuilder
    private var taskDetails: some View {
        if let dueDate = item.data["dueDate"],
           case let dateString as String = dueDate.value,
           let date = ISO8601DateFormatter().date(from: dateString) {
            HStack {
                Image(systemName: "calendar")
                Text("Due: \(date.formatted(date: .abbreviated, time: .omitted))")
            }
        }
        
        if let priority = item.data["priority"],
           case let priorityString as String = priority.value {
            HStack {
                Image(systemName: "flag")
                Text(priorityString.capitalized)
            }
        }
    }
    
    @ViewBuilder
    private var routineDetails: some View {
        if let frequency = item.data["frequency"],
           case let freqString as String = frequency.value {
            HStack {
                Image(systemName: "repeat")
                Text(freqString.capitalized)
            }
        }
    }
    
    @ViewBuilder
    private var groceryDetails: some View {
        if let category = item.data["category"],
           case let categoryString as String = category.value {
            HStack {
                Image(systemName: "tag")
                Text(categoryString)
            }
        }
    }
}

// MARK: - View Model

@MainActor
class TribeInboxViewModel: ObservableObject {
    @Published var proposals: [TribeProposal] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var showError = false
    
    func loadInbox(tribeId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            proposals = try await TribeAPIClient.shared.getInbox(tribeId: tribeId)
            AppLogger.info("Loaded \(proposals.count) proposals", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to load inbox: \(error)", logger: AppLogger.general)
        }
    }
    
    /// Tribe items are invitations. They never become active without explicit acceptance.
    func acceptProposal(tribeId: String, proposalId: String) async {
        do {
            _ = try await TribeAPIClient.shared.acceptProposal(tribeId: tribeId, proposalId: proposalId)
            
            // Remove from inbox
            proposals.removeAll { $0.id == proposalId }
            
            AppLogger.info("Accepted proposal: \(proposalId)", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to accept proposal: \(error)", logger: AppLogger.general)
        }
    }
    
    func notNowProposal(tribeId: String, proposalId: String) async {
        do {
            let updated = try await TribeAPIClient.shared.notNowProposal(tribeId: tribeId, proposalId: proposalId)
            
            // Update in list
            if let index = proposals.firstIndex(where: { $0.id == proposalId }) {
                proposals[index] = updated
            }
            
            AppLogger.info("Marked proposal as not now: \(proposalId)", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to mark proposal as not now: \(error)", logger: AppLogger.general)
        }
    }
    
    func dismissProposal(tribeId: String, proposalId: String) async {
        do {
            try await TribeAPIClient.shared.dismissProposal(tribeId: tribeId, proposalId: proposalId)
            
            // Remove from inbox
            proposals.removeAll { $0.id == proposalId }
            
            AppLogger.info("Dismissed proposal: \(proposalId)", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to dismiss proposal: \(error)", logger: AppLogger.general)
        }
    }
}
