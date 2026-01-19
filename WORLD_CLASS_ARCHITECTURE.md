# World-Class 3-Environment Architecture
**Status:** 📋 Documented, Not Yet Implemented  
**Implementation Target:** Before Beta Launch  
**Estimated Setup Time:** 4-5 hours total  

---

## 📊 Overview

This document defines the production-ready, scalable 3-environment architecture for helpem.

### Current State (Alpha)
```
✅ Dev Environment: Active (local development)
✅ Production Environment: Active (live deployment)
❌ Staging Environment: Not yet configured
```

### Target State (Beta+)
```
✅ Dev Environment: Rapid iteration, break things safely
✅ Staging Environment: QA, beta testing, production simulation
✅ Production Environment: Live users, App Store
```

---

## 🏗️ Architecture Design

### Environment Comparison

| Aspect | Dev | Staging | Production |
|--------|-----|---------|------------|
| **Purpose** | Active development | QA/Beta testing | Live users |
| **Backend** | Railway Dev | Railway Staging | Railway Production |
| **Database** | Postgres Dev | Postgres Staging | Postgres Production |
| **Web Frontend** | Vercel Dev | Vercel Preview | Vercel Production |
| **iOS Build** | Dev Scheme | Staging Scheme | Production Scheme |
| **Bundle ID** | `ai.helpem.app.dev` | `ai.helpem.app.beta` | `ai.helpem.app` |
| **Distribution** | Xcode Direct | TestFlight | App Store |
| **App Icon** | Orange tint | Purple tint | Standard blue |
| **Users** | You only | Beta testers | Public |
| **Data** | Test data | Synthetic data | Real user data |
| **Stability** | Unstable | Stable | Rock solid |

---

## 📱 iOS Implementation

### File: `ios/HelpEmApp/AppEnvironment.swift`

**Location:** `/Users/avpuser/HelpEm_POC/ios/HelpEmApp/AppEnvironment.swift`

