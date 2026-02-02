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
    @Environment(\.openURL) private var openURL

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isCurrentUser {
                Spacer()
            } else {
                // Sender avatar on left for other users
                MessageAvatarView(avatarUrl: message.senderAvatarUrl, size: 32)
            }

            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
                // Sender name (show for all messages)
                if let senderName = message.senderName {
                    Text(senderName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                messageContent
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isCurrentUser ? Color.blue : Color(.systemGray5))
                    .cornerRadius(18)

                HStack(spacing: 4) {
                    if message.editedAt != nil {
                        Text("Edited")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    Text(message.createdAt.formatted(date: .omitted, time: .shortened))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            if isCurrentUser {
                // Sender avatar on right for current user
                MessageAvatarView(avatarUrl: message.senderAvatarUrl, size: 32)
            } else {
                Spacer()
            }
        }
    }

    @ViewBuilder
    private var messageContent: some View {
        let urls = detectURLs(in: message.message)

        if urls.isEmpty {
            // No URLs, just plain text
            Text(message.message)
                .foregroundColor(isCurrentUser ? .white : .primary)
        } else {
            // Has URLs - make them tappable
            LinkedTextView(
                text: message.message,
                urls: urls,
                textColor: isCurrentUser ? .white : .primary,
                linkColor: isCurrentUser ? .white.opacity(0.9) : .blue
            )
        }
    }

    private func detectURLs(in text: String) -> [(range: Range<String.Index>, url: URL)] {
        var results: [(range: Range<String.Index>, url: URL)] = []

        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)

        detector?.enumerateMatches(in: text, options: [], range: nsRange) { match, _, _ in
            if let match = match,
               let url = match.url,
               let range = Range(match.range, in: text) {
                results.append((range: range, url: url))
            }
        }

        return results
    }
}

// MARK: - Linked Text View

struct LinkedTextView: View {
    let text: String
    let urls: [(range: Range<String.Index>, url: URL)]
    let textColor: Color
    let linkColor: Color
    @Environment(\.openURL) private var openURL

    var body: some View {
        // Build attributed text with tappable links
        var attributedString = AttributedString(text)
        attributedString.foregroundColor = textColor

        // Apply link styling to URL ranges
        for urlInfo in urls {
            if let attrRange = Range(urlInfo.range, in: attributedString) {
                attributedString[attrRange].link = urlInfo.url
                attributedString[attrRange].foregroundColor = linkColor
                attributedString[attrRange].underlineStyle = .single
            }
        }

        return Text(attributedString)
            .tint(linkColor)
    }
}

// MARK: - Message Avatar View

struct MessageAvatarView: View {
    let avatarUrl: String?
    let size: CGFloat

    var body: some View {
        if let urlString = avatarUrl, !urlString.isEmpty {
            if let image = decodeBase64Image(from: urlString) {
                // Successfully decoded base64 data URL
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else if !urlString.hasPrefix("data:"), let url = URL(string: urlString) {
                // Regular URL (not a data URL)
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: size, height: size)
                            .clipShape(Circle())
                    default:
                        placeholderAvatar
                    }
                }
            } else {
                placeholderAvatar
            }
        } else {
            placeholderAvatar
        }
    }

    /// Decode a base64 data URL to UIImage
    private func decodeBase64Image(from urlString: String) -> UIImage? {
        guard urlString.hasPrefix("data:") else { return nil }
        guard let commaIndex = urlString.firstIndex(of: ",") else { return nil }

        let base64String = String(urlString[urlString.index(after: commaIndex)...])

        // Try decoding with different options
        if let data = Data(base64Encoded: base64String, options: .ignoreUnknownCharacters),
           let image = UIImage(data: data) {
            return image
        }

        // Try with padding fix
        var paddedString = base64String
        let remainder = paddedString.count % 4
        if remainder > 0 {
            paddedString += String(repeating: "=", count: 4 - remainder)
        }

        if let data = Data(base64Encoded: paddedString, options: .ignoreUnknownCharacters),
           let image = UIImage(data: data) {
            return image
        }

        return nil
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

// MARK: - View Model
// Note: TribeMessagesViewModel has been moved to Architecture/ViewModels/TribeMessagesViewModel.swift
// This provides better separation of concerns and follows Clean Architecture principles
