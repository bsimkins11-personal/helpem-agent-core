import Foundation

/// Common errors for use cases
enum UseCaseError: LocalizedError {
    case proposalNotFound(String)
    case itemSuppressed
    case noRecipients
    case invalidItemType(String)
    case permissionDenied
    case tribeNotFound(String)
    case memberNotFound(String)
    case invalidState(String)
    
    var errorDescription: String? {
        // SECURITY: Use ErrorSanitizer for all user-facing messages
        ErrorSanitizer.userFacingMessage(for: self)
    }
    
    /// Internal debug description (for logging only, not shown to users)
    var debugDescription: String {
        switch self {
        case .proposalNotFound(let id):
            return "Proposal \(id) not found"
        case .itemSuppressed:
            return "Item suppressed: previously deleted by user"
        case .noRecipients:
            return "At least one recipient is required"
        case .invalidItemType(let type):
            return "Invalid item type: \(type)"
        case .permissionDenied:
            return "Permission denied"
        case .tribeNotFound(let id):
            return "Tribe \(id) not found"
        case .memberNotFound(let id):
            return "Member \(id) not found"
        case .invalidState(let state):
            return "Invalid state: \(state)"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .itemSuppressed:
            return "This item was deleted. If you want to access it again, ask the sender to create a new proposal."
        case .permissionDenied:
            return "Contact the tribe owner to request necessary permissions."
        case .noRecipients:
            return "Please select at least one person to send this proposal to."
        default:
            return nil
        }
    }
}