```swift
import Foundation

/// Defines the three deployment environments
enum AppEnvironment: String {
    case development
    case staging
    case production
    
    /// Current environment based on build configuration
    static var current: AppEnvironment {
        #if DEV
        return .development
        #elseif STAGING
        return .staging
        #else
        return .production
        #endif
    }
    
    // MARK: - Service URLs
    
    /// Web application URL (for WKWebView)
    var webAppURL: String {
        switch self {
        case .development:
            return "https://helpem-dev.vercel.app"
        case .staging:
            return "https://helpem-staging.vercel.app"
        case .production:
            return "https://helpem.app"
        }
    }
    
    /// Backend API base URL
    var apiBaseURL: String {
        switch self {
        case .development:
            return "https://helpem-backend-dev.up.railway.app"
        case .staging:
            return "https://helpem-backend-staging.up.railway.app"
        case .production:
            return "https://helpem-backend.up.railway.app"
        }
    }
    
    // MARK: - App Identity
    
    /// iOS Bundle Identifier
    var bundleIdentifier: String {
        switch self {
        case .development:
            return "ai.helpem.app.dev"
        case .staging:
            return "ai.helpem.app.beta"
        case .production:
            return "ai.helpem.app"
        }
    }
    
    /// App display name (shown on home screen)
    var displayName: String {
        switch self {
        case .development:
            return "helpem DEV"
        case .staging:
            return "helpem β"
        case .production:
            return "helpem"
        }
    }
    
    /// App icon asset name (nil = default)
    var appIconName: String? {
        switch self {
        case .development:
            return "AppIcon-Dev"     // Orange tint
        case .staging:
            return "AppIcon-Staging" // Purple tint
        case .production:
            return nil               // Standard blue
        }
    }
    
    // MARK: - Feature Flags
    
    /// Allow destructive "Clear All Data" operations
    var allowsDataWipe: Bool {
        self != .production
    }
    
    /// Enable verbose console logging
    var verboseLogging: Bool {
        self == .development
    }
    
    /// Enable crash reporting (Sentry, etc.)
    var crashReportingEnabled: Bool {
        self != .development
    }
    
    /// Enable analytics tracking
    var analyticsEnabled: Bool {
        self == .production
    }
    
    /// Show environment badge in UI
    var showEnvironmentBadge: Bool {
        self != .production
    }
    
    // MARK: - Third-Party Service Keys
    
    /// RevenueCat API Key (per environment)
    var revenueCatAPIKey: String {
        switch self {
        case .development:
            return "rc_dev_..." // TODO: Add when implementing subscriptions
        case .staging:
            return "rc_staging_..." // TODO: Add when implementing subscriptions
        case .production:
            return "rc_prod_..." // TODO: Add when implementing subscriptions
        }
    }
    
    /// Sentry DSN for crash reporting
    var sentryDSN: String? {
        switch self {
        case .development:
            return nil // No crash reporting in dev
        case .staging:
            return "https://...@sentry.io/staging" // TODO: Add if using Sentry
        case .production:
            return "https://...@sentry.io/production" // TODO: Add if using Sentry
        }
    }
    
    /// Meta Ads SDK App ID (for install tracking)
    var metaAdsAppID: String? {
        switch self {
        case .development:
            return nil // No ad tracking in dev
        case .staging:
            return nil // No ad tracking in staging
        case .production:
            return "YOUR_META_APP_ID" // TODO: Add when implementing Meta Ads
        }
    }
}

// MARK: - Convenience Accessors

extension AppEnvironment {
    /// Quick check if running in production
    static var isProduction: Bool { current == .production }
    
    /// Quick check if running in staging
    static var isStaging: Bool { current == .staging }
    
    /// Quick check if running in development
    static var isDevelopment: Bool { current == .development }
    
    /// Human-readable environment description
    var description: String {
        "Environment: \(rawValue.capitalized) | API: \(apiBaseURL)"
    }
}

// MARK: - Logging Helper

extension AppEnvironment {
    /// Environment-aware logging
    static func log(_ message: String, level: LogLevel = .info) {
        let prefix = current.verboseLogging ? "[\(current.rawValue.uppercased())] " : ""
        let emoji: String
        
        switch level {
        case .debug: emoji = "🔍"
        case .info: emoji = "ℹ️"
        case .warning: emoji = "⚠️"
        case .error: emoji = "❌"
        }
        
        print("\(emoji) \(prefix)\(message)")
        
        // Send to remote logging in non-dev environments
        if current.crashReportingEnabled {
            // TODO: Send to Sentry or other logging service
        }
    }
}

enum LogLevel {
    case debug, info, warning, error
}
```

### Usage Example

```swift
// In WebViewContainer.swift or any file
let webURL = AppEnvironment.current.webAppURL
let apiURL = AppEnvironment.current.apiBaseURL

// Feature gating
if AppEnvironment.current.allowsDataWipe {
    // Show "Clear All Data" button
}

// Logging
AppEnvironment.log("User authenticated successfully", level: .info)
```

---

## 🔧 Xcode Configuration

### Step 1: Build Configurations

**Path:** Xcode → Project → Info → Configurations

Create these configurations:

```
Debug
├── Debug-Dev        (Add: Swift Flag -DDEV)
├── Debug-Staging    (Add: Swift Flag -DSTAGING)
└── (keep existing Debug as fallback)

Release
├── Release-Dev      (Add: Swift Flag -DDEV)
├── Release-Staging  (Add: Swift Flag -DSTAGING)
└── Release-Production (No flags = production)
```

### Step 2: Swift Compiler Flags

**Path:** Build Settings → Swift Compiler - Custom Flags → Other Swift Flags

| Configuration | Flags |
|---------------|-------|
| Debug-Dev | `-DDEV` |
| Debug-Staging | `-DSTAGING` |
| Release-Dev | `-DDEV` |
| Release-Staging | `-DSTAGING` |
| Release-Production | *(empty)* |

### Step 3: Bundle Identifier Setup

**Path:** Build Settings → Product Bundle Identifier

