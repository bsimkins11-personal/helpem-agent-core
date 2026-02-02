import SwiftUI
import Combine

/// Enhanced Tribe Detail screen with improved UX
/// Unified hub for all tribe interactions: Messages, Inbox, Shared Items, Settings
struct TribeDetailView: View {
    let tribe: Tribe
    @StateObject private var viewModel: TribeDetailViewModel
    
    init(tribe: Tribe) {
        self.tribe = tribe
        _viewModel = StateObject(wrappedValue: AppContainer.shared.makeTribeDetailViewModel())
    }
    
    @State private var selectedSection: TribeSection? = nil
    @State private var showingSettings = false
    @State private var showingInvite = false
    @State private var showingCreateItem = false
    @State private var createItemType: TribeItemType = .appointment
    @State private var navigateToMessages = false
    @Environment(\.dismiss) private var dismiss
    
    enum TribeSection: String, Identifiable {
        case messages = "Messages"
        case inbox = "Inbox"
        case shared = "Shared"
        case members = "Members"
        case settings = "Settings"
        
        var id: String { rawValue }
        
        var icon: String {
            switch self {
            case .messages: return "message.fill"
            case .inbox: return "envelope.fill"
            case .shared: return "checkmark.circle.fill"
            case .members: return "person.3.fill"
            case .settings: return "gearshape.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .messages: return .blue
            case .inbox: return .orange
            case .shared: return .green
            case .members: return .purple
            case .settings: return .gray
            }
        }
    }
    
