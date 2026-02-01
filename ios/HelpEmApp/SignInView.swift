// SignInView.swift
// Sign in with Apple UI

import SwiftUI
import AuthenticationServices
import UIKit

struct SignInView: View {
    @ObservedObject var authManager: AuthManager
    @State private var showSignUp = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "0077CC"), Color(hex: "00C896")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                VStack(spacing: 24) {
                    // helpem text logo (wordmark)
                    HStack(spacing: 0) {
                        Text("help")
                            .foregroundColor(.white)
                        Text("em")
                            .foregroundColor(.white.opacity(0.85))
                    }
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
                    
                    // Tagline
                    Text("Built for you.")
                        .font(.title3)
                        .fontWeight(.medium)
                        .foregroundColor(.white.opacity(0.9))
                }

                Spacer()

                VStack(spacing: 20) {
                    if authManager.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)
                            .frame(height: 50)
                    } else {
                        SignInWithAppleButton(.signIn, onRequest: { _ in }, onCompletion: { _ in })
                            .signInWithAppleButtonStyle(.white)
                            .frame(height: 50)
                            .cornerRadius(10)
                            .overlay(
                                Color.clear
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        authManager.signInWithApple()
                                    }
                            )
                        
                        Button(action: {
                            showSignUp = true
                        }) {
                            Text("Create Account")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.white.opacity(0.15))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.white.opacity(0.6), lineWidth: 1)
                                )
                                .cornerRadius(10)
                        }
                    }

                    if let error = authManager.error {
                        Text(error)
                            .font(.footnote)
                            .foregroundColor(.white)
                            .padding(.horizontal)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 40)

                Spacer()
                    .frame(height: 60)
            }
        }
        .sheet(isPresented: $showSignUp) {
            NavigationStack {
                OnboardingWebView(authManager: authManager)
                    .navigationTitle("Get Started")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") {
                                showSignUp = false
                            }
                        }
                    }
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                showSignUp = false
            }
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    SignInView(authManager: AuthManager.shared)
}
