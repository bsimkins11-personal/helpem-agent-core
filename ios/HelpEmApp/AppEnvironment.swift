// AppEnvironment.swift
// Centralized configuration for app URLs

import Foundation

struct AppEnvironment {
    // Production URLs
    // Use the app subdomain for WebView UI; keep /app route for app UI.
    static let webAppURL = "https://app.helpem.ai/app"
    static let apiURL = "https://api-production-2989.up.railway.app"
    
    // For debugging
    static func printConfig() {
        print("📍 App Environment:")
        print("   Web App: \(webAppURL)")
        print("   API: \(apiURL)")
    }
}
