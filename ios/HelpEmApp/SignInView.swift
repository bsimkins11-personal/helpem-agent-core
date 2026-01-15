// SignInView.swift
// Sign in with Apple UI

import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @ObservedObject var authManager: AuthManager

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
                    // App logo with helping hand
                    ZStack {
                        Circle()
                            .fill(.white)
                            .frame(width: 120, height: 120)
                            .shadow(color: .black.opacity(0.15), radius: 15, x: 0, y: 8)
                        
                        // HelpEm logo - two hands reaching together
                        HStack(spacing: 4) {
                            Image(systemName: "hand.raised.fill")
                                .font(.system(size: 38))
                                .rotationEffect(.degrees(-15))
                            
                            Image(systemName: "hand.raised.fill")
                                .font(.system(size: 38))
                                .rotationEffect(.degrees(15))
                                .scaleEffect(x: -1, y: 1) // Mirror the hand
                        }
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(hex: "0077CC"), Color(hex: "00C896")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    }
                    
                    // "Helping hands to life management" tagline
                    HStack(spacing: 8) {
                        Image(systemName: "hand.raised.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.8))
                        
                        Text("Life Management")
                            .font(.title3)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.9))
                        
                        Image(systemName: "hand.raised.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.8))
                            .scaleEffect(x: -1, y: 1) // Mirror
                    }
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
                        
                        // TEMPORARY: Skip auth for local testing
                        Button(action: {
                            authManager.skipAuthForTesting()
                        }) {
                            Text("Skip for Testing")
                                .font(.footnote)
                                .foregroundColor(.white.opacity(0.7))
                                .underline()
                        }
                        .padding(.top, 8)
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
