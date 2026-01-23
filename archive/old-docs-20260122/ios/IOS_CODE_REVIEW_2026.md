# iOS App Code Review - HelpEm
**Date:** January 20, 2026  
**Reviewer:** iOS Expert Analysis  
**App:** HelpEm - Hybrid SwiftUI + WebView Personal Assistant

---

## Executive Summary

**Overall Grade: B+ (82/100)**

The HelpEm iOS app demonstrates solid engineering fundamentals with a well-architected hybrid approach. The codebase shows evidence of production-readiness with comprehensive security measures, proper memory management, and thoughtful user experience considerations. However, there are critical issues that need immediate attention before App Store submission.

### Strengths ✅
- Excellent security architecture (Keychain, Sign in with Apple)
- Strong memory management patterns
- Comprehensive audio resource cleanup
- Well-structured code organization
- Thoughtful WebView integration

### Critical Issues ⚠️
1. **DEPLOYMENT TARGET TOO HIGH** - iOS 26.2 doesn't exist (current is iOS 18.x)
2. Missing error recovery mechanisms
3. Hardcoded production URLs
4. Limited offline capability
5. No analytics/crash reporting

---

## 1. QUALITY ASSESSMENT (Score: 18/25)

### 1.1 Code Architecture ✅ EXCELLENT

**Strengths:**
- **Separation of Concerns**: Each manager has a single responsibility
  - `AuthManager` - Authentication only
  - `KeychainHelper` - Secure storage only
  - `SpeechManager` - Speech recognition only
  - `APIClient` - Network communication only
- **Singleton Pattern**: Properly implemented with `shared` instances
- **MVVM Pattern**: SwiftUI views properly observe state via `@ObservedObject`
- **Protocol Compliance**: Clean delegate implementations

**Example of Good Architecture:**
```swift:1:35:ios/HelpEmApp/KeychainHelper.swift
final class KeychainHelper {
    static let shared = KeychainHelper()
    private init() {}

    private enum Keys {
        static let sessionToken = "com.helpem.agent.sessionToken"
        static let appleUserId = "com.helpem.agent.appleUserId"
        static let userId = "com.helpem.agent.userId"
    }
    // Clear responsibility, well-encapsulated
}
```

### 1.2 Code Quality Issues

#### ❌ CRITICAL: Invalid Deployment Target
```
IPHONEOS_DEPLOYMENT_TARGET = 26.2
```
**Problem:** iOS 26.2 does not exist. Current iOS version is 18.x (as of January 2026).  
**Impact:** App will fail to build/submit to App Store  
**Fix Required:** Change to `17.0` or `18.0` for maximum compatibility

#### ⚠️ Hardcoded URLs (Security/Flexibility Risk)
```swift:6:10:ios/HelpEmApp/AppEnvironment.swift
struct AppEnvironment {
    static let webAppURL = "https://app.helpem.ai/app"
    static let apiURL = "https://api-production-2989.up.railway.app"
}
```
**Issues:**
- No staging environment support
- Can't test against different environments
- No fallback mechanism if production is down

**Recommendation:**
```swift
struct AppEnvironment {
    enum Environment {
        case production, staging, development
    }
    
    static var current: Environment = .production
    
    static var webAppURL: String {
        switch current {
        case .production: return "https://app.helpem.ai/app"
        case .staging: return "https://staging.helpem.ai/app"
        case .development: return "http://localhost:3000/app"
        }
    }
}
```

#### ⚠️ Excessive Console Logging (Production Risk)
The app has 100+ print statements throughout the codebase:
```swift
print("🔐 iOS Auth Script Starting...")
print("✅ Session established for user...")
print("📱 iOS: openFeedbackURL called")
```

**Issues:**
- Performance overhead in production
- Potential information leakage
- Clutters console in Xcode

**Recommendation:** Implement proper logging framework
```swift
enum LogLevel { case debug, info, warning, error }
struct Logger {
    static func log(_ message: String, level: LogLevel = .info) {
        #if DEBUG
        print("[\(level)] \(message)")
        #endif
    }
}
```

