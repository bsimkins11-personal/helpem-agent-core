// WebViewContainer.swift
// Native WebView wrapper with authentication and speech capabilities

import SwiftUI
import WebKit
import AVFoundation
import UIKit

// MARK: - Configuration

struct AppConfig {
    // For local testing: http://192.168.1.18:3001 (Mac's IP on local network)
    // For production: https://helpem-poc.vercel.app
    static let webAppURL = "https://helpem-poc.vercel.app"
    static let apiURL = "https://api-production-2989.up.railway.app"
    
    /// Returns true if URL should receive session token
    static func shouldAuthenticateRequest(url: String) -> Bool {
        guard let requestURL = URL(string: url) else { return false }
        let host = requestURL.host ?? ""
        
        return host.contains("helpem") ||
               host.contains("railway.app") ||
               url.contains("/api/")
    }
}

// MARK: - WebView Container

struct WebViewContainer: UIViewRepresentable {
    
    @ObservedObject var authManager: AuthManager
    
    func makeCoordinator() -> Coordinator {
        Coordinator(authManager: authManager)
    }

    func makeUIView(context: Context) -> WKWebView {
        // Configure WebView
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        
        // Register native message handler
        controller.add(context.coordinator, name: "native")
        
        // Inject authentication script
        let token = KeychainHelper.shared.sessionToken ?? ""
        controller.addUserScript(Self.makeAuthScript(token: token))
        
        config.userContentController = controller
        
        // Create WebView
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        
        context.coordinator.webView = webView
        
        // Load web app
        guard let url = URL(string: AppConfig.webAppURL) else {
            print("❌ Invalid web app URL")
            return webView
        }
        
        var request = URLRequest(url: url)
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        print("🌐 Loading web app: \(AppConfig.webAppURL)")
        webView.load(request)
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }

    // MARK: - Authentication Script
    
    /// Generate JavaScript to inject session token into WebView
    static func makeAuthScript(token: String) -> WKUserScript {
        let webHost = URL(string: AppConfig.webAppURL)?.host ?? ""
        let apiHost = URL(string: AppConfig.apiURL)?.host ?? ""
        let safeToken = escapeForJavaScript(token)
        
        let source = """
        (function() {
            const token = "\(safeToken)";
            const webHost = "\(webHost)";
            const apiHost = "\(apiHost)";
            
            if (!token) {
                console.warn('No session token available');
                return;
            }
            
            console.log('✅ Session token injected');
            
            // Store token globally for web app access
            window.__nativeSessionToken = token;
            
            // Check if URL should receive auth token
            const shouldAttach = (url) => {
                try {
                    const u = new URL(url, window.location.origin);
                    return u.host === webHost || 
                           u.host === apiHost || 
                           u.pathname.startsWith('/api/');
                } catch (e) {
                    return false;
                }
            };
            
            // Intercept fetch to add Authorization header
            const originalFetch = window.fetch;
            window.fetch = function(input, init = {}) {
                const url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
                
                if (shouldAttach(url)) {
                    const headers = new Headers(init.headers || {});
                    if (!headers.get('Authorization')) {
                        headers.set('Authorization', 'Bearer ' + token);
                    }
                    init.headers = headers;
                }
                
                // Handle 401 responses (session expired)
                return originalFetch(input, init).then((response) => {
                    if (response && response.status === 401) {
                        console.warn('Session expired (401)');
                        if (window.webkit?.messageHandlers?.native) {
                            window.webkit.messageHandlers.native.postMessage({ 
                                action: 'authExpired' 
                            });
                        }
                    }
                    return response;
                });
            };
        })();
        """
        
        return WKUserScript(
            source: source,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
    }
    
    /// Escape string for safe JavaScript injection
    static func escapeForJavaScript(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
    }

    // MARK: - Coordinator
    
    /// Coordinates WebView events, native messaging, and speech
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        
        // MARK: - Properties
        
        private let authManager: AuthManager
        private let speechManager = SpeechManager()
        private let synthesizer = AVSpeechSynthesizer()
        
        // Haptic feedback generators
        private let startHaptic = UIImpactFeedbackGenerator(style: .light)
        private let stopHaptic = UIImpactFeedbackGenerator(style: .soft)
        
        weak var webView: WKWebView?
        
        // Page lifecycle tracking
        private var pageReady = false
        private var pendingFinalTexts: [String] = []
        
        // Voice input tracking
        private var lastInputWasVoice = false
        
        // MARK: - Initialization
        
        init(authManager: AuthManager) {
            self.authManager = authManager
            super.init()
            
            // Prepare haptics for instant feedback
            startHaptic.prepare()
            stopHaptic.prepare()
            
            // Handle speech recognition results
            speechManager.onFinalResult = { [weak self] text in
                guard let self = self else { return }
                self.lastInputWasVoice = true
                
                if self.pageReady {
                    self.sendToWeb(text)
                } else {
                    // Queue if page not ready yet
                    self.pendingFinalTexts.append(text)
                }
            }
        }

        // MARK: - WKNavigationDelegate
        
        /// Called when page finishes loading
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ WebView page loaded")
            pageReady = true
            
            // Send any queued speech results
            pendingFinalTexts.forEach(sendToWeb)
            pendingFinalTexts.removeAll()
        }
        
