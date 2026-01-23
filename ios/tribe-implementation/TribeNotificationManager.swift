import Foundation
import UserNotifications

/// Manages tribe message notifications
@MainActor
class TribeNotificationManager: NSObject, ObservableObject {
    static let shared = TribeNotificationManager()
    
    @Published var unreadCounts: [String: Int] = [:] // tribeId -> count
    @Published var totalUnread: Int = 0
    @Published var notificationPermissionGranted = false
    
    private override init() {
        super.init()
        checkNotificationPermission()
    }
    
    // MARK: - Permission Handling
    
    func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            Task { @MainActor in
                self.notificationPermissionGranted = settings.authorizationStatus == .authorized
            }
        }
    }
    
    func requestNotificationPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            
            await MainActor.run {
                self.notificationPermissionGranted = granted
            }
            
            if granted {
                AppLogger.info("✅ Notification permission granted", logger: AppLogger.general)
            } else {
                AppLogger.info("❌ Notification permission denied", logger: AppLogger.general)
            }
            
            return granted
        } catch {
            AppLogger.error("❌ Failed to request notification permission: \(error)", logger: AppLogger.general)
            return false
        }
    }
    
    // MARK: - Fetch Unread Counts
    
    func fetchUnreadSummary() async {
        do {
            guard let url = URL(string: "\(AppEnvironment.apiURL)/tribes/unread-summary") else {
                throw NSError(domain: "Invalid URL", code: -1)
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(await getAuthToken())", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw NSError(domain: "Invalid response", code: -1)
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let result = try decoder.decode(UnreadSummaryResponse.self, from: data)
            
            // Update state
            await MainActor.run {
                self.totalUnread = result.totalUnread
                self.unreadCounts = Dictionary(
                    uniqueKeysWithValues: result.tribes.map { ($0.tribeId, $0.unreadCount) }
                )
            }
            
            // Update badge count
            await updateBadgeCount(result.totalUnread)
            
            AppLogger.info("📊 Fetched unread summary: \(result.totalUnread) total", logger: AppLogger.general)
            
        } catch {
            AppLogger.error("❌ Failed to fetch unread summary: \(error)", logger: AppLogger.general)
        }
    }
    
    func fetchUnreadCount(for tribeId: String) async -> Int {
        do {
            guard let url = URL(string: "\(AppEnvironment.apiURL)/tribes/\(tribeId)/unread-count") else {
                throw NSError(domain: "Invalid URL", code: -1)
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(await getAuthToken())", forHTTPHeaderField: "Authorization")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return 0
            }
            
            let decoder = JSONDecoder()
            let result = try decoder.decode(UnreadCountResponse.self, from: data)
            
            // Update local state
            await MainActor.run {
                self.unreadCounts[tribeId] = result.unreadCount
            }
            
            return result.unreadCount
            
        } catch {
            AppLogger.error("❌ Failed to fetch unread count for \(tribeId): \(error)", logger: AppLogger.general)
            return 0
        }
    }
    
    // MARK: - Mark as Read
    
    func markAsRead(tribeId: String) async {
        do {
            guard let url = URL(string: "\(AppEnvironment.apiURL)/tribes/\(tribeId)/mark-read") else {
                throw NSError(domain: "Invalid URL", code: -1)
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(await getAuthToken())", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let (_, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw NSError(domain: "Invalid response", code: -1)
            }
            
            // Update local state
            await MainActor.run {
                self.unreadCounts[tribeId] = 0
                self.totalUnread = self.unreadCounts.values.reduce(0, +)
            }
            
            // Update badge
            await updateBadgeCount(self.totalUnread)
            
            AppLogger.info("✅ Marked tribe \(tribeId) as read", logger: AppLogger.general)
            
        } catch {
            AppLogger.error("❌ Failed to mark as read: \(error)", logger: AppLogger.general)
        }
    }
    
    // MARK: - Badge Count
    
    private func updateBadgeCount(_ count: Int) async {
        UNUserNotificationCenter.current().setBadgeCount(count)
    }
    
    // MARK: - Notification Preferences
    
    func updateDailyNotificationPreference(tribeId: String, enabled: Bool) async -> Bool {
        do {
            guard let url = URL(string: "\(AppEnvironment.apiURL)/tribes/\(tribeId)/notification-preferences") else {
                throw NSError(domain: "Invalid URL", code: -1)
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.setValue("Bearer \(await getAuthToken())", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = ["dailyUnreadNotif": enabled]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (_, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw NSError(domain: "Invalid response", code: -1)
            }
            
            AppLogger.info("✅ Updated daily notification pref: \(enabled)", logger: AppLogger.general)
            return true
            
        } catch {
            AppLogger.error("❌ Failed to update notification pref: \(error)", logger: AppLogger.general)
            return false
        }
    }
    
    // MARK: - Handle Push Notification
    
    func handleNotification(_ userInfo: [AnyHashable: Any]) {
        // Extract notification data
        guard let type = userInfo["type"] as? String,
              type == "tribe_messages_unread" else {
            return
        }
        
        // Refresh unread counts
        Task {
            await fetchUnreadSummary()
        }
        
        AppLogger.info("📬 Handled tribe unread notification", logger: AppLogger.general)
    }
    
    // MARK: - Helpers
    
    private func getAuthToken() async -> String {
        // Get from Keychain or session manager
        // Placeholder for now
        return "your-auth-token"
    }
}

// MARK: - Models

struct UnreadSummaryResponse: Codable {
    let totalUnread: Int
    let tribes: [TribeUnreadInfo]
}

struct TribeUnreadInfo: Codable {
    let tribeId: String
    let tribeName: String
    let unreadCount: Int
    let latestMessageAt: Date?
}

struct UnreadCountResponse: Codable {
    let unreadCount: Int
    let tribeId: String
}

// MARK: - UNUserNotificationCenterDelegate

extension TribeNotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // User tapped notification
        let userInfo = response.notification.request.content.userInfo
        
        Task { @MainActor in
            self.handleNotification(userInfo)
        }
        
        completionHandler()
    }
}
