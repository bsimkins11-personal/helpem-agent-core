import Foundation
import SwiftUI
import Combine

/// ViewModel for TribeInboxView
/// Handles proposal display and actions (accept, not now, dismiss)
@MainActor
class TribeInboxViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var newProposals: [TribeProposal] = []
    @Published var laterProposals: [TribeProposal] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var processingProposalIds: Set<String> = []
    
    // MARK: - Dependencies
    
    private let getProposalsUseCase: GetProposalsUseCase
    private let acceptProposalUseCase: AcceptProposalUseCase
    private let notNowProposalUseCase: NotNowProposalUseCase
    private let dismissProposalUseCase: DismissProposalUseCase
    
    // MARK: - Initialization
    
    init(
        getProposalsUseCase: GetProposalsUseCase,
        acceptProposalUseCase: AcceptProposalUseCase,
        notNowProposalUseCase: NotNowProposalUseCase,
        dismissProposalUseCase: DismissProposalUseCase
    ) {
        self.getProposalsUseCase = getProposalsUseCase
        self.acceptProposalUseCase = acceptProposalUseCase
        self.notNowProposalUseCase = notNowProposalUseCase
        self.dismissProposalUseCase = dismissProposalUseCase
    }
    
    // MARK: - Public Methods
    
    /// Load proposals for a tribe
    func loadProposals(tribeId: String) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let result = try await getProposalsUseCase.execute(tribeId: tribeId)
            newProposals = result.new
            laterProposals = result.later
        } catch {
            self.error = error
            AppLogger.error("Failed to load proposals: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
    
    /// Accept a proposal
    func acceptProposal(_ proposal: TribeProposal, tribeId: String) async throws {
        // Mark as processing
        processingProposalIds.insert(proposal.id)
        defer { processingProposalIds.remove(proposal.id) }
        
        do {
            // Execute use case
            let acceptedProposal = try await acceptProposalUseCase.execute(
                tribeId: tribeId,
                proposalId: proposal.id
            )
            
            // Update local state (optimistic update)
            removeProposal(proposal.id)
            
            // Provide haptic feedback
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
            
            AppLogger.info("Proposal accepted: \(proposal.id)", logger: AppLogger.general)
            
        } catch UseCaseError.itemSuppressed {
            // Item was previously deleted
            removeProposal(proposal.id) // Remove from UI
            throw UseCaseError.itemSuppressed
        } catch {
            // Keep proposal visible on error
            throw error
        }
    }
    
    /// Mark proposal as "not now"
    func notNowProposal(_ proposal: TribeProposal, tribeId: String) async throws {
        // Mark as processing
        processingProposalIds.insert(proposal.id)
        defer { processingProposalIds.remove(proposal.id) }
        
        do {
            let updatedProposal = try await notNowProposalUseCase.execute(
                tribeId: tribeId,
                proposalId: proposal.id
            )
            
            // Move from new to later
            newProposals.removeAll { $0.id == proposal.id }
            laterProposals.append(updatedProposal)
            
            // Provide haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            
            AppLogger.info("Proposal marked as not now: \(proposal.id)", logger: AppLogger.general)
            
        } catch {
            throw error
        }
    }
    
    /// Dismiss proposal permanently
    func dismissProposal(_ proposal: TribeProposal, tribeId: String) async throws {
        // Mark as processing
        processingProposalIds.insert(proposal.id)
        defer { processingProposalIds.remove(proposal.id) }
        
        do {
            try await dismissProposalUseCase.execute(
                tribeId: tribeId,
                proposalId: proposal.id
            )
            
            // Remove from local state
            removeProposal(proposal.id)
            
            // Provide haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            
            AppLogger.info("Proposal dismissed: \(proposal.id)", logger: AppLogger.general)
            
        } catch {
            throw error
        }
    }
    
    // MARK: - Helper Methods
    
    private func removeProposal(_ id: String) {
        newProposals.removeAll { $0.id == id }
        laterProposals.removeAll { $0.id == id }
    }
    
    func isProcessing(_ proposalId: String) -> Bool {
        processingProposalIds.contains(proposalId)
    }
}

// MARK: - Computed Properties

extension TribeInboxViewModel {
    var totalProposals: Int {
        newProposals.count + laterProposals.count
    }
    
    var hasNewProposals: Bool {
        !newProposals.isEmpty
    }
    
    var hasLaterProposals: Bool {
        !laterProposals.isEmpty
    }
    
    var isEmpty: Bool {
        newProposals.isEmpty && laterProposals.isEmpty
    }
}
