import SwiftUI
import Combine
import UserNotifications

@main
struct HelpEmAppApp: App {
    
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var deepLinkHandler = DeepLinkHandler.shared
    
    init() {
        // Print app environment configuration
        AppEnvironment.printConfig()
        
        // Validate environment URLs
        if !AppEnvironment.validateURLs() {
            AppLogger.critical("Invalid environment URLs - app may not function correctly", logger: AppLogger.general)
            return
        }
        
        // Set up notification delegate
        UNUserNotificationCenter.current().delegate = NotificationManager.shared
        
        AppLogger.info("helpem app initialized", logger: AppLogger.general)
    }
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(deepLinkHandler)
                .onAppear {
                    // Request notification permission on first launch
                    Task {
                        await NotificationManager.shared.requestAuthorization()
                    }
                    
                    // Clear badge when app opens
                    NotificationManager.shared.clearBadge()
                }
                .onOpenURL { url in
                    // Handle custom URL scheme (helpem://)
                    deepLinkHandler.handleURL(url)
                }
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            if newPhase == .active {
                // Clear badge whenever app becomes active
                NotificationManager.shared.clearBadge()
            }
        }
    }
}

/// Handles deep links and universal links for the app
class DeepLinkHandler: ObservableObject {
    static let shared = DeepLinkHandler()
    
    @Published var pendingInviteToken: String?
    @Published var pendingTribeId: String?
    @Published var showInviteSheet: Bool = false
    
    private init() {}
    
    /// Handle a URL (either custom scheme or universal link)
    func handleURL(_ url: URL) {
        AppLogger.info("Deep link received: \(url)", logger: AppLogger.general)
        
        // Handle helpem:// custom scheme
        if url.scheme == "helpem" {
            handleCustomScheme(url)
            return
        }
        
        // Handle https://helpem.ai universal links
        if url.host == "helpem.ai" || url.host == "www.helpem.ai" || url.host == "app.helpem.ai" {
            handleUniversalLink(url)
            return
        }
    }
    
    private func handleCustomScheme(_ url: URL) {
        // Format: helpem://join/TOKEN
        guard let host = url.host else { return }
        
        switch host {
        case "join":
            // Extract token from path
            let pathComponents = url.pathComponents.filter { $0 != "/" }
            if let token = pathComponents.first {
                handleInviteToken(token)
            }
        case "tribe":
            // Format: helpem://tribe/TRIBE_ID
            let pathComponents = url.pathComponents.filter { $0 != "/" }
            if let tribeId = pathComponents.first {
                openTribe(tribeId)
            }
        default:
            AppLogger.warning("Unknown deep link host: \(host)", logger: AppLogger.general)
        }
    }
    
    private func handleUniversalLink(_ url: URL) {
        // Format: https://helpem.ai/join/TOKEN
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        
        guard pathComponents.count >= 2, pathComponents[0] == "join" else {
            AppLogger.warning("Unknown universal link path: \(url.path)", logger: AppLogger.general)
            return
        }
        
        let token = pathComponents[1]
        handleInviteToken(token)
    }
    
    private func handleInviteToken(_ token: String) {
        AppLogger.info("Processing invite token: \(token.prefix(8))...", logger: AppLogger.general)
        
        DispatchQueue.main.async {
            self.pendingInviteToken = token
            self.showInviteSheet = true
        }
    }
    
    private func openTribe(_ tribeId: String) {
        AppLogger.info("Opening tribe: \(tribeId)", logger: AppLogger.general)
        
        DispatchQueue.main.async {
            self.pendingTribeId = tribeId
        }
    }
    
    /// Clear any pending deep link state
    func clearPendingState() {
        pendingInviteToken = nil
        pendingTribeId = nil
        showInviteSheet = false
    }
}
