import SwiftUI
import Combine

/// Messages view for a tribe
/// Human conversation only - not a command queue
struct TribeMessagesView: View {
    let tribe: Tribe
    @StateObject private var viewModel: TribeMessagesViewModel
    @State private var messageText = ""
    @State private var sendError: String?
    @State private var failedMessageText: String?

    init(tribe: Tribe) {
        self.tribe = tribe
        _viewModel = StateObject(wrappedValue: AppContainer.shared.makeTribeMessagesViewModel())
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages list or empty/loading state
            if viewModel.isLoading && viewModel.messages.isEmpty {
                Spacer()
                ProgressView("Loading messages...")
                Spacer()
            } else if viewModel.messages.isEmpty {
                emptyState
            } else {
                messagesList
            }

            // Send error banner
            if let error = sendError {
                sendErrorBanner(error: error)
            }

            // Message input
            messageInputSection
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

    // MARK: - Empty State

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Messages", systemImage: "message")
        } description: {
            Text("Start the conversation! Messages you send will appear here.")
        }
    }

    // MARK: - Messages List

    private var messagesList: some View {
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
            .onChange(of: viewModel.messages.count) { oldValue, newValue in
                // Scroll to bottom when new messages arrive
                if newValue > oldValue, let lastMessage = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Send Error Banner

    private func sendErrorBanner(error: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundColor(.red)
            Text("Failed to send")
                .font(.subheadline)
            Spacer()
            Button("Retry") {
                retrySend()
            }
            .font(.subheadline)
            .fontWeight(.medium)
            Button {
                withAnimation {
                    sendError = nil
                    failedMessageText = nil
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.caption)
            }
            .foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color.red.opacity(0.1))
    }

    // MARK: - Message Input

    private var messageInputSection: some View {
        HStack(spacing: 12) {
            TextField("Type a message...", text: $messageText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...5)

            Button {
                sendMessage()
            } label: {
                if viewModel.isSending {
                    ProgressView()
                        .frame(width: 28, height: 28)
                } else {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(messageText.isEmpty ? .gray : .blue)
                }
            }
            .disabled(messageText.isEmpty || viewModel.isSending)
        }
        .padding()
        .background(Color(.systemBackground))
    }

    // MARK: - Actions

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        // Clear any previous error
        sendError = nil
        failedMessageText = nil

        viewModel.messageText = text
        messageText = ""

        Task {
            do {
                try await viewModel.sendMessage(tribeId: tribe.id)
            } catch {
                // Show error with retry option
                failedMessageText = text
                withAnimation {
                    sendError = error.localizedDescription
                }
            }
        }
    }

    private func retrySend() {
        guard let text = failedMessageText, !text.isEmpty else { return }

        sendError = nil
        viewModel.messageText = text

        Task {
            do {
                try await viewModel.sendMessage(tribeId: tribe.id)
                failedMessageText = nil
            } catch {
                withAnimation {
                    sendError = error.localizedDescription
                }
            }
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
                
                if message.editedAt != nil {
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
// Note: TribeMessagesViewModel has been moved to Architecture/ViewModels/TribeMessagesViewModel.swift
// This provides better separation of concerns and follows Clean Architecture principles