Set to: `$(PRODUCT_BUNDLE_IDENTIFIER_BASE)$(BUNDLE_ID_SUFFIX)`

Then in User-Defined Settings:
```
PRODUCT_BUNDLE_IDENTIFIER_BASE = ai.helpem.app

Per Configuration:
Debug-Dev:          BUNDLE_ID_SUFFIX = .dev
Debug-Staging:      BUNDLE_ID_SUFFIX = .beta
Release-Dev:        BUNDLE_ID_SUFFIX = .dev
Release-Staging:    BUNDLE_ID_SUFFIX = .beta
Release-Production: BUNDLE_ID_SUFFIX = (empty)
```

### Step 4: Create Schemes

**Create 3 schemes:**

**1. HelpEm Dev**
- Run: Debug-Dev
- Test: Debug-Dev
- Profile: Release-Dev
- Analyze: Debug-Dev
- Archive: Release-Dev

**2. HelpEm Staging**
- Run: Debug-Staging
- Test: Debug-Staging
- Profile: Release-Staging
- Analyze: Debug-Staging
- Archive: Release-Staging

**3. HelpEm Production**
- Run: Release-Production (or Debug for debugging)
- Test: Debug
- Profile: Release-Production
- Analyze: Release-Production
- Archive: Release-Production

### Step 5: App Icons (Optional Enhancement)

Create 3 app icon sets in Assets.xcassets:

```
AppIcon (default blue)
AppIcon-Dev (orange tint overlay)
AppIcon-Staging (purple tint overlay)
```

Then set in Build Settings → Asset Catalog App Icon Set Name:
```
Debug-Dev:      AppIcon-Dev
Debug-Staging:  AppIcon-Staging
Release-*:      AppIcon
```

---

## 🚂 Backend Setup (Railway)

### Current State
```
✅ helpem-backend (Production)
   ├── Postgres Database
   └── Node.js API
   └── Auto-deploy from main branch
```

### Target State
```
helpem-backend-dev (Development)
├── Postgres Database (test data, wipeable)
├── Node.js API
└── Auto-deploy from dev branch

helpem-backend-staging (Staging)
├── Postgres Database (synthetic data, production schema)
├── Node.js API
└── Auto-deploy from staging branch

helpem-backend (Production)
├── Postgres Database (real user data, backups enabled)
├── Node.js API
└── Manual deploy from main branch (after staging QA)
```

### Implementation Steps

#### 1. Create Dev Environment (15 minutes)

```bash
# In Railway dashboard:
1. Go to helpem-backend project
2. Click "New Project"
3. Name: "helpem-backend-dev"
4. Add Postgres database
5. Add Node.js service
6. Connect to GitHub repo, branch: dev
7. Copy all environment variables from production
8. Update: ENVIRONMENT=development
9. Update: DATABASE_URL (auto-generated by Railway)
10. Deploy
```

**Environment Variables (Dev):**
```env
ENVIRONMENT=development
DATABASE_URL=(auto-generated)
JWT_SECRET=(same as prod)
OPENAI_API_KEY=(same as prod)
NODE_ENV=development
```

#### 2. Create Staging Environment (15 minutes)

```bash
# In Railway dashboard:
1. Click "New Project"
2. Name: "helpem-backend-staging"
3. Add Postgres database
4. Add Node.js service
5. Connect to GitHub repo, branch: staging
6. Copy all environment variables from production
7. Update: ENVIRONMENT=staging
8. Update: DATABASE_URL (auto-generated by Railway)
9. Deploy
```

**Environment Variables (Staging):**
```env
ENVIRONMENT=staging
DATABASE_URL=(auto-generated)
JWT_SECRET=(same as prod)
OPENAI_API_KEY=(same as prod)
NODE_ENV=production
```

#### 3. Lock Down Production (5 minutes)

```bash
# In Railway dashboard (production project):
1. Go to Settings → Deployments
2. Change trigger from "Auto-deploy" to "Manual deploy"
3. Add deployment protection (require confirmation)
```

---

## 🌐 Frontend Setup (Vercel)

