// APIClient.swift
// Centralized API client for all backend communication

import Foundation

/// Centralized API client for Railway backend communication
@MainActor
final class APIClient {
    static let shared = APIClient()
    
    private let baseURL = "https://api-production-2989.up.railway.app"
    private let session: URLSession
    
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
        guard let url = URL(string: baseURL + endpoint) else {
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
        guard let url = URL(string: baseURL + endpoint) else {
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
