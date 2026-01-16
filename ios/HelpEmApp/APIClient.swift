// APIClient.swift
// Centralized API client for all backend communication

import Foundation

/// Centralized API client for Railway backend communication
@MainActor
final class APIClient {
    static let shared = APIClient()
    
    private let baseURL = AppEnvironment.apiURL
    private let session: URLSession
    private let maxRetries = 2
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - API Methods
    
    /// Save user input to database
    func saveUserInput(content: String, type: String = "text") async throws -> SaveInputResponse {
        guard let sessionToken = KeychainHelper.shared.sessionToken else {
            throw APIError.notAuthenticated
        }
        
        let endpoint = "/test-db"
        let body = SaveInputRequest(message: content, type: type)
        
        return try await post(endpoint: endpoint, body: body, token: sessionToken)
    }
    
    /// Test database connection
    func testDatabaseConnection() async throws -> HealthResponse {
        let endpoint = "/health"
        return try await get(endpoint: endpoint)
    }
    
    // MARK: - Generic Request Methods
    
    private func get<T: Decodable>(endpoint: String) async throws -> T {
        guard !baseURL.isEmpty, let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        return try await execute(request: request)
    }
    
    private func post<Request: Encodable, Response: Decodable>(
        endpoint: String,
        body: Request,
        token: String? = nil
    ) async throws -> Response {
        guard !baseURL.isEmpty, let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(body)
        
        return try await execute(request: request)
    }
    
    private func execute<T: Decodable>(request: URLRequest) async throws -> T {
        var lastError: Error?
        
        for attempt in 0...maxRetries {
            do {
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }
                
                // Log for debugging
                print("📡 API: \(request.httpMethod ?? "?") \(request.url?.path ?? "?")")
                print("📊 Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    // Try to decode error message
                    if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                        throw APIError.serverError(errorResponse.error)
                    }
                    throw APIError.httpError(httpResponse.statusCode)
                }
                
                do {
                    let decoded = try JSONDecoder().decode(T.self, from: data)
                    return decoded
                } catch {
                    print("❌ Decode error:", error)
                    print("📦 Raw data:", String(data: data, encoding: .utf8) ?? "")
                    throw APIError.decodingError(error)
                }
            } catch {
                lastError = error
                
                // Only retry on transient network failures
                if attempt < maxRetries, shouldRetry(error: error) {
                    let backoff = UInt64(300_000_000) * UInt64(attempt + 1) // 0.3s, 0.6s
                    try? await Task.sleep(nanoseconds: backoff)
                    continue
                }
                
                throw mapToAPIError(error)
            }
        }
        
        // Fallback
        throw mapToAPIError(lastError ?? APIError.invalidResponse)
    }

    private func shouldRetry(error: Error) -> Bool {
        if case APIError.notAuthenticated = error { return false }
        if let urlError = error as? URLError {
            return urlError.code == .timedOut ||
                   urlError.code == .cannotFindHost ||
                   urlError.code == .cannotConnectToHost ||
                   urlError.code == .networkConnectionLost ||
                   urlError.code == .notConnectedToInternet
        }
        return false
    }

    private func mapToAPIError(_ error: Error) -> APIError {
        if let apiError = error as? APIError { return apiError }
        if let urlError = error as? URLError {
            return APIError.networkError(urlError)
        }
        return APIError.networkError(error)
    }
}

// MARK: - Request/Response Models

struct SaveInputRequest: Encodable {
    let message: String
    let type: String
}

struct SaveInputResponse: Decodable {
    let success: Bool
    let message: String
    let responseType: String?
}

struct HealthResponse: Decodable {
    let status: String
    let db: String?
}

struct ErrorResponse: Decodable {
    let error: String
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case notAuthenticated
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    case decodingError(Error)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You are not signed in. Please sign in and try again."
        case .invalidURL:
            return "Invalid server URL"
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let code):
            return "Server error (HTTP \(code))"
        case .serverError(let message):
            return message
        case .decodingError:
            return "Failed to process server response"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