### 1.3 Error Handling ⚠️ NEEDS IMPROVEMENT

#### Good: Type-Safe Error Handling
```swift:232:253:ios/HelpEmApp/AuthManager.swift
enum AuthError: LocalizedError {
    case invalidURL
    case invalidResponse
    case missingCredentials
    case httpError(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL"
        // ... proper error messages
        }
    }
}
```

#### Bad: Silent Failures
```swift:328:338:ios/HelpEmApp/AuthManager.swift
@MainActor
private func handleAuthError(_ error: Error) {
    print("❌ Auth error:", error.localizedDescription)
    self.error = error.localizedDescription
    self.isLoading = false
    // NO USER NOTIFICATION - error only shown in console
}
```

**Problem:** Errors are printed but user may not see them in UI  
**Fix:** Always surface critical errors to user with actionable guidance

---

## 2. SPEED/PERFORMANCE ASSESSMENT (Score: 21/25)

### 2.1 Excellent Memory Management ✅

#### WebView Cache Management
```swift:369:386:ios/HelpEmApp/WebViewContainer.swift
private func handleMemoryWarning() {
    print("⚠️ Memory warning received - clearing WebView cache")
    
    let dataStore = WKWebsiteDataStore.default()
    let dataTypes = Set([
        WKWebsiteDataTypeDiskCache,
        WKWebsiteDataTypeMemoryCache
    ])
    
    dataStore.removeData(ofTypes: dataTypes, modifiedSince: Date.distantPast) {
        print("✅ WebView cache cleared")
    }
}
```
**Excellent:** Proactive memory management with automatic cleanup

#### Audio Resource Cleanup
```swift:419:441:ios/HelpEmApp/WebViewContainer.swift
func forceCleanupAllAudio() {
    print("🧹 WebView: Force cleanup all audio")
    
    // Stop text-to-speech immediately
    if synthesizer.isSpeaking {
        synthesizer.stopSpeaking(at: .immediate)
    }
    
    // Force microphone cleanup
    speechManager.forceCleanup()
    
    // Deactivate audio session
    let session = AVAudioSession.sharedInstance()
    try? session.setActive(false, options: .notifyOthersOnDeactivation)
}
```
**Excellent:** Comprehensive cleanup prevents microphone indicator issues

### 2.2 Network Performance ✅ GOOD

#### Retry Logic with Exponential Backoff
```swift:77:124:ios/HelpEmApp/APIClient.swift
private func execute<T: Decodable>(request: URLRequest) async throws -> T {
    var lastError: Error?
    
    for attempt in 0...maxRetries {
        do {
            let (data, response) = try await session.data(for: request)
            // ... handle response
        } catch {
            if attempt < maxRetries, shouldRetry(error: error) {
                let backoff = UInt64(300_000_000) * UInt64(attempt + 1) // 0.3s, 0.6s
                try? await Task.sleep(nanoseconds: backoff)
                continue
            }
            throw mapToAPIError(error)
        }
    }
}
```
**Good:** Smart retry logic only for transient failures

### 2.3 Performance Issues ⚠️

#### Synchronous Keychain Access on Main Thread
```swift:64:82:ios/HelpEmApp/KeychainHelper.swift
private func read(key: String) -> String? {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecReturnData as String: true,
        kSecMatchLimit as String: kSecMatchLimitOne
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    // BLOCKING CALL on main thread
}
```

**Issue:** All keychain operations happen on main thread  
**Impact:** Potential UI stuttering during read/write operations  
**Fix:** Wrap in background dispatch for non-critical reads

#### Inefficient String Escaping
```swift:277:284:ios/HelpEmApp/WebViewContainer.swift
static func escapeForJavaScript(_ value: String) -> String {
    value
        .replacingOccurrences(of: "\\", with: "\\\\")
        .replacingOccurrences(of: "\"", with: "\\\"")
        .replacingOccurrences(of: "\n", with: "\\n")
        .replacingOccurrences(of: "\r", with: "\\r")
}
```
**Issue:** Creates 4 intermediate strings  
**Fix:** Use single-pass character iteration for large tokens

