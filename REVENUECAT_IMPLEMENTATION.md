# RevenueCat Implementation Guide for helpem

**Why RevenueCat?** Building subscription management from scratch = 2-3 months. RevenueCat = 2 days.

---

## Setup (15 minutes)

### 1. Create RevenueCat Account

1. Go to https://app.revenuecat.com/signup
2. Create project: "helpem"
3. Copy API Keys:
   - **Public SDK Key** (for iOS app)
   - **Secret Key** (for backend, if needed)

### 2. Configure Products in RevenueCat Dashboard

**Entitlements (What users get):**
- `basic` - Basic tier features
- `premium` - Premium tier features

**Products (What users buy):**

| Product ID | Type | Price | Trial | Maps to Entitlement |
|-----------|------|-------|-------|---------------------|
| `com.helpem.basic.monthly` | Monthly | $7.99 | 7 days | `basic` |
| `com.helpem.basic.annual` | Annual | $79.00 | 7 days | `basic` |
| `com.helpem.premium.monthly` | Monthly | $14.99 | 7 days | `premium` |
| `com.helpem.premium.annual` | Annual | $149.00 | 7 days | `premium` |

**Offerings (How products are presented):**
- **Default Offering:** Basic Monthly, Basic Annual, Premium Monthly, Premium Annual

---

## iOS Implementation

### 1. Install RevenueCat SDK

**Package.swift** (Swift Package Manager):

```swift
dependencies: [
    .package(url: "https://github.com/RevenueCat/purchases-ios", from: "4.37.0")
]
```

Or in Xcode:
1. File → Add Packages
2. Enter: `https://github.com/RevenueCat/purchases-ios`
3. Add to target: `HelpEmApp`

---

### 2. Configure on App Launch

**File:** `ios/HelpEmApp/HelpEmApp.swift`

```swift
import SwiftUI
import RevenueCat

@main
struct HelpEmApp: App {
    init() {
        configureRevenueCat()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(SubscriptionManager.shared)
        }
    }
    
    private func configureRevenueCat() {
        // Get API key from your RevenueCat dashboard
        Purchases.logLevel = .debug // Remove in production
        Purchases.configure(withAPIKey: "appl_XYZ123...") // Your key here
        
        // Optional: Set user ID (if you have auth)
        // Purchases.shared.logIn("user_123") { customerInfo, error in }
    }
}
```

---

### 3. Create SubscriptionManager

**File:** `ios/HelpEmApp/SubscriptionManager.swift`

