# iOS Code Quality Improvements
**Priority:** Post-Launch Enhancements  
**Impact:** Code maintainability, performance, testability

---

## 1. PERFORMANCE OPTIMIZATIONS

### 1.1 Move Keychain Operations Off Main Thread

**Current Issue:**
```swift:64:82:ios/HelpEmApp/KeychainHelper.swift
private func read(key: String) -> String? {
    let query: [String: Any] = [...]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    // BLOCKING on main thread
}
```

**Improved Implementation:**

```swift
final class KeychainHelper {
    static let shared = KeychainHelper()
    
    private let queue = DispatchQueue(label: "ai.helpem.keychain", qos: .userInitiated)
    
    private init() {}
    
    // Async API for non-critical reads
    func getSessionToken() async -> String? {
        await withCheckedContinuation { continuation in
            queue.async {
                continuation.resume(returning: self.readSync(key: Keys.sessionToken))
            }
        }
    }
    
    // Synchronous API for critical path (kept for compatibility)
    var sessionToken: String? {
        get { readSync(key: Keys.sessionToken) }
        set { writeSync(key: Keys.sessionToken, value: newValue) }
    }
    
    private func readSync(key: String) -> String? {
        // Existing implementation
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
    }
    
    private func writeSync(key: String, value: String?) {
        if let value {
            saveSync(key: key, value: value)
        } else {
            deleteSync(key: key)
        }
    }
}
```

**Usage:**
```swift
// For UI-blocking operations (login):
KeychainHelper.shared.sessionToken = token

// For background checks:
let token = await KeychainHelper.shared.getSessionToken()
```

---

### 1.2 Optimize JavaScript String Escaping

**Current Issue:**
```swift:277:284:ios/HelpEmApp/WebViewContainer.swift
static func escapeForJavaScript(_ value: String) -> String {
    value
        .replacingOccurrences(of: "\\", with: "\\\\")  // Creates new string
        .replacingOccurrences(of: "\"", with: "\\\"")  // Creates new string
        .replacingOccurrences(of: "\n", with: "\\n")   // Creates new string
        .replacingOccurrences(of: "\r", with: "\\r")   // Creates new string
    // 4 intermediate allocations!
}
```

**Optimized Implementation:**

```swift
static func escapeForJavaScript(_ value: String) -> String {
    var result = ""
    result.reserveCapacity(value.count + value.count / 10) // Reserve extra space
    
    for char in value {
        switch char {
        case "\\":
            result.append("\\\\")
        case "\"":
            result.append("\\\"")
        case "\n":
            result.append("\\n")
        case "\r":
            result.append("\\r")
        default:
            result.append(char)
        }
    }
    
    return result
}
```

**Performance Impact:**
- Before: O(4n) with 4 full string copies
- After: O(n) with single-pass iteration
- Memory savings: ~75% reduction for large strings

---

### 1.3 Add Response Caching to APIClient

**Current Issue:** Every API request hits the network

**Improved Implementation:**

```swift
final class APIClient {
    static let shared = APIClient()
    
    private let baseURL = AppEnvironment.apiURL
    private let session: URLSession
    private let cache = NSCache<NSString, CachedResponse>()
    
    struct CachedResponse {
        let data: Data
        let timestamp: Date
        let ttl: TimeInterval
        
        var isValid: Bool {
            Date().timeIntervalSince(timestamp) < ttl
        }
    }
    
    private func get<T: Decodable>(
        endpoint: String,
        cachePolicy: CachePolicy = .networkFirst
    ) async throws -> T {
        let cacheKey = endpoint as NSString
        
        // Check cache first for .cacheFirst policy
        if cachePolicy == .cacheFirst,
           let cached = cache.object(forKey: cacheKey),
           cached.isValid {
            return try JSONDecoder().decode(T.self, from: cached.data)
        }
        
        // Make network request
        guard !baseURL.isEmpty, let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, _) = try await execute(request: request)
        
        // Cache successful response
        if cachePolicy != .networkOnly {
            let cached = CachedResponse(data: data, timestamp: Date(), ttl: 300) // 5 min TTL
            cache.setObject(cached, forKey: cacheKey)
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    enum CachePolicy {
        case networkFirst  // Try network, fallback to cache
        case cacheFirst    // Try cache, fallback to network
        case networkOnly   // Never cache
    }
}
```

