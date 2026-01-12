// WebViewContainer.swift
// SwiftUI wrapper for WKWebView with native bridge

import SwiftUI
import WebKit

// MARK: - Configuration
struct AppConfig {
    // Change this to your Vercel deployment URL
    static let webAppURL = "https://helpem-poc.vercel.app"
    
    // Message handler name (web calls: window.webkit.messageHandlers.native.postMessage(...))
    static let messageHandlerName = "native"
}

// MARK: - WebView Container
struct WebViewContainer: UIViewRepresentable {
    @ObservedObject var audioManager: AudioManager
    @ObservedObject var conversationManager: ConversationManager
    
    init(audioManager: AudioManager, conversationManager: ConversationManager = ConversationManager()) {
        self.audioManager = audioManager
        self.conversationManager = conversationManager
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(audioManager: audioManager, conversationManager: conversationManager)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        // Configure WebView
        let config = WKWebViewConfiguration()
        
        // Allow inline media playback (important for audio)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Add native message handler for web → native communication
        config.userContentController.add(context.coordinator, name: AppConfig.messageHandlerName)
        
        // Inject JavaScript bridge helper into the page
        let bridgeScript = WKUserScript(
            source: NativeBridge.injectedJavaScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(bridgeScript)
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        
        // Store reference for native → web communication
        context.coordinator.webView = webView
        
        // Load the web app
        if let url = URL(string: AppConfig.webAppURL) {
            webView.load(URLRequest(url: url))
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }
}

// MARK: - Coordinator (handles bridge messages)
class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    weak var webView: WKWebView?
    let audioManager: AudioManager
    let conversationManager: ConversationManager
    
    init(audioManager: AudioManager, conversationManager: ConversationManager) {
        self.audioManager = audioManager
        self.conversationManager = conversationManager
        super.init()
        
        // Listen for audio manager events (existing single-turn flow)
        setupAudioCallbacks()
        
        // Listen for conversation manager events (new conversation mode)
        setupConversationCallbacks()
    }
    
    private func setupAudioCallbacks() {
        // When recording completes, notify web
        audioManager.onRecordingComplete = { [weak self] audioData in
            self?.sendToWeb(message: NativeBridge.Message(
                type: .recordingComplete,
                payload: ["size": audioData.count]
            ))
            
            // Send audio to backend (Phase 2)
            self?.sendAudioToBackend(audioData: audioData)
        }
        
        // When TTS playback completes, notify web
        audioManager.onPlaybackComplete = { [weak self] in
            self?.sendToWeb(message: NativeBridge.Message(
                type: .playbackComplete,
                payload: nil
            ))
        }
        
        // Handle errors
        audioManager.onError = { [weak self] error in
            self?.sendToWeb(message: NativeBridge.Message(
                type: .error,
                payload: ["message": error]
            ))
        }
    }
    
    // MARK: - Conversation Mode Callbacks
    private func setupConversationCallbacks() {
        // State changes
        conversationManager.onStateChange = { [weak self] state, conversationId in
            self?.sendToWeb(message: NativeBridge.Message(
                type: .conversationStateUpdate,
                payload: [
                    "state": state.rawValue,
                    "conversationId": conversationId,
                    "timestamp": Date().timeIntervalSince1970
                ]
            ))
        }
        
        // Audio captured - send for transcription
        conversationManager.onAudioCaptured = { [weak self] audioData, conversationId in
            self?.transcribeConversationAudio(audioData: audioData, conversationId: conversationId)
        }
        
        // TTS playback complete
        conversationManager.onPlaybackComplete = { [weak self] conversationId in
            self?.sendToWeb(message: NativeBridge.Message(
                type: .playbackComplete,
                payload: ["conversationId": conversationId]
            ))
        }
        
        // Errors
        conversationManager.onError = { [weak self] error, conversationId in
            self?.sendToWeb(message: NativeBridge.Message(
                type: .error,
                payload: ["message": error, "conversationId": conversationId]
            ))
        }
    }
    
    // MARK: - WKScriptMessageHandler (Web → Native)
    func userContentController(_ userContentController: WKUserContentController, 
                               didReceive message: WKScriptMessage) {
        guard message.name == AppConfig.messageHandlerName,
              let body = message.body as? [String: Any],
              let typeString = body["type"] as? String,
              let type = NativeBridge.MessageType(rawValue: typeString) else {
            print("Invalid message from web: \(message.body)")
            return
        }
        
        let payload = body["payload"] as? [String: Any]
        
        print("📱 Received from web: \(type.rawValue)")
        
        switch type {
        case .startRecording:
            audioManager.startRecording()
            
        case .stopRecording:
            audioManager.stopRecording()
            
        case .playAudio:
            if let urlString = payload?["url"] as? String,
               let url = URL(string: urlString) {
                audioManager.playAudio(from: url)
            }
            
        case .cancelRecording:
            audioManager.cancelRecording()
            
        case .speakText:
            if let text = payload?["text"] as? String {
                let voice = payload?["voice"] as? String ?? "nova"
                // Use conversation manager if in conversation mode, otherwise use single-turn
                if conversationManager.isActive {
                    fetchAndPlayConversationTTS(text: text, voice: voice)
                } else {
                    fetchAndPlayTTS(text: text, voice: voice)
                }
            }
            
        // MARK: - Conversation Mode Messages
        case .startConversation:
            conversationManager.startConversation()
            if let convId = conversationManager.conversationId {
                sendToWeb(message: NativeBridge.Message(
                    type: .conversationStarted,
                    payload: ["conversationId": convId, "timestamp": Date().timeIntervalSince1970]
                ))
            }
            
        case .endConversation:
            if let convId = conversationManager.conversationId {
                sendToWeb(message: NativeBridge.Message(
                    type: .conversationEnded,
                    payload: ["conversationId": convId, "timestamp": Date().timeIntervalSince1970]
                ))
            }
            conversationManager.endConversation()
            
        case .interruptSpeaking:
            conversationManager.interruptSpeaking()
            
        default:
            print("Unhandled message type: \(type.rawValue)")
        }
    }
    
    // MARK: - Native → Web
    func sendToWeb(message: NativeBridge.Message) {
        guard let webView = webView else { return }
        
        let js = "window.nativeBridge.receive(\(message.toJSON()))"
        
        DispatchQueue.main.async {
            webView.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("Error sending to web: \(error)")
                }
            }
        }
    }
    
    // MARK: - Backend Communication
    private func sendAudioToBackend(audioData: Data) {
        // Update this URL to your Vercel deployment
        guard let url = URL(string: AppConfig.webAppURL + "/api/transcribe") else {
            print("❌ Invalid transcribe URL")
            return
        }
        
        print("📤 Sending audio to backend: \(audioData.count) bytes")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("audio/m4a", forHTTPHeaderField: "Content-Type")
        request.httpBody = audioData
        request.timeoutInterval = 30
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ Transcription request failed: \(error.localizedDescription)")
                    self?.sendToWeb(message: NativeBridge.Message(
                        type: .error,
                        payload: ["message": "Transcription failed: \(error.localizedDescription)"]
                    ))
                    return
                }
                
                guard let data = data else {
                    print("❌ No data received from transcription")
                    return
                }
                
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        if let text = json["text"] as? String {
                            print("✅ Transcription received: \(text)")
                            self?.sendToWeb(message: NativeBridge.Message(
                                type: .transcriptionReady,
                                payload: ["text": text]
                            ))
                        } else if let error = json["error"] as? String {
                            print("❌ Transcription error: \(error)")
                            self?.sendToWeb(message: NativeBridge.Message(
                                type: .error,
                                payload: ["message": error]
                            ))
                        }
                    }
                } catch {
                    print("❌ Failed to parse transcription response: \(error)")
                }
            }
        }.resume()
    }
    
    // MARK: - TTS Audio Playback
    private func fetchAndPlayTTS(text: String, voice: String = "nova") {
        guard let url = URL(string: AppConfig.webAppURL + "/api/tts") else {
            print("❌ Invalid TTS URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["text": text, "voice": voice]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 30
        
        print("🔊 Requesting TTS for: \(text.prefix(50))...")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ TTS request failed: \(error.localizedDescription)")
                    return
                }
                
                guard let data = data, data.count > 0 else {
                    print("❌ No TTS data received")
                    return
                }
                
                print("✅ TTS audio received: \(data.count) bytes")
                self?.audioManager.playAudioData(data)
            }
        }.resume()
    }
    
    // MARK: - Conversation Mode Audio
    
    /// Transcribe audio captured during conversation mode
    private func transcribeConversationAudio(audioData: Data, conversationId: String) {
        guard let url = URL(string: AppConfig.webAppURL + "/api/transcribe") else {
            print("❌ Invalid transcribe URL")
            return
        }
        
        print("📤 [Conv] Sending audio to backend: \(audioData.count) bytes")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("audio/m4a", forHTTPHeaderField: "Content-Type")
        request.httpBody = audioData
        request.timeoutInterval = 30
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ [Conv] Transcription failed: \(error.localizedDescription)")
                    self?.conversationManager.startConversation() // Resume listening
                    return
                }
                
                guard let data = data else {
                    print("❌ [Conv] No transcription data")
                    return
                }
                
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let text = json["text"] as? String, !text.isEmpty {
                        print("✅ [Conv] Transcription: \(text)")
                        
                        // Send transcript to web with conversationId
                        self?.sendToWeb(message: NativeBridge.Message(
                            type: .userTranscript,
                            payload: [
                                "text": text,
                                "conversationId": conversationId,
                                "timestamp": Date().timeIntervalSince1970
                            ]
                        ))
                    } else {
                        print("⚠️ [Conv] Empty transcription")
                        // Resume listening if no text
                        if self?.conversationManager.isActive == true {
                            self?.conversationManager.startConversation()
                        }
                    }
                } catch {
                    print("❌ [Conv] Parse error: \(error)")
                }
            }
        }.resume()
    }
    
    /// Fetch TTS and play via conversation manager (auto-resumes listening)
    private func fetchAndPlayConversationTTS(text: String, voice: String = "nova") {
        guard let url = URL(string: AppConfig.webAppURL + "/api/tts") else {
            print("❌ Invalid TTS URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["text": text, "voice": voice]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 30
        
        print("🔊 [Conv] Requesting TTS: \(text.prefix(50))...")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ [Conv] TTS failed: \(error.localizedDescription)")
                    // Resume listening on error
                    if self?.conversationManager.isActive == true {
                        self?.conversationManager.startConversation()
                    }
                    return
                }
                
                guard let data = data, data.count > 0 else {
                    print("❌ [Conv] No TTS data")
                    return
                }
                
                print("✅ [Conv] TTS received: \(data.count) bytes")
                // Play via conversation manager (will auto-resume listening when done)
                self?.conversationManager.playAudio(data)
            }
        }.resume()
    }
    
    // MARK: - WKNavigationDelegate
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("✅ WebView loaded: \(webView.url?.absoluteString ?? "unknown")")
        
        // Notify web that native bridge is ready
        sendToWeb(message: NativeBridge.Message(
            type: .bridgeReady,
            payload: ["platform": "ios"]
        ))
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("❌ WebView failed: \(error.localizedDescription)")
    }
}
