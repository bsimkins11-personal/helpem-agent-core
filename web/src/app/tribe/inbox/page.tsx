"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type TribeProposal = {
  id: string;
  itemId: string;
  state: string;
  createdAt: string;
  item: {
    id: string;
    itemType: string;
    data: any;
    createdAt: string;
  };
};

type Tribe = {
  id: string;
  name: string;
  pendingProposals: number;
};

/**
 * Tribe Inbox - Shows notifications and proposals
 * 
 * NON-NEGOTIABLE RULES:
 * - Proposals do NOT appear in Today
 * - Proposals do NOT trigger reminders
 * - No social pressure signals
 */
export default function TribeInboxPage() {
  const router = useRouter();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<TribeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tribes on mount
  useEffect(() => {
    loadTribes();
  }, []);

  // Load proposals when tribe is selected
  useEffect(() => {
    if (selectedTribeId) {
      loadProposals(selectedTribeId);
    }
  }, [selectedTribeId]);

  const loadTribes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tribes");
      if (!res.ok) throw new Error("Failed to load tribes");
      
      const data = await res.json();
      setTribes(data.tribes || []);
      
      // Auto-select first tribe with pending proposals
      const tribeWithProposals = data.tribes?.find((t: Tribe) => t.pendingProposals > 0);
      if (tribeWithProposals) {
        setSelectedTribeId(tribeWithProposals.id);
      } else if (data.tribes?.length > 0) {
        setSelectedTribeId(data.tribes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tribes");
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async (tribeId: string) => {
    try {
      const res = await fetch(`/api/tribes/${tribeId}/inbox`);
      if (!res.ok) throw new Error("Failed to load proposals");
      
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposals");
    }
  };

  const handleAccept = async (proposalId: string) => {
    if (!selectedTribeId) return;
    
    try {
      const res = await fetch(`/api/tribes/${selectedTribeId}/proposals/${proposalId}/accept`, {
        method: "POST",
      });
      
      if (!res.ok) throw new Error("Failed to accept proposal");
      
      // Remove from list
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      
      // Update tribe pending count
      setTribes(prev => prev.map(t => 
        t.id === selectedTribeId 
          ? { ...t, pendingProposals: Math.max(0, t.pendingProposals - 1) }
          : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept proposal");
    }
  };

  const handleNotNow = async (proposalId: string) => {
    if (!selectedTribeId) return;
    
    try {
      const res = await fetch(`/api/tribes/${selectedTribeId}/proposals/${proposalId}/not-now`, {
        method: "POST",
      });
      
      if (!res.ok) throw new Error("Failed to update proposal");
      
      // Update proposal state in list
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { ...p, state: "not_now" } : p
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update proposal");
    }
  };

  const handleDismiss = async (proposalId: string) => {
    if (!selectedTribeId) return;
    
    try {
      const res = await fetch(`/api/tribes/${selectedTribeId}/proposals/${proposalId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to dismiss proposal");
      
      // Remove from list
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      
      // Update tribe pending count
      setTribes(prev => prev.map(t => 
        t.id === selectedTribeId 
          ? { ...t, pendingProposals: Math.max(0, t.pendingProposals - 1) }
          : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss proposal");
    }
  };

  const getItemTitle = (proposal: TribeProposal): string => {
    return proposal.item?.data?.title || proposal.item?.data?.name || "Untitled";
  };

  const getItemType = (proposal: TribeProposal): string => {
    return proposal.item?.itemType || "item";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue mx-auto mb-4"></div>
          <p className="text-brandTextLight">Loading Tribe Inbox...</p>
        </div>
      </div>
    );
  }

  if (tribes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-semibold text-brandText mb-2">No Tribes Yet</h2>
          <p className="text-brandTextLight mb-6">
            Create a Tribe to share tasks, routines, appointments, and groceries with people you trust.
          </p>
          <button
            onClick={() => router.push("/tribe/settings")}
            className="px-6 py-3 bg-brandBlue text-white rounded-xl font-medium hover:opacity-90 transition-all"
          >
            Create a Tribe
          </button>
        </div>
      </div>
    );
  }

  const selectedTribe = tribes.find(t => t.id === selectedTribeId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-brandTextLight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-brandText">My Tribe</h1>
            </div>
            
            <button
              onClick={() => router.push("/tribe/settings")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Tribe Settings"
            >
              <svg className="w-5 h-5 text-brandTextLight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tribe selector */}
        {tribes.length > 1 && (
          <div className="mb-6">
            <select
              value={selectedTribeId || ""}
              onChange={(e) => setSelectedTribeId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-brandText focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
            >
              {tribes.map(tribe => (
                <option key={tribe.id} value={tribe.id}>
                  {tribe.name} {tribe.pendingProposals > 0 ? `(${tribe.pendingProposals} pending)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Proposals list */}
        {proposals.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-brandText mb-2">All Caught Up</h2>
            <p className="text-brandTextLight">
              You have no pending proposals. When someone shares something with you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onAccept={() => handleAccept(proposal.id)}
                onNotNow={() => handleNotNow(proposal.id)}
                onDismiss={() => handleDismiss(proposal.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// MARK: - Proposal Card Component

function ProposalCard({
  proposal,
  onAccept,
  onNotNow,
  onDismiss,
}: {
  proposal: TribeProposal;
  onAccept: () => void;
  onNotNow: () => void;
  onDismiss: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const itemTitle = proposal.item?.data?.title || proposal.item?.data?.name || "Untitled";
  const itemType = proposal.item?.itemType || "item";

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept();
    setIsProcessing(false);
  };

  const handleNotNow = async () => {
    setIsProcessing(true);
    await onNotNow();
    setIsProcessing(false);
  };

  const handleDismiss = async () => {
    setIsProcessing(true);
    await onDismiss();
    setIsProcessing(false);
    setShowMenu(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Left accent bar (neutral gray for proposals) */}
      <div className="flex">
        <div className="w-1 bg-gray-400"></div>
        
        <div className="flex-1 p-4">
          {/* Item info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-brandText mb-1">{itemTitle}</h3>
              <p className="text-sm text-brandTextLight">{itemType.charAt(0).toUpperCase() + itemType.slice(1)}</p>
            </div>
            
            {/* Context indicator */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-600">Proposal</span>
            </div>
          </div>

          {/* Item details */}
          {proposal.item && (
            <div className="mb-4 text-sm text-brandTextLight space-y-1">
              {itemType === "appointment" && (
                <>
                  {proposal.item.data.datetime && (
                    <p>📅 {new Date(proposal.item.data.datetime).toLocaleString()}</p>
                  )}
                  {proposal.item.data.withWhom && (
                    <p>👤 {proposal.item.data.withWhom}</p>
                  )}
                </>
              )}
              {itemType === "task" && proposal.item.data.priority && (
                <p>🚩 Priority: {proposal.item.data.priority}</p>
              )}
              {itemType === "routine" && proposal.item.data.frequency && (
                <p>🔄 {proposal.item.data.frequency}</p>
              )}
            </div>
          )}

          {/* State badge for "not now" items */}
          {proposal.state === "not_now" && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium mb-3">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Not Now
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Accept button (primary action) */}
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept
            </button>

            {/* Not Now button */}
            <button
              onClick={handleNotNow}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 text-brandText rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              Not Now
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={isProcessing}
                className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-brandText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={handleDismiss}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brandBlue"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