```swift
import Foundation
import RevenueCat
import SwiftUI

@MainActor
class SubscriptionManager: ObservableObject {
    static let shared = SubscriptionManager()
    
    // Published state
    @Published var currentTier: SubscriptionTier = .free
    @Published var isActive: Bool = false
    @Published var expirationDate: Date?
    @Published var isInTrial: Bool = false
    @Published var offerings: Offerings?
    @Published var isLoading: Bool = false
    
    // Usage tracking (local)
    @AppStorage("messageCount") var messageCount: Int = 0
    @AppStorage("todoCount") var todoCount: Int = 0
    @AppStorage("habitCount") var habitCount: Int = 0
    @AppStorage("lastResetDate") var lastResetDate: TimeInterval = Date().timeIntervalSince1970
    
    private init() {
        Task {
            await checkSubscriptionStatus()
            await loadOfferings()
        }
        
        // Listen for subscription changes
        Purchases.shared.delegate = self
    }
    
    // MARK: - Check Current Status
    
    func checkSubscriptionStatus() async {
        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            updateSubscriptionState(customerInfo)
        } catch {
            print("❌ Failed to fetch customer info: \(error)")
            self.currentTier = .free
            self.isActive = false
        }
    }
    
    private func updateSubscriptionState(_ customerInfo: CustomerInfo) {
        // Check entitlements
        if customerInfo.entitlements["premium"]?.isActive == true {
            self.currentTier = .premium
            self.isActive = true
        } else if customerInfo.entitlements["basic"]?.isActive == true {
            self.currentTier = .basic
            self.isActive = true
        } else {
            self.currentTier = .free
            self.isActive = false
        }
        
        // Check trial status
        if let entitlement = customerInfo.entitlements.active.first?.value {
            self.isInTrial = entitlement.periodType == .intro
            self.expirationDate = entitlement.expirationDate
        }
        
        print("✅ Subscription status: \(currentTier), active: \(isActive), trial: \(isInTrial)")
    }
    
    // MARK: - Load Offerings (Products)
    
    func loadOfferings() async {
        do {
            let offerings = try await Purchases.shared.offerings()
            self.offerings = offerings
            
            if let current = offerings.current {
                print("📦 Loaded \(current.availablePackages.count) packages")
            }
        } catch {
            print("❌ Failed to load offerings: \(error)")
        }
    }
    
    // MARK: - Purchase
    
    func purchase(package: Package) async -> Bool {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let (transaction, customerInfo, userCancelled) = try await Purchases.shared.purchase(package: package)
            
            if userCancelled {
                print("⚠️ User cancelled purchase")
                return false
            }
            
            updateSubscriptionState(customerInfo)
            print("✅ Purchase successful: \(transaction?.productIdentifier ?? "unknown")")
            return true
            
        } catch {
            print("❌ Purchase failed: \(error)")
            return false
        }
    }
    
    // MARK: - Restore Purchases
    
    func restorePurchases() async -> Bool {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            updateSubscriptionState(customerInfo)
            print("✅ Purchases restored")
            return true
        } catch {
            print("❌ Restore failed: \(error)")
            return false
        }
    }
    
    // MARK: - Feature Gating
    
    func canAddTodo() -> Bool {
        switch currentTier {
        case .free:
            return todoCount < 10
        case .basic:
            return todoCount < 100
        case .premium:
            return true // Unlimited
        }
    }
    
    func canAddHabit() -> Bool {
        switch currentTier {
        case .free:
            return habitCount < 5
        case .basic:
            return habitCount < 20
        case .premium:
            return true // Unlimited
        }
    }
    
    func canSendMessage() -> Bool {
        resetCountsIfNeeded()
        
        switch currentTier {
        case .free:
            return messageCount < 50
        case .basic:
            return messageCount < 300
        case .premium:
            return messageCount < 3000 // Fair use policy
        }
    }
    
    func incrementMessageCount() {
        resetCountsIfNeeded()
        messageCount += 1
    }
    
    func incrementTodoCount() {
        todoCount += 1
    }
    
    func decrementTodoCount() {
        todoCount = max(0, todoCount - 1)
    }
    
    func incrementHabitCount() {
        habitCount += 1
    }
    
    func decrementHabitCount() {
        habitCount = max(0, habitCount - 1)
    }
    
    private func resetCountsIfNeeded() {
        let now = Date()
        let lastReset = Date(timeIntervalSince1970: lastResetDate)
        
        // Reset message count on the 1st of each month
        if !Calendar.current.isDate(now, equalTo: lastReset, toGranularity: .month) {
            messageCount = 0
            lastResetDate = now.timeIntervalSince1970
            print("🔄 Reset monthly message count")
        }
    }
    
    // MARK: - Usage Stats
    
    func getUsagePercentage() -> Double {
        let limit: Int
        switch currentTier {
        case .free:
            limit = 50
        case .basic:
            limit = 300
        case .premium:
            limit = 3000
        }
        
        return Double(messageCount) / Double(limit)
    }
    
    func getRemainingMessages() -> Int {
        let limit: Int
        switch currentTier {
        case .free:
            limit = 50
        case .basic:
            limit = 300
        case .premium:
            limit = 3000
        }
        
        return max(0, limit - messageCount)
    }
}

// MARK: - PurchasesDelegate

extension SubscriptionManager: PurchasesDelegate {
    nonisolated func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        // Called whenever subscription status changes
        Task { @MainActor in
            updateSubscriptionState(customerInfo)
        }
    }
}

// MARK: - Models

enum SubscriptionTier: String, Codable {
    case free = "free"
    case basic = "basic"
    case premium = "premium"
    
    var displayName: String {
        switch self {
        case .free: return "Free"
        case .basic: return "Basic"
        case .premium: return "Premium"
        }
    }
    
    var price: String {
        switch self {
        case .free: return "$0"
        case .basic: return "$7.99/month"
        case .premium: return "$14.99/month"
        }
    }
}
```

---

### 4. Create Paywall View

**File:** `ios/HelpEmApp/PaywallView.swift`

