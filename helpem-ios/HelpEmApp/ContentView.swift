// ContentView.swift
// Main view containing the WebView wrapper

import SwiftUI

struct ContentView: View {
    @StateObject private var audioManager = AudioManager()
    @StateObject private var conversationManager = ConversationManager()
    
    var body: some View {
        WebViewContainer(audioManager: audioManager, conversationManager: conversationManager)
            .ignoresSafeArea()
            .onAppear {
                // Request microphone permission on app launch
                audioManager.requestMicrophonePermission()
            }
    }
}

#Preview {
    ContentView()
}
