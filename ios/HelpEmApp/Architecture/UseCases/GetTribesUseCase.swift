import Foundation

/// Use case for fetching user's tribes
/// Returns tribes sorted by most recent activity
class GetTribesUseCase {
    private let repository: TribeRepository
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    /// Execute the use case
    /// Returns tribes sorted by join date (most recent first)
    func execute() async throws -> [Tribe] {
        let tribes = try await repository.getTribes()
        
        // Sort by joined date (most recent first)
        return tribes.sorted { $0.joinedAt > $1.joinedAt }
    }
    
    /// Get tribes with pending proposals
    func executePendingOnly() async throws -> [Tribe] {
        let tribes = try await repository.getTribes()
        return tribes.filter { $0.pendingProposals > 0 }
            .sorted { $0.pendingProposals > $1.pendingProposals }
    }
}
