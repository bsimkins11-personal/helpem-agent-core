import Foundation
import SwiftUI
import Combine

/// ViewModel for TribeMessagesView
/// Handles messaging functionality
@MainActor
class TribeMessagesViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var messages: [TribeMessage] = []
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: Error?
    @Published var messageText = ""
    
    // MARK: - Dependencies
    
    private let repository: TribeRepository
    
    // MARK: - Configuration
    
    private let pollingInterval: TimeInterval = 15.0 // 15 seconds
    private var pollingTask: Task<Void, Never>?
    
    // MARK: - Initialization
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    deinit {
        stopPolling()
    }
    
    // MARK: - Public Methods
    
    /// Load messages for a tribe
    func loadMessages(tribeId: String, limit: Int = 50) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            messages = try await repository.getMessages(
                tribeId: tribeId,
                limit: limit,
                before: nil
            )
            
            // Sort by date (most recent last for chat UI)
            messages.sort { $0.createdAt < $1.createdAt }
            
        } catch {
            self.error = error
            AppLogger.error("Failed to load messages: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    /// Send a message
    func sendMessage(tribeId: String) async throws {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }
        
        isSending = true
        defer { isSending = false }
        
        let text = messageText
        messageText = "" // Clear input immediately (optimistic)
        
        do {
            let newMessage = try await repository.sendMessage(tribeId: tribeId, message: text)
            
            // Add to local messages (optimistic update)
            messages.append(newMessage)
            
            // Provide haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            
            AppLogger.info("Message sent successfully", logger: AppLogger.general)
            
        } catch {
            // Restore message on error
            messageText = text
            throw error
        }
    }
    
    /// Edit a message
    func editMessage(tribeId: String, messageId: String, newText: String) async throws {
        guard !newText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ValidationError.emptyMessage
        }
        
        let updatedMessage = try await repository.editMessage(
            tribeId: tribeId,
            messageId: messageId,
            newMessage: newText
        )
        
        // Update local message
        if let index = messages.firstIndex(where: { $0.id == messageId }) {
            messages[index] = updatedMessage
        }
    }
    
    /// Delete a message
    func deleteMessage(tribeId: String, messageId: String) async throws {
        try await repository.deleteMessage(tribeId: tribeId, messageId: messageId)
        
        // Remove from local messages
        messages.removeAll { $0.id == messageId }
    }
    
    /// Start polling for new messages
    func startPolling(tribeId: String) {
        stopPolling() // Stop any existing polling
        
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(self?.pollingInterval ?? 15.0 * 1_000_000_000))
                
                guard !Task.isCancelled else { break }
                
                // Fetch new messages
                await self?.fetchNewMessages(tribeId: tribeId)
            }
        }
    }
    
    /// Stop polling
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }
    
    // MARK: - Private Methods
    
    private func fetchNewMessages(tribeId: String) async {
        guard !messages.isEmpty else { return }
        
        do {
            let newMessages = try await repository.getMessages(
                tribeId: tribeId,
                limit: 10,
                before: nil
            )
            
            // Filter out messages we already have
            let existingIds = Set(messages.map { $0.id })
            let uniqueNew = newMessages.filter { !existingIds.contains($0.id) }
            
            if !uniqueNew.isEmpty {
                messages.append(contentsOf: uniqueNew)
                messages.sort { $0.createdAt < $1.createdAt }
                
                AppLogger.info("Fetched \(uniqueNew.count) new messages", logger: AppLogger.general)
            }
            
        } catch {
            AppLogger.error("Failed to fetch new messages: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}

// MARK: - Computed Properties

extension TribeMessagesViewModel {
    var canSend: Bool {
        !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSending
    }
    
    var isEmpty: Bool {
        messages.isEmpty
    }
}

// MARK: - Validation Error

extension ValidationError {
    static var emptyMessage: ValidationError {
        .emptyTribeName // Reuse error type
    }
}
