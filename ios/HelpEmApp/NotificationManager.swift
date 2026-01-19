// NotificationManager.swift
// Local and remote notification management

import Foundation
import UserNotifications
import UIKit

/// Manages local and push notifications
@MainActor
final class NotificationManager: NSObject {
    
    static let shared = NotificationManager()
    
    var authorizationStatus: UNAuthorizationStatus = .notDetermined
    
    private override init() {
        super.init()
        checkAuthorizationStatus()
    }
    
    // MARK: - Authorization
    
    /// Request permission to send notifications
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
            
            checkAuthorizationStatus()
            
            if granted {
                print("✅ Notification permission granted")
                // Register for remote notifications (for push later)
                await registerForRemoteNotifications()
            } else {
                print("❌ Notification permission denied")
            }
            
            return granted
        } catch {
            print("❌ Error requesting notification permission:", error)
            return false
        }
    }
    
    /// Check current authorization status
    func checkAuthorizationStatus() {
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            await MainActor.run {
                authorizationStatus = settings.authorizationStatus
            }
        }
    }
    
    private func registerForRemoteNotifications() async {
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
    
    // MARK: - Local Notifications
    
    /// Schedule a local notification
    func scheduleNotification(
        id: String,
        title: String,
        body: String,
        timeInterval: TimeInterval,
        userInfo: [String: Any] = [:]
    ) async throws {
        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1
        content.userInfo = userInfo
        
        // Create trigger
        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: timeInterval,
            repeats: false
        )
        
        // Create request
        let request = UNNotificationRequest(
            identifier: id,
            content: content,
            trigger: trigger
        )
        
        // Schedule notification
        try await UNUserNotificationCenter.current().add(request)
        print("📅 Scheduled notification '\(id)' for \(timeInterval)s from now")
    }
    
    /// Schedule notification at specific date
    func scheduleNotification(
        id: String,
        title: String,
        body: String,
        date: Date,
        userInfo: [String: Any] = [:]
    ) async throws {
        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1
        content.userInfo = userInfo
        
        // Create date components trigger
        let calendar = Calendar.current
        let components = calendar.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: date
        )
        
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: components,
            repeats: false
        )
        
        // Create request
        let request = UNNotificationRequest(
            identifier: id,
            content: content,
            trigger: trigger
        )
        
        // Schedule notification
        try await UNUserNotificationCenter.current().add(request)
        print("📅 Scheduled notification '\(id)' for \(date)")
    }
    
    /// Schedule repeating daily notification
    func scheduleRepeatingNotification(
        id: String,
        title: String,
        body: String,
        hour: Int,
        minute: Int,
        userInfo: [String: Any] = [:]
    ) async throws {
        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1
        content.userInfo = userInfo
        
        // Create date components for daily repeat
        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute
        
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )
        
        // Create request
        let request = UNNotificationRequest(
            identifier: id,
            content: content,
            trigger: trigger
        )
        
        // Schedule notification
        try await UNUserNotificationCenter.current().add(request)
        print("🔁 Scheduled daily notification '\(id)' at \(hour):\(minute)")
    }
    
    /// Cancel specific notification (both pending and delivered)
    func cancelNotification(id: String) {
        let center = UNUserNotificationCenter.current()
        
        // Remove pending notifications (not yet delivered)
        center.removePendingNotificationRequests(withIdentifiers: [id])
        
        // Remove delivered notifications (already in notification center)
        center.removeDeliveredNotifications(withIdentifiers: [id])
        
        print("🗑️ Cancelled notification '\(id)' (pending + delivered)")
    }
    
    /// Cancel all notifications (both pending and delivered)
    func cancelAllNotifications() {
        let center = UNUserNotificationCenter.current()
        
        // Remove all pending notifications (not yet delivered)
        center.removeAllPendingNotificationRequests()
        
        // Remove all delivered notifications (already in notification center)
        center.removeAllDeliveredNotifications()
        
        print("🗑️ Cancelled all notifications (pending + delivered)")
    }
    
    /// Get all pending notifications
    func getPendingNotifications() async -> [UNNotificationRequest] {
        await UNUserNotificationCenter.current().pendingNotificationRequests()
    }
    
    /// Clear badge count
    func clearBadge() {
        Task {
            try? await UNUserNotificationCenter.current().setBadgeCount(0)
        }
    }
    
    // MARK: - Example Usage
    
    /// Example: Schedule a reminder in 1 hour
    func scheduleExampleReminder() async {
        guard authorizationStatus == .authorized else {
            print("⚠️ Notifications not authorized")
            return
        }
        
        try? await scheduleNotification(
            id: "example-reminder",
            title: "helpem Reminder",
            body: "Don't forget to check your tasks!",
            timeInterval: 3600, // 1 hour
            userInfo: ["type": "reminder", "action": "check-tasks"]
        )
    }
    
    /// Example: Daily morning reminder
    func scheduleDailyMorningReminder() async {
        guard authorizationStatus == .authorized else {
            print("⚠️ Notifications not authorized")
            return
        }
        
        try? await scheduleRepeatingNotification(
            id: "daily-morning",
            title: "Good Morning!",
            body: "Ready to tackle your day? Check your goals.",
            hour: 8,
            minute: 0,
            userInfo: ["type": "daily", "time": "morning"]
        )
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationManager: UNUserNotificationCenterDelegate {
    
    /// Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // Show notification even when app is open
        return [.banner, .sound, .badge]
    }
    
    /// Handle notification tap
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        
        print("📬 Notification tapped:", userInfo)
        
        // Handle different notification types
        if let type = userInfo["type"] as? String {
            switch type {
            case "reminder":
                // Navigate to reminders
                print("Opening reminders...")
            case "task":
                // Navigate to specific task
                print("Opening task...")
            case "habit":
                // Navigate to habit tracking
                print("Opening habits...")
            default:
                break
            }
        }
        
        // Clear badge
        clearBadge()
    }
}
