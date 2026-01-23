import SwiftUI

/// Messages view for a tribe
/// Human conversation only - not a command queue
struct TribeMessagesView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeMessagesViewModel()
    @State private var messageText = ""
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message, isCurrentUser: message.userId == viewModel.currentUserId)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) { _ in
                    // Scroll to bottom when new messages arrive
                    if let lastMessage = viewModel.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Message input
            HStack(spacing: 12) {
                TextField("Type a message...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)
                
                Button {
                    sendMessage()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(messageText.isEmpty ? .gray : .blue)
                }
                .disabled(messageText.isEmpty || viewModel.isSending)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .navigationTitle("Messages")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadMessages(tribeId: tribe.id)
        }
        .refreshable {
            await viewModel.loadMessages(tribeId: tribe.id)
        }
    }
    
    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        
        messageText = ""
        Task {
            await viewModel.sendMessage(tribeId: tribe.id, message: text)
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: TribeMessage
    let isCurrentUser: Bool
    
    var body: some View {
        HStack {
            if isCurrentUser {
                Spacer()
            }
            
            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
                Text(message.message)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isCurrentUser ? Color.blue : Color(.systemGray5))
                    .foregroundColor(isCurrentUser ? .white : .primary)
                    .cornerRadius(18)
                
                if let editedAt = message.editedAt {
                    Text("Edited")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Text(message.createdAt.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            if !isCurrentUser {
                Spacer()
            }
        }
    }
}

// MARK: - View Model

@MainActor
class TribeMessagesViewModel: ObservableObject {
    @Published var messages: [TribeMessage] = []
    @Published var isSending = false
    @Published var isLoading = false
    
    var currentUserId: String {
        KeychainHelper.shared.userId ?? ""
    }
    
    func loadMessages(tribeId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            messages = try await TribeAPIClient.shared.getMessages(tribeId: tribeId)
        } catch {
            AppLogger.error("Failed to load messages: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    func sendMessage(tribeId: String, message: String) async {
        isSending = true
        defer { isSending = false }
        
        do {
            let newMessage = try await TribeAPIClient.shared.sendMessage(tribeId: tribeId, message: message)
            messages.append(newMessage)
        } catch {
            AppLogger.error("Failed to send message: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}