---

## 3. SECURITY ASSESSMENT (Score: 22/25)

### 3.1 Excellent Security Practices ✅

#### Secure Token Storage
```swift:42:61:ios/HelpEmApp/KeychainHelper.swift
private func save(key: String, value: String) {
    guard let data = value.data(using: .utf8) else { return }
    delete(key: key) // Remove old value first
    
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecValueData as String: data,
        kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    ]
    
    SecItemAdd(query as CFDictionary, nil)
}
```
**Excellent:**
- Uses Keychain (encrypted by iOS)
- `AfterFirstUnlockThisDeviceOnly` - Proper accessibility level
- Tokens never stored in UserDefaults or files

#### Sign in with Apple Implementation
```swift:94:106:ios/HelpEmApp/AuthManager.swift
func signInWithApple() {
    isLoading = true
    error = nil
    
    let request = ASAuthorizationAppleIDProvider().createRequest()
    // Don't request email/name per privacy policy
    request.requestedScopes = []
    
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.performRequests()
}
```
**Excellent:**
- No PII requested (email/name)
- Complies with Apple's privacy guidelines
- Uses native Apple APIs (not web-based)

#### Token Injection Security
```swift:137:184:ios/HelpEmApp/WebViewContainer.swift
static func makeAuthScript(token: String) -> WKUserScript {
    let safeToken = escapeForJavaScript(token)
    
    let source = """
    (function() {
        const token = "\(safeToken)";
        window.__nativeSessionToken = token;
        
        const shouldAttach = (url) => {
            const u = new URL(url, window.location.origin);
            return u.host === webHost || u.host === apiHost;
        };
        // Only attach token to same-origin requests
    })();
    """
    
    return WKUserScript(
        source: source,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
    )
}
```
**Excellent:**
- Token properly escaped
- IIFE prevents global pollution
- Domain validation before attaching token

### 3.2 Security Concerns ⚠️

#### No Certificate Pinning
```swift:15:20:ios/HelpEmApp/APIClient.swift
private init() {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    self.session = URLSession(configuration: config)
}
```
**Issue:** App trusts any valid SSL certificate  
**Risk:** Susceptible to MITM attacks on compromised networks  
**Recommendation:** Implement certificate pinning for production API

#### Insufficient Token Validation
```swift:157:216:ios/HelpEmApp/AuthManager.swift
private func authenticateWithBackend(appleUserId: String, identityToken: String) async throws {
    // ... make request
    
    guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let sessionToken = json["session_token"] as? String,
          let userId = json["user_id"] as? String else {
        throw AuthError.invalidResponse
    }
    
    // NO TOKEN VALIDATION - just store it
    KeychainHelper.shared.sessionToken = sessionToken
}
```
**Issue:** No JWT signature verification client-side  
**Risk:** Malicious backend could send invalid token  
**Recommendation:** Add basic JWT format validation

#### WebView Inspector Enabled
```swift:66:70:ios/HelpEmApp/WebViewContainer.swift
#if DEBUG
if #available(iOS 16.4, *) {
    webView.isInspectable = true
}
#endif
```
**Good:** Only enabled in debug builds  
**Concern:** Ensure this is stripped in release builds (check build settings)

---

## 4. STABILITY ASSESSMENT (Score: 21/25)

### 4.1 Good Stability Patterns ✅

#### Graceful Speech Recognition Failures
```swift:118:135:ios/HelpEmApp/SpeechManager.swift
private func beginSession() {
    guard let recognizer = recognizer else {
        print("❌ No speech recognizer available!")
        return
    }
    
    guard recognizer.isAvailable else {
        print("❌ Speech recognizer not available!")
        print("   - Device restrictions")
        print("   - No network connection")
        return
    }
    // Continues safely
}
```
**Excellent:** Multiple validation checkpoints

