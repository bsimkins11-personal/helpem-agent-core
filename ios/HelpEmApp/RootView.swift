// RootView.swift
// Main app entry point with auth routing

import SwiftUI

struct RootView: View {
    
    @StateObject private var authManager = AuthManager.shared
    @State private var showDatabaseTest = false
    
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
                    // Main app view
                    ZStack {
                        WebViewContainer(authManager: authManager)
                        
                        // Floating buttons
                        VStack {
                            HStack {
                                Spacer()
                                // Logout button (top right)
                                Button(action: {
                                    authManager.logout()
                                }) {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .font(.system(size: 16))
                                        .foregroundColor(.white)
                                        .padding(12)
                                        .background(Color.red.opacity(0.8))
                                        .clipShape(Circle())
                                        .shadow(radius: 4)
                                }
                                .padding()
                            }
                            
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
                }
            } else {
                SignInView(authManager: authManager)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.isAuthenticated)
        .animation(.easeInOut(duration: 0.2), value: showDatabaseTest)
    }
}
