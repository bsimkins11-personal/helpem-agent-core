// WebViewContainer.swift
// Native WebView wrapper with authentication and speech capabilities

import SwiftUI
import WebKit
import AVFoundation
import UIKit

// MARK: - Configuration

// MARK: - WebView Container

struct WebViewContainer: UIViewRepresentable {
    
    @ObservedObject var authManager: AuthManager
    @Binding var webViewHandler: RootView.WebViewHandler?
    private let userAgentSuffix = "HelpEm-iOS"
    
    func makeCoordinator() -> Coordinator {
        Coordinator(authManager: authManager)
    }

    func makeUIView(context: Context) -> WKWebView {
        // Configure WebView with memory optimization
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        
        // 🛡️ Memory Management Configuration
        config.suppressesIncrementalRendering = true
        // Use default persistent store but clear it first for fresh start
        config.websiteDataStore = .default()
        
        // Limit media playback to reduce memory usage
        if #available(iOS 15.0, *) {
            config.mediaTypesRequiringUserActionForPlayback = .all
        }
        
        // Register native message handler
        controller.add(context.coordinator, name: "native")
        
        // Inject authentication script
        let token = KeychainHelper.shared.sessionToken ?? ""
        controller.addUserScript(Self.makeAuthScript(token: token))
        
        config.userContentController = controller
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        // Create WebView
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.customUserAgent = "\(webView.value(forKey: "userAgent") as? String ?? "Safari") \(userAgentSuffix)"
        
        // 🧹 Configure for lower memory usage
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        
        context.coordinator.webView = webView
        
        // Set up WebView handler for RootView
        DispatchQueue.main.async {
            print("🔗 WebViewContainer: Setting up WebViewHandler")
            let handler = RootView.WebViewHandler()
            handler.webView = webView
            self.webViewHandler = handler
            print("✅ WebViewContainer: WebViewHandler set up complete")
        }
        
        // 🚨 Setup memory warning observer
        context.coordinator.setupMemoryWarningObserver()
        
        // ⚠️ DISABLED: Aggressive cache clearing was causing re-authentication prompts
        // The WebView needs cached auth state to work properly
        // We only clear cache on logout now, not on every load
        
        // Only clear cache if this is a fresh install (no session token)
        if KeychainHelper.shared.sessionToken == nil {
            print("🧹 First launch - clearing WebView cache...")
            let dataStore = WKWebsiteDataStore.default()
            dataStore.removeData(
                ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                modifiedSince: Date.distantPast
            ) {
                print("✅ Cache cleared for first launch")
            }
        } else {
            print("✅ Preserving WebView cache for authenticated session")
        }
        
        // Load web app
        guard let url = URL(string: AppEnvironment.webAppURL) else {
            print("❌ Invalid web app URL")
            return webView
        }
        
        var request = URLRequest(url: url)
        // Use normal cache policy - let the browser decide when to refresh
        // Aggressive cache clearing was causing re-authentication issues
        request.cachePolicy = .useProtocolCachePolicy
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        print("🌐 Loading web app: \(AppEnvironment.webAppURL)")
        webView.load(request)
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }

    // MARK: - Authentication Script
    
    /// Generate JavaScript to inject session token into WebView
    static func makeAuthScript(token: String) -> WKUserScript {
        let webHost = URL(string: AppEnvironment.webAppURL)?.host ?? ""
        let apiHost = URL(string: AppEnvironment.apiURL)?.host ?? ""
        let safeToken = escapeForJavaScript(token)
        
        let source = """
        (function() {
            const token = "\(safeToken)";
            const webHost = "\(webHost)";
            const apiHost = "\(apiHost)";
            
            if (!token) {
                console.warn('❌ iOS: No session token available to inject');
                return;
            }
            
            console.log('✅ iOS: Session token injected successfully');
            console.log('📱 iOS: Token length:', token.length);
            console.log('📱 iOS: Token preview:', token.substring(0, 20) + '...');
            
            // Store token globally for web app access
            window.__nativeSessionToken = token;
            
            console.log('✅ iOS: window.__nativeSessionToken set');
            console.log('🔍 iOS: Verify - window.__nativeSessionToken exists:', !!window.__nativeSessionToken);
            
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
        
        // Memory management
        private var memoryObserver: NSObjectProtocol?
        
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
                
                // Persist voice input to backend for auditing/analytics
                Task.detached { [text] in
                    do {
                        try await APIClient.shared.saveUserInput(content: text, type: "voice")
                        print("📥 Logged voice input to backend")
                    } catch {
                        print("⚠️ Failed to log voice input:", error.localizedDescription)
                    }
                }
                
                if self.pageReady {
                    self.sendToWeb(text)
                } else {
                    // Queue if page not ready yet
                    self.pendingFinalTexts.append(text)
                }
            }
        }
        
        deinit {
            // Remove memory observer
            if let observer = memoryObserver {
                NotificationCenter.default.removeObserver(observer)
            }
        }
        
        // MARK: - Memory Management
        
        /// Setup memory warning observer to clear cache when memory is low
        func setupMemoryWarningObserver() {
            memoryObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.didReceiveMemoryWarningNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.handleMemoryWarning()
            }
        }
        
        /// Clear WebView cache and data when memory warning is received
        private func handleMemoryWarning() {
            print("⚠️ Memory warning received - clearing WebView cache")
            
            // Clear website data
            let dataStore = WKWebsiteDataStore.default()
            let dataTypes = Set([
                WKWebsiteDataTypeDiskCache,
                WKWebsiteDataTypeMemoryCache,
                WKWebsiteDataTypeOfflineWebApplicationCache
            ])
            
            dataStore.removeData(ofTypes: dataTypes, modifiedSince: Date.distantPast) {
                print("✅ WebView cache cleared")
            }
            
            // Force JavaScript garbage collection
            webView?.evaluateJavaScript("if (window.gc) { window.gc(); }", completionHandler: nil)
        }

        // MARK: - WKNavigationDelegate
        
        /// Called when page finishes loading
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ WebView page loaded")
            pageReady = true
            
            // Send any queued speech results
            pendingFinalTexts.forEach(sendToWeb)
            pendingFinalTexts.removeAll()
            
            // 🧹 Periodic cache cleanup (every page load helps prevent buildup)
            clearOldCacheData()
        }
        
        /// Clear old cached data to prevent memory buildup
        private func clearOldCacheData() {
            let dataStore = WKWebsiteDataStore.default()
            
            // Clear data older than 1 day
            let oneDay = Date().addingTimeInterval(-24 * 60 * 60)
            let dataTypes = Set([
                WKWebsiteDataTypeDiskCache,
                WKWebsiteDataTypeMemoryCache
            ])
            
            dataStore.removeData(ofTypes: dataTypes, modifiedSince: oneDay) {
                print("🧹 Cleared old WebView cache data")
            }
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
            print("⏰ Session expired")
            
            // ⚠️ DISABLED: Silent reauth shows Apple Sign In UI which is disruptive
            // Instead, we rely on the session token remaining valid for 30 days
            // If it truly expires, user will be logged out on next app restart
            
            // For now, just log and do nothing - the session token is valid for 30 days
            // and we don't want to show Apple Sign In prompt while user is using the app
            print("ℹ️ Ignoring auth expiry - session tokens are long-lived (30 days)")
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
            guard let url = URL(string: AppEnvironment.webAppURL) else { return }
            
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