#### Audio Session Conflict Handling
```swift:140:153:ios/HelpEmApp/SpeechManager.swift
let session = AVAudioSession.sharedInstance()
do {
    try session.setCategory(
        .playAndRecord,
        mode: .spokenAudio,
        options: [.defaultToSpeaker, .allowBluetoothHFP]
    )
    try session.setActive(true)
} catch {
    print("❌ Audio session error:", error)
    print("❌ Another app may be using microphone")
    return // Fail gracefully
}
```

### 4.2 Stability Concerns ⚠️

#### Potential Race Condition
```swift:76:89:ios/HelpEmApp/WebViewContainer.swift
context.coordinator.webView = webView

// Set up WebView handler for RootView
DispatchQueue.main.async {
    let handler = RootView.WebViewHandler()
    handler.webView = webView
    let coordinator = context.coordinator
    handler.cleanupAudioCallback = { [weak coordinator] in
        coordinator?.forceCleanupAllAudio()
    }
    self.webViewHandler = handler
}
```
**Issue:** WebView handler set asynchronously after WebView creation  
**Risk:** Race condition if web content loads before handler is set  
**Fix:** Make handler setup synchronous or add ready flag

#### No Network Reachability Check
```swift:36:40:ios/HelpEmApp/APIClient.swift
func testDatabaseConnection() async throws -> HealthResponse {
    let endpoint = "/health"
    return try await get(endpoint: endpoint)
}
```
**Issue:** No check if device is online before making requests  
**Impact:** Poor UX - users get generic network errors  
**Recommendation:** Add Network framework reachability monitoring

#### Missing Crash Reporting
The app has no crash reporting framework (Firebase Crashlytics, Sentry, etc.)

**Impact:**
- Can't diagnose production crashes
- No visibility into error patterns
- Can't prioritize bug fixes

**Recommendation:** Integrate crash reporting before production launch

#### WebView Navigation Without Timeout
```swift:112:126:ios/HelpEmApp/WebViewContainer.swift
// Load web app
guard let url = URL(string: AppEnvironment.webAppURL) else {
    print("❌ Invalid web app URL")
    return webView
}

var request = URLRequest(url: url)
request.cachePolicy = .useProtocolCachePolicy
if !token.isEmpty {
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
}

webView.load(request)
// No timeout handling
```
**Issue:** If web app fails to load, user sees infinite spinner  
**Fix:** Add navigation timeout with retry/error UI

---

## 5. SPECIFIC ISSUES & RECOMMENDATIONS

### 5.1 CRITICAL FIXES BEFORE APP STORE SUBMISSION

#### 1. Fix Deployment Target ❌ BLOCKING
```
Current: IPHONEOS_DEPLOYMENT_TARGET = 26.2
Required: IPHONEOS_DEPLOYMENT_TARGET = 17.0 or 18.0
```
**Action:** Update `project.pbxproj` immediately

#### 2. Add App Transport Security Configuration
**Missing from Info.plist:**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>app.helpem.ai</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <true/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
        </dict>
    </dict>
</dict>
```

#### 3. Add App Entitlements Documentation
**Required for App Review:**
- Document why `com.apple.developer.siri` entitlement is needed
- Add privacy policy URL to Info.plist
- Add app description strings

### 5.2 HIGH PRIORITY IMPROVEMENTS

#### 1. Add Offline Mode Support
```swift
// Detect offline state
import Network

class NetworkMonitor {
    static let shared = NetworkMonitor()
    private let monitor = NWPathMonitor()
    @Published var isConnected = true
    
    func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        monitor.start(queue: DispatchQueue.global(qos: .background))
    }
}
```

#### 2. Add Analytics
```swift
// Track critical user flows
enum AnalyticsEvent {
    case appLaunched
    case signInStarted
    case signInCompleted
    case voiceInputStarted
    case voiceInputCompleted(duration: TimeInterval)
    case apiErrorOccurred(endpoint: String, code: Int)
}

class Analytics {
    static func track(_ event: AnalyticsEvent) {
        // Send to analytics service
    }
}
```

#### 3. Implement Proper Logging
```swift
import os.log

