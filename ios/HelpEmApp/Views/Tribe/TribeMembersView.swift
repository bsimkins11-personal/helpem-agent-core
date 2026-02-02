import SwiftUI
import Combine

/// Members list view - shows all tribe members
/// Separate from TribeSettingsView's member management
struct TribeMembersListView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeMembersListViewModel()
    
    var body: some View {
        List {
            if viewModel.members.isEmpty && !viewModel.isLoading {
                ContentUnavailableView(
                    "No Members",
                    systemImage: "person.3",
                    description: Text("Members will appear here")
                )
            } else {
                ForEach(viewModel.members) { member in
                    TribeMemberRow(member: member, isOwner: tribe.isOwner)
                }
            }
        }
        .navigationTitle("Members")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadMembers(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadMembers(tribeId: tribe.id)
        }
    }
}

// MARK: - Member Row (Tribe Members View)

struct TribeMemberRow: View {
    let member: TribeMember
    let isOwner: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            MemberAvatarView(avatarUrl: member.avatarUrl, size: 44)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(memberDisplayName)
                        .font(.headline)

                    if member.isAccepted {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                }

                Text(memberStatus)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if isOwner && member.isAccepted {
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
                    .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }

    private var memberDisplayName: String {
        if let name = member.displayName, !name.isEmpty {
            return name
        }
        return "Member"
    }
    
    private var memberStatus: String {
        if member.isAccepted {
            return "Member"
        } else if member.isPending {
            return "Pending"
        } else {
            return "Left"
        }
    }
}

// MARK: - View Model (Tribe Members View)

@MainActor
class TribeMembersListViewModel: ObservableObject {
    @Published var members: [TribeMember] = []
    @Published var isLoading = false
    
    init() {}
    
    func loadMembers(tribeId: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            members = try await TribeAPIClient.shared.getTribeMembers(tribeId: tribeId)
        } catch {
            AppLogger.error("Failed to load members: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}

// MARK: - Member Avatar View

struct MemberAvatarView: View {
    let avatarUrl: String?
    let size: CGFloat

    var body: some View {
        if let urlString = avatarUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure:
                    placeholderAvatar
                case .empty:
                    placeholderAvatar
                        .overlay {
                            ProgressView()
                        }
                @unknown default:
                    placeholderAvatar
                }
            }
        } else {
            placeholderAvatar
        }
    }

    private var placeholderAvatar: some View {
        Circle()
            .fill(Color.blue.opacity(0.2))
            .frame(width: size, height: size)
            .overlay {
                Image(systemName: "person.fill")
                    .foregroundColor(.blue)
                    .font(.system(size: size * 0.4))
            }
    }
}
