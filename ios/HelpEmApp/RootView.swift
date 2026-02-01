// RootView.swift
// Main app entry point with auth routing

import SwiftUI
import WebKit
import UIKit
import AVFoundation

struct RootView: View {
    
    @StateObject private var authManager = AuthManager.shared
    @State private var webViewHandler: WebViewHandler?
    @State private var isMenuPresented = false
    @State private var isTribeManagerPresented = false
    @Environment(\.scenePhase) private var scenePhase
    
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
    
    private func openConnectorsModal() {
        // Navigate to connections page
        print("📱 iOS: openConnectorsModal called - navigating to connections page")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.navigateConnections()
    }
    
    private func openClearDataModal() {
        // Trigger clear data modal in WebView
        print("📱 iOS: openClearDataModal called")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.triggerClearDataModal()
    }

    private func openPersonalAnalytics() {
        print("📱 iOS: openPersonalAnalytics called")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.navigateAnalytics()
    }
    
    private func navigateHome() {
        print("🏠 iOS: Navigating to app home")
        if webViewHandler == nil {
            print("⚠️ iOS: webViewHandler is nil!")
        }
        webViewHandler?.navigateHome()
    }
    
    class WebViewHandler {
        weak var webView: WKWebView?
        var cleanupAudioCallback: (() -> Void)?
        
        func forceCleanupAudio() {
            cleanupAudioCallback?()
        }
        
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
                    // Fallback to event
                    const event = new CustomEvent('showSupportModal');
                    window.dispatchEvent(event);
                    console.log('📱 iOS JavaScript: Fallback event dispatched');
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
                    // Fallback to event
                    const event = new CustomEvent('showClearDataModal');
                    window.dispatchEvent(event);
                    console.log('📱 iOS JavaScript: Fallback event dispatched');
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
        
        func navigateHome() {
            guard let url = URL(string: AppEnvironment.webDashboardURL) else {
                print("❌ iOS: Invalid home URL")
                return
            }
            print("🏠 iOS: Loading home URL \(url.absoluteString)")
            let request = URLRequest(url: url)
            webView?.load(request)
        }

        func navigateAnalytics() {
            guard var components = URLComponents(string: AppEnvironment.webAppURL) else {
                print("❌ iOS: Invalid analytics URL")
                return
            }
            components.path = "/analytics"
            guard let url = components.url else {
                print("❌ iOS: Invalid analytics URL components")
                return
            }
            print("📊 iOS: Loading analytics URL \(url.absoluteString)")
            let request = URLRequest(url: url)
            webView?.load(request)
        }
        
        func navigateConnections() {
            guard var components = URLComponents(string: AppEnvironment.webAppURL) else {
                print("❌ iOS: Invalid connections URL")
                return
            }
            
            // Navigate to real connections page
            components.path = "/connections"
            
            guard let url = components.url else {
                print("❌ iOS: Invalid connections URL components")
                return
            }
            
            print("🔌 iOS: Loading connections page: \(url.absoluteString)")
            let request = URLRequest(url: url)
            webView?.load(request)
        }
    }
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                // Main app view with custom header
                    GeometryReader { geometry in
                        ZStack {
                            Color.white.ignoresSafeArea()
                            VStack(spacing: 0) {
                                // Custom header bar
                                VStack(spacing: 0) {
                                    // Status bar spacer
                                    Color.white
                                        .frame(height: geometry.safeAreaInsets.top)
                                    
                                    // Header content
                                    HStack(alignment: .center) {
                                        // Logo + Tagline
                                        Button(action: {
                                            navigateHome()
                                        }) {
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
                                        }
                                        .buttonStyle(.plain)
                                        
                                        Spacer()
                                        
                                        // Menu button (custom sheet to avoid UIKit bar button constraints)
                                        Button(action: {
                                            isMenuPresented = true
                                        }) {
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
                        .sheet(isPresented: $isMenuPresented) {
                            VStack(spacing: 0) {
                                Text("Menu")
                                    .font(.headline)
                                    .padding(.top, 16)
                                    .padding(.bottom, 12)
                                
                                Divider()
                                
                                Button(action: {
                                    isMenuPresented = false
                                    openFeedbackURL()
                                }) {
                                    Label("Give Feedback", systemImage: "bubble.left.and.bubble.right")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)
                                
                                Button(action: {
                                    isMenuPresented = false
                                    openUsageModal()
                                }) {
                                    Label("View Usage", systemImage: "chart.bar.fill")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)
                                
                                Button(action: {
                                    isMenuPresented = false
                                    openConnectorsModal()
                                }) {
                                    Label("Connectors", systemImage: "link.circle")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)

                                Button(action: {
                                    isMenuPresented = false
                                    openPersonalAnalytics()
                                }) {
                                    Label("Personal Analytics", systemImage: "chart.line.uptrend.xyaxis")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)

                                Button(action: {
                                    isMenuPresented = false
                                    isTribeManagerPresented = true
                                }) {
                                    Label("Tribes", systemImage: "person.3")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)
                                
                                Button(action: {
                                    isMenuPresented = false
                                    openSupportModal()
                                }) {
                                    Label("Get Support", systemImage: "questionmark.circle")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)
                                
                                Divider()
                                    .padding(.top, 8)
                                
                                Button(action: {
                                    isMenuPresented = false
                                    openClearDataModal()
                                }) {
                                    Label("Clear App Data", systemImage: "trash")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)
                                
                                Button(role: .destructive, action: {
                                    isMenuPresented = false
                                    authManager.logout()
                                }) {
                                    Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 12)
                                }
                                .padding(.horizontal, 20)
                                
                                Spacer()
                            }
                            .presentationDetents([.medium])
                        }
                        .sheet(isPresented: $isTribeManagerPresented) {
                            NavigationStack {
                                TribeListView()
                                    .navigationTitle("Tribes")
                                    .navigationBarTitleDisplayMode(.inline)
                                    .toolbar {
                                        ToolbarItem(placement: .cancellationAction) {
                                            Button("Done") {
                                                isTribeManagerPresented = false
                                            }
                                        }
                                    }
                            }
                        }
                    }
            } else {
                SignInView(authManager: authManager)
                    .background(Color.white)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.isAuthenticated)
        .onChange(of: scenePhase) { oldPhase, newPhase in
            if newPhase == .background {
                print("📱 App entering background - force audio cleanup")
                forceCleanupAllAudio()
            }
        }
    }
    
    private func forceCleanupAllAudio() {
        print("📱 RootView: Force cleanup audio on background")
        // Tell WebView/Coordinator to cleanup
        webViewHandler?.forceCleanupAudio()
    }
}
