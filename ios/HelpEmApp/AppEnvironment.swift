// AppEnvironment.swift
// Centralized configuration for app URLs and environment management

import Foundation

/// Application environment configuration
/// Supports multiple environments for proper staging and production separation
struct AppEnvironment {
    
    // MARK: - Environment Types
    
    enum Environment: String {
        case production
        case staging
        case development
        
        var displayName: String {
            rawValue.capitalized
        }
    }
    
    // MARK: - Current Environment
    
    /// Current active environment
    /// Auto-detects based on build configuration
    static var current: Environment {
        if let override = ProcessInfo.processInfo.environment["HELPEM_ENV"],
           let env = Environment(rawValue: override.lowercased()) {
            return env
        }
        #if DEBUG
        #if targetEnvironment(simulator)
        return .development
        #else
        return .production
        #endif
        #else
        return .production
        #endif
    }
    
    // MARK: - Environment URLs

    /// Base web URL for the current environment
    static var webBaseURL: String {
        switch current {
        case .production:
            return "https://app.helpem.ai"
        case .staging:
            return "https://staging.helpem.ai"
        case .development:
            return "http://localhost:3000"
        }
    }
    
    /// Web app URL for the current environment
    /// This loads the auth-aware landing page which redirects to dashboard if logged in
    static var webAppURL: String {
        "\(webBaseURL)/app?t=\(Int(Date().timeIntervalSince1970))"
    }

    /// Dashboard URL for authenticated users
    static var webDashboardURL: String {
        "\(webBaseURL)/app/dashboard?t=\(Int(Date().timeIntervalSince1970))"
    }

    /// Marketing/onboarding URL for sign-up flow
    static var onboardingURL: String {
        "\(webBaseURL)/app/onboarding?t=\(Int(Date().timeIntervalSince1970))"
    }
    
    /// API base URL for the current environment
    static var apiURL: String {
        switch current {
        case .production:
            return "https://api-production-2989.up.railway.app"
        case .staging:
            return "https://api-staging-2989.up.railway.app"
        case .development:
            return "http://localhost:8080"
        }
    }
    
    // MARK: - Environment Info
    
    /// Check if running in production
    static var isProduction: Bool {
        current == .production
    }
    
    /// Check if running in development
    static var isDevelopment: Bool {
        current == .development
    }
    
    /// Check if running in staging
    static var isStaging: Bool {
        current == .staging
    }
    
    // MARK: - Configuration
    
    /// App version string
    static var version: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
    }
    
    /// Build number
    static var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"
    }
    
    /// Full version string (version + build)
    static var fullVersion: String {
        "\(version) (\(buildNumber))"
    }
    
    /// Bundle identifier
    static var bundleIdentifier: String {
        Bundle.main.bundleIdentifier ?? "ai.helpem.app"
    }
    
    // MARK: - Debug Utilities
    
    /// Print current environment configuration
    static func printConfig() {
        AppLogger.info("=== App Environment ===", logger: AppLogger.general)
        AppLogger.info("Environment: \(current.displayName)", logger: AppLogger.general)
        AppLogger.info("Version: \(fullVersion)", logger: AppLogger.general)
        AppLogger.info("Bundle ID: \(bundleIdentifier)", logger: AppLogger.general)
        AppLogger.info("Web App: \(webAppURL)", logger: AppLogger.general)
        AppLogger.info("API: \(apiURL)", logger: AppLogger.general)
        AppLogger.info("=====================", logger: AppLogger.general)
    }
    
    /// Check if all URLs are reachable
    static func validateURLs() -> Bool {
        guard let webURL = URL(string: webAppURL),
              let apiUrl = URL(string: apiURL) else {
            AppLogger.error("Invalid environment URLs", logger: AppLogger.general)
            return false
        }
        
        // Basic URL validation
        guard webURL.scheme == "https" || webURL.scheme == "http",
              apiUrl.scheme == "https" || apiUrl.scheme == "http" else {
            AppLogger.error("URLs must use http or https scheme", logger: AppLogger.general)
            return false
        }
        
        return true
    }
}