extension Logger {
    static let auth = Logger(subsystem: "ai.helpem.app", category: "auth")
    static let network = Logger(subsystem: "ai.helpem.app", category: "network")
    static let ui = Logger(subsystem: "ai.helpem.app", category: "ui")
}

// Usage:
Logger.auth.info("User signed in successfully")
Logger.network.error("API request failed: \(error)")
```

### 5.3 MEDIUM PRIORITY IMPROVEMENTS

#### 1. Add Biometric Authentication
```swift
import LocalAuthentication

func authenticateWithBiometrics() async -> Bool {
    let context = LAContext()
    var error: NSError?
    
    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
        return false
    }
    
    return try? await context.evaluatePolicy(
        .deviceOwnerAuthenticationWithBiometrics,
        localizedReason: "Unlock helpem"
    ) ?? false
}
```

#### 2. Add Loading States
- WebView loading progress bar
- Skeleton screens for data loading
- Pull-to-refresh indicators

#### 3. Improve Error UX
```swift
struct ErrorView: View {
    let error: Error
    let retry: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
            Text(error.localizedDescription)
            Button("Try Again") { retry() }
        }
    }
}
```

---

## 6. TESTING RECOMMENDATIONS

### 6.1 Critical Test Cases Missing

#### Authentication Flow
- [ ] Test Apple Sign In cancellation
- [ ] Test network timeout during auth
- [ ] Test token expiration (after 30 days)
- [ ] Test logout and re-login
- [ ] Test multiple rapid sign-in attempts

#### Memory Management
- [ ] Profile app memory usage over 30 minutes
- [ ] Test with low memory warnings
- [ ] Test WebView memory leaks (Instruments)
- [ ] Test audio session cleanup on background

#### Edge Cases
- [ ] Test with no internet connection
- [ ] Test with slow 2G connection
- [ ] Test with VPN active
- [ ] Test with parental controls enabled
- [ ] Test with microphone access denied
- [ ] Test with speech recognition denied
- [ ] Test with notifications disabled

#### Device Compatibility
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 15 Pro Max (large screen)
- [ ] Test on iPad (if supported)
- [ ] Test with accessibility features (VoiceOver, Dynamic Type)
- [ ] Test with Dark Mode

### 6.2 Automated Testing Recommendations

```swift
// Unit Tests
class KeychainHelperTests: XCTestCase {
    func testTokenStorage() {
        let helper = KeychainHelper.shared
        let testToken = "test_session_token"
        
        helper.sessionToken = testToken
        XCTAssertEqual(helper.sessionToken, testToken)
        
        helper.clearAll()
        XCTAssertNil(helper.sessionToken)
    }
}

