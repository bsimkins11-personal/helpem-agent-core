import SwiftUI
import UserNotifications

@main
struct HelpEmAppApp: App {
    
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
                }
        }
    }
}
