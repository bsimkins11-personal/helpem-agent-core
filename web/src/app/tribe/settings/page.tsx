"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tribe = {
  id: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
  pendingProposalsCount?: number;
  memberCount?: number;
  joinedAt: string;
};

/**
 * Tribe Settings Page
 * Create, rename, delete Tribes
 * Manage members and permissions
 */
export default function TribeSettingsPage() {
  const router = useRouter();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTribeName, setNewTribeName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTribes();
  }, []);

  const loadTribes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tribes");
      if (!res.ok) throw new Error("Failed to load tribes");
      
      const data = await res.json();
      setTribes(data.tribes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tribes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTribe = async () => {
    const name = newTribeName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error("Failed to create tribe");

      const data = await res.json();
      setTribes(prev => [data.tribe, ...prev]);
      setShowCreateForm(false);
      setNewTribeName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tribe");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue mx-auto mb-4"></div>
          <p className="text-brandTextLight">Loading Tribes...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold text-brandText">Tribe Settings</h1>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brandBlue text-white rounded-lg font-medium hover:opacity-90 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Tribe
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-brandText mb-4">Create New Tribe</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newTribeName}
                onChange={(e) => setNewTribeName(e.target.value)}
                placeholder="Tribe name (e.g., Family, Work Team)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-brandText focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTribe}
                  disabled={!newTribeName.trim() || creating}
                  className="flex-1 px-6 py-3 bg-brandBlue text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTribeName("");
                  }}
                  className="px-6 py-3 bg-gray-100 text-brandText rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tribes list */}
        {tribes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-brandText mb-2">No Tribes Yet</h2>
            <p className="text-brandTextLight mb-6">
              Create a Tribe to share tasks, routines, appointments, and groceries with people you trust.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-brandBlue text-white rounded-xl font-medium hover:opacity-90 transition-all"
            >
              Create Your First Tribe
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tribes.map(tribe => (
              <div
                key={tribe.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-brandText mb-1">{tribe.name}</h3>
                    {tribe.isOwner && (
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                        Owner
                      </span>
                    )}
                  </div>
                  
                  {tribe.pendingProposals > 0 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                      {tribe.pendingProposals} pending
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/tribe/inbox?tribe=${tribe.id}`)}
                    className="flex-1 px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-all"
                  >
                    View Inbox
                  </button>
                  
                  <button
                    onClick={() => router.push(`/tribe/${tribe.id}/members`)}
                    className="px-4 py-2 bg-gray-50 text-brandText rounded-lg font-medium hover:bg-gray-100 transition-all"
                  >
                    Members
                  </button>
                  
                  {tribe.isOwner && (
                    <button
                      onClick={() => router.push(`/tribe/${tribe.id}/edit`)}
                      className="px-4 py-2 bg-gray-50 text-brandText rounded-lg font-medium hover:bg-gray-100 transition-all"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