```swift
import SwiftUI
import RevenueCat

struct PaywallView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var subscriptionManager: SubscriptionManager
    
    @State private var selectedPackage: Package?
    @State private var isPurchasing = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 8) {
                            Text("Upgrade to helpem")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                            
                            Text("Choose the plan that works for you")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 32)
                        
                        // Feature comparison
                        featureComparisonView
                        
                        // Package selection
                        if let offerings = subscriptionManager.offerings,
                           let packages = offerings.current?.availablePackages {
                            
                            VStack(spacing: 12) {
                                ForEach(packages, id: \.identifier) { package in
                                    PackageButton(
                                        package: package,
                                        isSelected: selectedPackage?.identifier == package.identifier,
                                        onSelect: { selectedPackage = package }
                                    )
                                }
                            }
                            .padding(.horizontal)
                        }
                        
                        // CTA button
                        Button {
                            Task {
                                await purchaseSelected()
                            }
                        } label: {
                            if isPurchasing {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Start 7-Day Free Trial")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(selectedPackage != nil ? Color.blue : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .padding(.horizontal)
                        .disabled(selectedPackage == nil || isPurchasing)
                        
                        // Fine print
                        Text("Cancel anytime. You won't be charged until your trial ends. We'll ask you to confirm before billing.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        
                        // Restore button
                        Button {
                            Task {
                                await restorePurchases()
                            }
                        } label: {
                            Text("Restore Purchases")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                        .padding(.bottom, 32)
                    }
                }
                
                // Loading overlay
                if isPurchasing {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
        .onAppear {
            // Pre-select Basic Monthly
            if let offerings = subscriptionManager.offerings,
               let packages = offerings.current?.availablePackages {
                selectedPackage = packages.first(where: { $0.storeProduct.productIdentifier == "com.helpem.basic.monthly" })
            }
        }
    }
    
    private var featureComparisonView: some View {
        VStack(alignment: .leading, spacing: 12) {
            FeatureRow(icon: "checkmark.circle.fill", text: "Unlimited todos & appointments", color: .green)
            FeatureRow(icon: "waveform", text: "Premium neural voice", color: .blue)
            FeatureRow(icon: "bubble.left.fill", text: "AI assistant (300-unlimited messages)", color: .purple)
            FeatureRow(icon: "calendar", text: "Calendar sync & export", color: .orange)
            FeatureRow(icon: "icloud.fill", text: "Cloud backup", color: .blue)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private func purchaseSelected() async {
        guard let package = selectedPackage else { return }
        
        isPurchasing = true
        let success = await subscriptionManager.purchase(package: package)
        isPurchasing = false
        
        if success {
            dismiss()
        } else {
            errorMessage = "Purchase failed. Please try again."
            showError = true
        }
    }
    
    private func restorePurchases() async {
        isPurchasing = true
        let success = await subscriptionManager.restorePurchases()
        isPurchasing = false
        
        if success && subscriptionManager.isActive {
            dismiss()
        } else {
            errorMessage = "No purchases found to restore."
            showError = true
        }
    }
}

struct PackageButton: View {
    let package: Package
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button {
            onSelect()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(packageName)
                            .font(.headline)
                        
                        if package.packageType == .annual {
                            Text("SAVE 17%")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green)
                                .cornerRadius(4)
                        }
                    }
                    
                    Text(package.storeProduct.localizedPriceString)
                        .font(.title3)
                        .fontWeight(.bold)
                    
                    Text("7-day free trial")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isSelected ? .blue : .gray)
            }
            .padding()
            .background(isSelected ? Color.blue.opacity(0.1) : Color.gray.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
    
    private var packageName: String {
        let tier = package.storeProduct.productIdentifier.contains("premium") ? "Premium" : "Basic"
        let period = package.packageType == .annual ? "Annual" : "Monthly"
        return "\(tier) - \(period)"
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title3)
            
            Text(text)
                .font(.subheadline)
            
            Spacer()
        }
    }
}
```

---

### 5. Show Paywall When Limit Reached

**File:** `ios/HelpEmApp/ChatInput.swift` (example integration)

```swift
import SwiftUI

struct ChatInputView: View {
    @EnvironmentObject var subscriptionManager: SubscriptionManager
    @State private var showPaywall = false
    @State private var message = ""
    
    var body: some View {
        VStack {
            // Message counter
            if subscriptionManager.currentTier != .premium {
                Text("\(subscriptionManager.getRemainingMessages()) messages remaining this month")
                    .font(.caption)
                    .foregroundColor(subscriptionManager.getUsagePercentage() > 0.8 ? .red : .secondary)
            }
            
            HStack {
                TextField("Message", text: $message)
                    .textFieldStyle(.roundedBorder)
                
                Button("Send") {
                    sendMessage()
                }
                .disabled(!subscriptionManager.canSendMessage())
            }
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
                .environmentObject(subscriptionManager)
        }
    }
    
    private func sendMessage() {
        guard subscriptionManager.canSendMessage() else {
            // Show paywall
            showPaywall = true
            return
        }
        
        // Send message logic
        subscriptionManager.incrementMessageCount()
        
        // ... rest of chat logic
    }
}
```

---

### 6. Settings/Account View

