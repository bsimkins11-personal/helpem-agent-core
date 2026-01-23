import Foundation

// MARK: - Trial Usage Models

struct TrialUsage: Codable {
    let status: TrialStatus
    let usage: UsageCosts
    let time: TimeInfo
    let breakdown: UsageBreakdown
    
    enum CodingKeys: String, CodingKey {
        case status, usage, time, breakdown
    }
}

enum TrialStatus: String, Codable {
    case active = "active"
    case expired = "expired"
    case upgraded = "upgraded"
    case cancelled = "cancelled"
    
    var displayName: String {
        switch self {
        case .active: return "Active"
        case .expired: return "Expired"
        case .upgraded: return "Upgraded"
        case .cancelled: return "Cancelled"
        }
    }
}

struct UsageCosts: Codable {
    let total: String // "2.45"
    let cap: String // "5.00"
    let remaining: String // "2.55"
    let percentUsed: String // "49.0"
    
    var totalDouble: Double { Double(total) ?? 0.0 }
    var capDouble: Double { Double(cap) ?? 0.0 }
    var remainingDouble: Double { Double(remaining) ?? 0.0 }
    var percentUsedDouble: Double { Double(percentUsed) ?? 0.0 }
}

struct TimeInfo: Codable {
    let startedAt: Date
    let expiresAt: Date
    let daysRemaining: Int
}

struct UsageBreakdown: Codable {
    let aiMessages: OperationUsage
    let voiceInput: OperationUsage
    let voiceOutput: OperationUsage
    let calendarSyncs: OperationUsage
}

struct OperationUsage: Codable {
    let count: Int?
    let minutes: Int?
    let chars: Int?
    let cost: String // "1.25"
    
    var costDouble: Double { Double(cost) ?? 0.0 }
    
    var displayCount: String {
        if let count = count {
            return "\(count)"
        } else if let minutes = minutes {
            return "\(minutes)min"
        } else if let chars = chars {
            return "\(chars) chars"
        }
        return "0"
    }
}

// MARK: - API Responses

struct TrialActivationResponse: Codable {
    let success: Bool
    let message: String
    let expiresAt: String
    let costCap: String
    let tier: String
}

struct TrialUsageResponse: Codable {
    let status: String
    let usage: UsageCosts
    let time: TimeInfo
    let breakdown: UsageBreakdown
}

// MARK: - Subscription Tier

enum SubscriptionTier: String, Codable {
    case free = "free"
    case trial = "trial"
    case basic = "basic"
    case premium = "premium"
    
    var displayName: String {
        switch self {
        case .free: return "Free"
        case .trial: return "Trial"
        case .basic: return "Basic"
        case .premium: return "Premium"
        }
    }
    
    var price: String {
        switch self {
        case .free: return "$0"
        case .trial: return "$0 (30 days)"
        case .basic: return "$7.99/mo"
        case .premium: return "$14.99/mo"
        }
    }
    
    var features: [String] {
        switch self {
        case .free:
            return [
                "10 active todos",
                "5 appointments",
                "5 habits",
                "50 AI messages/month",
                "Premium voice"
            ]
        case .trial:
            return [
                "100 todos",
                "50 appointments",
                "20 habits",
                "300 AI messages",
                "Calendar sync",
                "Cloud backup",
                "$5 usage cap"
            ]
        case .basic:
            return [
                "100 todos",
                "50 appointments",
                "20 habits",
                "300 AI messages/month",
                "Calendar sync",
                "Cloud backup",
                "Email support"
            ]
        case .premium:
            return [
                "Unlimited everything",
                "3000 AI messages/month",
                "Advanced AI features",
                "Voice customization",
                "Priority support",
                "Analytics dashboard"
            ]
        }
    }
}
