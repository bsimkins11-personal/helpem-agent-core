"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getClientSessionToken } from "@/lib/clientSession";
import { DemoTribeBanner } from "@/components/DemoTribeBanner";

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
  pendingProposalsCount?: number;
  isOwner: boolean;
  memberCount?: number;
  unreadMessageCount?: number;
};

/**
 * Tribe Messages - Scroll through tribes and view/send messages
 */
export default function TribeInboxPage() {
  const router = useRouter();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load tribes on mount
  useEffect(() => {
    loadTribes();
  }, []);

  // Load messages when tribe is selected
  useEffect(() => {
    if (selectedTribeId) {
      loadMessages(selectedTribeId);
      // Set up polling for new messages
      const interval = setInterval(() => {
        loadMessages(selectedTribeId, true);
      }, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [selectedTribeId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadTribes = async () => {
    setLoading(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch("/api/tribes", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load tribes");
      
      const data = await res.json();
      setTribes(data.tribes || []);
      
      // Auto-select first tribe
      if (data.tribes?.length > 0 && !selectedTribeId) {
        setSelectedTribeId(data.tribes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tribes");
    } finally {
      setLoading(false);
    }
  };

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
      
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
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

  if (tribes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-semibold text-brandText mb-2">No Tribes Yet</h2>
          <p className="text-brandTextLight mb-6">
            Create a Tribe to start messaging with people you trust.
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Demo Mode Banner */}
      <div className="px-4 pt-4 pb-0">
        <DemoTribeBanner />
      </div>
      
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
              <h1 className="text-xl font-semibold text-brandText">My Tribes</h1>
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

      <div className="flex-1 flex overflow-hidden">
        {/* Tribe List Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-brandTextLight mb-3">TRIBES</h2>
            <div className="space-y-1">
              {tribes.map(tribe => (
                <button
                  key={tribe.id}
                  onClick={() => setSelectedTribeId(tribe.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedTribeId === tribe.id
                      ? "bg-brandBlue text-white"
                      : "hover:bg-gray-100 text-brandText"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tribe.name}</span>
                    {tribe.isOwner && (
                      <span className="text-xs opacity-75">Owner</span>
                    )}
                  </div>
                  {(tribe.pendingProposalsCount ?? 0) > 0 && (
                    <div className="text-xs mt-1 opacity-75">
                      {tribe.pendingProposalsCount} pending
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedTribe ? (
            <>
              {/* Tribe Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-brandText">{selectedTribe.name}</h2>
              </div>

              {/* Messages Feed */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold text-brandText mb-2">No messages yet</h3>
                    <p className="text-brandTextLight">
                      Start the conversation by sending a message below.
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                {error && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandBlue/50 resize-none"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-2 bg-brandBlue text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-brandTextLight">Select a tribe to view messages</p>
            </div>
          )}
        </div>
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
      <div className="inline-block max-w-[70%] bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
        <p className="text-brandText whitespace-pre-wrap break-words">{message.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-brandTextLight">{time}</span>
          {isEdited && (
            <span className="text-xs text-brandTextLight italic">(edited)</span>
          )}
        </div>
      </div>
    </div>
  );
}
