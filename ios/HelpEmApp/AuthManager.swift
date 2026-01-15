// AuthManager.swift
// Sign in with Apple + backend session management

import Foundation
import AuthenticationServices
import Combine
import UIKit

@MainActor
final class AuthManager: NSObject, ObservableObject {

    static let shared = AuthManager()

    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?

    private let apiBaseURL = "https://api-production-2989.up.railway.app"

    override init() {
        super.init()
        checkExistingSession()
    }

    func checkExistingSession() {
        if KeychainHelper.shared.isAuthenticated {
            isAuthenticated = true
            if let appleUserId = KeychainHelper.shared.appleUserId {
                checkAppleCredentialState(userId: appleUserId)
            }
        } else {
            isAuthenticated = false
        }
    }

    private func checkAppleCredentialState(userId: String) {
        let provider = ASAuthorizationAppleIDProvider()
        provider.getCredentialState(forUserID: userId) { [weak self] state, _ in
            Task { @MainActor in
                switch state {
                case .authorized:
                    break
                case .revoked, .notFound:
                    self?.logout()
                case .transferred:
                    break
                @unknown default:
                    break
                }
            }
        }
    }

    func signInWithApple() {
        isLoading = true
        error = nil

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = []

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func silentReauth() async -> Bool {
        guard let appleUserId = KeychainHelper.shared.appleUserId else {
            return false
        }

        let provider = ASAuthorizationAppleIDProvider()
        return await withCheckedContinuation { continuation in
            provider.getCredentialState(forUserID: appleUserId) { [weak self] state, _ in
                Task { @MainActor in
                    if state == .authorized {
                        self?.performSilentAuth(continuation: continuation)
                    } else {
                        continuation.resume(returning: false)
                    }
                }
            }
        }
    }

    private func performSilentAuth(continuation: CheckedContinuation<Bool, Never>) {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = []

        let controller = ASAuthorizationController(authorizationRequests: [request])
        silentAuthContinuation = continuation
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    private var silentAuthContinuation: CheckedContinuation<Bool, Never>?

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

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorMessage = errorJson["error"] as? String {
                throw AuthError.serverError(errorMessage)
            }
            throw AuthError.httpError(httpResponse.statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sessionToken = json["session_token"] as? String,
              let userId = json["user_id"] as? String else {
            throw AuthError.invalidResponse
        }

        KeychainHelper.shared.sessionToken = sessionToken
        KeychainHelper.shared.appleUserId = appleUserId
        KeychainHelper.shared.userId = userId
    }

    func logout() {
        KeychainHelper.shared.clearAll()
        isAuthenticated = false
        error = nil
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

extension AuthManager: ASAuthorizationControllerDelegate {
    nonisolated func authorizationController(controller: ASAuthorizationController,
                                             didCompleteWithAuthorization authorization: ASAuthorization) {
        Task { @MainActor in
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                handleAuthError(AuthError.missingCredentials)
                return
            }

            guard let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                handleAuthError(AuthError.missingCredentials)
                return
            }

            let appleUserId = credential.user

            do {
                try await authenticateWithBackend(appleUserId: appleUserId, identityToken: identityToken)
                isAuthenticated = true
                isLoading = false

                if let continuation = silentAuthContinuation {
                    silentAuthContinuation = nil
                    continuation.resume(returning: true)
                }
            } catch {
                handleAuthError(error)
            }
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController,
                                             didCompleteWithError error: Error) {
        Task { @MainActor in
            if let authError = error as? ASAuthorizationError,
               authError.code == .canceled {
                isLoading = false
                if let continuation = silentAuthContinuation {
                    silentAuthContinuation = nil
                    continuation.resume(returning: false)
                }
                return
            }

            handleAuthError(error)
        }
    }

    @MainActor
    private func handleAuthError(_ error: Error) {
        self.error = error.localizedDescription
        self.isLoading = false

        if let continuation = silentAuthContinuation {
            silentAuthContinuation = nil
            continuation.resume(returning: false)
        }
    }
}

extension AuthManager: ASAuthorizationControllerPresentationContextProviding {
    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes
        let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
        return windowScene?.windows.first { $0.isKeyWindow } ?? UIWindow()
    }
}