### Current State
```
✅ web (Production)
   └── Auto-deploy from main branch
   └── Domain: helpem.app (or vercel domain)
```

### Target State
```
web-dev (Development)
└── Manual deploys or auto-deploy from dev branch
└── Domain: helpem-dev.vercel.app

web-staging (Staging)
└── Auto-deploy from staging branch
└── Domain: helpem-staging.vercel.app

web (Production)
└── Auto-deploy from main branch
└── Domain: helpem.app
```

### Implementation Steps

#### 1. Create Staging Branch & Auto-Deploy (5 minutes)

```bash
# In terminal:
cd /Users/avpuser/HelpEm_POC
git checkout -b staging
git push origin staging

# In Vercel dashboard:
1. Go to Project Settings
2. Git → Connected Git Branch
3. Add "staging" branch
4. Enable "Auto-deploy" for staging
5. Custom domain (optional): staging.helpem.app
```

**Vercel automatically creates preview deployments:**
- `main` → `helpem.app` (production)
- `staging` → `helpem-git-staging.vercel.app` (staging)
- Pull requests → `helpem-pr-123.vercel.app` (preview)

#### 2. Environment Variables Per Branch (10 minutes)

In Vercel dashboard → Settings → Environment Variables:

| Variable | Production | Staging | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://helpem-backend.up.railway.app` | `https://helpem-backend-staging.up.railway.app` | `https://helpem-backend-dev.up.railway.app` |
| `OPENAI_API_KEY` | (prod key) | (same) | (same) |
| `JWT_SECRET` | (prod secret) | (same) | (same) |
| `DATABASE_URL` | (Railway prod) | (Railway staging) | (Railway dev) |

---

## 🚀 Deployment Workflows

### Daily Development (Dev Environment)

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Develop and test locally
# - Run "HelpEm Dev" scheme in Xcode
# - Orange app icon, points to dev backend
# - Can install alongside other builds

# 3. Push changes
git push origin feature/new-feature

# 4. Backend auto-deploys to Railway Dev (if merged to dev branch)
# 5. Frontend auto-deploys to Vercel Dev (if merged to dev branch)
```

### Weekly Beta Release (Staging Environment)

```bash
# 1. Merge feature branches to staging
git checkout staging
git merge feature/new-feature
git push origin staging

# 2. Auto-deploys
# - Railway Staging: Auto-deploys backend
# - Vercel Staging: Auto-deploys frontend

# 3. Build iOS Staging
# - Xcode → Product → Archive (HelpEm Staging scheme)
# - Upload to TestFlight (Internal Testing)

# 4. QA Testing (2-3 days)
# - You + internal testers test on staging
# - Report bugs, fix in new branches
# - Re-deploy to staging, re-test

# 5. When stable, promote to production
```

### Bi-Weekly Production Release

```bash
# 1. After staging QA approval
git checkout main
git merge staging
git push origin main

# 2. Manual deploys
# - Railway Production: Trigger manual deploy
# - Vercel Production: Auto-deploys

# 3. Build iOS Production
# - Xcode → Product → Archive (HelpEm Production scheme)
# - Upload to TestFlight (External Testing)

# 4. TestFlight Beta (3-7 days)
# - External testers validate

