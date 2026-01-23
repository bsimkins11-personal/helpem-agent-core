# View-ViewModel Interface Fixes

## ✅ Fixed Method Signature Mismatches

---

## 🐛 The Problem

Views were calling ViewModel methods with incorrect signatures after the Architecture refactor.

---

## 🔧 Fixes Applied

### 1. **TribeInboxView** ✅ (Commit `721fa6a`)

**Wrong Method Calls:**
```swift
❌ viewModel.acceptProposal(tribeId: tribe.id, proposalId: proposal.id)
❌ viewModel.notNowProposal(tribeId: tribe.id, proposalId: proposal.id)
❌ viewModel.dismissProposal(tribeId: tribe.id, proposalId: proposal.id)
❌ viewModel.loadInbox(tribeId: tribe.id)
```

**Correct Method Calls:**
```swift
✅ viewModel.acceptProposal(proposal, tribeId: tribe.id)
✅ viewModel.notNowProposal(proposal, tribeId: tribe.id)
✅ viewModel.dismissProposal(proposal, tribeId: tribe.id)
✅ viewModel.loadProposals(tribeId: tribe.id)
```

**Property Access:**
```swift
❌ viewModel.proposals  // Doesn't exist
✅ viewModel.newProposals && viewModel.laterProposals

❌ $viewModel.showError  // ViewModel only has 'error'
✅ @State private var showError = false
   .onChange(of: viewModel.error) { _, newError in
       showError = newError != nil
   }
```

---

### 2. **TribeListView** ✅ (Commit `NEXT`)

**Error Handling:**
```swift
❌ $viewModel.showError  // Doesn't exist in Architecture ViewModel
✅ @State private var showError = false
   .onChange(of: viewModel.error) { _, newError in
       showError = newError != nil
   }
```

**Error Messages:**
```swift
❌ Text(error.localizedDescription)  // May expose internal details
✅ Text(ErrorSanitizer.userFacingMessage(for: error))  // Sanitized
```

---

## 📋 Architecture ViewModel Properties

### TribeInboxViewModel
```swift
@Published var newProposals: [TribeProposal] = []
@Published var laterProposals: [TribeProposal] = []
@Published var isLoading = false
@Published var error: Error?  // ← No 'showError' boolean!
@Published var processingProposalIds: Set<String> = []
```

### TribeListViewModel
```swift
@Published var tribes: [Tribe] = []
@Published var invitations: [TribeInvitation] = []
@Published var isLoading = false
@Published var error: Error?  // ← No 'showError' boolean!
@Published var showingCreateTribe = false
```

---

## 📋 Method Signatures

### TribeInboxViewModel Methods

```swift
func loadProposals(tribeId: String) async

func acceptProposal(_ proposal: TribeProposal, tribeId: String) async throws

func notNowProposal(_ proposal: TribeProposal, tribeId: String) async throws

func dismissProposal(_ proposal: TribeProposal, tribeId: String) async throws
```

**Key Point:** Methods take the full `TribeProposal` object, not just the ID!

---

## ✅ Pattern for Error Handling in Views

**Standard pattern for all Views using Architecture ViewModels:**

```swift
struct MyView: View {
    @StateObject private var viewModel: MyViewModel
    @State private var showError = false  // ← Local state
    
    var body: some View {
        // ... content ...
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = viewModel.error {
                Text(ErrorSanitizer.userFacingMessage(for: error))
            }
        }
        .onChange(of: viewModel.error) { _, newError in
            showError = newError != nil
        }
    }
}
```

---

## 🎯 Still To Fix

Check these views for similar issues:
- [ ] TribeDetailView
- [ ] TribeSharedView  
- [ ] TribeMessagesView
- [ ] TribeSettingsView (nested ViewModels - may be okay)

---

## 📊 Root Cause

After the Architecture refactor, ViewModels follow consistent patterns:
- ✅ Always `@Published var error: Error?`
- ❌ Never `@Published var showError: Bool`
- ✅ Methods take full objects, not just IDs
- ✅ All use ErrorSanitizer for user-facing messages

Old Views were calling methods with old signatures.

---

**Status:** ✅ TribeInboxView & TribeListView fixed  
**Next:** Check remaining Tribe views for similar issues
