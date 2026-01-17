// RootView.swift
// Main app entry point with auth routing

import SwiftUI
import WebKit

struct RootView: View {
    
    @StateObject private var authManager = AuthManager.shared
    @State private var showDatabaseTest = false
    @State private var webViewHandler: WebViewHandler?
    
    private func openFeedbackURL() {
        // Trigger feedback modal in WebView
        webViewHandler?.triggerFeedback()
    }
    
    private func openUsageModal() {
        // Trigger usage modal in WebView
        webViewHandler?.triggerUsage()
    }
    
    class WebViewHandler {
        weak var webView: WKWebView?
        
        func triggerFeedback() {
            let js = """
            (function() {
                const event = new CustomEvent('showFeedbackModal');
                window.dispatchEvent(event);
            })();
            """
            webView?.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("Error triggering feedback: \(error)")
                }
            }
        }
        
        func triggerUsage() {
            let js = """
            (function() {
                const event = new CustomEvent('showUsageModal');
                window.dispatchEvent(event);
            })();
            """
            webView?.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("Error triggering usage: \(error)")
                }
            }
        }
    }
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                if showDatabaseTest {
                    // Database test view
                    NavigationView {
                        DatabaseTestView()
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .navigationBarLeading) {
                                    Button("Back to App") {
                                        showDatabaseTest = false
                                    }
                                }
                                ToolbarItem(placement: .navigationBarTrailing) {
                                    Button("Logout") {
                                        authManager.logout()
                                    }
                                }
                            }
                    }
                } else {
                    // Main app view with custom header
                    GeometryReader { geometry in
                        ZStack {
                            VStack(spacing: 0) {
                                // Custom header bar
                                VStack(spacing: 0) {
                                    // Status bar spacer
                                    Color.white
                                        .frame(height: geometry.safeAreaInsets.top)
                                    
                                    // Header content
                                    HStack(alignment: .center) {
                                        // Logo + Tagline
                                        HStack(spacing: 12) {
                                            if let uiImage = UIImage(named: "HelpEm_Logo") {
                                                Image(uiImage: uiImage)
                                                    .resizable()
                                                    .scaledToFit()
                                                    .frame(height: 40)
                                            }
                                            
                                            Text("Built for you.")
                                                .font(.system(size: 13))
                                                .foregroundColor(.gray)
                                        }
                                        
                                        Spacer()
                                        
                                        // Menu button
                                        Menu {
                                            Button(action: {
                                                openFeedbackURL()
                                            }) {
                                                Label("Give Feedback", systemImage: "bubble.left.and.bubble.right")
                                            }
                                            
                                            Button(action: {
                                                openUsageModal()
                                            }) {
                                                Label("View Usage", systemImage: "chart.bar.fill")
                                            }
                                            
                                            Divider()
                                            
                                            Button(role: .destructive, action: {
                                                authManager.logout()
                                            }) {
                                                Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                                            }
                                        } label: {
                                            VStack(spacing: 2) {
                                                Image(systemName: "ellipsis.circle.fill")
                                                    .font(.system(size: 26))
                                                    .foregroundColor(.blue)
                                                
                                                Text("Menu")
                                                    .font(.system(size: 10))
                                                    .foregroundColor(.blue)
                                            }
                                            .frame(width: 44, height: 44)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color.white)
                                }
                                .overlay(
                                    Rectangle()
                                        .frame(height: 0.5)
                                        .foregroundColor(Color.gray.opacity(0.3)),
                                    alignment: .bottom
                                )
                                
                                // WebView
                                WebViewContainer(authManager: authManager, webViewHandler: $webViewHandler)
                            }
                            
                            // Floating buttons
                            VStack {
                                Spacer()
                                
                                HStack {
                                    Spacer()
                                    // Database test button (bottom right)
                                    Button(action: {
                                        showDatabaseTest = true
                                    }) {
                                        Image(systemName: "cylinder.split.1x2")
                                            .font(.title2)
                                            .foregroundColor(.white)
                                            .padding()
                                            .background(Color.blue)
                                            .clipShape(Circle())
                                            .shadow(radius: 4)
                                    }
                                    .padding()
                                    .padding(.bottom, geometry.safeAreaInsets.bottom)
                                }
                            }
                        }
                        .ignoresSafeArea()
                    }
                }
            } else {
                SignInView(authManager: authManager)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.isAuthenticated)
        .animation(.easeInOut(duration: 0.2), value: showDatabaseTest)
    }
}
