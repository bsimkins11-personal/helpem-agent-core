"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getClientSessionToken } from "@/lib/clientSession";

type TribeMessage = {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  senderName?: string;
};

type Tribe = {
  id: string;
  name: string;
  pendingProposalsCount?: number;
  isOwner: boolean;
  memberCount?: number;
  unreadMessageCount?: number;
  lastMessage?: {
    text: string;
    senderName?: string;
    timestamp: string;
  };
};

interface TribesFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen Tribes experience - overlay that takes over the screen
 */
export function TribesFullScreen({ isOpen, onClose }: TribesFullScreenProps) {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tribes when opened
  useEffect(() => {
    if (isOpen) {
      loadTribes();
      // Reset view to list when opening
      setView("list");
      setSelectedTribeId(null);
    }
  }, [isOpen]);

  // Load messages when tribe is selected
  useEffect(() => {
    if (selectedTribeId && view === "chat") {
      loadMessages(selectedTribeId);
      // Set up polling for new messages
      const interval = setInterval(() => {
        loadMessages(selectedTribeId, true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTribeId, view]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  const loadTribes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Wait for token with polling
      let token: string | null = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 50 : 100));
        token = getClientSessionToken();
        if (token) break;
      }

      const res = await fetch("/api/tribes", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      if (!res.ok) throw new Error("Failed to load tribes");
      
      const data = await res.json();
      
      // Auto-seed demo tribes if none exist
      if (!data.tribes || data.tribes.length === 0) {
        try {
          const seedRes = await fetch("/api/tribes/demo/seed", {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (seedRes.ok) {
            const reloadRes = await fetch("/api/tribes", {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (reloadRes.ok) {
              const reloadData = await reloadRes.json();
              setTribes(reloadData.tribes || []);
              return;
            }
          }
        } catch {
          // Ignore seed errors
        }
      }
      
      setTribes(data.tribes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tribes");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = async (tribeId: string, silent = false) => {
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${tribeId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load messages");
      
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    }
  };

  const sendMessage = async () => {
    if (!selectedTribeId || !newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${selectedTribeId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectTribe = (tribeId: string) => {
    setSelectedTribeId(tribeId);
    setView("chat");
    setMessages([]);
    setError(null);
  };

  const backToList = () => {
    setView("list");
    setSelectedTribeId(null);
    setMessages([]);
  };

  const selectedTribe = tribes.find(t => t.id === selectedTribeId);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100000] bg-gray-50 flex flex-col"
      style={{ touchAction: "none" }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          {view === "chat" ? (
            <>
              <button
                onClick={backToList}
                className="flex items-center gap-2 text-brandBlue font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-lg font-semibold text-brandText">
                {selectedTribe?.name || "Messages"}
              </h1>
              <div className="w-16" /> {/* Spacer for centering */}
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-brandText">My Tribes</h1>
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-brandTextLight text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-brandTextLight">Loading your tribes...</p>
            </div>
          </div>
        ) : error && tribes.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-brandText mb-2">Something went wrong</h2>
              <p className="text-brandTextLight mb-4">{error}</p>
              <button
                onClick={loadTribes}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : view === "list" ? (
          /* Tribe List View */
          <div className="h-full overflow-y-auto">
            {tribes.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">👥</span>
                  </div>
                  <h2 className="text-xl font-semibold text-brandText mb-2">No Tribes Yet</h2>
                  <p className="text-brandTextLight mb-6">
                    Create a tribe to start collaborating with your trusted circle.
                  </p>
                  <button
                    onClick={() => window.location.href = '/tribe/settings'}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                  >
                    Create Your First Tribe
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Refresh button */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-brandTextLight">
                    {tribes.length} tribe{tribes.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={loadTribes}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                {tribes.map((tribe) => (
                  <button
                    key={tribe.id}
                    onClick={() => selectTribe(tribe.id)}
                    className="w-full bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      {/* Tribe Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-2xl">
                          {tribe.name.match(/[\p{Emoji}]/u)?.[0] || '👥'}
                        </span>
                      </div>
                      
                      {/* Tribe Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-brandText truncate">
                            {tribe.name.replace(/[\p{Emoji}]/gu, '').trim() || tribe.name}
                          </h3>
                          {tribe.isOwner && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              Owner
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-brandTextLight mb-2">
                          {tribe.memberCount || 0} member{(tribe.memberCount || 0) !== 1 ? 's' : ''}
                        </p>
                        
                        {/* Last message preview */}
                        {tribe.lastMessage && (
                          <p className="text-sm text-brandTextLight truncate">
                            {tribe.lastMessage.senderName && (
                              <span className="font-medium">{tribe.lastMessage.senderName}: </span>
                            )}
                            {tribe.lastMessage.text}
                          </p>
                        )}
                      </div>
                      
                      {/* Badges & Arrow */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {((tribe.unreadMessageCount || 0) > 0 || (tribe.pendingProposalsCount || 0) > 0) && (
                          <div className="flex items-center gap-1">
                            {(tribe.unreadMessageCount || 0) > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-medium">
                                {tribe.unreadMessageCount}
                              </span>
                            )}
                            {(tribe.pendingProposalsCount || 0) > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium">
                                {tribe.pendingProposalsCount}
                              </span>
                            )}
                          </div>
                        )}
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
                
                {/* Create New Tribe button */}
                <button
                  onClick={() => window.location.href = '/tribe/settings'}
                  className="w-full bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-brandTextLight hover:text-purple-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Create New Tribe</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Chat View */
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold text-brandText mb-1">No messages yet</h3>
                    <p className="text-sm text-brandTextLight">
                      Start the conversation!
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4 safe-area-bottom">
              {error && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                  <button 
                    onClick={() => setError(null)} 
                    className="ml-2 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-base"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: TribeMessage }) {
  const isDeleted = !!message.deletedAt;
  const isEdited = !!message.editedAt;
  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isDeleted) {
    return (
      <div className="flex items-center justify-center py-2">
        <p className="text-sm text-brandTextLight italic">Message deleted</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="inline-block max-w-[85%] bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        {message.senderName && (
          <p className="text-xs font-medium text-purple-600 mb-1">{message.senderName}</p>
        )}
        <p className="text-brandText whitespace-pre-wrap break-words">{message.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-brandTextLight">{time}</span>
          {isEdited && (
            <span className="text-xs text-brandTextLight italic">(edited)</span>
          )}
        </div>
      </div>
    </div>
  );
}
