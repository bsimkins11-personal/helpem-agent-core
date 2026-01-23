import SwiftUI

/// Refactored TribeInboxView using Clean Architecture
/// Displays proposals in "New" and "Later" sections
struct TribeInboxViewRefactored: View {
    let tribe: Tribe
    
    @StateObject private var viewModel: TribeInboxViewModel
    @State private var showError = false
    @State private var errorMessage: String?
    
    // MARK: - Initialization
    
    init(tribe: Tribe) {
        self.tribe = tribe
        _viewModel = StateObject(wrappedValue: AppContainer.shared.makeTribeInboxViewModel())
    }
    
    // MARK: - Body
    
    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.isEmpty {
                loadingView
            } else if viewModel.isEmpty {
                emptyView
            } else {
                proposalsList
            }
        }
        .navigationTitle("Inbox")
        .task {
            await viewModel.loadProposals(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadProposals(tribeId: tribe.id)
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") {
                showError = false
            }
        } message: {
            if let errorMessage = errorMessage {
                Text(errorMessage)
            }
        }
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Loading proposals...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Empty View
    
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("No Proposals")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("When tribe members share items with you, they'll appear here.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
    }
    
    // MARK: - Proposals List
    
    private var proposalsList: some View {
        List {
            // New Proposals Section
            if viewModel.hasNewProposals {
                Section {
                    ForEach(viewModel.newProposals) { proposal in
                        ProposalRow(
                            proposal: proposal,
                            isProcessing: viewModel.isProcessing(proposal.id),
                            onAccept: { await handleAccept(proposal) },
                            onNotNow: { await handleNotNow(proposal) },
                            onDismiss: { await handleDismiss(proposal) }
                        )
                    }
                } header: {
                    HStack {
                        Image(systemName: "envelope.fill")
                        Text("New")
                        Spacer()
                        Text("\(viewModel.newProposals.count)")
                            .foregroundColor(.orange)
                    }
                }
            }
            
            // Later Proposals Section
            if viewModel.hasLaterProposals {
                Section {
                    ForEach(viewModel.laterProposals) { proposal in
                        ProposalRow(
                            proposal: proposal,
                            isProcessing: viewModel.isProcessing(proposal.id),
                            onAccept: { await handleAccept(proposal) },
                            onNotNow: nil, // Already in "Later"
                            onDismiss: { await handleDismiss(proposal) }
                        )
                    }
                } header: {
                    HStack {
                        Image(systemName: "clock.fill")
                        Text("Later")
                        Spacer()
                        Text("\(viewModel.laterProposals.count)")
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
    }
    
    // MARK: - Action Handlers
    
    private func handleAccept(_ proposal: TribeProposal) async {
        do {
            try await viewModel.acceptProposal(proposal, tribeId: tribe.id)
        } catch UseCaseError.itemSuppressed {
            errorMessage = "This item was previously deleted and cannot be re-added."
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
    
    private func handleNotNow(_ proposal: TribeProposal) async {
        do {
            try await viewModel.notNowProposal(proposal, tribeId: tribe.id)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
    
    private func handleDismiss(_ proposal: TribeProposal) async {
        do {
            try await viewModel.dismissProposal(proposal, tribeId: tribe.id)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

// MARK: - Proposal Row

struct ProposalRow: View {
    let proposal: TribeProposal
    let isProcessing: Bool
    let onAccept: () async -> Void
    let onNotNow: (() async -> Void)?
    let onDismiss: () async -> Void
    
    @State private var showingActions = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Proposal Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(itemTitle)
                        .font(.headline)
                    
                    Text(itemSubtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if isProcessing {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }
            
            // Action Buttons
            if !isProcessing {
                HStack(spacing: 12) {
                    // Accept Button
                    Button {
                        Task { await onAccept() }
                    } label: {
                        Label("Accept", systemImage: "checkmark.circle.fill")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.green)
                            .cornerRadius(10)
                    }
                    
                    // Not Now Button (if available)
                    if let notNow = onNotNow {
                        Button {
                            Task { await notNow() }
                        } label: {
                            Label("Not Now", systemImage: "clock")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.orange)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.orange.opacity(0.1))
                                .cornerRadius(10)
                        }
                    }
                    
                    // More Options
                    Menu {
                        Button(role: .destructive) {
                            Task { await onDismiss() }
                        } label: {
                            Label("Dismiss", systemImage: "xmark.circle")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 10)
                            .padding(.horizontal, 12)
                            .background(Color.secondary.opacity(0.1))
                            .cornerRadius(10)
                    }
                }
            }
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Computed Properties
    
    private var itemTitle: String {
        guard let item = proposal.item else { return "Unknown Item" }
        
        if let title = item.data["title"]?.value as? String {
            return title
        }
        return "\(item.itemType.capitalized)"
    }
    
    private var itemSubtitle: String {
        guard let item = proposal.item else { return "" }
        
        let type = item.itemType.capitalized
        let date = item.createdAt.formatted(date: .abbreviated, time: .omitted)
        return "\(type) • \(date)"
    }
}

// MARK: - Preview

#if DEBUG
struct TribeInboxViewRefactored_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            TribeInboxViewRefactored(tribe: Tribe(
                id: "1",
                name: "Family",
                ownerId: "user1",
                isOwner: false,
                pendingProposals: 3,
                joinedAt: Date()
            ))
        }
    }
}
#endif
