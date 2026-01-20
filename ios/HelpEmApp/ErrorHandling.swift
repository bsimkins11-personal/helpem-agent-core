// ErrorHandling.swift
// Comprehensive error handling with user-facing messages

import Foundation
import SwiftUI

// MARK: - App Error Protocol

/// Base protocol for all app errors
protocol AppErrorProtocol: LocalizedError {
    var userMessage: String { get }
    var recoverySuggestion: String? { get }
    var canRetry: Bool { get }
    var severity: ErrorSeverity { get }
}

// MARK: - Error Severity

enum ErrorSeverity {
    case info       // Informational, no action needed
    case warning    // Warning, user should be aware
    case error      // Error, action may be needed
    case critical   // Critical error, immediate action required
    
    var icon: String {
        switch self {
        case .info: return "info.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .error: return "xmark.circle.fill"
        case .critical: return "exclamationmark.octagon.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .info: return .blue
        case .warning: return .orange
        case .error: return .red
        case .critical: return .purple
        }
    }
}

// MARK: - Network Errors

enum NetworkError: AppErrorProtocol {
    case notConnected
    case timeout
    case serverError(Int)
    case invalidResponse
    case unknown(Error)
    
    var userMessage: String {
        switch self {
        case .notConnected:
            return "No Internet Connection"
        case .timeout:
            return "Request Timed Out"
        case .serverError(let code):
            return "Server Error (\(code))"
        case .invalidResponse:
            return "Invalid Server Response"
        case .unknown:
            return "Network Error"
        }
    }
    
    var errorDescription: String? { userMessage }
    
    var recoverySuggestion: String? {
        switch self {
        case .notConnected:
            return "Please check your internet connection and try again."
        case .timeout:
            return "The request took too long. Please check your connection and try again."
        case .serverError(let code) where code >= 500:
            return "Our servers are experiencing issues. Please try again in a few minutes."
        case .serverError:
            return "Please try again or contact support if the issue persists."
        case .invalidResponse:
            return "We received an unexpected response. Please try again."
        case .unknown:
            return "Please check your connection and try again."
        }
    }
    
    var canRetry: Bool {
        switch self {
        case .notConnected, .timeout, .serverError: return true
        case .invalidResponse, .unknown: return true
        }
    }
    
    var severity: ErrorSeverity {
        switch self {
        case .notConnected: return .warning
        case .timeout: return .warning
        case .serverError: return .error
        case .invalidResponse: return .error
        case .unknown: return .error
        }
    }
}

// MARK: - Authentication Errors

enum AuthenticationError: AppErrorProtocol {
    case sessionExpired
    case invalidCredentials
    case appleSignInFailed
    case appleSignInCancelled
    case tokenInvalid
    case unauthorized
    
    var userMessage: String {
        switch self {
        case .sessionExpired:
            return "Session Expired"
        case .invalidCredentials:
            return "Invalid Credentials"
        case .appleSignInFailed:
            return "Sign In Failed"
        case .appleSignInCancelled:
            return "Sign In Cancelled"
        case .tokenInvalid:
            return "Authentication Error"
        case .unauthorized:
            return "Unauthorized Access"
        }
    }
    
    var errorDescription: String? { userMessage }
    
    var recoverySuggestion: String? {
        switch self {
        case .sessionExpired:
            return "Your session has expired. Please sign in again."
        case .invalidCredentials:
            return "The credentials provided are invalid. Please sign in again."
        case .appleSignInFailed:
            return "Sign in with Apple failed. Please try again."
        case .appleSignInCancelled:
            return nil // User intentionally cancelled
        case .tokenInvalid:
            return "Your authentication token is invalid. Please sign in again."
        case .unauthorized:
            return "You don't have permission to access this feature. Please sign in again."
        }
    }
    
    var canRetry: Bool {
        switch self {
        case .appleSignInFailed, .unauthorized: return true
        case .sessionExpired, .invalidCredentials, .tokenInvalid: return false
        case .appleSignInCancelled: return false
        }
    }
    
    var severity: ErrorSeverity {
        switch self {
        case .sessionExpired: return .warning
        case .invalidCredentials, .tokenInvalid: return .error
        case .appleSignInFailed: return .error
        case .appleSignInCancelled: return .info
        case .unauthorized: return .error
        }
    }
}

// MARK: - Permission Errors

enum PermissionError: AppErrorProtocol {
    case microphoneDenied
    case speechRecognitionDenied
    case notificationsDenied
    case notificationsNotDetermined
    
