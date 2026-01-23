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
    @StateObject private var viewModel: TribeInboxViewModel
    
    init(tribe: Tribe) {
        self.tribe = tribe
        _viewModel = StateObject(wrappedValue: AppContainer.shared.makeTribeInboxViewModel())
    }
    
    @State private var showError = false
    
    var body: some View {
        Group {
            let isEmpty = viewModel.newProposals.isEmpty && viewModel.laterProposals.isEmpty
            
            if viewModel.isLoading && isEmpty {
                ProgressView("Loading inbox...")
            } else if isEmpty {
                emptyState
            } else {
                proposalsList
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = viewModel.error {
                Text(ErrorSanitizer.userFacingMessage(for: error))
            }
        }
        .task {
            await viewModel.loadProposals(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadProposals(tribeId: tribe.id)
        }
        .onChange(of: viewModel.error) { _, newError in
            showError = newError != nil
        }
    }
    
    private var proposalsList: some View {
        List {
            // New Proposals Section
            if !viewModel.newProposals.isEmpty {
                Section {
                    ForEach(viewModel.newProposals) { proposal in
                        ProposalCard(
                            proposal: proposal,
                            onAccept: {
                                try? await viewModel.acceptProposal(proposal, tribeId: tribe.id)
                            },
                            onNotNow: {
                                try? await viewModel.notNowProposal(proposal, tribeId: tribe.id)
                            },
                            onDismiss: {
                                try? await viewModel.dismissProposal(proposal, tribeId: tribe.id)
                            }
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                    }
                } header: {
                    Text("New")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            // Later Section (not_now proposals)
            if !viewModel.laterProposals.isEmpty {
                Section {
                    ForEach(viewModel.laterProposals) { proposal in
                        ProposalCard(
                            proposal: proposal,
                            onAccept: {
                                try? await viewModel.acceptProposal(proposal, tribeId: tribe.id)
                            },
                            onNotNow: {
                                try? await viewModel.notNowProposal(proposal, tribeId: tribe.id)
                            },
                            onDismiss: {
                                try? await viewModel.dismissProposal(proposal, tribeId: tribe.id)
                            }
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                        .opacity(0.7) // Muted appearance for "Later" items
                    }
                } header: {
                    Text("Later")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .listStyle(.insetGrouped)
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
        let capitalized = item.itemType.prefix(1).uppercased() + item.itemType.dropFirst()
        return capitalized
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
            let capitalized = priorityString.prefix(1).uppercased() + priorityString.dropFirst()
            HStack {
                Image(systemName: "flag")
                Text(capitalized)
            }
        }
    }
    
    @ViewBuilder
    private var routineDetails: some View {
        if let frequency = item.data["frequency"],
           case let freqString as String = frequency.value {
            let capitalized = freqString.prefix(1).uppercased() + freqString.dropFirst()
            HStack {
                Image(systemName: "repeat")
                Text(capitalized)
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
// Note: TribeInboxViewModel has been moved to Architecture/ViewModels/TribeInboxViewModel.swift  
// This provides better separation of concerns and follows Clean Architecture principles
