"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { getClientSessionToken } from "@/lib/clientSession";
import { useLife } from "@/state/LifeStore";

type TribeMessage = {
  id: string;
  odileId: string;
  message: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  senderName?: string;
};

type TribeEvent = {
  id: string;
  title: string;
  datetime: string;
  location?: string;
  description?: string;
  createdBy?: string;
};

type TribeTodo = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  assignedTo?: string;
  createdBy?: string;
};

type Tribe = {
  id: string;
  name: string;
  avatarUrl?: string | null;
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

type TribeTab = "messages" | "events" | "todos";

interface TribesFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen Tribes experience with expandable tribes showing messages, events, and todos
 */
export function TribesFullScreen({ isOpen, onClose }: TribesFullScreenProps) {
  const { addTodo, addAppointment } = useLife();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [expandedTribeId, setExpandedTribeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TribeTab>("messages");
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [events, setEvents] = useState<TribeEvent[]>([]);
  const [todos, setTodos] = useState<TribeTodo[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tribes when opened
  useEffect(() => {
    if (isOpen) {
      loadTribes();
      setExpandedTribeId(null);
      setAddedItems(new Set());
    }
  }, [isOpen]);

  // Load content when tribe is expanded or tab changes
  useEffect(() => {
    if (expandedTribeId) {
      loadTribeContent(expandedTribeId, activeTab);
    }
  }, [expandedTribeId, activeTab]);

  // Auto-scroll messages
  useEffect(() => {
    if (activeTab === "messages" && expandedTribeId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab, expandedTribeId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadTribes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
      
      setTribes(data.tribes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tribes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (window as any).__sendTribeMessage = async (text: string) => {
      if (!expandedTribeId || !text.trim()) return;
      try {
        const token = getClientSessionToken();
        const res = await fetch(`/api/tribes/${expandedTribeId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: text.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(prev => [...prev, data.message]);
        }
      } finally {
        (window as any).__tribeVoiceModeActive = false;
      }
    };
    return () => {
      delete (window as any).__sendTribeMessage;
    };
  }, [expandedTribeId]);

  const loadTribeContent = async (tribeId: string, tab: TribeTab) => {
    setContentLoading(true);
    try {
      const token = getClientSessionToken();
      
      if (tab === "messages") {
        const res = await fetch(`/api/tribes/${tribeId}/messages`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } else if (tab === "events") {
        const res = await fetch(`/api/tribes/${tribeId}/events`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        } else {
          setEvents([]);
        }
      } else if (tab === "todos") {
        const res = await fetch(`/api/tribes/${tribeId}/todos`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          setTodos(data.todos || []);
        } else {
          setTodos([]);
        }
      }
    } catch (err) {
      console.error("Failed to load tribe content:", err);
    } finally {
      setContentLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!expandedTribeId || !newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/tribes/${expandedTribeId}/messages`, {
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

  const tribeMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tribeAudioChunksRef = useRef<Blob[]>([]);

  const startTribeTalk = async () => {
    if (!expandedTribeId) return;
    (window as any).__tribeVoiceModeActive = true;
    (window as any).__tribeVoiceTargetId = expandedTribeId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      tribeAudioChunksRef.current = [];
      recorder.ondataavailable = (e) => tribeAudioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(tribeAudioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (res.ok) {
            const data = await res.json();
            if (data.text && typeof (window as any).__sendTribeMessage === "function") {
              (window as any).__sendTribeMessage(data.text);
            }
          }
        } catch (err) {
          console.error("Tribe voice transcription error:", err);
        }
        (window as any).__tribeVoiceModeActive = false;
      };
      tribeMediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      console.error("Microphone access denied:", err);
      (window as any).__tribeVoiceModeActive = false;
    }
  };

  const stopTribeTalk = () => {
    if (tribeMediaRecorderRef.current && tribeMediaRecorderRef.current.state !== "inactive") {
      tribeMediaRecorderRef.current.stop();
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleTribe = (tribeId: string) => {
    if (expandedTribeId === tribeId) {
      setExpandedTribeId(null);
    } else {
      setExpandedTribeId(tribeId);
      setActiveTab("messages");
      setMessages([]);
      setEvents([]);
      setTodos([]);
    }
  };

  // Add to PA handlers
  const addEventToPA = (event: TribeEvent, tribeName: string) => {
    const itemKey = `event-${event.id}`;
    if (addedItems.has(itemKey)) return;
    
    const tribe = tribes.find(t => t.id === expandedTribeId);
    
    addAppointment({
      id: uuidv4(),
      title: event.title,
      datetime: new Date(event.datetime),
      location: event.location || null,
      withWhom: null,
      topic: event.description || null,
      durationMinutes: 60,
      createdAt: new Date(),
      addedByTribeId: expandedTribeId,
      addedByTribeName: tribe?.name || tribeName,
    });
    
    setAddedItems(prev => new Set(prev).add(itemKey));
    setToastMessage(`Added "${event.title}" to your calendar`);
  };

  const addTodoToPA = (todo: TribeTodo, tribeName: string) => {
    const itemKey = `todo-${todo.id}`;
    if (addedItems.has(itemKey)) return;
    
    const tribe = tribes.find(t => t.id === expandedTribeId);
    
    addTodo({
      id: uuidv4(),
      title: todo.title,
      priority: todo.priority,
      dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
      createdAt: new Date(),
      addedByTribeId: expandedTribeId,
      addedByTribeName: tribe?.name || tribeName,
    });
    
    setAddedItems(prev => new Set(prev).add(itemKey));
    setToastMessage(`Added "${todo.title}" to your todos`);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100000] bg-gray-50 flex flex-col"
      style={{ touchAction: "pan-y" }}
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100001] bg-green-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
        ) : tribes.length === 0 ? (
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
                {tribes.length} tribe{tribes.length !== 1 ? 's' : ''} • Tap to expand
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
            
            {/* Tribes accordion */}
            {tribes.map((tribe) => (
              <div key={tribe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Tribe header - clickable to expand */}
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center">
                      {tribe.avatarUrl ? (
                        <img src={tribe.avatarUrl} alt={tribe.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">
                          {tribe.name.match(/[\p{Emoji}]/u)?.[0] || '👥'}
                        </span>
                      )}
                    </div>
                    
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
                      <p className="text-sm text-brandTextLight">
                        {tribe.memberCount || 0} member{(tribe.memberCount || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {((tribe.unreadMessageCount || 0) > 0 || (tribe.pendingProposalsCount || 0) > 0) && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-medium">
                          {(tribe.unreadMessageCount || 0) + (tribe.pendingProposalsCount || 0)}
                        </span>
                      )}
                      <button
                        onClick={() => toggleTribe(tribe.id)}
                        className="p-1 rounded-full hover:bg-gray-100"
                        aria-label="Toggle tribe"
                      >
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedTribeId === tribe.id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {expandedTribeId === tribe.id && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-brandTextLight">
                        Tribe chat active
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
                        title="Hold to talk to this tribe"
                        onPointerDown={startTribeTalk}
                        onPointerUp={stopTribeTalk}
                        onPointerLeave={stopTribeTalk}
                      >
                        <span>🎙️</span>
                        Hold to Talk
                      </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Expanded content */}
                {expandedTribeId === tribe.id && (
                  <div className="border-t border-gray-200">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                      <button
                        onClick={() => setActiveTab("messages")}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === "messages"
                            ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                            : "text-brandTextLight hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Messages
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab("events")}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === "events"
                            ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                            : "text-brandTextLight hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Events
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab("todos")}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === "todos"
                            ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                            : "text-brandTextLight hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Todos
                        </span>
                      </button>
                    </div>
                    
                    {/* Tab content */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {contentLoading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        </div>
                      ) : activeTab === "messages" ? (
                        <MessagesTab
                          messages={messages}
                          newMessage={newMessage}
                          setNewMessage={setNewMessage}
                          sendMessage={sendMessage}
                          sending={sending}
                          handleKeyPress={handleKeyPress}
                          messagesEndRef={messagesEndRef}
                          error={error}
                          setError={setError}
                          tribeName={tribe.name}
                        />
                      ) : activeTab === "events" ? (
                        <EventsTab
                          events={events}
                          addEventToPA={(event) => addEventToPA(event, tribe.name)}
                          addedItems={addedItems}
                        />
                      ) : (
                        <TodosTab
                          todos={todos}
                          addTodoToPA={(todo) => addTodoToPA(todo, tribe.name)}
                          addedItems={addedItems}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  );
}

// Messages Tab Component
function MessagesTab({
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
  sending,
  handleKeyPress,
  messagesEndRef,
  error,
  setError,
  tribeName,
}: {
  messages: TribeMessage[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  sendMessage: () => void;
  sending: boolean;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  error: string | null;
  setError: (err: string | null) => void;
  tribeName: string;
}) {
  return (
    <div className="flex flex-col h-[350px]">
      <div className="px-4 pt-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
          <span className="text-sm">👥</span>
          <span>Tribe: {tribeName.replace(/[\p{Emoji}]/gu, '').trim() || tribeName}</span>
        </div>
        <p className="mt-1 text-[11px] text-brandTextLight">
          Messages and proposals here go only to this tribe.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm text-brandTextLight">No messages yet</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${tribeName.replace(/[\p{Emoji}]/gu, '').trim() || tribeName}...`}
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm"
            style={{ minHeight: "40px", maxHeight: "80px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Events Tab Component
function EventsTab({
  events,
  addEventToPA,
  addedItems,
}: {
  events: TribeEvent[];
  addEventToPA: (event: TribeEvent) => void;
  addedItems: Set<string>;
}) {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-sm text-brandTextLight">No events scheduled</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {events.map((event) => {
        const isAdded = addedItems.has(`event-${event.id}`);
        const eventDate = new Date(event.datetime);
        
        return (
          <div key={event.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-brandText text-sm">{event.title}</h4>
                <p className="text-xs text-brandTextLight mt-1">
                  {eventDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {" at "}
                  {eventDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
                {event.location && (
                  <p className="text-xs text-brandTextLight mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </p>
                )}
                {event.createdBy && (
                  <p className="text-xs text-purple-600 mt-1">from {event.createdBy}</p>
                )}
              </div>
              <button
                onClick={() => addEventToPA(event)}
                disabled={isAdded}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isAdded
                    ? "bg-green-100 text-green-700 cursor-default"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {isAdded ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Added
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add to PA
                  </span>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Todos Tab Component
function TodosTab({
  todos,
  addTodoToPA,
  addedItems,
}: {
  todos: TribeTodo[];
  addTodoToPA: (todo: TribeTodo) => void;
  addedItems: Set<string>;
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };

  if (todos.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-sm text-brandTextLight">No todos from this tribe</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {todos.map((todo) => {
        const isAdded = addedItems.has(`todo-${todo.id}`);
        
        return (
          <div key={todo.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-brandText text-sm">{todo.title}</h4>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[todo.priority]}`}>
                    {todo.priority}
                  </span>
                </div>
                {todo.dueDate && (
                  <p className="text-xs text-brandTextLight">
                    Due: {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
                {todo.createdBy && (
                  <p className="text-xs text-purple-600 mt-1">from {todo.createdBy}</p>
                )}
              </div>
              <button
                onClick={() => addTodoToPA(todo)}
                disabled={isAdded}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isAdded
                    ? "bg-green-100 text-green-700 cursor-default"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {isAdded ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Added
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add to PA
                  </span>
                )}
              </button>
            </div>
          </div>
        );
      })}
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
      <div className="flex items-center justify-center py-1">
        <p className="text-xs text-brandTextLight italic">Message deleted</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="inline-block max-w-[85%] bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
        {message.senderName && (
          <p className="text-xs font-medium text-purple-600 mb-0.5">{message.senderName}</p>
        )}
        <p className="text-sm text-brandText whitespace-pre-wrap break-words">{message.message}</p>
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
