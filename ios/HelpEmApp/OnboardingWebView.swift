// OnboardingWebView.swift
// Lightweight WebView for marketing/onboarding sign-up flow

import SwiftUI
import WebKit

struct OnboardingWebView: UIViewRepresentable {
    @ObservedObject var authManager: AuthManager
    private let userAgentSuffix = "helpem-iOS"
    
    func makeCoordinator() -> Coordinator {
        Coordinator(authManager: authManager)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        
        // Listen for sign-in trigger from web onboarding
        controller.add(context.coordinator, name: "signInWithApple")
        config.userContentController = controller
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.customUserAgent = "\(webView.value(forKey: "userAgent") as? String ?? "Safari") \(userAgentSuffix)"
        
        guard let url = URL(string: AppEnvironment.onboardingURL) else {
            AppLogger.error("Invalid onboarding URL", logger: AppLogger.webview)
            return webView
        }
        
        var request = URLRequest(url: url)
        request.cachePolicy = .useProtocolCachePolicy
        webView.load(request)
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }
    
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        private let authManager: AuthManager
        
        init(authManager: AuthManager) {
            self.authManager = authManager
        }
        
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "signInWithApple" else { return }
            DispatchQueue.main.async { [weak self] in
                self?.authManager.signInWithApple()
            }
        }
    }
}

