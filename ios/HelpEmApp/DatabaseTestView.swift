// DatabaseTestView.swift
// Debug view for testing database storage

import SwiftUI

/// Simple view for testing database persistence
struct DatabaseTestView: View {
    
    @StateObject private var manager = ConversationManager()
    @State private var testMessage = ""
    @State private var statusMessage = ""
    
    var body: some View {
        VStack(spacing: 24) {
            Text("Database Test")
                .font(.largeTitle.bold())
            
            // Input section
            VStack(spacing: 12) {
                TextField("Enter test message", text: $testMessage)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)
                
                HStack(spacing: 16) {
                    Button("Save as Text") {
                        saveMessage(type: .text)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(testMessage.isEmpty)
                    
                    Button("Save as Voice") {
                        saveMessage(type: .voice)
                    }
                    .buttonStyle(.bordered)
                    .disabled(testMessage.isEmpty)
                }
            }
            
            // Status section
            if manager.isLoading {
                ProgressView("Saving...")
            }
            
            if let error = manager.error {
                Text("Error: \(error)")
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            
            if !statusMessage.isEmpty {
                Text(statusMessage)
                    .foregroundColor(.green)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            
            Divider()
            
            // Messages list
            Text("Saved Messages (\(manager.messages.count))")
                .font(.headline)
            
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(manager.messages) { message in
                        MessageRow(message: message)
                    }
                }
                .padding()
            }
            
            Spacer()
            
            // Test buttons
            HStack(spacing: 12) {
                Button("Test DB") {
                    testConnection()
                }
                .buttonStyle(.bordered)
                
                Button("Test Notification") {
                    testNotification()
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
    }
    
    private func saveMessage(type: ConversationManager.Message.MessageType) {
        statusMessage = ""
        
        Task {
            await manager.saveMessage(content: testMessage, type: type)
            
            if manager.error == nil {
                statusMessage = "✅ Saved successfully!"
                testMessage = ""
                
                // Clear status after 3 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    statusMessage = ""
                }
            }
        }
    }
    
    private func testConnection() {
        statusMessage = ""
        
        Task {
            await manager.testConnection()
            
            if manager.error == nil {
                statusMessage = "✅ Database connection OK!"
            }
        }
    }
    
    private func testNotification() {
        statusMessage = ""
        
        Task {
            // Schedule a test notification in 5 seconds
            try? await NotificationManager.shared.scheduleNotification(
                id: "test-notification",
                title: "helpem Test",
                body: "Notifications are working! 🎉",
                timeInterval: 5,
                userInfo: ["type": "test"]
            )
            
            statusMessage = "🔔 Notification scheduled for 5 seconds from now!"
            
            // Clear status after 3 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                statusMessage = ""
            }
        }
    }
}

// MARK: - Message Row

struct MessageRow: View {
    let message: ConversationManager.Message
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: message.type == .text ? "text.bubble" : "waveform")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(message.type == .text ? "Text" : "Voice")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(message.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Text(message.content)
                .font(.body)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Preview

#Preview {
    DatabaseTestView()
}
