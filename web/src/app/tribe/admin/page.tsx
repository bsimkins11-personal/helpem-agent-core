"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientSessionToken } from "@/lib/clientSession";

type TribeMember = {
  id: string;
  userId: string;
  invitedAt: string;
  acceptedAt: string | null;
  leftAt: string | null;
  permissions?: {
    canAddTasks: boolean;
    canRemoveTasks: boolean;
    canAddRoutines: boolean;
    canRemoveRoutines: boolean;
    canAddAppointments: boolean;
    canRemoveAppointments: boolean;
    canAddGroceries: boolean;
    canRemoveGroceries: boolean;
  };
};

type TribeMessage = {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
};

type Tribe = {
  id: string;
  name: string;
  ownerId: string;
  tribeType: "friend" | "family";
  isOwner: boolean;
  pendingProposalsCount?: number;
  memberCount?: number;
  joinedAt: string;
};

type MemberRequest = {
  id: string;
  tribeId: string;
  requestedBy: string;
  requestedUserId: string;
  state: "pending" | "approved" | "denied";
  createdAt: string;
};

type ActiveTab = "overview" | "members" | "requests" | "messages" | "settings";

/**
 * Tribe Admin Page
 * Comprehensive management interface for tribes
 */
export default function TribeAdminPage() {
  const router = useRouter();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create tribe state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTribeName, setNewTribeName] = useState("");
  const [newTribeType, setNewTribeType] = useState<"friend" | "family" | "">("");
  const [creating, setCreating] = useState(false);
  
  // Members state
  const [members, setMembers] = useState<TribeMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Member requests state
  const [memberRequests, setMemberRequests] = useState<MemberRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    loadTribes();
  }, []);

  useEffect(() => {
    if (selectedTribeId) {
      if (activeTab === "members") {
        loadMembers(selectedTribeId);
      } else if (activeTab === "messages") {
        loadMessages(selectedTribeId);
      } else if (activeTab === "requests") {
        loadMemberRequests(selectedTribeId);
      }
    }
  }, [selectedTribeId, activeTab]);

  const loadTribes = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getClientSessionToken();
      const res = await fetch("/api/tribes", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load tribes");
      
      const data = await res.json();
      setTribes(data.tribes || []);
      
      // Auto-select first tribe if none selected
      if (data.tribes?.length > 0 && !selectedTribeId) {
        setSelectedTribeId(data.tribes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tribes");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (tribeId: string) => {
    setLoadingMembers(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/members`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load members");
      
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadMessages = async (tribeId: string) => {
    setLoadingMessages(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load messages");
      
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMemberRequests = async (tribeId: string) => {
    setLoadingRequests(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/member-requests`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load member requests");
      
      const data = await res.json();
      setMemberRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleCreateTribe = async () => {
    const name = newTribeName.trim();
    if (!name) {
      setError("Tribe name is required");
      return;
    }

    if (!newTribeType) {
      setError("Please select a tribe type (Friend or Family)");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const token = getClientSessionToken();
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, tribeType: newTribeType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tribe");
      }

      await loadTribes();
      setShowCreateForm(false);
      setNewTribeName("");
      setNewTribeType("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tribe");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTribe = async (tribeId: string, tribeName: string) => {
    if (!confirm(`Are you sure you want to delete "${tribeName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Failed to delete tribe");

      await loadTribes();
      setSelectedTribeId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tribe");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedTribeId) return;
    
    if (!confirm("Delete this message? This action cannot be undone.")) {
      return;
    }

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${selectedTribeId}/messages/${messageId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Failed to delete message");

      await loadMessages(selectedTribeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete message");
    }
  };

  const handleRenameTribe = async (tribeId: string) => {
    const newName = prompt("Enter new tribe name:");
    if (!newName || !newName.trim()) return;

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to rename tribe");

      await loadTribes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename tribe");
    }
  };

  const selectedTribe = tribes.find(t => t.id === selectedTribeId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue mx-auto mb-4"></div>
          <p className="text-brandTextLight">Loading tribes...</p>
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
              <h1 className="text-xl font-semibold text-brandText">Tribe Admin</h1>
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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
              
              {/* Tribe Type Selector */}
              <div>
                <label className="block text-sm font-medium text-brandText mb-2">
                  Tribe Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewTribeType("friend")}
                    className={`px-4 py-3 rounded-xl border-2 transition-all ${
                      newTribeType === "friend"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-brandText hover:border-blue-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">👥</div>
                    <div className="font-semibold text-sm">Friend</div>
                    <div className="text-xs mt-1 opacity-75">
                      Appointments, todos, chat
                    </div>
                  </button>
                  <button
                    onClick={() => setNewTribeType("family")}
                    className={`px-4 py-3 rounded-xl border-2 transition-all ${
                      newTribeType === "family"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-brandText hover:border-green-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">👨‍👩‍👧‍👦</div>
                    <div className="font-semibold text-sm">Family</div>
                    <div className="text-xs mt-1 opacity-75">
                      + Routines & groceries
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateTribe}
                  disabled={!newTribeName.trim() || !newTribeType || creating}
                  className="flex-1 px-6 py-3 bg-brandBlue text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTribeName("");
                    setNewTribeType("");
                  }}
                  className="px-6 py-3 bg-gray-100 text-brandText rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {tribes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-brandText mb-2">No Tribes Yet</h2>
            <p className="text-brandTextLight mb-6">
              Create a Tribe to start collaborating with your trusted circle.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-brandBlue text-white rounded-xl font-medium hover:opacity-90 transition-all"
            >
              Create Your First Tribe
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Tribes List Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-brandTextLight mb-3">MY TRIBES</h2>
                <div className="space-y-2">
                  {tribes.map(tribe => (
                    <button
                      key={tribe.id}
                      onClick={() => {
                        setSelectedTribeId(tribe.id);
                        setActiveTab("overview");
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        selectedTribeId === tribe.id
                          ? "bg-brandBlue text-white shadow-md"
                          : "hover:bg-gray-50 text-brandText"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate flex-1">{tribe.name}</span>
                        <span className="text-base">
                          {tribe.tribeType === "family" ? "👨‍👩‍👧‍👦" : "👥"}
                        </span>
                        {tribe.isOwner && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            selectedTribeId === tribe.id 
                              ? "bg-white/20 text-white" 
                              : "bg-blue-50 text-blue-600"
                          }`}>
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        {tribe.tribeType === "family" ? "Family" : "Friend"} • {tribe.memberCount || 0} members
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-2">
              {selectedTribe ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  {/* Tribe Header */}
                  <div className="border-b border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-brandText">{selectedTribe.name}</h2>
                        <p className="text-sm text-brandTextLight mt-1">
                          {selectedTribe.memberCount || 0} members • Joined {new Date(selectedTribe.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedTribe.isOwner && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRenameTribe(selectedTribe.id)}
                            className="px-3 py-2 text-sm bg-gray-100 text-brandText rounded-lg hover:bg-gray-200 transition-colors"
                            title="Rename tribe"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTribe(selectedTribe.id, selectedTribe.name)}
                            className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete tribe"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 px-6">
                    <div className="flex gap-6">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-3 pt-4 border-b-2 transition-colors ${
                          activeTab === "overview"
                            ? "border-brandBlue text-brandBlue font-medium"
                            : "border-transparent text-brandTextLight hover:text-brandText"
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("members")}
                        className={`pb-3 pt-4 border-b-2 transition-colors ${
                          activeTab === "members"
                            ? "border-brandBlue text-brandBlue font-medium"
                            : "border-transparent text-brandTextLight hover:text-brandText"
                        }`}
                      >
                        Members
                      </button>
                      {selectedTribe.isOwner && (
                        <button
                          onClick={() => setActiveTab("requests")}
                          className={`pb-3 pt-4 border-b-2 transition-colors ${
                            activeTab === "requests"
                              ? "border-brandBlue text-brandBlue font-medium"
                              : "border-transparent text-brandTextLight hover:text-brandText"
                          }`}
                        >
                          Requests
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab("messages")}
                        className={`pb-3 pt-4 border-b-2 transition-colors ${
                          activeTab === "messages"
                            ? "border-brandBlue text-brandBlue font-medium"
                            : "border-transparent text-brandTextLight hover:text-brandText"
                        }`}
                      >
                        Messages
                      </button>
                      {selectedTribe.isOwner && (
                        <button
                          onClick={() => setActiveTab("settings")}
                          className={`pb-3 pt-4 border-b-2 transition-colors ${
                            activeTab === "settings"
                              ? "border-brandBlue text-brandBlue font-medium"
                              : "border-transparent text-brandTextLight hover:text-brandText"
                          }`}
                        >
                          Settings
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {activeTab === "overview" && (
                      <OverviewTab tribe={selectedTribe} />
                    )}
                    {activeTab === "members" && (
                      <MembersTab
                        tribeId={selectedTribe.id}
                        isOwner={selectedTribe.isOwner}
                        members={members}
                        loading={loadingMembers}
                        onReload={() => loadMembers(selectedTribe.id)}
                      />
                    )}
                    {activeTab === "requests" && selectedTribe.isOwner && (
                      <MemberRequestsTab
                        tribeId={selectedTribe.id}
                        requests={memberRequests}
                        loading={loadingRequests}
                        onReload={() => loadMemberRequests(selectedTribe.id)}
                      />
                    )}
                    {activeTab === "messages" && (
                      <MessagesTab
                        tribeId={selectedTribe.id}
                        isOwner={selectedTribe.isOwner}
                        messages={messages}
                        loading={loadingMessages}
                        onDeleteMessage={handleDeleteMessage}
                      />
                    )}
                    {activeTab === "settings" && selectedTribe.isOwner && (
                      <SettingsTab tribe={selectedTribe} onUpdate={loadTribes} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                  <div className="text-4xl mb-4">👈</div>
                  <p className="text-brandTextLight">Select a tribe to manage</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ tribe }: { tribe: Tribe }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Members</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{tribe.memberCount || 0}</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Pending Proposals</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{tribe.pendingProposalsCount || 0}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-brandText">Quick Actions</h3>
        <div className="grid gap-3">
          <a
            href={`/tribe/inbox?tribe=${tribe.id}`}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-brandText">View Inbox</div>
              <div className="text-sm text-brandTextLight">See pending proposals</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// Members Tab Component
function MembersTab({
  tribeId,
  isOwner,
  members,
  loading,
  onReload,
}: {
  tribeId: string;
  isOwner: boolean;
  members: TribeMember[];
  loading: boolean;
  onReload: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [contactIdentifier, setContactIdentifier] = useState("");
  const [contactType, setContactType] = useState<"email" | "phone">("email");
  const [contactName, setContactName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!contactIdentifier.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/invite-contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contactIdentifier: contactIdentifier.trim(),
          contactType,
          contactName: contactName.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to invite member");
      }

      const data = await res.json();
      setSuccess(data.message || "Invitation sent successfully!");
      setContactIdentifier("");
      setContactName("");
      setShowAddForm(false);
      
      // Reload members after a delay
      setTimeout(() => {
        onReload();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!confirm("Remove this member from the tribe?")) return;

    try {
      const token = getClientSessionToken();
      // Note: This endpoint might not exist yet - we may need to add it
      const res = await fetch(`/api/tribes/${tribeId}/members/${memberId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        throw new Error("Failed to remove member");
      }

      setSuccess("Member removed successfully");
      onReload();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brandBlue mx-auto mb-2"></div>
        <p className="text-sm text-brandTextLight">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-brandText">{members.length} Members</h3>
        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-sm bg-brandBlue text-white rounded-lg hover:opacity-90 transition-all"
            >
              + Add Member
            </button>
          )}
          <button
            onClick={onReload}
            className="px-3 py-1.5 text-sm text-brandBlue hover:text-brandBlue/80"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add Member Form */}
      {showAddForm && isOwner && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <h4 className="font-medium text-brandText">Invite New Member</h4>
          
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-brandText mb-1">
                Contact Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setContactType("email")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    contactType === "email"
                      ? "bg-brandBlue text-white"
                      : "bg-white text-brandText border border-gray-200"
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setContactType("phone")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    contactType === "phone"
                      ? "bg-brandBlue text-white"
                      : "bg-white text-brandText border border-gray-200"
                  }`}
                >
                  Phone
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brandText mb-1">
                {contactType === "email" ? "Email Address" : "Phone Number"}
              </label>
              <input
                type={contactType === "email" ? "email" : "tel"}
                value={contactIdentifier}
                onChange={(e) => setContactIdentifier(e.target.value)}
                placeholder={contactType === "email" ? "name@example.com" : "+1 234 567 8900"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brandText mb-1">
                Name (Optional)
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddMember}
              disabled={!contactIdentifier.trim() || adding}
              className="flex-1 px-4 py-2 bg-brandBlue text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {adding ? "Sending..." : "Send Invitation"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setContactIdentifier("");
                setContactName("");
                setError(null);
              }}
              className="px-4 py-2 bg-white text-brandText border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {members.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-brandTextLight">No members yet</p>
          {isOwner && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-brandBlue text-white rounded-lg hover:opacity-90 transition-all"
            >
              Add First Member
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const isPending = !member.acceptedAt;
            const hasLeft = !!member.leftAt;
            
            return (
              <div key={member.id} className={`p-4 border rounded-lg ${
                hasLeft 
                  ? "border-gray-200 bg-gray-50 opacity-60" 
                  : isPending 
                  ? "border-yellow-200 bg-yellow-50" 
                  : "border-gray-200 bg-white"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-brandText">
                        Member {member.userId.substring(0, 8)}...
                      </div>
                      {isPending && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                      {hasLeft && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          Left
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-brandTextLight mt-1">
                      {isPending 
                        ? `Invited ${new Date(member.invitedAt).toLocaleDateString()}` 
                        : hasLeft 
                        ? `Left ${member.leftAt ? new Date(member.leftAt).toLocaleDateString() : 'Recently'}`
                        : `Joined ${member.acceptedAt ? new Date(member.acceptedAt).toLocaleDateString() : 'Recently'}`
                      }
                    </div>
                    
                    {/* Permissions */}
                    {member.permissions && !hasLeft && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {member.permissions.canAddTasks && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Can add tasks</span>
                        )}
                        {member.permissions.canAddAppointments && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Can add appts</span>
                        )}
                        {member.permissions.canRemoveTasks && (
                          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Can remove tasks</span>
                        )}
                      </div>
                    )}
                  </div>
                  {isOwner && !hasLeft && (
                    <button 
                      onClick={() => handleRemoveMember(member.id, member.userId)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Messages Tab Component
function MessagesTab({
  tribeId,
  isOwner,
  messages,
  loading,
  onDeleteMessage,
}: {
  tribeId: string;
  isOwner: boolean;
  messages: TribeMessage[];
  loading: boolean;
  onDeleteMessage: (messageId: string) => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brandBlue mx-auto mb-2"></div>
        <p className="text-sm text-brandTextLight">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">💬</div>
        <p className="text-brandTextLight">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-brandText">{messages.length} Messages</h3>
        {isOwner && (
          <span className="text-xs text-brandTextLight">You can delete inappropriate messages</span>
        )}
      </div>
      
      <div className="space-y-3">
        {messages.map(message => (
          <div key={message.id} className={`p-4 rounded-lg ${message.deletedAt ? 'bg-gray-50 opacity-50' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-brandText whitespace-pre-wrap break-words">
                  {message.deletedAt ? "[Message deleted]" : message.message}
                </div>
                <div className="text-xs text-brandTextLight mt-1">
                  {new Date(message.createdAt).toLocaleString()}
                  {message.editedAt && " (edited)"}
                </div>
              </div>
              {isOwner && !message.deletedAt && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Member Requests Tab Component
function MemberRequestsTab({
  tribeId,
  requests,
  loading,
  onReload,
}: {
  tribeId: string;
  requests: MemberRequest[];
  loading: boolean;
  onReload: () => void;
}) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    setError(null);
    setSuccess(null);

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/member-requests/${requestId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve request");
      }

      setSuccess("Member request approved!");
      setTimeout(() => {
        onReload();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!confirm("Deny this member request?")) return;

    setProcessing(requestId);
    setError(null);
    setSuccess(null);

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/member-requests/${requestId}/deny`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deny request");
      }

      setSuccess("Member request denied");
      setTimeout(() => {
        onReload();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny request");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brandBlue mx-auto mb-2"></div>
        <p className="text-sm text-brandTextLight">Loading requests...</p>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.state === "pending");

  return (
    <div className="space-y-4">
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-brandText">
          {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={onReload}
          className="text-sm text-brandBlue hover:text-brandBlue/80"
        >
          Refresh
        </button>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-brandTextLight">No pending member requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map(request => (
            <div key={request.id} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-brandText">
                    Member Request
                  </div>
                  <div className="text-sm text-brandTextLight mt-1">
                    User {request.requestedUserId.substring(0, 8)}... requested to join
                  </div>
                  <div className="text-xs text-brandTextLight mt-0.5">
                    Requested {new Date(request.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processing === request.id}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {processing === request.id ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleDeny(request.id)}
                    disabled={processing === request.id}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ tribe, onUpdate }: { tribe: Tribe; onUpdate: () => void }) {
  const [changingType, setChangingType] = useState(false);
  const [newType, setNewType] = useState<"friend" | "family">(tribe.tribeType);

  const handleChangeTribeType = async () => {
    if (newType === tribe.tribeType) return;

    if (!confirm(`Change tribe type to ${newType}? This will ${newType === "family" ? "enable" : "disable"} sharing routines and groceries.`)) {
      setNewType(tribe.tribeType);
      return;
    }

    setChangingType(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribe.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tribeType: newType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update tribe type");
      }

      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update tribe type");
      setNewType(tribe.tribeType);
    } finally {
      setChangingType(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-brandText mb-4">Tribe Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brandText mb-2">
              Tribe Name
            </label>
            <input
              type="text"
              defaultValue={tribe.name}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
              disabled
            />
            <p className="text-xs text-brandTextLight mt-1">Use the rename button in the header to change the name</p>
          </div>

          {/* Tribe Type Selector */}
          <div>
            <label className="block text-sm font-medium text-brandText mb-2">
              Tribe Type
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => setNewType("friend")}
                disabled={changingType}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  newType === "friend"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-brandText hover:border-blue-300"
                } disabled:opacity-50`}
              >
                <div className="text-2xl mb-1">👥</div>
                <div className="font-semibold text-sm">Friend</div>
                <div className="text-xs mt-1 opacity-75">
                  Appointments, todos, chat
                </div>
              </button>
              <button
                onClick={() => setNewType("family")}
                disabled={changingType}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  newType === "family"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-brandText hover:border-green-300"
                } disabled:opacity-50`}
              >
                <div className="text-2xl mb-1">👨‍👩‍👧‍👦</div>
                <div className="font-semibold text-sm">Family</div>
                <div className="text-xs mt-1 opacity-75">
                  + Routines & groceries
                </div>
              </button>
            </div>
            {newType !== tribe.tribeType && (
              <button
                onClick={handleChangeTribeType}
                disabled={changingType}
                className="w-full px-4 py-2 bg-brandBlue text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {changingType ? "Updating..." : "Save Tribe Type"}
              </button>
            )}
            <p className="text-xs text-brandTextLight mt-2">
              {newType === "family" 
                ? "Family tribes can share all item types including routines and groceries" 
                : "Friend tribes can only share appointments, todos, and chat messages"}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brandText mb-2">
              Description (Coming Soon)
            </label>
            <textarea
              placeholder="Add a description for your tribe..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brandBlue/50 opacity-50"
              rows={3}
              disabled
            />
            <p className="text-xs text-brandTextLight mt-1">Tribe descriptions will be available in a future update</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
        <p className="text-sm text-brandTextLight mb-4">
          Deleting a tribe is permanent and cannot be undone. All members will lose access.
        </p>
        <button
          onClick={() => {
            const btn = document.querySelector('[title="Delete tribe"]') as HTMLButtonElement;
            if (btn) btn.click();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Tribe
        </button>
      </div>
    </div>
  );
}
