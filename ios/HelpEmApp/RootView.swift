// RootView.swift
// Main app entry point with auth routing

import SwiftUI
import WebKit
import UIKit

struct RootView: View {
    
    @StateObject private var authManager = AuthManager.shared
    @State private var webViewHandler: WebViewHandler?
    
    private func openFeedbackURL() {
        // Trigger feedback modal in WebView
        print("📱 iOS: openFeedbackURL called")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.triggerFeedback()
    }
    
    private func openUsageModal() {
        // Trigger usage modal in WebView
        print("📱 iOS: openUsageModal called")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.triggerUsage()
    }
    
    private func openSupportModal() {
        // Trigger support modal in WebView
        print("📱 iOS: openSupportModal called")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.triggerSupport()
    }
    
    private func openClearDataModal() {
        // Trigger clear data modal in WebView
        print("📱 iOS: openClearDataModal called")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.triggerClearDataModal()
    }
    
    class WebViewHandler {
        weak var webView: WKWebView?
        
        func triggerFeedback() {
            print("🔔 iOS: Triggering feedback modal")
            let js = """
            (function() {
                console.log('📱 iOS JavaScript: Calling window.showFeedbackModal()');
                if (typeof window.showFeedbackModal === 'function') {
                    window.showFeedbackModal();
                    console.log('✅ iOS JavaScript: showFeedbackModal() called');
                } else {
                    console.error('❌ iOS JavaScript: window.showFeedbackModal is not a function');
                    // Fallback to event
                    const event = new CustomEvent('showFeedbackModal');
                    window.dispatchEvent(event);
                    console.log('📱 iOS JavaScript: Fallback event dispatched');
                }
            })();
            """
            webView?.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("❌ Error triggering feedback: \(error)")
                } else {
                    print("✅ Feedback JavaScript executed successfully")
                }
            }
        }
        
        func triggerUsage() {
            print("📊 iOS: Triggering usage modal")
            let js = """
            (function() {
                console.log('📱 iOS JavaScript: Calling window.showUsageModal()');
                if (typeof window.showUsageModal === 'function') {
                    window.showUsageModal();
                    console.log('✅ iOS JavaScript: showUsageModal() called');
                } else {
                    console.error('❌ iOS JavaScript: window.showUsageModal is not a function');
                    // Fallback to event
                    const event = new CustomEvent('showUsageModal');
                    window.dispatchEvent(event);
                    console.log('📱 iOS JavaScript: Fallback event dispatched');
                }
            })();
            """
            webView?.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("❌ Error triggering usage: \(error)")
                } else {
                    print("✅ Usage JavaScript executed successfully")
                }
            }
        }
        
        func triggerSupport() {
            print("💬 iOS: Triggering support modal")
            let js = """
            (function() {
                console.log('📱 iOS JavaScript: Calling window.showSupportModal()');
                if (typeof window.showSupportModal === 'function') {
                    window.showSupportModal();
                    console.log('✅ iOS JavaScript: showSupportModal() called');
                } else {
                    console.error('❌ iOS JavaScript: window.showSupportModal is not a function');
                }
            })();
            """
            webView?.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("❌ Error triggering support: \(error)")
                } else {
                    print("✅ Support JavaScript executed successfully")
                }
            }
        }
        
        func triggerClearDataModal() {
            print("🗑️ iOS: Triggering clear data modal")
            let js = """
            (function() {
                console.log('📱 iOS JavaScript: Calling window.showClearDataModal()');
                if (typeof window.showClearDataModal === 'function') {
                    window.showClearDataModal();
                    console.log('✅ iOS JavaScript: showClearDataModal() called');
                } else {
                    console.error('❌ iOS JavaScript: window.showClearDataModal is not a function');
                }
            })();
            """
            webView?.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("❌ Error triggering clear data modal: \(error)")
                } else {
                    print("✅ Clear data modal JavaScript executed successfully")
                }
            }
        }
        
        func clearData() {
            print("🗑️ iOS: Clearing all app data")
            let js = """
            (async function() {
                console.log('📱 iOS JavaScript: Calling window.__clearAllData()');
                if (typeof window.__clearAllData === 'function') {
                    try {
                        await window.__clearAllData();
                        console.log('✅ iOS JavaScript: __clearAllData() completed');
                        alert('✅ All app data has been cleared from database and app.');
                    } catch (error) {
                        console.error('❌ iOS JavaScript: Error clearing data:', error);
                        alert('⚠️ Error clearing data. Please try again.');
                    }
                } else {
                    console.error('❌ iOS JavaScript: window.__clearAllData is not a function');
                    alert('❌ Error: Clear function not available');
                }
            })();
            """
            webView?.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("❌ Error clearing data: \(error)")
                } else {
                    print("✅ Clear data JavaScript executed successfully")
                }
            }
        }
    }
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
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
                                                    .frame(height: 65)
                                            }
                                            
                                            Text("Built for you.")
                                                .font(.system(size: 17))
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
                                            
                                            Button(action: {
                                                openSupportModal()
                                            }) {
                                                Label("Get Support", systemImage: "questionmark.circle")
                                            }
                                            
                                            Divider()
                                            
                                            Button(action: {
                                                openClearDataModal()
                                            }) {
                                                Label("Clear App Data", systemImage: "trash")
                                            }
                                            
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
                        }
                        .ignoresSafeArea()
                    }
            } else {
                SignInView(authManager: authManager)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.isAuthenticated)
    }
}
