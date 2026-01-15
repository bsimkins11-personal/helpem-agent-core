// ConversationManager.swift
// Manages conversation state and database persistence

import Foundation
import Combine

@MainActor
final class ConversationManager: ObservableObject {
    
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    // MARK: - Message Model
    
    struct Message: Identifiable {
        let id = UUID()
        let content: String
        let type: MessageType
        let timestamp: Date
        
        enum MessageType {
            case text
            case voice
        }
    }
    
    // MARK: - Public Methods
    
    /// Save a message to the database
    func saveMessage(content: String, type: Message.MessageType = .text) async {
        guard !content.isEmpty else { return }
        
        isLoading = true
        error = nil
        
        // Add message to local state immediately for better UX
        let message = Message(content: content, type: type, timestamp: Date())
        messages.append(message)
        
        do {
            let typeString = type == .text ? "text" : "voice"
            let response = try await apiClient.saveUserInput(content: content, type: typeString)
            
            print("✅ Message saved: \(response.message)")
            
        } catch {
            print("❌ Failed to save message:", error)
            self.error = error.localizedDescription
            
            // Optionally remove message from local state on failure
            // messages.removeAll { $0.id == message.id }
        }
        
        isLoading = false
    }
    
    /// Clear all local messages
    func clearMessages() {
        messages.removeAll()
    }
    
    /// Test database connection
    func testConnection() async {
        do {
            let health = try await apiClient.testDatabaseConnection()
            print("🏥 Health check: status=\(health.status), db=\(health.db ?? "unknown")")
        } catch {
            print("❌ Health check failed:", error)
            self.error = error.localizedDescription
        }
    }
}
