import SwiftUI
import WebKit
import AVFoundation
import UIKit

// MARK: - Configuration
struct AppConfig {
    static let webAppURL = "https://helpem-poc.vercel.app"
    static let apiURL = "https://api-production-2989.up.railway.app"
}

struct WebViewContainer: UIViewRepresentable {

    @ObservedObject var authManager: AuthManager

    func makeCoordinator() -> Coordinator {
        Coordinator(authManager: authManager)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()

        controller.add(context.coordinator, name: "native")

        let token = KeychainHelper.shared.sessionToken ?? ""
        controller.addUserScript(Self.makeAuthScript(token: token))

        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator

        context.coordinator.webView = webView

        var request = URLRequest(url: URL(string: AppConfig.webAppURL)!)
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        webView.load(request)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func makeAuthScript(token: String) -> WKUserScript {
        let webHost = URL(string: AppConfig.webAppURL)?.host ?? ""
        let apiHost = URL(string: AppConfig.apiURL)?.host ?? ""
        let safeToken = escapeForJavaScript(token)

        let source = """
        (function() {
            const token = "\(safeToken)";
            const webHost = "\(webHost)";
            const apiHost = "\(apiHost)";
            if (!token) return;

            window.__nativeSessionToken = token;

            const shouldAttach = (url) => {
                try {
                    const u = new URL(url, window.location.origin);
                    return u.host === webHost || u.host === apiHost || u.pathname.startsWith('/api/');
                } catch (e) {
                    return false;
                }
            };

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

                return originalFetch(input, init).then((response) => {
                    if (response && response.status === 401) {
                        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native) {
                            window.webkit.messageHandlers.native.postMessage({ action: 'authExpired' });
                        }
                    }
                    return response;
                });
            };
        })();
        """

        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    static func escapeForJavaScript(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
    }

    // MARK: - Coordinator
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {

        private let authManager: AuthManager
        private let speechManager = SpeechManager()
        private let synthesizer = AVSpeechSynthesizer()

        // Haptics
        private let startHaptic = UIImpactFeedbackGenerator(style: .light)
        private let stopHaptic = UIImpactFeedbackGenerator(style: .soft)

        weak var webView: WKWebView?

        private var pageReady = false
        private var pendingFinalTexts: [String] = []

        // Modality gate
        private var lastInputWasVoice = false

        init(authManager: AuthManager) {
            self.authManager = authManager
            super.init()

            startHaptic.prepare()
            stopHaptic.prepare()

            speechManager.onFinalResult = { [weak self] text in
                guard let self = self else { return }
                self.lastInputWasVoice = true

                if self.pageReady {
                    self.sendToWeb(text)
                } else {
                    self.pendingFinalTexts.append(text)
                }
            }
        }

        // MARK: - Page lifecycle
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            pageReady = true
            pendingFinalTexts.forEach(sendToWeb)
            pendingFinalTexts.removeAll()
        }

        // MARK: - Swift → Web
        private func sendToWeb(_ text: String) {
            let escaped = text
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "\"", with: "\\\"")
                .replacingOccurrences(of: "\n", with: "\\n")

            let js = """
            window.handleNativeSpeech && window.handleNativeSpeech("\(escaped)");
            """

            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(js)
            }
        }

        // MARK: - Web → Swift
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "native" else { return }

            guard
                let body = message.body as? [String: Any],
                let action = body["action"] as? String
            else { return }

            switch action {
            case "authExpired":
                handleAuthExpired()
                return

            case "logout":
                handleLogout()
                return

            case "startRecording":
                if synthesizer.isSpeaking {
                    synthesizer.stopSpeaking(at: .immediate)
                }

                startHaptic.impactOccurred()
                startHaptic.prepare()

                lastInputWasVoice = true
                speechManager.startListening()

            case "stopRecording":
                stopHaptic.impactOccurred()
                stopHaptic.prepare()

                speechManager.stopListening()

            case "speak":
                guard lastInputWasVoice else { return }

                if let text = body["text"] as? String {
                    speakConversationAware(text)
                }

                lastInputWasVoice = false

            default:
                break
            }
        }

        private func handleAuthExpired() {
            Task { @MainActor in
                let success = await authManager.silentReauth()
                if success {
                    reloadWebView()
                } else {
                    handleLogout()
                }
            }
        }

        private func handleLogout() {
            authManager.logout()
            WKWebsiteDataStore.default().removeData(
                ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                modifiedSince: Date.distantPast
            ) {}
        }

        private func reloadWebView() {
            guard let webView else { return }
            let token = KeychainHelper.shared.sessionToken ?? ""
            let controller = webView.configuration.userContentController
            controller.removeAllUserScripts()
            controller.addUserScript(WebViewContainer.makeAuthScript(token: token))

            var request = URLRequest(url: URL(string: AppConfig.webAppURL)!)
            if !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            webView.load(request)
        }

        // MARK: - Conversation-aware TTS
        private func speakConversationAware(_ text: String) {
            if synthesizer.isSpeaking {
                synthesizer.stopSpeaking(at: .immediate)
            }

            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(
                .playback,
                mode: .spokenAudio,
                options: [.duckOthers]
            )
            try? session.setActive(true)

            let chunks = semanticChunks(from: text)

            for chunk in chunks {
                let utterance = AVSpeechUtterance(string: chunk.text)
                utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
                utterance.rate = AVSpeechUtteranceDefaultSpeechRate
                utterance.postUtteranceDelay = chunk.pause
                synthesizer.speak(utterance)
            }
        }

        // MARK: - Semantic chunking
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