    var userMessage: String {
        switch self {
        case .microphoneDenied:
            return "Microphone Access Denied"
        case .speechRecognitionDenied:
            return "Speech Recognition Denied"
        case .notificationsDenied:
            return "Notifications Disabled"
        case .notificationsNotDetermined:
            return "Notifications Not Configured"
        }
    }
    
    var errorDescription: String? { userMessage }
    
    var recoverySuggestion: String? {
        switch self {
        case .microphoneDenied:
            return "Please enable microphone access in Settings > helpem > Microphone to use voice input."
        case .speechRecognitionDenied:
            return "Please enable speech recognition in Settings > helpem > Speech Recognition to use voice input."
        case .notificationsDenied:
            return "Please enable notifications in Settings > helpem > Notifications to receive reminders."
        case .notificationsNotDetermined:
            return "Would you like to enable notifications to receive reminders?"
        }
    }
    
    var canRetry: Bool {
        false // Requires user to change settings
    }
    
    var severity: ErrorSeverity {
        .warning
    }
    
    var shouldShowSettings: Bool {
        switch self {
        case .microphoneDenied, .speechRecognitionDenied, .notificationsDenied:
            return true
        case .notificationsNotDetermined:
            return false
        }
    }
}

// MARK: - Storage Errors

enum StorageError: AppErrorProtocol {
    case keychainReadFailed
    case keychainWriteFailed
    case keychainDeleteFailed
    case dataCorrupted
    
    var userMessage: String {
        switch self {
        case .keychainReadFailed:
            return "Failed to Read Secure Data"
        case .keychainWriteFailed:
            return "Failed to Save Secure Data"
        case .keychainDeleteFailed:
            return "Failed to Delete Secure Data"
        case .dataCorrupted:
            return "Data Corrupted"
        }
    }
    
    var errorDescription: String? { userMessage }
    
    var recoverySuggestion: String? {
        switch self {
        case .keychainReadFailed:
            return "Unable to read your secure data. You may need to sign in again."
        case .keychainWriteFailed:
            return "Unable to save your secure data. Please try again."
        case .keychainDeleteFailed:
            return "Unable to delete your secure data. Please try again."
        case .dataCorrupted:
            return "Your local data appears to be corrupted. You may need to sign out and sign in again."
        }
    }
    
    var canRetry: Bool {
        switch self {
        case .keychainWriteFailed, .keychainDeleteFailed: return true
        case .keychainReadFailed, .dataCorrupted: return false
        }
    }
    
    var severity: ErrorSeverity {
        switch self {
        case .dataCorrupted: return .critical
        default: return .error
        }
    }
}

// MARK: - Error Banner View

struct ErrorBanner: View {
    let error: AppErrorProtocol
    let retry: (() -> Void)?
    let dismiss: (() -> Void)?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: error.severity.icon)
                    .foregroundColor(error.severity.color)
                    .font(.title3)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(error.userMessage)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if let suggestion = error.recoverySuggestion {
                        Text(suggestion)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                
                Spacer()
                
                if let dismiss = dismiss {
                    Button(action: dismiss) {
                        Image(systemName: "xmark")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
            }
            
            // Actions
            HStack(spacing: 12) {
                if error.canRetry, let retry = retry {
                    Button(action: retry) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Try Again")
                        }
                    }
                    .buttonStyle(.bordered)
                    .tint(error.severity.color)
                }
                
                if let permissionError = error as? PermissionError, permissionError.shouldShowSettings {
                    Button(action: openSettings) {
                        HStack {
                            Image(systemName: "gear")
                            Text("Open Settings")
                        }
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        )
        .padding(.horizontal)
    }
    
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Error Alert Modifier

struct ErrorAlertModifier: ViewModifier {
    @Binding var error: (any AppErrorProtocol)?
    let retry: (() -> Void)?
    
    func body(content: Content) -> some View {
        content
            .alert(error?.userMessage ?? "Error", isPresented: .constant(error != nil)) {
                if error?.canRetry == true, let retry = retry {
                    Button("Try Again", action: retry)
                }
                
                if let permissionError = error as? PermissionError, permissionError.shouldShowSettings {
                    Button("Open Settings", action: openSettings)
                }
                
                Button("OK", role: .cancel) {
                    error = nil
                }
            } message: {
                if let suggestion = error?.recoverySuggestion {
                    Text(suggestion)
                }
            }
    }
    
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

extension View {
    func errorAlert(error: Binding<(any AppErrorProtocol)?>, retry: (() -> Void)? = nil) -> some View {
        modifier(ErrorAlertModifier(error: error, retry: retry))
    }
}
