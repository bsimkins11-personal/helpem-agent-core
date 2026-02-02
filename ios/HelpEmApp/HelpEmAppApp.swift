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

    /// Pending referral code from deep link (applied after signup)
    @Published var pendingReferralCode: String?

    private init() {
        // Load any stored referral code from UserDefaults (persists across app restarts)
        pendingReferralCode = UserDefaults.standard.string(forKey: "pendingReferralCode")
    }
    
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
        // Check for referral code in query parameter: ?ref=CODE
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
           let refCode = components.queryItems?.first(where: { $0.name == "ref" })?.value,
           !refCode.isEmpty {
            handleReferralCode(refCode)
        }

        // Format: helpem://join/TOKEN or helpem://join?ref=CODE
        guard let host = url.host else { return }

        switch host {
        case "join":
            // Extract token from path (for tribe invites)
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
        // Check for referral code in query parameter: ?ref=CODE
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
           let refCode = components.queryItems?.first(where: { $0.name == "ref" })?.value,
           !refCode.isEmpty {
            handleReferralCode(refCode)
        }

        // Format: https://helpem.ai/join/TOKEN or https://helpem.ai/join?ref=CODE
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // Handle /join path (for tribe invites with token in path)
        if pathComponents.count >= 2, pathComponents[0] == "join" {
            let token = pathComponents[1]
            handleInviteToken(token)
            return
        }

        // If just /join with ?ref= param, we already handled it above
        if pathComponents.first == "join" {
            return
        }

        AppLogger.warning("Unknown universal link path: \(url.path)", logger: AppLogger.general)
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

    private func handleReferralCode(_ code: String) {
        AppLogger.info("Storing referral code: \(code)", logger: AppLogger.general)

        DispatchQueue.main.async {
            self.pendingReferralCode = code
            // Persist to UserDefaults so it survives app restarts before signup
            UserDefaults.standard.set(code, forKey: "pendingReferralCode")
        }
    }

    /// Apply the pending referral code after user signs up
    /// Should be called after successful authentication
    func applyPendingReferralCode() async {
        guard let code = pendingReferralCode else { return }

        AppLogger.info("Applying referral code: \(code)", logger: AppLogger.general)

        do {
            try await TribeAPIClient.shared.applyReferralCode(code)
            AppLogger.info("Referral code applied successfully", logger: AppLogger.general)

            // Clear the pending code
            await MainActor.run {
                self.pendingReferralCode = nil
                UserDefaults.standard.removeObject(forKey: "pendingReferralCode")
            }
        } catch {
            // Log but don't block - referral code might be invalid or already used
            AppLogger.warning("Failed to apply referral code: \(error)", logger: AppLogger.general)

            // Still clear it so we don't keep trying
            await MainActor.run {
                self.pendingReferralCode = nil
                UserDefaults.standard.removeObject(forKey: "pendingReferralCode")
            }
        }
    }

    /// Clear any pending deep link state
    func clearPendingState() {
        pendingInviteToken = nil
        pendingTribeId = nil
        showInviteSheet = false
    }
}
