// AppEnvironment.swift
// Centralized app configuration for URLs and routing logic.

import Foundation

struct AppEnvironment {
    // App experience (for WebView) lives at /app on the helpem.ai domain
    static let webAppURL = "https://helpem.ai/app"
    static let apiURL = "https://api-production-2989.up.railway.app"
    
    /// Returns true if URL should receive session token
    static func shouldAuthenticateRequest(url: String) -> Bool {
        guard let requestURL = URL(string: url) else { return false }
        let host = requestURL.host ?? ""
        
        return host.contains("helpem") ||
               host.contains("railway.app") ||
               url.contains("/api/")
    }
}