        /// Called when navigation fails
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("❌ WebView navigation failed:", error.localizedDescription)
        }
        
        // MARK: - Native → Web Communication
        
        /// Send speech result to web app
        private func sendToWeb(_ text: String) {
            guard !text.isEmpty else { return }
            
            let escaped = text
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "\"", with: "\\\"")
                .replacingOccurrences(of: "\n", with: "\\n")
                .replacingOccurrences(of: "\r", with: "\\r")
            
            let js = """
            if (window.handleNativeSpeech) {
                window.handleNativeSpeech("\(escaped)");
            } else {
                console.warn('handleNativeSpeech not found');
            }
            """
            
            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(js) { result, error in
                    if let error = error {
                        print("❌ JS execution error:", error)
                    }
                }
            }
        }

        // MARK: - WKScriptMessageHandler (Web → Native)
        
        /// Handle messages from web app
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "native" else { return }
            
            guard let body = message.body as? [String: Any],
                  let action = body["action"] as? String else {
                print("⚠️ Invalid message format from web")
                return
            }
            
            print("📨 Received action from web:", action)
            
            switch action {
            case "authExpired":
                handleAuthExpired()
                
            case "logout":
                handleLogout()
                
            case "startRecording":
                handleStartRecording()
                
            case "stopRecording":
                handleStopRecording()
                
            case "speak":
                handleSpeak(text: body["text"] as? String)
                
            default:
                print("⚠️ Unknown action:", action)
            }
        }
        
        // MARK: - Message Action Handlers
        
        private func handleStartRecording() {
            // Stop any ongoing speech
            if synthesizer.isSpeaking {
                synthesizer.stopSpeaking(at: .immediate)
            }
            
            // Haptic feedback
            startHaptic.impactOccurred()
            startHaptic.prepare()
            
            // Track that input is voice
            lastInputWasVoice = true
            
            // Start speech recognition
            speechManager.startListening()
            print("🎤 Started recording")
        }
        
        private func handleStopRecording() {
            // Haptic feedback
            stopHaptic.impactOccurred()
            stopHaptic.prepare()
            
            // Stop speech recognition
            speechManager.stopListening()
            print("🛑 Stopped recording")
        }
        
        private func handleSpeak(text: String?) {
            // Only speak if last input was voice
            guard lastInputWasVoice,
                  let text = text,
                  !text.isEmpty else {
                return
            }
            
            speakConversationAware(text)
            
            // Reset voice flag
            lastInputWasVoice = false
        }

        // MARK: - Authentication Handlers
        
        /// Handle expired session token
        private func handleAuthExpired() {
            print("⏰ Session expired, attempting silent reauth...")
            
            Task { @MainActor in
                let success = await authManager.silentReauth()
                
                if success {
                    print("✅ Silent reauth successful, reloading WebView")
                    reloadWebView()
                } else {
                    print("❌ Silent reauth failed, logging out")
                    handleLogout()
                }
            }
        }
        
        /// Handle logout request from web
        private func handleLogout() {
            print("👋 Logout requested from web")
            
            // Clear app session
            authManager.logout()
            
            // Clear WebView data (cookies, storage, etc.)
            WKWebsiteDataStore.default().removeData(
                ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                modifiedSince: Date.distantPast
            ) {
                print("✅ WebView data cleared")
            }
        }
        
        /// Reload WebView with new session token
        private func reloadWebView() {
            guard let webView = webView else { return }
            
            let token = KeychainHelper.shared.sessionToken ?? ""
            
            // Update auth script with new token
            let controller = webView.configuration.userContentController
            controller.removeAllUserScripts()
            controller.addUserScript(WebViewContainer.makeAuthScript(token: token))
            
            // Reload web app
            guard let url = URL(string: AppConfig.webAppURL) else { return }
            
            var request = URLRequest(url: url)
            if !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            webView.load(request)
        }

        // MARK: - Text-to-Speech
        
        /// Speak text with conversation-aware pauses
        private func speakConversationAware(_ text: String) {
            guard !text.isEmpty else { return }
            
            // Stop any ongoing speech
            if synthesizer.isSpeaking {
                synthesizer.stopSpeaking(at: .immediate)
            }
            
            // Configure audio session for speech
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(
                .playback,
                mode: .spokenAudio,
                options: [.duckOthers]  // Duck other audio
            )
            try? session.setActive(true)
            
            // Break text into semantic chunks with appropriate pauses
            let chunks = semanticChunks(from: text)
            
            // Speak each chunk
            for chunk in chunks {
                let utterance = AVSpeechUtterance(string: chunk.text)
                utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
                utterance.rate = AVSpeechUtteranceDefaultSpeechRate
                utterance.postUtteranceDelay = chunk.pause
                synthesizer.speak(utterance)
            }
            
            print("🔊 Speaking: \(text.prefix(50))...")
        }
        
        /// Break text into semantic chunks with natural pauses
        private func semanticChunks(from text: String) -> [(text: String, pause: TimeInterval)] {
            let normalized = text.replacingOccurrences(of: "\n", with: ". ")
            let sentences = normalized
                .components(separatedBy: ".")
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }

            return sentences.map { sentence in
                let lower = sentence.lowercased()

                // Strong transition / intent
                if lower.hasPrefix("here’s what")
                    || lower.hasPrefix("here is what")
                    || lower.hasPrefix("next")
                    || lower.hasPrefix("summary")
                    || lower.hasPrefix("to do")
                    || lower.hasPrefix("i will") {
                    return (sentence, 0.6)
                }

                // List / routine step
                if lower.hasPrefix("first")
                    || lower.hasPrefix("second")
                    || lower.hasPrefix("third")
                    || lower.hasPrefix("then")
                    || lower.hasPrefix("after that") {
                    return (sentence, 0.45)
                }

                // Default conversational sentence
                return (sentence, 0.25)
            }
        }
    }
}
