import Foundation

/// Use case for fetching tribe proposals
/// Filters out suppressed items and organizes by state
class GetProposalsUseCase {
    private let repository: TribeRepository
    private let suppressionManager: SuppressionManager
    
    init(
        repository: TribeRepository,
        suppressionManager: SuppressionManager = .shared
    ) {
        self.repository = repository
        self.suppressionManager = suppressionManager
    }
    
    /// Execute the use case
    /// Returns proposals organized by state
    @MainActor
    func execute(tribeId: String) async throws -> ProposalsByState {
        // Step 1: Fetch proposals from repository
        let proposals = try await repository.getProposals(tribeId: tribeId)
        
        // Step 2: Filter out suppressed items (INVARIANT: Silent Deletion)
        let filteredProposals = proposals.filter { proposal in
            guard let item = proposal.item else { return true }
            return !suppressionManager.isSuppressed(originTribeItemId: item.id)
        }
        
        // Step 3: Organize by state
        let newProposals = filteredProposals.filter { $0.state == .proposed }
        let laterProposals = filteredProposals.filter { $0.state == .notNow }
        let acceptedProposals = filteredProposals.filter { $0.state == .accepted }
        
        return ProposalsByState(
            new: newProposals,
            later: laterProposals,
            accepted: acceptedProposals
        )
    }
}

// MARK: - Result Types

struct ProposalsByState {
    let new: [TribeProposal]
    let later: [TribeProposal]
    let accepted: [TribeProposal]
    
    var total: Int {
        new.count + later.count + accepted.count
    }
    
    var pendingCount: Int {
        new.count
    }
}

