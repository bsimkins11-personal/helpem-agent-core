// RootView.swift
// Main app entry point with auth routing

import SwiftUI

struct RootView: View {
    
    @StateObject private var authManager = AuthManager.shared
    @State private var showDatabaseTest = false
    
    private func openFeedbackURL() {
        // Open feedback form in default browser to avoid navigation issues
        if let url = URL(string: "\(AppEnvironment.webAppURL)?feedback=true") {
            UIApplication.shared.open(url)
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
                    // Main app view with navigation
                    NavigationView {
                        ZStack {
                            WebViewContainer(authManager: authManager)
                            
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
                                }
                            }
                        }
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .navigationBarLeading) {
                                HStack(spacing: 8) {
                                    if let uiImage = UIImage(named: "HelpEm_Logo") {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .scaledToFit()
                                            .frame(height: 32)
                                    }
                                    
                                    Text("Built for you.")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Menu {
                                    Button(action: {
                                        openFeedbackURL()
                                    }) {
                                        Label("Give Feedback", systemImage: "bubble.left.and.bubble.right")
                                    }
                                    
                                    Divider()
                                    
                                    Button(role: .destructive, action: {
                                        authManager.logout()
                                    }) {
                                        Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                                    }
                                } label: {
                                    Image(systemName: "ellipsis.circle")
                                        .font(.title3)
                                        .foregroundColor(.primary)
                                }
                            }
                        }
                    }
                    .navigationViewStyle(.stack)
                }
            } else {
                SignInView(authManager: authManager)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.isAuthenticated)
        .animation(.easeInOut(duration: 0.2), value: showDatabaseTest)
    }
}
