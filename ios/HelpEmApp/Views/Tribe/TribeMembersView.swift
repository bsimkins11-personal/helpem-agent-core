import SwiftUI

/// Members view - shows all tribe members
struct TribeMembersView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeMembersViewModel()
    
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
                    MemberRow(member: member, isOwner: tribe.isOwner)
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

// MARK: - Member Row

struct MemberRow: View {
    let member: TribeMember
    let isOwner: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: "person.fill")
                        .foregroundColor(.blue)
                }
            
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
        // TODO: Get actual user display name
        return "User \(member.userId.prefix(8))"
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

// MARK: - View Model

@MainActor
class TribeMembersViewModel: ObservableObject {
    @Published var members: [TribeMember] = []
    @Published var isLoading = false
    
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