**File:** `ios/HelpEmApp/SettingsView.swift`

```swift
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var subscriptionManager: SubscriptionManager
    @State private var showPaywall = false
    
    var body: some View {
        Form {
            Section("Subscription") {
                HStack {
                    Text("Current Plan")
                    Spacer()
                    Text(subscriptionManager.currentTier.displayName)
                        .foregroundColor(.secondary)
                }
                
                if subscriptionManager.isInTrial {
                    HStack {
                        Text("Trial Ends")
                        Spacer()
                        if let date = subscriptionManager.expirationDate {
                            Text(date, style: .date)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                if subscriptionManager.currentTier != .premium {
                    Button("Upgrade") {
                        showPaywall = true
                    }
                }
                
                if subscriptionManager.isActive {
                    Link("Manage Subscription", destination: URL(string: "https://apps.apple.com/account/subscriptions")!)
                        .foregroundColor(.blue)
                }
                
                Button("Restore Purchases") {
                    Task {
                        await subscriptionManager.restorePurchases()
                    }
                }
            }
            
            Section("Usage") {
                HStack {
                    Text("Messages This Month")
                    Spacer()
                    Text("\(subscriptionManager.messageCount) / \(subscriptionManager.getRemainingMessages() + subscriptionManager.messageCount)")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Active Todos")
                    Spacer()
                    Text("\(subscriptionManager.todoCount)")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Active Habits")
                    Spacer()
                    Text("\(subscriptionManager.habitCount)")
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle("Settings")
        .sheet(isPresented: $showPaywall) {
            PaywallView()
                .environmentObject(subscriptionManager)
        }
    }
}
```

---

## Testing

### 1. Sandbox Testing

**In App Store Connect:**
1. Go to Users and Access → Sandbox Testers
2. Create test account: `test@helpem.com`

**In Xcode:**
1. Run app on device (not simulator for StoreKit)
2. When prompted, sign in with sandbox account
3. Purchase should work instantly (no charge)

**RevenueCat Dashboard:**
- Sandbox purchases show up in real-time
- Check "Customers" tab to see test user

### 2. Test Scenarios

✅ **Happy Path:**
- Install app → See Free tier
- Hit message limit → See paywall
- Purchase Basic → Access unlocked
- Restart app → Still Basic (entitlement cached)

✅ **Edge Cases:**
- Purchase while offline → Should queue and process when online
- Restore purchases → Should restore on new device
- Cancel subscription → Should work until period ends
- Upgrade Basic → Premium → Should prorate automatically

---

## Production Checklist

Before launching:

- [ ] Change RevenueCat API key from Sandbox → Production
- [ ] Remove `Purchases.logLevel = .debug`
- [ ] Submit app with in-app purchases for review
- [ ] Set up App Store Server Notifications in RevenueCat
- [ ] Test on real device with real payment method
- [ ] Set up customer support email for subscription issues
- [ ] Add privacy policy link (required by Apple)
- [ ] Add terms of service link (required by Apple)

---

## Cost Breakdown (RevenueCat)

| Plan | MRR | Cost | % of Revenue |
|------|-----|------|--------------|
| **Free** | $0-$10K | $0 | 0% |
| **Growth** | $10K+ | $0-$800 | 1% (capped at $800) |
| **Pro** | Custom | $800-2.5K | <1% |

**Your Situation:**
- Launch: FREE (under $10K MRR)
- Year 1: FREE (likely under $10K MRR for months 1-6)
- Scale: $800/month max (trivial vs. 30% Apple fee)

---

## Summary

### What You Get with RevenueCat

✅ **2 days instead of 2 months**
✅ **Receipt validation** (prevent fraud)
✅ **Server-side subscriptions** (source of truth)
✅ **Webhook handling** (refunds, renewals, cancellations)
✅ **Cross-platform ready** (if you add Android later)
✅ **Free for launch** (under $10K MRR)

### Implementation Time

| Task | Time |
|------|------|
| Install SDK | 5 min |
| Configure dashboard | 10 min |
| Create SubscriptionManager | 2 hours |
| Build Paywall UI | 4 hours |
| Feature gating | 2 hours |
| Testing | 2 hours |
| **Total** | **1-2 days** |

vs.

| Task (Custom) | Time |
|--------------|------|
| StoreKit 2 setup | 1 week |
| Receipt validation backend | 1 week |
| Webhook handling | 1 week |
| Database schema | 3 days |
| Edge cases (refunds, prorations) | 1 week |
| Testing & debugging | 1 week |
| **Total** | **6-8 weeks** |

---

**Ready to implement?** Use the Swift code above as your foundation. 🚀
