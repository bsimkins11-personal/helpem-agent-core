// AppEnvironment.swift
// Centralized configuration for app URLs

import Foundation

struct AppEnvironment {
    // Production URLs
    static let webAppURL = "https://helpem.ai/app"
    static let apiURL = "https://api-production-2989.up.railway.app"
    
    // For debugging
    static func printConfig() {
        print("📍 App Environment:")
        print("   Web App: \(webAppURL)")
        print("   API: \(apiURL)")
    }
}