# 5. Submit to App Store
# - Same build from TestFlight
# - Submit for review
```

---

## 📊 Cost Analysis

### Monthly Infrastructure Costs

| Service | Dev | Staging | Production | Total |
|---------|-----|---------|------------|-------|
| Railway | $5-10 | $10-15 | $15-20 | $30-45 |
| Vercel | Free | Free | Free | $0 |
| TestFlight | Free | Free | Free | $0 |
| **Total** | | | | **$30-45/mo** |

### Cost Justification

**ROI Calculation:**
- Prevents 1 major production incident = Saves 10+ hours debugging
- Your time: $50-150/hour
- Staging pays for itself in Month 1

**What You're Buying:**
- Peace of mind
- Professional infrastructure
- Investor confidence
- Scalability foundation
- Reduced stress

---

## 🚦 When to Implement

### Decision Triggers

Implement staging when you hit **any** of these:

✅ **User Threshold**
- 50+ beta testers
- 10+ paying users
- Planning to launch publicly

✅ **Risk Events**
- First production bug that affects multiple users
- Need to test payment/subscription flows
- Planning a risky migration or refactor

✅ **Team Growth**
- Hiring a contractor, intern, or QA tester
- Working with a co-founder or technical advisor

✅ **Traction Signals**
- 30%+ Week 1 retention rate
- Users are paying money ($4.99/month)
- Beta waitlist is growing

✅ **Professional Readiness**
- Preparing for investor pitch
- Enterprise customers asking about your infrastructure
- App Store submission (want a safety net)

---

## ⏱️ Implementation Timeline

### Phase 1: Backend (Day 1) - 1 hour
- [ ] Create Railway dev project (15 min)
- [ ] Create Railway staging project (15 min)
- [ ] Configure environment variables (15 min)
- [ ] Test API endpoints (15 min)

### Phase 2: Frontend (Day 1) - 30 minutes
- [ ] Create `staging` branch (5 min)
- [ ] Create `dev` branch (5 min)
- [ ] Connect branches to Vercel (10 min)
- [ ] Test auto-deploys (10 min)

### Phase 3: iOS (Day 2-3) - 2 hours
- [ ] Update `AppEnvironment.swift` (20 min)
- [ ] Create Xcode build configurations (20 min)
- [ ] Create Xcode schemes (20 min)
- [ ] Create app icon variants (30 min)
- [ ] Test all 3 builds locally (30 min)

### Phase 4: Validation (Day 4) - 1 hour
- [ ] Upload staging build to TestFlight (20 min)
- [ ] Install all 3 apps side-by-side (10 min)
- [ ] Verify environment routing (20 min)
- [ ] Document process (10 min)

**Total:** 4.5 hours

---

## 📋 Pre-Implementation Checklist

Before starting implementation, ensure:

- [ ] Current production is stable
- [ ] All code is committed and pushed
- [ ] Database backups are enabled
- [ ] You have 4-5 hours available
- [ ] Railway account has payment method (for additional projects)
- [ ] Apple Developer account is active (for TestFlight)

---

## 🎯 Success Criteria

After implementation, you should have:

- [ ] 3 Railway projects (dev, staging, production)
- [ ] 3 Vercel deployments (dev, staging, production)
- [ ] 3 Xcode schemes (dev, staging, production)
- [ ] 3 installable iOS apps on one device
- [ ] All 3 environments pointing to correct backends
- [ ] TestFlight configured for staging builds
- [ ] Documentation updated with new URLs

---

## 🔗 Reference Links

### Current Production URLs
- **Web:** https://web-if0n5qpk3-bryan-simkins.vercel.app
- **Backend:** (Railway production URL)
- **iOS:** Not yet on App Store (alpha testing)

### Future Staging URLs (After Implementation)
- **Web:** https://helpem-staging.vercel.app (or Vercel auto-generated)
- **Backend:** https://helpem-backend-staging.up.railway.app
- **iOS:** TestFlight (Internal Testing)

### Future Dev URLs (After Implementation)
- **Web:** https://helpem-dev.vercel.app (or manual deploys)
- **Backend:** https://helpem-backend-dev.up.railway.app
- **iOS:** Direct install via Xcode

---

## 📝 Notes

- This architecture follows industry best practices used by Stripe, Notion, Linear
- Designed to scale from 1 → 10,000+ users without major refactoring
- Can be implemented incrementally (staging first, dev later, or vice versa)
- All services have free tiers or affordable pricing for early stage
- Compatible with future additions: CI/CD, feature flags, A/B testing

---

## 🚀 Next Steps

When ready to implement:
1. Review this document
2. Schedule 4-5 hour implementation block
3. Follow Phase 1-4 timeline
4. Test thoroughly
5. Launch beta with confidence

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** Ready for implementation when needed  
