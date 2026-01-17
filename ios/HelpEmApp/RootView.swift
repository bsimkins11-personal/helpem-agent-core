// RootView.swift
// Main app entry point with auth routing

import SwiftUI
import WebKit
import UIKit

struct RootView: View {
    
    @StateObject private var authManager = AuthManager.shared
    @State private var showDatabaseTest = false
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
    
    private func showClearDataAlert() {
        // Show native confirmation alert
        print("⚠️ iOS: Showing clear data confirmation")
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootViewController = window.rootViewController else {
            print("❌ Could not get root view controller")
            return
        }
        
        let alert = UIAlertController(
            title: "Clear All Data",
            message: "Are you sure you want to clear all app data? This will delete all your todos, habits, appointments, and routines. This action cannot be undone.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Clear All", style: .destructive) { _ in
            print("🗑️ User confirmed: clearing all data")
            self.webViewHandler?.clearData()
        })
        
        rootViewController.present(alert, animated: true)
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
                                            
                                            Divider()
                                            
                                            Button(action: {
                                                showClearDataAlert()
                                            }) {
                                                Label("Clear All Data", systemImage: "trash")
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
