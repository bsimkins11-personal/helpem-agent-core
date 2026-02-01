import Foundation

/// Dependency Injection Container
/// Manages singleton instances and provides factory methods for dependencies
@MainActor
class AppContainer {
    // MARK: - Singleton
    
    static let shared = AppContainer()
    
    private init() {}
    
    // MARK: - Core Services (Singletons)
    
    lazy var apiClient: TribeAPIClient = {
        TribeAPIClient.shared
    }()
    
    lazy var cacheService: CacheService = {
        CacheService.shared
    }()
    
    lazy var suppressionManager: SuppressionManager = {
        SuppressionManager.shared
    }()
    
    lazy var pendingOperationManager: PendingOperationManager = {
        PendingOperationManager.shared
    }()
    
    // MARK: - Repositories
    
    private var _tribeRepository: TribeRepository?
    
    var tribeRepository: TribeRepository {
        if let repository = _tribeRepository {
            return repository
        }
        
        let repository = TribeAPIRepository(
            apiClient: apiClient,
            cacheService: cacheService
        )
        _tribeRepository = repository
        return repository
    }
    
    // MARK: - Use Cases
    
    func makeGetTribesUseCase() -> GetTribesUseCase {
        GetTribesUseCase(repository: tribeRepository)
    }
    
    func makeGetProposalsUseCase() -> GetProposalsUseCase {
        GetProposalsUseCase(
            repository: tribeRepository,
            suppressionManager: suppressionManager
        )
    }
    
    func makeAcceptProposalUseCase() -> AcceptProposalUseCase {
        AcceptProposalUseCase(
            repository: tribeRepository,
            suppressionManager: suppressionManager,
            pendingOperationManager: pendingOperationManager
        )
    }
    
    func makeNotNowProposalUseCase() -> NotNowProposalUseCase {
        NotNowProposalUseCase(
            repository: tribeRepository,
            pendingOperationManager: pendingOperationManager
        )
    }
    
    func makeDismissProposalUseCase() -> DismissProposalUseCase {
        DismissProposalUseCase(
            repository: tribeRepository,
            pendingOperationManager: pendingOperationManager
        )
    }

    func makeMaybeProposalUseCase() -> MaybeProposalUseCase {
        MaybeProposalUseCase(
            repository: tribeRepository,
            pendingOperationManager: pendingOperationManager
        )
    }
    
    func makeCreateTribeItemUseCase() -> CreateTribeItemUseCase {
        CreateTribeItemUseCase(
            repository: tribeRepository,
            pendingOperationManager: pendingOperationManager
        )
    }
    
    // MARK: - ViewModels
    
    func makeTribeListViewModel() -> TribeListViewModel {
        TribeListViewModel(getTribesUseCase: makeGetTribesUseCase())
    }
    
    func makeTribeDetailViewModel() -> TribeDetailViewModel {
        TribeDetailViewModel(
            repository: tribeRepository
        )
    }
    
    func makeTribeInboxViewModel() -> TribeInboxViewModel {
        TribeInboxViewModel(
            getProposalsUseCase: makeGetProposalsUseCase(),
            acceptProposalUseCase: makeAcceptProposalUseCase(),
            notNowProposalUseCase: makeNotNowProposalUseCase(),
            maybeProposalUseCase: makeMaybeProposalUseCase(),
            dismissProposalUseCase: makeDismissProposalUseCase()
        )
    }
    
    func makeTribeSharedViewModel() -> TribeSharedViewModel {
        TribeSharedViewModel(repository: tribeRepository)
    }
    
    func makeTribeMessagesViewModel() -> TribeMessagesViewModel {
        TribeMessagesViewModel(repository: tribeRepository)
    }
    
    func makeTribeMembersViewModel() -> TribeMembersViewModel {
        TribeMembersViewModel(repository: tribeRepository)
    }
    
    // MARK: - Lifecycle
    
    /// Retry pending operations on app startup
    func retryPendingOperations() async {
        let acceptUseCase = makeAcceptProposalUseCase()
        await acceptUseCase.retryPendingOperations()
        
        AppLogger.info("Pending operations retry completed", logger: AppLogger.general)
    }
    
    /// Clear all caches (for debugging)
    func clearCaches() async {
        await cacheService.clearAll()
        AppLogger.info("All caches cleared", logger: AppLogger.general)
    }
    
    /// Reset the container (for testing)
    func reset() {
        _tribeRepository = nil
        Task { await cacheService.clearAll() }
    }
    
    /// Get diagnostics information
    func getDiagnostics() async -> AppDiagnostics {
        let cacheStats = await cacheService.getStats()
        let pendingOps = pendingOperationManager.pendingOperations.count
        let suppressedItems = suppressionManager.suppressedOrigins.count
        
        return AppDiagnostics(
            cacheStats: cacheStats,
            pendingOperations: pendingOps,
            suppressedOrigins: suppressedItems
        )
    }
}

// MARK: - Diagnostics

struct AppDiagnostics {
    let cacheStats: CacheStats
    let pendingOperations: Int
    let suppressedOrigins: Int
    
    var description: String {
        """
        App Diagnostics:
        - Cache: \(cacheStats.validEntries)/\(cacheStats.totalEntries) valid (\(String(format: "%.1f%%", cacheStats.hitRate * 100)))
        - Pending Operations: \(pendingOperations)
        - Suppressed Origins: \(suppressedOrigins)
        """
    }
}
