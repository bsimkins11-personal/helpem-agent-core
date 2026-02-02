import SwiftUI
import Combine

/// Main Tribe list screen
/// Shows all Tribes the user belongs to with muted pending counts
struct TribeListView: View {
    @StateObject private var viewModel = AppContainer.shared.makeTribeListViewModel()
    @State private var showingCreateTribe = false
    @State private var showError = false
    @State private var showingSignInRequired = false
    @State private var newTribeName = ""
    @State private var newTribeType: TribeType? = nil
    @State private var feedbackMessage: String?
    @State private var showFeedback = false
    @State private var feedbackIsError = false
    @State private var searchText = ""
    @ObservedObject private var authManager = AuthManager.shared

    /// Filtered tribes based on search text
    private var filteredTribes: [Tribe] {
        if searchText.isEmpty {
            return viewModel.tribes
        }
        return viewModel.tribes.filter { tribe in
            tribe.name.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.tribes.isEmpty && viewModel.invitations.isEmpty {
                    ProgressView("Loading Tribes...")
                } else if viewModel.tribes.isEmpty && viewModel.invitations.isEmpty {
                    emptyState
                } else {
                    tribeList
                }
            }
            .navigationTitle("My Tribes")
            // DEBUG: Temporary banner showing invitation count
            .safeAreaInset(edge: .top) {
                HStack {
                    Text("DEBUG: \(viewModel.invitations.count) invitations")
                        .font(.caption)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 4)
                .background(viewModel.invitations.isEmpty ? Color.red : Color.green)
            }
            .searchable(text: $searchText, prompt: "Search tribes")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingCreateTribe = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateTribe) {
                createTribeSheet
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                if let error = viewModel.error {
                    Text(ErrorSanitizer.userFacingMessage(for: error))
                }
            }
            .alert("Sign In Required", isPresented: $showingSignInRequired) {
                Button("Sign In") {
                    AuthManager.shared.signInWithApple()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Your session has expired. Please sign in to access your Tribes.")
            }
            .onReceive(viewModel.$error) { newError in
                if let error = newError {
                    // Check if it's an auth error
                    if let tribeError = error as? TribeAPIError, 
                       case .notAuthenticated = tribeError {
                        showingSignInRequired = true
                        showError = false
                    } else {
                        showError = true
                        showingSignInRequired = false
                    }
                } else {
                    showError = false
                    showingSignInRequired = false
                }
            }
            .onChange(of: authManager.isAuthenticated) { _, isAuth in
                if isAuth {
                    // Reload tribes when auth completes
                    Task {
                        await viewModel.loadTribes()
                    }
                }
            }
            .task {
                await viewModel.loadTribes()
            }
            .onAppear {
                // Reload tribes when view reappears (e.g., after deleting a tribe)
                // This ensures deleted tribes are removed from the UI
                Task {
                    await viewModel.loadTribes()
                }
            }
            .refreshable {
                await viewModel.loadTribes()
            }
            .overlay(alignment: .bottom) {
                if showFeedback, let message = feedbackMessage {
                    feedbackBanner(message: message, isError: feedbackIsError)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .animation(.easeInOut, value: showFeedback)
                }
            }
        }
    }

    private func feedbackBanner(message: String, isError: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: isError ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
            Text(message)
                .font(.subheadline)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(isError ? Color.red : Color.green)
        .cornerRadius(8)
        .shadow(radius: 4)
        .padding(.bottom, 20)
    }

    private func showFeedbackMessage(_ message: String, isError: Bool) {
        feedbackMessage = message
        feedbackIsError = isError
        withAnimation {
            showFeedback = true
        }
        // Auto-hide after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation {
                showFeedback = false
            }
        }
    }
    
    private var tribeList: some View {
        List {
            // Only show invitations when not searching
            if !viewModel.invitations.isEmpty && searchText.isEmpty {
                Section("Invitations") {
                    ForEach(viewModel.invitations) { invitation in
                        InvitationRow(
                            invitation: invitation,
                            onAccept: {
                                do {
                                    try await viewModel.acceptInvitation(invitation)
                                    showFeedbackMessage("Joined '\(invitation.tribeName)'", isError: false)
                                } catch {
                                    showFeedbackMessage("Failed to join tribe", isError: true)
                                }
                            },
                            onDecline: {
                                do {
                                    try await viewModel.declineInvitation(invitation)
                                    showFeedbackMessage("Declined invitation", isError: false)
                                } catch {
                                    showFeedbackMessage("Failed to decline invitation", isError: true)
                                }
                            }
                        )
                    }
                }
            }

            // Show filtered tribes or no results message
            if filteredTribes.isEmpty && !searchText.isEmpty {
                ContentUnavailableView.search(text: searchText)
            } else {
                ForEach(filteredTribes) { tribe in
                    NavigationLink {
                        TribeDetailView(tribe: tribe)
                    } label: {
                        TribeRow(tribe: tribe)
                    }
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Tribes Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create a Tribe to share tasks, routines, appointments, and groceries with people you trust.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            Button {
                showingCreateTribe = true
            } label: {
                Label("Create a Tribe", systemImage: "plus")
                    .padding()
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var createTribeSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Tribe Name", text: $newTribeName)
                        .textContentType(.name)
                } footer: {
                    Text("Choose a name that helps you remember who this Tribe is for.")
                        .font(.caption)
                }
                
                Section("Tribe Type") {
                    VStack(spacing: 10) {
                        ForEach(TribeType.allCases) { type in
                            Button {
                                newTribeType = type
                            } label: {
                                HStack {
                                    Text(type.displayName)
                                        .font(.body)
                                    Spacer()
                                    if newTribeType == type {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.accentColor)
                                    }
                                }
                                .padding(.vertical, 8)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    
                    if let selected = newTribeType {
                        Text(selected.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Select a type to continue.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Create Tribe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingCreateTribe = false
                        newTribeName = ""
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await createTribe()
                        }
                    }
                    .disabled(newTribeName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || newTribeType == nil)
                }
            }
        }
    }
    
    private func createTribe() async {
        let name = newTribeName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, let tribeType = newTribeType else { return }
        
        do {
            _ = try await viewModel.createTribe(name: name, tribeType: tribeType)
            showingCreateTribe = false
            newTribeName = ""
            newTribeType = nil
        } catch {
            // Check if it's an auth error
            if let tribeError = error as? TribeAPIError, 
               case .notAuthenticated = tribeError {
                showingCreateTribe = false
                newTribeName = ""
                newTribeType = nil
                showingSignInRequired = true
            }
            // Other errors are captured in viewModel.error and shown via alert
        }
    }
}

// MARK: - Tribe Row

struct TribeRow: View {
    let tribe: Tribe

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tribe.name)
                    .font(.headline)

                if let description = tribe.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                } else if tribe.isOwner {
                    Text("Owner")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Muted pending count (neutral color, not red)
            if tribe.pendingProposals > 0 {
                Text("\(tribe.pendingProposals)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(12)
                    .accessibilityLabel("\(tribe.pendingProposals) pending proposals")
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Invitation Row

struct InvitationRow: View {
    let invitation: TribeInvitation
    let onAccept: () async -> Void
    let onDecline: () async -> Void

    @State private var isProcessing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(invitation.tribeName)
                .font(.headline)

            Text("You've been invited to join this Tribe.")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 12) {
                Button {
                    Task {
                        await handleAccept()
                    }
                } label: {
                    Label("Accept", systemImage: "checkmark")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isProcessing)

                Button {
                    Task {
                        await handleDecline()
                    }
                } label: {
                    Text("Decline")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.bordered)
                .disabled(isProcessing)
            }
        }
        .padding(.vertical, 4)
    }

    private func handleAccept() async {
        isProcessing = true
        defer { isProcessing = false }
        await onAccept()
    }

    private func handleDecline() async {
        isProcessing = true
        defer { isProcessing = false }
        await onDecline()
    }
}

// MARK: - View Model
// Note: TribeListViewModel has been moved to Architecture/ViewModels/TribeListViewModel.swift
// This provides better separation of concerns and follows Clean Architecture principles