---

## 2. ARCHITECTURE IMPROVEMENTS

### 2.1 Add Dependency Injection

**Current Issue:** Hard dependencies on singletons make testing difficult

**Improved Implementation:**

```swift
// Define protocols for testability
protocol SessionStorage {
    var sessionToken: String? { get set }
    var isAuthenticated: Bool { get }
}

protocol APIClientProtocol {
    func saveUserInput(content: String, type: String) async throws -> SaveInputResponse
}

// Make KeychainHelper conform to protocol
extension KeychainHelper: SessionStorage {}

// Make APIClient conform to protocol  
extension APIClient: APIClientProtocol {}

// Inject dependencies
@MainActor
final class AuthManager: ObservableObject {
    private let storage: SessionStorage
    
    init(storage: SessionStorage = KeychainHelper.shared) {
        self.storage = storage
    }
    
    func checkExistingSession() {
        guard storage.isAuthenticated else {
            isAuthenticated = false
            return
        }
        isAuthenticated = true
    }
}

// Now testable!
class MockStorage: SessionStorage {
    var sessionToken: String?
    var isAuthenticated: Bool { sessionToken != nil }
}

// Unit test:
func testAuthWithMockStorage() {
    let mockStorage = MockStorage()
    mockStorage.sessionToken = "test_token"
    
    let authManager = AuthManager(storage: mockStorage)
    authManager.checkExistingSession()
    
    XCTAssertTrue(authManager.isAuthenticated)
}
```

---

### 2.2 Add Coordinator Pattern for Navigation

**Current Issue:** Navigation logic scattered across views

**Improved Implementation:**

```swift
enum Route: Hashable {
    case signIn
    case home
    case settings
    case feedback
    case usage
}

@MainActor
final class AppCoordinator: ObservableObject {
    @Published var currentRoute: Route = .signIn
    
    func navigate(to route: Route) {
        currentRoute = route
    }
    
    func handleDeepLink(_ url: URL) {
        // Parse URL and navigate
        if url.path == "/feedback" {
            navigate(to: .feedback)
        }
    }
}

// In RootView:
struct RootView: View {
    @StateObject private var coordinator = AppCoordinator()
    @StateObject private var authManager = AuthManager.shared
    
    var body: some View {
        NavigationStack {
            switch coordinator.currentRoute {
            case .signIn:
                SignInView(authManager: authManager)
            case .home:
                HomeView(coordinator: coordinator)
            case .settings:
                SettingsView(coordinator: coordinator)
            case .feedback:
                FeedbackView(coordinator: coordinator)
            case .usage:
                UsageView(coordinator: coordinator)
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, authenticated in
            coordinator.navigate(to: authenticated ? .home : .signIn)
        }
    }
}
```

---

### 2.3 Add Repository Pattern for Data Layer

**Current Issue:** Data access logic in multiple places

**Improved Implementation:**

```swift
protocol UserRepository {
    func getCurrentUser() async throws -> User
    func saveUserInput(_ content: String, type: String) async throws
    func getUserInputs() async throws -> [UserInput]
}

final class DefaultUserRepository: UserRepository {
    private let apiClient: APIClientProtocol
    private let cache: CacheService
    
    init(apiClient: APIClientProtocol = APIClient.shared, cache: CacheService = .shared) {
        self.apiClient = apiClient
        self.cache = cache
    }
    
    func getCurrentUser() async throws -> User {
        // Check cache first
        if let cached = await cache.get(User.self, key: "current_user") {
            return cached
        }
        
        // Fetch from API
        let user = try await apiClient.getCurrentUser()
        
        // Cache result
        await cache.set(user, key: "current_user", ttl: 3600)
        
        return user
    }
    
    func saveUserInput(_ content: String, type: String) async throws {
        try await apiClient.saveUserInput(content: content, type: type)
        
        // Invalidate cache
        await cache.invalidate(key: "user_inputs")
    }
}
```

---

## 3. ERROR HANDLING IMPROVEMENTS

### 3.1 Add User-Facing Error Messages

**Current Issue:** Generic error messages

**Improved Implementation:**

