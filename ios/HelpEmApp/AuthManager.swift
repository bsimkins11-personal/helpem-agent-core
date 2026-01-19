// AuthManager.swift
// Sign in with Apple + backend session management

import Foundation
import AuthenticationServices
import Combine
import UIKit
import WebKit

/// Manages Apple Sign In authentication and session lifecycle
@MainActor
final class AuthManager: NSObject, ObservableObject {
    
    // MARK: - Singleton
    
    static let shared = AuthManager()
    
    // MARK: - Published Properties
    
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?
    
    // MARK: - Private Properties
    
    private let apiBaseURL = "https://api-production-2989.up.railway.app"
    private var silentAuthContinuation: CheckedContinuation<Bool, Never>?
    
    // MARK: - Initialization
    
    private override init() {
        super.init()
        checkExistingSession()
    }

    // MARK: - Session Management
    
    /// Check for existing session on app launch
    func checkExistingSession() {
        guard KeychainHelper.shared.isAuthenticated else {
            isAuthenticated = false
            return
        }
        
        isAuthenticated = true
        
        // ⚠️ DISABLED: Apple credential check can cause unnecessary logouts
        // Session tokens are long-lived (30 days) and sufficient for authentication
        // Only require re-login if session token actually expires
        print("✅ Session restored from keychain - user is authenticated")
        
        // Don't check Apple credential state on every launch
        // This can cause false positives and unnecessary logouts
        // Users will only need to re-auth if session token truly expires (30 days)
    }
    
