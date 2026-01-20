import SwiftUI
import UserNotifications

@main
struct HelpEmAppApp: App {
    
    @Environment(\.scenePhase) private var scenePhase
    
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
                .onAppear {
                    // Request notification permission on first launch
                    Task {
                        await NotificationManager.shared.requestAuthorization()
                    }
                    
                    // Clear badge when app opens
                    NotificationManager.shared.clearBadge()
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