```swift
enum AppError: LocalizedError {
    case network(NetworkError)
    case auth(AuthError)
    case permission(PermissionError)
    case storage(StorageError)
    
    var errorDescription: String? {
        switch self {
        case .network(let error):
            return error.userMessage
        case .auth(let error):
            return error.userMessage
        case .permission(let error):
            return error.userMessage
        case .storage(let error):
            return error.userMessage
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .network(.notConnected):
            return "Please check your internet connection and try again."
        case .network(.timeout):
            return "The request took too long. Please try again."
        case .auth(.sessionExpired):
            return "Your session has expired. Please sign in again."
        case .permission(.microphoneDenied):
            return "Please enable microphone access in Settings to use voice input."
        default:
            return "Please try again later or contact support if the issue persists."
        }
    }
    
    var canRetry: Bool {
        switch self {
        case .network(.timeout), .network(.serverError):
            return true
        case .auth(.sessionExpired):
            return false
        default:
            return false
        }
    }
}

// Error display component
struct ErrorBanner: View {
    let error: AppError
    let retry: (() -> Void)?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text(error.errorDescription ?? "An error occurred")
                    .font(.headline)
                Spacer()
            }
            
            if let suggestion = error.recoverySuggestion {
                Text(suggestion)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            if error.canRetry, let retry = retry {
                Button("Try Again") {
                    retry()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 4)
    }
}
```

---

### 3.2 Add Error Recovery Strategies

**Improved Implementation:**

```swift
struct RetryStrategy {
    let maxAttempts: Int
    let baseDelay: TimeInterval
    let backoffMultiplier: Double
    
    static let `default` = RetryStrategy(
        maxAttempts: 3,
        baseDelay: 1.0,
        backoffMultiplier: 2.0
    )
    
    func delay(for attempt: Int) -> TimeInterval {
        baseDelay * pow(backoffMultiplier, Double(attempt))
    }
}

extension APIClient {
    func executeWithRetry<T: Decodable>(
        request: URLRequest,
        strategy: RetryStrategy = .default
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 0..<strategy.maxAttempts {
            do {
                return try await execute(request: request)
            } catch {
                lastError = error
                
                // Don't retry on auth errors
                if case APIError.notAuthenticated = error {
                    throw error
                }
                
                // Don't retry on client errors (4xx)
                if case APIError.httpError(let code) = error, (400...499).contains(code) {
                    throw error
                }
                
                // Wait before retry
                if attempt < strategy.maxAttempts - 1 {
                    let delay = strategy.delay(for: attempt)
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    print("🔄 Retrying request (attempt \(attempt + 2)/\(strategy.maxAttempts))")
                }
            }
        }
        
        throw lastError ?? APIError.invalidResponse
    }
}
```

---

## 4. TESTING IMPROVEMENTS

### 4.1 Add Unit Tests

Create `HelpEmAppTests/` directory with:

```swift
// KeychainHelperTests.swift
import XCTest
@testable import HelpEmApp

final class KeychainHelperTests: XCTestCase {
    var helper: KeychainHelper!
    
    override func setUp() {
        super.setUp()
        helper = KeychainHelper.shared
        helper.clearAll()
    }
    
    override func tearDown() {
        helper.clearAll()
        super.tearDown()
    }
    
    func testTokenStorage() {
        let testToken = "test_session_token_12345"
        
        helper.sessionToken = testToken
        XCTAssertEqual(helper.sessionToken, testToken)
        
        helper.sessionToken = nil
        XCTAssertNil(helper.sessionToken)
    }
    
    func testIsAuthenticated() {
        XCTAssertFalse(helper.isAuthenticated)
        
        helper.sessionToken = "token"
        helper.appleUserId = "user123"
        XCTAssertTrue(helper.isAuthenticated)
        
        helper.clearAll()
        XCTAssertFalse(helper.isAuthenticated)
    }
}

// AuthManagerTests.swift
final class AuthManagerTests: XCTestCase {
    func testSessionCheck() async throws {
        let mockStorage = MockSessionStorage()
        mockStorage.sessionToken = "valid_token"
        mockStorage.appleUserId = "user123"
        
        let authManager = AuthManager(storage: mockStorage)
        authManager.checkExistingSession()
        
        XCTAssertTrue(authManager.isAuthenticated)
    }
    
    func testAuthErrorHandling() async throws {
        let authManager = AuthManager()
        
        // Simulate auth error
        let error = AuthManager.AuthError.invalidURL
        await authManager.handleAuthError(error)
        
        XCTAssertNotNil(authManager.error)
        XCTAssertFalse(authManager.isLoading)
    }
}
```

