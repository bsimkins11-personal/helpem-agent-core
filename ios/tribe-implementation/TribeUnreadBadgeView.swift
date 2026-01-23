import SwiftUI

/// Badge showing unread message count for a tribe
struct TribeUnreadBadge: View {
    let count: Int
    
    var body: some View {
        if count > 0 {
            Text("\(count)")
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, count > 9 ? 6 : 8)
                .padding(.vertical, 4)
                .background(Color.red)
                .clipShape(Capsule())
        }
    }
}

/// Integration example for TribeDetailView
struct TribeDetailViewWithBadge: View {
    let tribe: Tribe
    @StateObject private var notificationManager = TribeNotificationManager.shared
    
    var body: some View {
        NavigationStack {
            VStack {
                // Your tribe content here
                Text("Tribe messages and content")
            }
            .navigationTitle(tribe.name)
            .toolbar {
                // Unread badge in navigation bar
                ToolbarItem(placement: .navigationBarTrailing) {
                    if let unreadCount = notificationManager.unreadCounts[tribe.id],
                       unreadCount > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(.red)
                            TribeUnreadBadge(count: unreadCount)
                        }
                    }
                }
            }
            .onAppear {
                Task {
                    await notificationManager.fetchUnreadCount(for: tribe.id)
                }
            }
            .onDisappear {
                // Mark as read when leaving tribe view
                Task {
                    await notificationManager.markAsRead(tribeId: tribe.id)
                }
            }
        }
    }
}

/// Badge for tribe list
struct TribeListRowWithBadge: View {
    let tribe: Tribe
    @StateObject private var notificationManager = TribeNotificationManager.shared
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tribe.name)
                    .font(.headline)
                
                if let unreadCount = notificationManager.unreadCounts[tribe.id],
                   unreadCount > 0 {
                    Text("\(unreadCount) unread message\(unreadCount > 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            if let unreadCount = notificationManager.unreadCounts[tribe.id],
               unreadCount > 0 {
                TribeUnreadBadge(count: unreadCount)
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

/// App badge (total across all tribes)
struct AppBadgeUpdater: View {
    @StateObject private var notificationManager = TribeNotificationManager.shared
    
    var body: some View {
        EmptyView()
            .task {
                // Update badge count when app launches
                await notificationManager.fetchUnreadSummary()
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                // Update when app comes to foreground
                Task {
                    await notificationManager.fetchUnreadSummary()
                }
            }
    }
}

/// Settings toggle for daily notifications
struct TribeNotificationSettingsRow: View {
    let tribe: Tribe
    @State private var dailyNotificationsEnabled = true
    @State private var isUpdating = false
    @StateObject private var notificationManager = TribeNotificationManager.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("Daily Unread Digest", isOn: $dailyNotificationsEnabled)
                .disabled(isUpdating)
                .onChange(of: dailyNotificationsEnabled) { _, newValue in
                    Task {
                        isUpdating = true
                        _ = await notificationManager.updateDailyNotificationPreference(
                            tribeId: tribe.id,
                            enabled: newValue
                        )
                        isUpdating = false
                    }
                }
            
            Text("Get a daily notification if there are unread messages in this tribe")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Preview

#if DEBUG
struct TribeUnreadBadge_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            TribeUnreadBadge(count: 1)
            TribeUnreadBadge(count: 5)
            TribeUnreadBadge(count: 12)
            TribeUnreadBadge(count: 99)
        }
        .padding()
    }
}
#endif