// UI Tests
class AuthFlowUITests: XCTestCase {
    func testSuccessfulLogin() {
        let app = XCUIApplication()
        app.launch()
        
        let signInButton = app.buttons["Sign in with Apple"]
        XCTAssertTrue(signInButton.exists)
        
        // Continue with auth flow testing
    }
}
```

---

## 7. COMPARISON WITH INDUSTRY STANDARDS

### 7.1 How HelpEm Compares

| Category | HelpEm | Industry Standard | Grade |
|----------|---------|-------------------|-------|
| Security (Auth) | ✅ Excellent | Sign in with Apple | A+ |
| Security (Storage) | ✅ Keychain | Keychain | A |
| Security (Network) | ⚠️ No pinning | Certificate pinning | C |
| Memory Management | ✅ Excellent | Proactive cleanup | A |
| Error Handling | ⚠️ Good | User-facing errors | B |
| Offline Support | ❌ None | Essential | F |
| Analytics | ❌ None | Essential | F |
| Crash Reporting | ❌ None | Essential | F |
| Logging | ⚠️ Print statements | OSLog/Unified Logging | D |
| Testing | ⚠️ Unknown | 70%+ coverage | ? |
| Accessibility | ⚠️ Unknown | WCAG 2.1 AA | ? |

### 7.2 Apps to Benchmark Against

Similar hybrid apps with excellent iOS implementations:
1. **Notion** - WebView + Native features
2. **Superhuman** - Email with voice features
3. **Otter.ai** - Speech recognition excellence
4. **Todoist** - Offline sync patterns

---

## 8. FINAL RECOMMENDATIONS

### 8.1 Before App Store Submission (MUST DO)

1. ✅ Fix deployment target to iOS 17.0 or 18.0
2. ✅ Add App Transport Security configuration
3. ✅ Add privacy policy URL to Info.plist
4. ✅ Remove all debug print statements or gate with #if DEBUG
5. ✅ Add crash reporting (Firebase Crashlytics)
6. ✅ Test on physical devices (not just simulator)
7. ✅ Complete App Store Connect metadata
8. ✅ Record app preview video
9. ✅ Test TestFlight distribution

### 8.2 Week 1 Post-Launch (HIGH)

1. Add network reachability monitoring
2. Implement proper logging framework (OSLog)
3. Add analytics tracking
4. Add certificate pinning
5. Implement offline mode basics
6. Add loading progress indicators
7. Improve error messages with retry actions

### 8.3 Month 1 Post-Launch (MEDIUM)

1. Add biometric authentication option
2. Implement widget support (if applicable)
3. Add Siri Shortcuts integration
4. Improve accessibility (VoiceOver, Dynamic Type)
5. Add iPad optimization (if target platform)
6. Implement background refresh for notifications
7. Add onboarding flow for new users

### 8.4 Long-term Roadmap (LOW)

1. Investigate SwiftUI performance optimizations
2. Consider migrating from WebView to native UI
3. Add Apple Watch companion app
4. Implement App Clips for quick access
5. Add ShareSheet integration
6. Explore HomeKit integration (if relevant)

---

## 9. CODE REVIEW CHECKLIST

### Security ✅
- [x] Keychain used for sensitive data
- [x] Sign in with Apple implemented correctly
- [x] No hardcoded secrets in code
- [x] Token properly escaped in JavaScript injection
- [ ] Certificate pinning implemented
- [ ] JWT validation on client-side
- [ ] App Transport Security configured

### Performance ✅
- [x] Memory warnings handled
- [x] WebView cache managed
- [x] Audio resources cleaned up
- [x] Network retry logic implemented
- [ ] Keychain access moved off main thread
- [ ] String operations optimized

### Stability ⚠️
- [x] Nil checks for optional values
- [x] Try-catch blocks for throwing functions
- [x] Delegate weak references to prevent retain cycles
- [ ] Network reachability monitoring
- [ ] Crash reporting integrated
- [ ] Loading timeout handling

### User Experience ⚠️
- [x] Loading states shown
- [x] Haptic feedback on interactions
- [ ] Error messages actionable
- [ ] Offline mode supported
- [ ] Progress indicators for long operations
- [ ] Pull-to-refresh implemented

### Code Quality ⚠️
- [x] Single Responsibility Principle followed
- [x] DRY (Don't Repeat Yourself) mostly adhered to
- [ ] Proper logging framework
- [ ] Code documentation/comments
- [ ] Unit tests written
- [ ] UI tests written

---

## 10. OVERALL ASSESSMENT

**The HelpEm iOS app is 85% production-ready** with a solid architectural foundation and excellent security practices. The main concerns are:

1. **Critical:** Deployment target must be fixed
2. **High:** Missing observability (analytics, crash reporting)
3. **Medium:** No offline support
4. **Low:** Logging needs improvement

The development team demonstrates strong iOS engineering skills with particular excellence in:
- Security architecture
- Memory management
- WebView integration
- Audio resource handling

With the critical fixes implemented, this app is ready for TestFlight beta testing. Full production launch should wait until analytics and crash reporting are integrated.

---

## Contact & Follow-up

For questions about this review or implementation guidance, please contact the iOS engineering team.

**Review Version:** 1.0  
**Next Review:** After critical fixes implemented  
**Estimated Fix Time:** 2-3 days for critical issues
