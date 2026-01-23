import Foundation

/// Sanitizes errors before displaying to users
/// Prevents leaking sensitive information (stack traces, IDs, internal paths)
/// while maintaining helpful feedback for users
struct ErrorSanitizer {
    
    /// Convert any error into a safe, user-friendly message
    static func userFacingMessage(for error: Error) -> String {
        // Check for known error types first
        if let tribeError = error as? TribeAPIError {
            return sanitize(tribeError)
        }
        
        if let useCaseError = error as? UseCaseError {
            return sanitize(useCaseError)
        }
        
        // Handle URL/Network errors
        if let urlError = error as? URLError {
            return sanitize(urlError)
        }
        
        // Default fallback - never expose raw error details
        AppLogger.error("Unsanitized error shown to user: \(error)", logger: AppLogger.general)
        return "Something went wrong. Please try again."
    }
    
    // MARK: - Private Sanitizers
    
    private static func sanitize(_ error: TribeAPIError) -> String {
        switch error {
        case .notAuthenticated:
            return "Your session has expired. Please sign in again."
            
        case .invalidResponse:
            return "We couldn't process the response. Please try again."
            
        case .httpError(let code):
            switch code {
            case 400:
                return "The request couldn't be completed. Please check your input."
            case 401:
                return "Your session has expired. Please sign in again."
            case 403:
                return "You don't have permission to do that."
            case 404:
                return "The requested item couldn't be found."
            case 409:
                return "This action conflicts with an existing item."
            case 429:
                return "Too many requests. Please wait a moment and try again."
            case 500...599:
                return "Our servers are experiencing issues. Please try again later."
            default:
                return "An error occurred (code: \(code)). Please try again."
            }
            
        case .serverError(let message):
            // Server messages might be safe, but sanitize just in case
            // Only show message if it's short and doesn't contain sensitive patterns
            if message.count < 100 &&
               !message.contains("Exception") &&
               !message.contains("Error:") &&
               !message.contains("Stack") &&
               !message.contains("at ") {
                return message
            }
            return "A server error occurred. Please try again."
            
        case .memberRequestCreated:
            return "Your request to add a member has been sent to the tribe owner."
        }
    }
    
    private static func sanitize(_ error: UseCaseError) -> String {
        switch error {
        case .itemSuppressed:
            return "This item was previously deleted and won't be added again."
            
        case .permissionDenied:
            return "You don't have permission to do that."
            
        case .tribeNotFound:
            return "The tribe couldn't be found."
            
        case .proposalNotFound:
            return "The proposal couldn't be found."
            
        case .memberNotFound:
            return "The member couldn't be found."
            
        case .noRecipients:
            return "Please select at least one recipient."
            
        case .invalidItemType:
            return "Invalid item type. Please try again."
            
        case .invalidState:
            return "This action can't be performed right now."
        }
    }
    
    private static func sanitize(_ error: URLError) -> String {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost:
            return "No internet connection. Please check your network and try again."
            
        case .timedOut:
            return "The request timed out. Please try again."
            
        case .cannotFindHost, .cannotConnectToHost:
            return "Couldn't connect to the server. Please try again later."
            
        case .cancelled:
            return "The request was cancelled."
            
        case .badURL, .unsupportedURL:
            return "Invalid request. Please try again."
            
        case .secureConnectionFailed:
            return "Secure connection failed. Please check your network."
            
        default:
            return "A network error occurred. Please check your connection."
        }
    }
}

// MARK: - Note
// UseCaseError is defined in Architecture/UseCases/UseCaseError.swift
// No need to redeclare it here
