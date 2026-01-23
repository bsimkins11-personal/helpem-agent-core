import SwiftUI

/// Tribe list showing unread message counts
/// This is the main view users see from homescreen
struct TribeListWithUnreadBadges: View {
    @StateObject private var viewModel = TribeListViewModel()
    @StateObject private var notificationManager = TribeNotificationManager.shared
    
    var body: some View {
        NavigationStack {
            List {
                if viewModel.tribes.isEmpty && !viewModel.isLoading {
                    ContentUnavailableView(
                        "No Tribes Yet",
                        systemImage: "person.3",
                        description: Text("Create or join a tribe to get started")
                    )
                } else {
                    ForEach(viewModel.tribes) { tribe in
                        NavigationLink(destination: TribeMessagesView(tribe: tribe)) {
                            TribeRowWithUnreadBadge(
                                tribe: tribe,
                                unreadCount: notificationManager.unreadCounts[tribe.id] ?? 0
                            )
                        }
                    }
                }
            }
            .navigationTitle("Tribes")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // Create new tribe
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
        }
    }
    
    private func loadData() async {
        await viewModel.loadTribes()
        await notificationManager.fetchUnreadSummary()
    }
}

/// Individual tribe row with unread badge
struct TribeRowWithUnreadBadge: View {
    let tribe: Tribe
    let unreadCount: Int
    
    var body: some View {
        HStack(spacing: 12) {
            // Tribe icon/avatar
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: "person.3.fill")
                        .foregroundColor(.blue)
                }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(tribe.name)
                        .font(.headline)
                        .fontWeight(unreadCount > 0 ? .bold : .regular)
                    
                    Spacer()
                    
                    // Badge
                    if unreadCount > 0 {
                        TribeUnreadBadge(count: unreadCount)
                    }
                }
                
                HStack {
                    // Unread indicator text
                    if unreadCount > 0 {
                        Text("\(unreadCount) unread message\(unreadCount > 1 ? "s" : "")")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .fontWeight(.medium)
                    } else {
                        Text("\(tribe.pendingProposals) pending proposal\(tribe.pendingProposals != 1 ? "s" : "")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

/// Tribe messages view that marks as read when opened
struct TribeMessagesView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeMessagesViewModel()
    @StateObject private var notificationManager = TribeNotificationManager.shared
    @State private var hasMarkedAsRead = false
    
    var body: some View {
        VStack {
            if viewModel.messages.isEmpty && !viewModel.isLoading {
                ContentUnavailableView(
                    "No Messages Yet",
                    systemImage: "bubble.left",
                    description: Text("Start a conversation with your tribe")
                )
            } else {
                List {
                    ForEach(viewModel.messages) { message in
                        MessageRow(message: message)
                    }
                }
            }
            
            // Message input
            MessageInputView(onSend: { text in
                Task {
                    await viewModel.sendMessage(text)
                }
            })
        }
        .navigationTitle(tribe.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadMessages(tribeId: tribe.id)
            
            // Mark as read when opened
            if !hasMarkedAsRead {
                await notificationManager.markAsRead(tribeId: tribe.id)
                hasMarkedAsRead = true
            }
        }
        .onDisappear {
            // Ensure marked as read when leaving
            if !hasMarkedAsRead {
                Task {
                    await notificationManager.markAsRead(tribeId: tribe.id)
                }
            }
        }
    }
}

/// Message row in list
struct MessageRow: View {
    let message: TribeMessage
    @State private var isCurrentUser = false
    
    var body: some View {
        HStack {
            if isCurrentUser {
                Spacer()
            }
            
            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
                Text(message.message)
                    .padding(12)
                    .background(isCurrentUser ? Color.blue : Color.gray.opacity(0.2))
                    .foregroundColor(isCurrentUser ? .white : .primary)
                    .cornerRadius(16)
                
                Text(message.createdAt, style: .relative)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            if !isCurrentUser {
                Spacer()
            }
        }
        .padding(.vertical, 4)
        .task {
            // Determine if current user
            isCurrentUser = message.userId == getCurrentUserId()
        }
    }
    
    private func getCurrentUserId() -> String {
        // Get from session/auth
        return ""
    }
}

/// Message input field
struct MessageInputView: View {
    @State private var messageText = ""
    let onSend: (String) -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            TextField("Message", text: $messageText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)
            
            Button {
                guard !messageText.isEmpty else { return }
                onSend(messageText)
                messageText = ""
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundColor(messageText.isEmpty ? .gray : .blue)
            }
            .disabled(messageText.isEmpty)
        }
        .padding()
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - View Models

@MainActor
class TribeListViewModel: ObservableObject {
    @Published var tribes: [Tribe] = []
    @Published var isLoading = false
    
    func loadTribes() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Fetch from API
            tribes = try await TribeAPIClient.shared.getTribes()
        } catch {
            AppLogger.error("Failed to load tribes: \(error)", logger: AppLogger.general)
        }
    }
}

@MainActor
class TribeMessagesViewModel: ObservableObject {
    @Published var messages: [TribeMessage] = []
    @Published var isLoading = false
    
    func loadMessages(tribeId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            messages = try await TribeAPIClient.shared.getMessages(
                tribeId: tribeId,
                limit: 50,
                before: nil
            )
        } catch {
            AppLogger.error("Failed to load messages: \(error)", logger: AppLogger.general)
        }
    }
    
    func sendMessage(_ text: String) async {
        do {
            guard let firstMessage = messages.first else { return }
            let tribeId = firstMessage.tribeId
            
            let newMessage = try await TribeAPIClient.shared.sendMessage(
                tribeId: tribeId,
                message: text
            )
            
            // Optimistically add to list
            messages.insert(newMessage, at: 0)
        } catch {
            AppLogger.error("Failed to send message: \(error)", logger: AppLogger.general)
        }
    }
}

// MARK: - Preview

#if DEBUG
struct TribeListWithUnreadBadges_Previews: PreviewProvider {
    static var previews: some View {
        TribeListWithUnreadBadges()
    }
}
#endif
