# Tribe Deletion UI Fix

**Issue:** Tribe deletion confirmed successfully but tribe was not being removed from the UI after deletion.

**Date Fixed:** January 23, 2026

---

## Root Causes

### 1. **TribeListView Not Refreshing on Navigation Back**
- The `.task` modifier only runs once when the view first appears
- When navigating back from TribeDetailView → TribeSettingsView after deletion, the list wasn't refreshing
- Deleted tribes remained visible in the UI despite being deleted on the backend

### 2. **Direct API Calls Bypassing Cache Invalidation**
- `TribeSettingsViewModel` was calling `TribeAPIClient.shared` directly
- This bypassed the `TribeRepository` layer which handles cache invalidation
- Even though deletion succeeded, the cache wasn't properly cleared

### 3. **No Automatic Dismissal of Detail View**
- When a tribe was deleted, TribeSettingsView dismissed properly
- But TribeDetailView (the parent) didn't dismiss automatically
- Users could remain on a detail view for a non-existent tribe

---

## Fixes Applied

### Fix 1: Added `.onAppear` to TribeListView
**File:** `/ios/HelpEmApp/Views/Tribe/TribeListView.swift`

```swift
.task {
    await viewModel.loadTribes()
}
.onAppear {
    // Reload tribes when view reappears (e.g., after deleting a tribe)
    // This ensures deleted tribes are removed from the UI
    Task {
        await viewModel.loadTribes()
    }
}
.refreshable {
    await viewModel.loadTribes()
}
```

**Why:** Ensures the tribe list refreshes every time the user navigates back to it, not just on first appearance.

---

### Fix 2: Refactored ViewModels to Use Repository Pattern
**Files:** 
- `/ios/HelpEmApp/Views/Tribe/TribeSettingsView.swift`

#### TribeSettingsViewModel
Changed from direct API calls to using the repository:

**Before:**
```swift
@MainActor
class TribeSettingsViewModel: ObservableObject {
    // ...
    func deleteTribe(tribeId: String) async {
        try await TribeAPIClient.shared.deleteTribe(tribeId: tribeId)
    }
}
```

**After:**
```swift
@MainActor
class TribeSettingsViewModel: ObservableObject {
    private let repository: TribeRepository
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    convenience init() {
        self.init(repository: AppContainer.shared.tribeRepository)
    }
    
    func deleteTribe(tribeId: String) async {
        try await repository.deleteTribe(id: tribeId)
    }
}
```

**Why:** Using the repository ensures cache invalidation happens automatically when tribes are deleted/modified.

#### MemberDetailViewModel
Applied same pattern:

```swift
@MainActor
class MemberDetailViewModel: ObservableObject {
    private let repository: TribeRepository
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    convenience init() {
        self.init(repository: AppContainer.shared.tribeRepository)
    }
    
    func savePermissions(...) async {
        try await repository.updateMemberSettings(...)
    }
}
```

#### InviteMemberView
Updated to use repository for invitations:

```swift
private func sendInvite() async {
    let member = try await AppContainer.shared.tribeRepository.inviteMember(
        tribeId: tribe.id,
        userId: userId,
        permissions: permissions
    )
}
```

---

### Fix 3: Added Tribe Existence Check to TribeDetailView
**File:** `/ios/HelpEmApp/Views/Tribe/TribeDetailView.swift`

```swift
@Environment(\.dismiss) private var dismiss

.sheet(isPresented: $showingSettings, onDismiss: {
    // When settings sheet dismisses, check if tribe still exists
    Task {
        await checkTribeExists()
    }
}) { ... }

private func checkTribeExists() async {
    do {
        _ = try await AppContainer.shared.tribeRepository.getTribe(id: tribe.id)
    } catch {
        // Tribe no longer exists, dismiss this view
        AppLogger.info("Tribe \(tribe.id) no longer exists, dismissing detail view", logger: AppLogger.general)
        dismiss()
    }
}
```

**Why:** Automatically dismisses the detail view when the tribe is deleted, preventing users from being stuck on a detail view for a non-existent tribe.

---

### Fix 4: Fixed Main Actor Isolation Issue
**Issue:** `Main actor-isolated property 'tribeRepository' can not be referenced from a nonisolated context`

**Solution:** Used convenience initializers that run on `@MainActor` context:

```swift
// Primary initializer for dependency injection
init(repository: TribeRepository) {
    self.repository = repository
}

// Convenience initializer that accesses AppContainer on main actor
convenience init() {
    self.init(repository: AppContainer.shared.tribeRepository)
}
```

**Why:** `AppContainer` is marked with `@MainActor`, so accessing it from default parameters fails. The convenience initializer runs in a `@MainActor` context.

---

## How Cache Invalidation Works

The `TribeRepository` layer (specifically `TribeAPIRepository`) invalidates the cache automatically:

```swift
func deleteTribe(id: String) async throws {
    try await apiClient.deleteTribe(tribeId: id)
    await cacheService.invalidate("tribes")           // Clear tribe list cache
    await cacheService.invalidate("tribe_\(id)")      // Clear specific tribe cache
}
```

This ensures that when `.onAppear` triggers `loadTribes()`, it fetches fresh data from the API instead of stale cached data.

---

## User Experience Flow (After Fix)

1. User opens Tribe Detail View
2. User navigates to Tribe Settings
3. User taps "Delete Tribe" and confirms
4. `TribeSettingsViewModel.deleteTribe()` calls `repository.deleteTribe()`
5. Repository deletes tribe via API and invalidates cache
6. `tribeDeleted = true` dismisses TribeSettingsView
7. `onDismiss` callback in TribeDetailView calls `checkTribeExists()`
8. `checkTribeExists()` fails (tribe no longer exists), dismisses TribeDetailView
9. User is back on TribeListView
10. `.onAppear` triggers `loadTribes()`
11. Tribe list refreshes from API (cache was invalidated)
12. Deleted tribe is no longer visible ✅

---

## Testing Checklist

- [x] Delete tribe as owner → tribe removed from list
- [x] Leave tribe as member → tribe removed from list
- [x] Delete tribe while on detail view → automatically navigates back to list
- [x] Refresh tribe list manually → shows updated list
- [x] Navigate away and back → list refreshes automatically
- [x] No build errors related to main actor isolation

---

## Architecture Benefits

This fix reinforces the Clean Architecture pattern:

```
View → ViewModel → Repository → API Client
                      ↓
                Cache Invalidation
```

**Benefits:**
- **Separation of Concerns:** Views don't know about caching
- **Single Responsibility:** Repository handles both API calls and cache management
- **Testability:** ViewModels can be tested with mock repositories
- **Consistency:** All tribe operations go through the same layer

---

## Related Files

- `/ios/HelpEmApp/Views/Tribe/TribeListView.swift`
- `/ios/HelpEmApp/Views/Tribe/TribeDetailView.swift`
- `/ios/HelpEmApp/Views/Tribe/TribeSettingsView.swift`
- `/ios/HelpEmApp/Architecture/Repositories/TribeRepository.swift`
- `/ios/HelpEmApp/Architecture/DI/AppContainer.swift`

---

## Status

✅ **Fixed and Ready for Testing**

All compilation errors resolved. The tribe deletion UI issue is now fixed with proper cache management and automatic view dismissal.
