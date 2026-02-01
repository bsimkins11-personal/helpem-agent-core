import UserNotifications
import UIKit

/// Tribe Notification Manager
/// 
/// NON-NEGOTIABLE RULES:
/// - One notification per proposal creation
/// - No repeat notifications for the same proposal
/// - If many proposals arrive close together → send a single digest
/// - No escalation language
/// - Actionable notifications with Accept/Not Now
class TribeNotificationManager {
    static let shared = TribeNotificationManager()
    
    private let notificationCenter = UNUserNotificationCenter.current()
    
    // Category identifiers
    private let proposalCategoryId = "TRIBE_PROPOSAL"
    private let digestCategoryId = "TRIBE_DIGEST"
    private let inviteCategoryId = "TRIBE_INVITE"
    
    private init() {
        setupNotificationCategories()
    }
    
    // MARK: - Setup
    
    /// Configure notification categories and actions
    func setupNotificationCategories() {
        // Accept action
        let acceptAction = UNNotificationAction(
            identifier: "ACCEPT_PROPOSAL",
            title: "Accept",
            options: [.foreground]
        )
        
        // Not Now action
        let notNowAction = UNNotificationAction(
            identifier: "NOT_NOW_PROPOSAL",
            title: "Not Now",
            options: []
        )
        
        // Proposal category (single proposal)
        let proposalCategory = UNNotificationCategory(
            identifier: proposalCategoryId,
            actions: [acceptAction, notNowAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        
        // Digest category (multiple proposals)
        let digestCategory = UNNotificationCategory(
            identifier: digestCategoryId,
            actions: [],
            intentIdentifiers: [],
            options: []
        )

        // Tribe invite category (view invite action)
        let viewInviteAction = UNNotificationAction(
            identifier: "VIEW_INVITE",
            title: "View",
            options: [.foreground]
        )

        let inviteCategory = UNNotificationCategory(
            identifier: inviteCategoryId,
            actions: [viewInviteAction],
            intentIdentifiers: [],
            options: []
        )

        notificationCenter.setNotificationCategories([proposalCategory, digestCategory, inviteCategory])
        
        AppLogger.info("Tribe notification categories configured", logger: AppLogger.general)
    }
    
    // MARK: - Send Notifications
    
    /// Send notification for a single Tribe proposal
    /// ONE notification per proposal creation
    func sendProposalNotification(
        proposalId: String,
        tribeId: String,
        tribeName: String,
        itemType: String,
        itemTitle: String
    ) async throws {
        // Privacy-safe copy
        let content = UNMutableNotificationContent()
        content.title = "New from \(tribeName)"
        content.body = "\(itemType.capitalized): \(itemTitle)"
        content.categoryIdentifier = proposalCategoryId
        content.sound = .default
        
        // User info for handling actions
        content.userInfo = [
            "type": "tribe_proposal",
            "proposalId": proposalId,
            "tribeId": tribeId,
            "itemType": itemType
        ]
        
        // Badge increment
        content.badge = NSNumber(value: await getCurrentBadgeCount() + 1)
        
        // Deliver immediately
        let request = UNNotificationRequest(
            identifier: "tribe_proposal_\(proposalId)",
            content: content,
            trigger: nil
        )
        
        try await notificationCenter.add(request)
        
        AppLogger.info("Sent proposal notification: \(proposalId)", logger: AppLogger.general)
    }
    
    /// Send digest notification for multiple proposals
    /// Used when many proposals arrive close together
    func sendDigestNotification(
        tribeId: String,
        tribeName: String,
        count: Int
    ) async throws {
        let content = UNMutableNotificationContent()
        content.title = "New from \(tribeName)"
        content.body = "\(count) new proposals"
        content.categoryIdentifier = digestCategoryId
        content.sound = .default
        
        content.userInfo = [
            "type": "tribe_digest",
            "tribeId": tribeId,
            "count": count
        ]
        
        content.badge = NSNumber(value: await getCurrentBadgeCount() + count)
        
        let request = UNNotificationRequest(
            identifier: "tribe_digest_\(tribeId)_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        
        try await notificationCenter.add(request)
        
        AppLogger.info("Sent digest notification: \(count) proposals", logger: AppLogger.general)
    }
    
    // MARK: - Handle Actions
    
    /// Handle notification action response
    func handleNotificationAction(response: UNNotificationResponse) async {
        let userInfo = response.notification.request.content.userInfo
        
        guard let type = userInfo["type"] as? String else { return }
        
        switch type {
        case "tribe_proposal":
            await handleProposalAction(response: response)
        case "tribe_digest":
            await handleDigestAction(response: response)
        case "tribe_invite":
            await handleInviteAction(response: response)
        default:
            break
        }
    }
    
    private func handleProposalAction(response: UNNotificationResponse) async {
        guard let proposalId = response.notification.request.content.userInfo["proposalId"] as? String,
              let tribeId = response.notification.request.content.userInfo["tribeId"] as? String else {
            return
        }
        
        switch response.actionIdentifier {
        case "ACCEPT_PROPOSAL":
            await acceptProposal(tribeId: tribeId, proposalId: proposalId)
            
        case "NOT_NOW_PROPOSAL":
            await notNowProposal(tribeId: tribeId, proposalId: proposalId)
            
        case UNNotificationDefaultActionIdentifier:
            // User tapped notification → open Tribe Inbox
            await openTribeInbox(tribeId: tribeId)
            
        default:
            break
        }
    }
    
    private func handleDigestAction(response: UNNotificationResponse) async {
        guard let tribeId = response.notification.request.content.userInfo["tribeId"] as? String else {
            return
        }

        // Open Tribe Inbox
        await openTribeInbox(tribeId: tribeId)
    }

    private func handleInviteAction(response: UNNotificationResponse) async {
        // Navigate to tribe invitations list
        await MainActor.run {
            NotificationCenter.default.post(
                name: NSNotification.Name("OpenTribeInvitations"),
                object: nil,
                userInfo: response.notification.request.content.userInfo
            )
        }
        AppLogger.info("Opening tribe invitations from notification", logger: AppLogger.general)
    }
    
    // MARK: - Actions
    
    /// Tribe items are invitations. They never become active without explicit acceptance.
    private func acceptProposal(tribeId: String, proposalId: String) async {
        do {
            _ = try await TribeAPIClient.shared.acceptProposal(tribeId: tribeId, proposalId: proposalId)
            
            // Show success feedback
            await showLocalNotification(
                title: "Accepted",
                body: "The proposal has been added to your list"
            )
            
            AppLogger.info("Accepted proposal from notification: \(proposalId)", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to accept proposal: \(error)", logger: AppLogger.general)
        }
    }
    
    private func notNowProposal(tribeId: String, proposalId: String) async {
        do {
            _ = try await TribeAPIClient.shared.notNowProposal(tribeId: tribeId, proposalId: proposalId)
            
            AppLogger.info("Marked proposal as not now from notification: \(proposalId)", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to mark proposal as not now: \(error)", logger: AppLogger.general)
        }
    }
    
    private func openTribeInbox(tribeId: String) async {
        // Post notification to app to navigate to Tribe Inbox
        await MainActor.run {
            NotificationCenter.default.post(
                name: NSNotification.Name("OpenTribeInbox"),
                object: nil,
                userInfo: ["tribeId": tribeId]
            )
        }
    }
    
    // MARK: - Helpers
    
    private func getCurrentBadgeCount() async -> Int {
        let requests = await notificationCenter.deliveredNotifications()
        return requests.count
    }
    
    private func showLocalNotification(title: String, body: String) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        
        try? await notificationCenter.add(request)
    }
}