    var body: some View {
        List {
            // Header Section
            headerSection
            
            // Quick Actions
            quickActionsSection
            
            // Main Sections
            mainSections
            
            // Info Section
            infoSection
        }
        .listStyle(.insetGrouped)
        .navigationTitle(tribe.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                HStack(spacing: 16) {
                    // Create item button
                    Button {
                        showingCreateItem = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                    }

                    // Menu button
                    Menu {
                        if tribe.isOwner {
                            Button {
                                showingSettings = true
                            } label: {
                                Label("Tribe Settings", systemImage: "gearshape")
                            }

                            Button {
                                showingInvite = true
                            } label: {
                                Label("Invite Members", systemImage: "person.badge.plus")
                            }
                        }

                        Button {
                            shareTribe()
                        } label: {
                            Label("Share Tribe Link", systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .sheet(isPresented: $showingInvite) {
            NavigationStack {
                InviteMemberView(tribe: tribe) {
                    Task {
                        await viewModel.loadTribeData(tribeId: tribe.id)
                    }
                }
            }
        }
        .sheet(isPresented: $showingCreateItem) {
            TribeCreateItemView(tribe: tribe, initialType: createItemType) {
                // Refresh data after creating an item
                Task {
                    await viewModel.loadTribeData(tribeId: tribe.id)
                }
            }
        }
        .navigationDestination(isPresented: $navigateToMessages) {
            TribeMessagesView(tribe: tribe)
        }
        .sheet(isPresented: $showingSettings, onDismiss: {
            // When settings sheet dismisses, check if tribe still exists
            Task {
                await checkTribeExists()
            }
        }) {
            NavigationStack {
                TribeSettingsView(tribe: tribe)
                    .navigationTitle("Tribe Settings")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") {
                                showingSettings = false
                            }
                        }
                    }
            }
        }
        .task {
            await viewModel.loadTribeData(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadTribeData(tribeId: tribe.id)
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        Section {
            VStack(spacing: 12) {
                // Tribe Icon/Avatar
                if let avatarUrl = tribe.avatarUrl, let url = URL(string: avatarUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Circle().fill(Color.gray.opacity(0.2))
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(Circle())
                } else {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [.blue.opacity(0.6), .purple.opacity(0.6)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 80, height: 80)

                        Image(systemName: "person.3.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.white)
                    }
                }
                
                // Tribe Name & Owner Badge
                VStack(spacing: 4) {
                    Text(tribe.name)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    if tribe.isOwner {
                        Label("Owner", systemImage: "crown.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
                
                // Stats Row
                HStack(spacing: 24) {
                    StatBadge(
                        icon: "envelope.fill",
                        value: "\(viewModel.pendingCount)",
                        label: "Pending",
                        color: .orange
                    )
                    
                    StatBadge(
                        icon: "person.3.fill",
                        value: "\(viewModel.memberCount)",
                        label: "Members",
                        color: .blue
                    )
                    
                    StatBadge(
                        icon: "checkmark.circle.fill",
                        value: "\(viewModel.sharedCount)",
                        label: "Shared",
                        color: .green
                    )
                }
                .padding(.top, 8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
        }
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
    }
    
    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        Section("Quick Actions") {
            // Create items row - prominent for sharing
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    QuickActionButton(
                        icon: "calendar.badge.plus",
                        label: "Add Event",
                        color: .blue
                    ) {
                        createItemType = .appointment
                        showingCreateItem = true
                    }

                    QuickActionButton(
                        icon: "checkmark.circle.badge.plus",
                        label: "Add To-Do",
                        color: .green
                    ) {
                        createItemType = .task
                        showingCreateItem = true
                    }
                }

                HStack(spacing: 12) {
                    QuickActionButton(
                        icon: "message.fill",
                        label: "Message",
                        color: .purple
                    ) {
                        navigateToMessages = true
                    }

                    if tribe.isOwner {
                        QuickActionButton(
                            icon: "person.badge.plus",
                            label: "Invite",
                            color: .orange
                        ) {
                            showingInvite = true
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Main Sections
    
    private var mainSections: some View {
        Section {
            NavigationLink {
                TribeMessagesView(tribe: tribe)
            } label: {
                SectionRow(
                    icon: "message.fill",
                    title: "Messages",
                    subtitle: viewModel.unreadCount > 0 ? "\(viewModel.unreadCount) unread" : nil,
                    color: .blue,
                    badge: viewModel.unreadCount > 0 ? viewModel.unreadCount : nil
                )
            }
            
            NavigationLink {
                TribeInboxView(tribe: tribe)
            } label: {
                SectionRow(
                    icon: "envelope.fill",
                    title: "Inbox",
                    subtitle: "Proposals waiting for you",
                    color: .orange,
                    badge: viewModel.pendingCount > 0 ? viewModel.pendingCount : nil
                )
            }
            
            NavigationLink {
                TribeSharedView(tribe: tribe)
            } label: {
                SectionRow(
                    icon: "checkmark.circle.fill",
                    title: "Shared Items",
                    subtitle: "Accepted proposals",
                    color: .green,
                    badge: viewModel.sharedCount > 0 ? viewModel.sharedCount : nil
                )
            }

            NavigationLink {
                TribeSentItemsView(tribe: tribe)
            } label: {
                SectionRow(
                    icon: "paperplane.fill",
                    title: "Sent Items",
                    subtitle: "Items you shared",
                    color: .indigo
                )
            }

            NavigationLink {
                TribeMembersListView(tribe: tribe)
            } label: {
                SectionRow(
                    icon: "person.3.fill",
                    title: "Members",
                    subtitle: "\(viewModel.memberCount) people",
                    color: .purple
                )
            }
        } header: {
            Text("Tribe")
        }
    }
    
    // MARK: - Info Section
    
    private var infoSection: some View {
        Section {
            if tribe.isOwner {
                Button {
                    showingSettings = true
                } label: {
                    SectionRow(
                        icon: "gearshape.fill",
                        title: "Tribe Settings",
                        subtitle: "Manage tribe and permissions",
                        color: .gray
                    )
                }
            }
            
            HStack {
                Label("Joined", systemImage: "calendar")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
                Text(tribe.joinedAt.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        } header: {
            Text("Information")
        }
    }
    
    // MARK: - Helper Methods

    private func checkTribeExists() async {
        // Try to fetch the tribe from the repository
        // If it fails (tribe was deleted), dismiss this view
        do {
            _ = try await AppContainer.shared.tribeRepository.getTribe(id: tribe.id)
        } catch {
            // Tribe no longer exists, dismiss this view
            AppLogger.info("Tribe \(tribe.id) no longer exists, dismissing detail view", logger: AppLogger.general)
            dismiss()
        }
    }

    private func shareTribe() {
        // Create shareable link/message for the tribe
        let shareText = "Join my Tribe '\(tribe.name)' on HelpEm!"
        let activityVC = UIActivityViewController(
            activityItems: [shareText],
            applicationActivities: nil
        )

        // Present the share sheet
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            // Find the topmost presented view controller
            var topVC = rootVC
            while let presented = topVC.presentedViewController {
                topVC = presented
            }
            topVC.present(activityVC, animated: true)
        }
    }
}

// MARK: - Supporting Views

struct StatBadge: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .light)
            impact.impactOccurred()
            action()
        }) {
            HStack {
                Image(systemName: icon)
                    .font(.headline)
                Text(label)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(color.opacity(0.1))
            .foregroundColor(color)
            .cornerRadius(12)
        }
    }
}

struct SectionRow: View {
    let icon: String
    let title: String
    let subtitle: String?
    let color: Color
    var badge: Int? = nil
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(color)
            }
            
            // Text
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Badge
            if let badge = badge, badge > 0 {
                Text("\(badge)")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(color)
                    .clipShape(Capsule())
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - View Model
// Note: TribeDetailViewModel has been moved to Architecture/ViewModels/TribeDetailViewModel.swift
// This provides better separation of concerns and follows Clean Architecture principles

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
                avatarUrl: nil,
                pendingProposals: 3,
                joinedAt: Date()
            ))
        }
    }
}
#endif