---

### 4.2 Add UI Tests

```swift
// AuthFlowUITests.swift
import XCTest

final class AuthFlowUITests: XCTestCase {
    var app: XCUIApplication!
    
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI-Testing"]
        app.launch()
    }
    
    func testSuccessfulSignInFlow() {
        // Verify sign in screen appears
        let signInButton = app.buttons["Sign in with Apple"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 5))
        
        // Tap sign in
        signInButton.tap()
        
        // Wait for home screen
        let homeView = app.otherElements["HomeView"]
        XCTAssertTrue(homeView.waitForExistence(timeout: 10))
    }
    
    func testLogoutFlow() {
        // Assume already logged in
        signIn()
        
        // Open menu
        let menuButton = app.buttons["Menu"]
        menuButton.tap()
        
        // Tap logout
        app.buttons["Logout"].tap()
        
        // Verify back on sign in screen
        XCTAssertTrue(app.buttons["Sign in with Apple"].exists)
    }
    
    private func signIn() {
        // Helper method to sign in for tests
        // Implement based on your test setup
    }
}
```

---

## 5. ACCESSIBILITY IMPROVEMENTS

### 5.1 Add Accessibility Labels

**Current Issue:** Missing accessibility labels

**Improved Implementation:**

```swift
// In RootView.swift
Menu {
    // ... menu items
} label: {
    VStack(spacing: 2) {
        Image(systemName: "ellipsis.circle.fill")
            .font(.system(size: 26))
        Text("Menu")
            .font(.system(size: 10))
    }
}
.accessibilityLabel("Main menu")
.accessibilityHint("Double tap to open menu options")

// For voice input button
Button(action: startRecording) {
    Image(systemName: "mic.fill")
}
.accessibilityLabel("Start voice input")
.accessibilityHint("Double tap and hold to record your message")
```

---

### 5.2 Support Dynamic Type

```swift
// In all text views
Text("helpem")
    .font(.system(size: 56, weight: .bold))
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge) // Cap at xxxLarge

// Better approach - use built-in text styles
Text("helpem")
    .font(.largeTitle)
    .fontWeight(.bold)
// System automatically handles dynamic type
```

---

### 5.3 Support VoiceOver

```swift
// Custom controls need proper traits
Button(action: { }) {
    CustomMicrophoneView()
}
.accessibilityAddTraits(.isButton)
.accessibilityRemoveTraits(.isImage)

// WebView accessibility
webView.accessibilityLabel = "helpem assistant"
webView.accessibilityHint = "Interactive conversation area"
```

---

## 6. CODE ORGANIZATION IMPROVEMENTS

### 6.1 Organize Files by Feature

**Current Structure:**
```
HelpEmApp/
  - AuthManager.swift
  - KeychainHelper.swift
  - APIClient.swift
  - SpeechManager.swift
  - NotificationManager.swift
  ...
```

**Improved Structure:**
```
HelpEmApp/
  - App/
    - HelpEmAppApp.swift
    - AppEnvironment.swift
  - Features/
    - Auth/
      - AuthManager.swift
      - SignInView.swift
      - MockSessionStorage.swift (tests)
    - Speech/
      - SpeechManager.swift
      - SpeechPermissionView.swift
    - WebView/
      - WebViewContainer.swift
      - WebViewHandler.swift
  - Core/
    - Services/
      - APIClient.swift
      - NetworkMonitor.swift
    - Storage/
      - KeychainHelper.swift
    - Managers/
      - NotificationManager.swift
  - Common/
    - Views/
      - LoadingView.swift
      - ErrorView.swift
    - Extensions/
      - Color+Hex.swift
      - Logger+App.swift
  - Resources/
    - Assets.xcassets
    - Info.plist
    - Entitlements
```

---

### 6.2 Add Documentation Comments

**Before:**
```swift
func saveUserInput(content: String, type: String) async throws -> SaveInputResponse {
    // implementation
}
```