    /// Verify Apple credential hasn't been revoked
    /// ⚠️ NOTE: This check can cause false positives and is NOT called on app launch
    /// Only use this for explicit security checks, not routine authentication
    private func checkAppleCredentialState(userId: String) {
        let provider = ASAuthorizationAppleIDProvider()
        provider.getCredentialState(forUserID: userId) { [weak self] state, error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                
                if let error = error {
                    print("⚠️ Credential check error (non-fatal):", error)
                    // Don't logout on network errors or temporary issues
                    return
                }
                
                switch state {
                case .authorized:
                    print("✅ Apple credentials still valid")
                case .revoked:
                    // Only logout if credentials are explicitly revoked by user
                    print("❌ Apple credentials explicitly revoked by user")
                    self.logout()
                case .notFound:
                    // notFound can be a false positive - don't auto-logout
                    print("⚠️ Apple credentials not found (may be temporary issue)")
                case .transferred:
                    print("ℹ️ Apple credentials transferred to another device")
                @unknown default:
                    print("⚠️ Unknown credential state")
                }
            }
        }
    }

    // MARK: - Authentication Methods
    
    /// Initiate Sign in with Apple flow
    func signInWithApple() {
        isLoading = true
        error = nil
        
        let request = ASAuthorizationAppleIDProvider().createRequest()
        // Don't request email/name per privacy policy
        request.requestedScopes = []
        
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    /// Attempt silent re-authentication when session expires
    func silentReauth() async -> Bool {
        guard let appleUserId = KeychainHelper.shared.appleUserId else {
            print("❌ No Apple user ID for silent reauth")
            return false
        }
        
        let provider = ASAuthorizationAppleIDProvider()
        return await withCheckedContinuation { continuation in
            provider.getCredentialState(forUserID: appleUserId) { [weak self] state, error in
                Task { @MainActor [weak self] in
                    guard let self else {
                        continuation.resume(returning: false)
                        return
                    }
                    
                    if let error = error {
                        print("❌ Silent reauth credential check failed:", error)
                        continuation.resume(returning: false)
                        return
                    }
                    
                    if state == .authorized {
                        print("🔄 Attempting silent reauth")
                        strongSelf.performSilentAuth(continuation: continuation)
                    } else {
                        print("❌ Credentials not authorized for silent reauth")
                        continuation.resume(returning: false)
                    }
                }
            }
        }
    }
    
    private func performSilentAuth(continuation: CheckedContinuation<Bool, Never>) {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = []
        
        silentAuthContinuation = continuation
        
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    // MARK: - Backend Communication
    
    /// Exchange Apple identity token for app session token
    private func authenticateWithBackend(appleUserId: String, identityToken: String) async throws {
        guard let url = URL(string: "\(apiBaseURL)/auth/apple") else {
            throw AuthError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        
        let body: [String: String] = [
            "apple_user_id": appleUserId,
            "identity_token": identityToken
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        print("🔐 Authenticating with backend...")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }
        
        print("📊 Backend response status: \(httpResponse.statusCode)")
        
        guard httpResponse.statusCode == 200 else {
            // Try to extract error message from response
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorMessage = errorJson["error"] as? String {
                throw AuthError.serverError(errorMessage)
            }
            throw AuthError.httpError(httpResponse.statusCode)
        }
        
        // Parse response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sessionToken = json["session_token"] as? String,
              let userId = json["user_id"] as? String else {
            throw AuthError.invalidResponse
        }
        
        // Store credentials securely in Keychain
        print("💾 Storing credentials in Keychain...")
        print("   Session Token length: \(sessionToken.count)")
        print("   Session Token preview: \(sessionToken.prefix(30))...")
        print("   Apple User ID: \(appleUserId)")
        print("   User ID: \(userId)")
        
        KeychainHelper.shared.sessionToken = sessionToken
        KeychainHelper.shared.appleUserId = appleUserId
        KeychainHelper.shared.userId = userId
        
        // Verify storage
        let storedToken = KeychainHelper.shared.sessionToken
        print("✅ Verification - Token stored successfully:", storedToken != nil)
        print("✅ Verification - Stored token length:", storedToken?.count ?? 0)
        print("✅ Session established for user: \(userId.prefix(8))...")
    }

    /// Sign out and clear all stored credentials
    func logout() {
        print("👋 Logging out...")
        KeychainHelper.shared.clearAll()
        isAuthenticated = false
        error = nil
        
        // Clear web data/session to avoid stale cookies in embedded webview
        WKWebsiteDataStore.default().fetchDataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes()) { records in
            WKWebsiteDataStore.default().removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), for: records) {
                print("🧹 Cleared web data after logout")
            }
        }
    }

    enum AuthError: LocalizedError {
        case invalidURL
        case invalidResponse
        case missingCredentials
        case httpError(Int)
        case serverError(String)

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid server URL"
            case .invalidResponse:
                return "Invalid server response"
            case .missingCredentials:
                return "Missing Apple credentials"
            case .httpError(let code):
                return "Server error (HTTP \(code))"
            case .serverError(let message):
                return message
            }
        }
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AuthManager: ASAuthorizationControllerDelegate {
    
    /// Handle successful Apple Sign In authorization
    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        Task { @MainActor in
            // Extract Apple ID credential
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                handleAuthError(AuthError.missingCredentials)
                return
            }
            
            // Extract identity token
            guard let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                handleAuthError(AuthError.missingCredentials)
                return
            }
            
            let appleUserId = credential.user
            
            do {
                // Exchange Apple token for app session token
                try await authenticateWithBackend(
                    appleUserId: appleUserId,
                    identityToken: identityToken
                )
                
                isAuthenticated = true
                isLoading = false
                
                // Resume silent auth continuation if present
                if let continuation = silentAuthContinuation {
                    silentAuthContinuation = nil
                    continuation.resume(returning: true)
                }
                
            } catch {
                handleAuthError(error)
            }
        }
    }
    
    /// Handle Apple Sign In errors
    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        Task { @MainActor in
            // User canceled - don't show error
            if let authError = error as? ASAuthorizationError,
               authError.code == .canceled {
                print("ℹ️ User canceled sign in")
                isLoading = false
                
                if let continuation = silentAuthContinuation {
                    silentAuthContinuation = nil
                    continuation.resume(returning: false)
                }
                return
            }
            
            // Actual error occurred
            handleAuthError(error)
        }
    }
    
    @MainActor
    private func handleAuthError(_ error: Error) {
        print("❌ Auth error:", error.localizedDescription)
        self.error = error.localizedDescription
        self.isLoading = false
        
        // Resume silent auth continuation with failure
        if let continuation = silentAuthContinuation {
            silentAuthContinuation = nil
            continuation.resume(returning: false)
        }
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension AuthManager: ASAuthorizationControllerPresentationContextProviding {
    
    /// Provide window for presenting Apple Sign In UI
    @MainActor
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes
        let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
        if let window = windowScene?.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        // Fallback: return first window scene's first window or create one
        if let window = windowScene?.windows.first {
            return window
        }
        // Last resort: create new window with scene
        if let scene = windowScene {
            return UIWindow(windowScene: scene)
        }
        // If all else fails, return any connected scene's window
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? UIWindow()
    }
}
