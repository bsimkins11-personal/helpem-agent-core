# Test Examples for Clean Architecture

## Overview

This directory contains reference test examples for the refactored Tribe architecture. These are **not actual test files** that will run automatically - they are examples to guide you when writing your own tests.

## How to Use These Examples

### Step 1: Create a Test Target in Xcode

1. Open your project in Xcode
2. Go to **File → New → Target**
3. Choose **Unit Testing Bundle**
4. Name it `HelpEmAppTests` (or similar)
5. Click **Finish**

### Step 2: Add Test Files to Test Target

1. Right-click on the test target folder in Xcode
2. Select **New File → Swift File**
3. Name it (e.g., `TribeRepositoryTests.swift`)
4. **Important:** Check the test target box when creating the file
5. Copy the test code from `TestExamples.swift.reference`

### Step 3: Import Required Modules

In your test files:

```swift
import XCTest
@testable import HelpEmApp  // Allows access to internal classes

class TribeRepositoryTests: XCTestCase {
    // Your tests here
}
```

## Test File Structure

```
YourProject/
├── HelpEmApp/                  # Main app target
│   ├── Architecture/
│   │   ├── Repositories/
│   │   ├── UseCases/
│   │   └── ViewModels/
│   └── ...
└── HelpEmAppTests/             # Test target (create this)
    ├── RepositoryTests/
    │   └── TribeRepositoryTests.swift
    ├── UseCaseTests/
    │   ├── AcceptProposalUseCaseTests.swift
    │   └── GetProposalsUseCaseTests.swift
    ├── ViewModelTests/
    │   ├── TribeInboxViewModelTests.swift
    │   └── TribeListViewModelTests.swift
    └── Mocks/
        ├── MockTribeRepository.swift
        └── MockUseCases.swift
```

## Example Tests

See `TestExamples.swift.reference` for complete examples of:

### Repository Tests
- Testing with cache
- Testing without cache
- Testing cache invalidation
- Testing error handling

### Use Case Tests
- Testing success scenarios
- Testing error scenarios
- Testing invariant enforcement
- Testing idempotency

### ViewModel Tests
- Testing data loading
- Testing user actions
- Testing state management
- Testing error handling

## Running Tests

Once you've created your test target and added test files:

1. **Run all tests:** `Cmd + U` in Xcode
2. **Run single test:** Click the diamond next to test method
3. **Run test class:** Click the diamond next to class name
4. **Command line:** `xcodebuild test -scheme HelpEmApp -destination 'platform=iOS Simulator,name=iPhone 15'`

## Test Coverage

To see test coverage in Xcode:

1. **Edit Scheme** (Cmd + <)
2. Select **Test** on the left
3. Check **Gather coverage for** and select your app target
4. Run tests
5. View coverage: **Show Report Navigator** (Cmd + 9) → Coverage tab

## Best Practices

### 1. Follow AAA Pattern
```swift
func testExample() async throws {
    // Arrange - Set up test data
    let mockRepo = MockTribeRepository()
    let useCase = GetTribesUseCase(repository: mockRepo)
    
    // Act - Perform the action
    let result = try await useCase.execute()
    
    // Assert - Verify the outcome
    XCTAssertEqual(result.count, 1)
}
```

### 2. Use Descriptive Names
```swift
func testGetTribes_withValidData_returnsTribes()
func testAcceptProposal_whenSuppressed_throwsError()
func testLoadProposals_withNetworkError_setsErrorState()
```

### 3. Test One Thing
Each test should verify one specific behavior.

### 4. Use Mocks, Not Real Services
Always use mock objects for dependencies to isolate the code being tested.

### 5. Test Both Success and Failure
Test happy paths and error scenarios.

## Quick Reference

### Creating a Mock Repository
```swift
@MainActor
class MockTribeRepository: TribeRepository {
    var tribesResult: [Tribe] = []
    var shouldThrowError = false
    
    func getTribes() async throws -> [Tribe] {
        if shouldThrowError {
            throw TestError.mockError
        }
        return tribesResult
    }
    
    // Implement other protocol methods...
}
```

### Testing Async Code
```swift
func testAsyncMethod() async throws {
    let result = try await someAsyncMethod()
    XCTAssertNotNil(result)
}
```

### Testing @MainActor Code
```swift
@MainActor
func testMainActorViewModel() async throws {
    let viewModel = TribeListViewModel(...)
    await viewModel.loadTribes()
    XCTAssertFalse(viewModel.isLoading)
}
```

### Testing Errors
```swift
func testThrowsError() async throws {
    do {
        _ = try await useCase.execute()
        XCTFail("Should have thrown error")
    } catch UseCaseError.itemSuppressed {
        // Expected error
    } catch {
        XCTFail("Wrong error type: \(error)")
    }
}
```

## Additional Resources

- [Apple's XCTest Documentation](https://developer.apple.com/documentation/xctest)
- [Testing Swift Code](https://www.swift.org/documentation/articles/testing.html)
- [iOS Unit Testing Best Practices](https://www.raywenderlich.com/21020457-ios-unit-testing-and-ui-testing-tutorial)

## Support

For questions about testing the architecture:
1. Review the reference examples in `TestExamples.swift.reference`
2. Check the Architecture README for patterns
3. Consult the team lead for guidance

---

**Note:** The file `TestExamples.swift.reference` is a reference document, not a compiled test file. Copy its contents into proper test target files to use them.