**After:**
```swift
/// Saves user input to the backend database
///
/// This method persists user input (text or voice) to the backend for audit logging
/// and analytics. It requires an active session token.
///
/// - Parameters:
///   - content: The user's input message
///   - type: The input type ("text" or "voice")
/// - Returns: A response indicating success and any server messages
/// - Throws: `APIError.notAuthenticated` if no valid session exists
///          `APIError.networkError` if network request fails
///
/// - Note: This method automatically attaches the session token from Keychain
///
/// Example:
/// ```swift
/// let response = try await APIClient.shared.saveUserInput(
///     content: "Remind me to call mom",
///     type: "voice"
/// )
/// ```
func saveUserInput(content: String, type: String = "text") async throws -> SaveInputResponse {
    // implementation
}
```

---

## 7. SECURITY ENHANCEMENTS

### 7.1 Add Certificate Pinning

```swift
// CertificatePinner.swift
import Foundation
import CryptoKit

final class CertificatePinner: NSObject, URLSessionDelegate {
    private let pinnedHashes: Set<String>
    
    init(pinnedHashes: Set<String>) {
        self.pinnedHashes = pinnedHashes
    }
    
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Get server certificate
        guard let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Calculate hash
        let serverCertificateData = SecCertificateCopyData(serverCertificate) as Data
        let serverCertificateHash = SHA256.hash(data: serverCertificateData)
        let serverHashString = serverCertificateHash.compactMap { String(format: "%02x", $0) }.joined()
        
        // Verify against pinned hashes
        if pinnedHashes.contains(serverHashString) {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            print("⚠️ Certificate pinning failed!")
            print("Expected one of: \(pinnedHashes)")
            print("Got: \(serverHashString)")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

// Usage in APIClient:
private init() {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    
    let pinner = CertificatePinner(pinnedHashes: [
        "YOUR_CERTIFICATE_HASH_HERE" // Get from openssl s_client -connect api.helpem.ai:443
    ])
    
    self.session = URLSession(configuration: config, delegate: pinner, delegateQueue: nil)
}
```

---

### 7.2 Add Request Signing

```swift
extension APIClient {
    private func signRequest(_ request: inout URLRequest) {
        let timestamp = String(Int(Date().timeIntervalSince1970))
        let nonce = UUID().uuidString
        
        // Create signature: HMAC-SHA256(timestamp + nonce + body)
        var signatureInput = timestamp + nonce
        if let body = request.httpBody, let bodyString = String(data: body, encoding: .utf8) {
            signatureInput += bodyString
        }
        
        // Sign with app secret (from secure storage)
        let key = SymmetricKey(data: Data(AppSecrets.apiSecret.utf8))
        let signature = HMAC<SHA256>.authenticationCode(for: Data(signatureInput.utf8), using: key)
        let signatureString = Data(signature).base64EncodedString()
        
        // Add headers
        request.setValue(timestamp, forHTTPHeaderField: "X-Timestamp")
        request.setValue(nonce, forHTTPHeaderField: "X-Nonce")
        request.setValue(signatureString, forHTTPHeaderField: "X-Signature")
    }
}
```

---

## Implementation Priority

### Phase 1 (Week 1) - High Impact, Low Effort
1. Add proper logging framework
2. Add user-facing error messages
3. Add accessibility labels
4. Organize files by feature

### Phase 2 (Week 2-3) - Medium Impact, Medium Effort
1. Move keychain operations off main thread
2. Add network monitor
3. Add coordinator pattern
4. Add unit tests for core logic

### Phase 3 (Month 2) - High Impact, High Effort
1. Add dependency injection
2. Add repository pattern
3. Add certificate pinning
4. Add comprehensive UI tests

### Phase 4 (Month 3+) - Nice to Have
1. Add request signing
2. Optimize JavaScript escaping
3. Add response caching
4. Add advanced error recovery

---

## Conclusion

These improvements will significantly enhance:
- **Code Quality:** Better organization, testability, maintainability
- **Performance:** Faster operations, less memory usage
- **Security:** Certificate pinning, request signing
- **User Experience:** Better errors, accessibility support
- **Reliability:** More tests, better error handling

Implement in phases based on priority and available resources.
