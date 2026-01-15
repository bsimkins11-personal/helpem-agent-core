import SwiftUI
import UserNotifications

@main
struct HelpEmAppApp: App {
    
    @Environment(\.scenePhase) private var scenePhase
    
    init() {
        // Set up notification delegate
        UNUserNotificationCenter.current().delegate = NotificationManager.shared
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
