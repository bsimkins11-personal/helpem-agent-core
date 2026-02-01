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
    private let userAgentSuffix = "helpem-iOS"
    
    func makeCoordinator() -> Coordinator {
        Coordinator(authManager: authManager)
    }

    func makeUIView(context: Context) -> WKWebView {
        #if DEBUG
        AppLogger.debug("WebView creation started", logger: AppLogger.webview)
        #endif
        
        // Configure WebView with memory optimization
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        
        // 🛡️ Memory Management Configuration
        config.suppressesIncrementalRendering = true
        config.websiteDataStore = .default()
        
        // Limit media playback to reduce memory usage
        if #available(iOS 15.0, *) {
            config.mediaTypesRequiringUserActionForPlayback = .all
        }
        
        // Register native message handler
        controller.add(context.coordinator, name: "native")
        
        // Inject authentication script
        let token = KeychainHelper.shared.sessionToken ?? ""
        
        #if DEBUG
        AppLogger.debug("Token exists: \(!token.isEmpty), length: \(token.count)", logger: AppLogger.webview)
        if token.isEmpty {
            AppLogger.warning("No session token in keychain", logger: AppLogger.webview)
        }
        #endif
        
        controller.addUserScript(Self.makeAuthScript(token: token))
        
        config.userContentController = controller
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        // Create WebView
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .white
        webView.scrollView.backgroundColor = .white
        webView.navigationDelegate = context.coordinator
        webView.customUserAgent = "\(webView.value(forKey: "userAgent") as? String ?? "Safari") \(userAgentSuffix)"
        
        // Enable Safari Web Inspector for debugging
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
        
        // 🧹 Configure for lower memory usage
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        
        context.coordinator.webView = webView
        
        // Set up WebView handler for RootView
        DispatchQueue.main.async {
            let handler = RootView.WebViewHandler()
            handler.webView = webView
            let coordinator = context.coordinator
            handler.cleanupAudioCallback = { [weak coordinator] in
                coordinator?.forceCleanupAllAudio()
            }
            self.webViewHandler = handler
            #if DEBUG
            AppLogger.debug("WebViewHandler configured", logger: AppLogger.webview)
            #endif
        }
        
        // 🚨 Setup memory warning observer
        context.coordinator.setupMemoryWarningObserver()
        
        // ⚠️ DISABLED: Aggressive cache clearing was causing re-authentication prompts
        // The WebView needs cached auth state to work properly
        // We only clear cache on logout now, not on every load
        
        // Only clear cache if this is a fresh install (no session token)
        if KeychainHelper.shared.sessionToken == nil {
            let dataStore = WKWebsiteDataStore.default()
            dataStore.removeData(
                ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                modifiedSince: Date.distantPast
            ) {
                #if DEBUG
                AppLogger.debug("Cache cleared for first launch", logger: AppLogger.webview)
                #endif
            }
        }
        
        // Load web app
        guard let url = URL(string: AppEnvironment.webDashboardURL) else {
            AppLogger.error("Invalid web app URL", logger: AppLogger.webview)
            return webView
        }
        
        var request = URLRequest(url: url)
        request.cachePolicy = .useProtocolCachePolicy
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
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
            
            // Store token globally
            window.__nativeSessionToken = token;
            window.__authDebug = {
                hasToken: token.length > 0,
                tokenLength: token.length,
                webHost: webHost,
                apiHost: apiHost
            };
            
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
            
            // Intercept fetch to attach auth token
            const originalFetch = window.fetch;
            
            window.fetch = function(input, init = {}) {
                const url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
                
                if (shouldAttach(url) && token && token.length > 0) {
                    const headers = new Headers(init.headers || {});
                    if (!headers.get('Authorization')) {
                        headers.set('Authorization', 'Bearer ' + token);
                        init.headers = headers;
                    }
                }
                
                // Make the request
                return originalFetch(input, init).then((response) => {
                    // Handle 401 on auth endpoints
                    if (response && response.status === 401 && url.includes('/auth/')) {
                        if (window.webkit?.messageHandlers?.native) {
                            window.webkit.messageHandlers.native.postMessage({ 
                                action: 'authExpired' 
                            });
                        }
                    }
                    return response;
                }).catch((error) => {
                    throw error;
                });
            };
            
            // Expose diagnostic function (debug only)
            window.__debugAuth = function() {
                return window.__authDebug;
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
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKDownloadDelegate {
        
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
        
        // Loading timeout management
        private var loadTimeoutTask: Task<Void, Never>?
        private let loadTimeout: TimeInterval = 30.0
        private var retryCount = 0
        private let maxRetries = 3

        // Download tracking (avoid WebKit "DownloadFailed" spam)
        private var downloadDestinations: [ObjectIdentifier: URL] = [:]
        
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
                    _ = try await APIClient.shared.saveUserInput(content: text, type: "voice")
                } catch {
                    // Error logged by APIClient
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
            // Force cleanup all audio resources
            forceCleanupAllAudio()
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
            AppLogger.warning("Memory warning - clearing WebView cache", logger: AppLogger.webview)
            
            // Clear website data
            let dataStore = WKWebsiteDataStore.default()
            let dataTypes = Set([
                WKWebsiteDataTypeDiskCache,
                WKWebsiteDataTypeMemoryCache
            ])
            
            dataStore.removeData(ofTypes: dataTypes, modifiedSince: Date.distantPast) {
                #if DEBUG
                AppLogger.debug("WebView cache cleared", logger: AppLogger.webview)
                #endif
            }
            
            // Force JavaScript garbage collection
            webView?.evaluateJavaScript("if (window.gc) { window.gc(); }", completionHandler: nil)
        }

        // MARK: - WKNavigationDelegate
        
        /// Called when navigation starts
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            AppLogger.info("WebView navigation started", logger: AppLogger.webview)
            pageReady = false
            
            // Start timeout timer
            startLoadTimeout()
        }
        
        /// Called when page finishes loading
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            AppLogger.info("WebView page loaded successfully", logger: AppLogger.webview)
            
            // Cancel timeout
            cancelLoadTimeout()
            
            pageReady = true
            retryCount = 0 // Reset retry counter on success
            
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
                #if DEBUG
                AppLogger.debug("Old WebView cache cleared", logger: AppLogger.webview)
                #endif
            }
        }
        
        /// Force cleanup ALL audio resources (mic, speech, TTS)
        func forceCleanupAllAudio() {
            #if DEBUG
            AppLogger.debug("Force audio cleanup", logger: AppLogger.webview)
            #endif
            
            // Stop text-to-speech immediately
            if synthesizer.isSpeaking {
                synthesizer.stopSpeaking(at: .immediate)
            }
            
            // Force immediate microphone cleanup
            speechManager.forceCleanup()
            
            // Deactivate audio session to remove blue/yellow indicator dots
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setActive(false, options: .notifyOthersOnDeactivation)
            } catch {
                AppLogger.error("Failed to deactivate audio session: \(error.localizedDescription)", logger: AppLogger.webview)
            }
        }
        
        /// Called when navigation fails
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            AppLogger.error("WebView navigation failed: \(error.localizedDescription)", logger: AppLogger.webview)
            cancelLoadTimeout()
            handleLoadError(error)
        }
        
        /// Called when provisional navigation fails
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            AppLogger.error("WebView provisional navigation failed: \(error.localizedDescription)", logger: AppLogger.webview)
            cancelLoadTimeout()
            handleLoadError(error)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationResponse: WKNavigationResponse,
            decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
        ) {
            if let httpResponse = navigationResponse.response as? HTTPURLResponse,
               let contentDisposition = httpResponse.value(forHTTPHeaderField: "Content-Disposition")?.lowercased(),
               contentDisposition.contains("attachment") {
                AppLogger.info("Blocking attachment download from WebView", logger: AppLogger.webview)
                decisionHandler(.cancel)
                return
            }

            if !navigationResponse.canShowMIMEType {
                AppLogger.info("Blocking non-displayable MIME type from WebView", logger: AppLogger.webview)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        // MARK: - Downloads

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }

        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
            download.delegate = self
        }

        func download(
            _ download: WKDownload,
            decideDestinationUsing response: URLResponse,
            suggestedFilename: String,
            completionHandler: @escaping (URL?) -> Void
        ) {
            let tempDir = FileManager.default.temporaryDirectory
            let destination = tempDir.appendingPathComponent(suggestedFilename)
            downloadDestinations[ObjectIdentifier(download)] = destination
            completionHandler(destination)
        }

        func downloadDidFinish(_ download: WKDownload) {
            let key = ObjectIdentifier(download)
            if let destination = downloadDestinations[key] {
                try? FileManager.default.removeItem(at: destination)
                downloadDestinations.removeValue(forKey: key)
            }
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            let key = ObjectIdentifier(download)
            if let destination = downloadDestinations[key] {
                try? FileManager.default.removeItem(at: destination)
                downloadDestinations.removeValue(forKey: key)
            }
            AppLogger.info("Download failed: \(error.localizedDescription)", logger: AppLogger.webview)
        }
        
        // MARK: - Loading Timeout
        
        private func startLoadTimeout() {
            cancelLoadTimeout()
            
            loadTimeoutTask = Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(self?.loadTimeout ?? 30.0) * 1_000_000_000)
                
                guard !Task.isCancelled, let self = self else { return }
                
                AppLogger.warning("WebView load timeout after \(self.loadTimeout)s", logger: AppLogger.webview)
                self.handleLoadTimeout()
            }
        }
        
        private func cancelLoadTimeout() {
            loadTimeoutTask?.cancel()
            loadTimeoutTask = nil
        }
        
        private func handleLoadTimeout() {
            let error = NSError(
                domain: "ai.helpem.webview",
                code: -1001,
                userInfo: [NSLocalizedDescriptionKey: "Request timed out"]
            )
            handleLoadError(error)
        }
        
        private func handleLoadError(_ error: Error) {
            guard let webView = webView else { return }
            
            let nsError = error as NSError
            
            // Don't show error for user cancellation
            if nsError.code == NSURLErrorCancelled {
                AppLogger.info("WebView load cancelled by user", logger: AppLogger.webview)
                return
            }
            
            // Check if we should retry
            if retryCount < maxRetries && shouldRetryError(nsError) {
                retryCount += 1
                AppLogger.info("Retrying WebView load (attempt \(retryCount)/\(maxRetries))", logger: AppLogger.webview)
                
                // Wait a bit before retrying
                Task { @MainActor [weak self] in
                    try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                    self?.retryLoad()
                }
                return
            }
            
            // Show error page
            let errorHTML = generateErrorHTML(error: nsError)
            webView.loadHTMLString(errorHTML, baseURL: nil)
        }
        
        private func shouldRetryError(_ error: NSError) -> Bool {
            // Retry on network errors
            switch error.code {
            case NSURLErrorTimedOut,
                 NSURLErrorCannotFindHost,
                 NSURLErrorCannotConnectToHost,
                 NSURLErrorNetworkConnectionLost,
                 NSURLErrorNotConnectedToInternet:
                return true
            default:
                return false
            }
        }
        
        private func retryLoad() {
            guard let url = URL(string: AppEnvironment.webDashboardURL) else { return }
            var request = URLRequest(url: url)
            if let token = KeychainHelper.shared.sessionToken, !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            webView?.load(request)
        }
        
        private func generateErrorHTML(error: NSError) -> String {
            let isOffline = error.code == NSURLErrorNotConnectedToInternet
            
            let title = isOffline ? "No Internet Connection" : "Connection Error"
            let message = isOffline
                ? "Please check your internet connection and try again."
                : "Unable to load helpem. Please check your connection."
            
            let retryButton = retryCount < maxRetries
                ? """
                <button onclick="location.reload()" style="
                    padding: 14px 28px;
                    border-radius: 12px;
                    border: none;
                    background: #007AFF;
                    color: white;
                    font-size: 17px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 20px;
                ">
                    Try Again
                </button>
                """
                : ""
            
            return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }
                    .icon {
                        font-size: 60px;
                        margin-bottom: 24px;
                    }
                    h1 {
                        font-size: 24px;
                        font-weight: 700;
                        margin-bottom: 12px;
                    }
                    p {
                        font-size: 16px;
                        opacity: 0.9;
                        line-height: 1.5;
                        max-width: 300px;
                    }
                    button:active {
                        transform: scale(0.98);
                    }
                </style>
            </head>
            <body>
                <div class="icon">\(isOffline ? "📡" : "⚠️")</div>
                <h1>\(title)</h1>
                <p>\(message)</p>
                \(retryButton)
            </body>
            </html>
            """
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
                
            case "scheduleNotification":
                handleScheduleNotification(body: body)
                
            case "cancelNotification":
                handleCancelNotification(body: body)
                
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
        }
        
        private func handleStopRecording() {
            // Haptic feedback
            stopHaptic.impactOccurred()
            stopHaptic.prepare()
            
            // Stop speech recognition
            speechManager.stopListening()
        }
        
        private func handleSpeak(text: String?) {
            // Only speak if last input was voice
            guard lastInputWasVoice,
                  let text = text,
                  !text.isEmpty else {
                return
            }

            // Give the audio session a brief moment to settle after recording stops.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
                self?.speakConversationAware(text)
            }

            // Reset voice flag
            lastInputWasVoice = false
        }
        
        private func handleScheduleNotification(body: [String: Any]) {
            guard let id = body["id"] as? String,
                  let title = body["title"] as? String,
                  let bodyText = body["body"] as? String,
                  let dateString = body["date"] as? String else {
                AppLogger.warning("Missing notification parameters", logger: AppLogger.notification)
                return
            }
            
            let silent = (body["silent"] as? Bool) == true
            let badgeValue = body["badge"] as? Int
            
            // Parse ISO date string
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let date = formatter.date(from: dateString) else {
                AppLogger.error("Invalid date format: \(dateString)", logger: AppLogger.notification)
                return
            }
            
            Task {
                do {
                    try await NotificationManager.shared.scheduleNotification(
                        id: id,
                        title: title,
                        body: bodyText,
                        date: date,
                        sound: silent ? nil : .default,
                        badge: badgeValue.map { NSNumber(value: $0) } ?? 1,
                        userInfo: ["type": "reminder", "id": id]
                    )
                    #if DEBUG
                    AppLogger.debug("Notification scheduled: \(id)", logger: AppLogger.notification)
                    #endif
                } catch {
                    AppLogger.error("Failed to schedule notification: \(error.localizedDescription)", logger: AppLogger.notification)
                }
            }
        }
        
        private func handleCancelNotification(body: [String: Any]) {
            guard let id = body["id"] as? String else {
                AppLogger.warning("Missing notification ID", logger: AppLogger.notification)
                return
            }
            
            NotificationManager.shared.cancelNotification(id: id)
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
            
            // Configure audio session for professional speech output
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(
                    .playAndRecord,  // Allows interruption + background audio
                    mode: .spokenAudio,  // Optimized for voice frequencies
                    options: [.duckOthers, .defaultToSpeaker]  // Duck background audio, use speaker
                )
                try session.setActive(true)
                print("✅ Audio session configured for premium speech")
            } catch {
                print("⚠️ Audio session config failed:", error)
            }
            
            // Select premium voice (neural TTS)
            let selectedVoice = selectPremiumVoice()
            
            // Break text into semantic chunks with appropriate pauses
            let chunks = semanticChunks(from: text)
            
            // Speak each chunk with premium voice
            for chunk in chunks {
                let utterance = AVSpeechUtterance(string: chunk.text)
                utterance.voice = selectedVoice
                utterance.rate = 0.52  // Slightly faster for natural AI assistant feel
                utterance.pitchMultiplier = 1.0
                utterance.volume = 1.0
                utterance.postUtteranceDelay = chunk.pause
                synthesizer.speak(utterance)
            }
            
            print("🔊 Speaking: \(text.prefix(50))...")
        }
        
        /// Select the highest quality voice available
        private func selectPremiumVoice() -> AVSpeechSynthesisVoice? {
            let allVoices = AVSpeechSynthesisVoice.speechVoices()
            
            // Get current locale (defaults to en-US)
            let locale = Locale.current.language.languageCode?.identifier ?? "en"
            
            // Priority 1: Find Premium (Neural) voice
            if let premiumVoice = allVoices.first(where: { voice in
                voice.language.hasPrefix(locale) && voice.quality == .premium
            }) {
                print("✅ Selected Voice: \(premiumVoice.name) | Quality: Premium (Neural)")
                return premiumVoice
            }
            
            // Priority 2: Find Enhanced voice
            if let enhancedVoice = allVoices.first(where: { voice in
                voice.language.hasPrefix(locale) && voice.quality == .enhanced
            }) {
                print("✅ Selected Voice: \(enhancedVoice.name) | Quality: Enhanced")
                return enhancedVoice
            }
            
            // Priority 3: Any English voice
            if let englishVoice = allVoices.first(where: { voice in
                voice.language.hasPrefix("en")
            }) {
                print("⚠️ Selected Voice: \(englishVoice.name) | Quality: Default (Fallback)")
                return englishVoice
            }
            
            // Fallback: System default
            let fallback = AVSpeechSynthesisVoice(language: "en-US")
            print("⚠️ Using system default voice (no premium available)")
            return fallback
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
