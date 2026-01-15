"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLife } from "@/state/LifeStore";
import { Priority } from "@/types/todo";
import { useNativeAudio } from "@/hooks/useNativeAudio";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    type: "todo" | "habit" | "appointment";
    title: string;
    priority?: Priority;
    datetime?: string;
    frequency?: "daily" | "weekly";
  };
};

const MAX_MESSAGES = 50;
const SESSION_STORAGE_KEY = "helpem_chat_history";

// Detect iOS native environment - single source of truth
function isIOSNativeEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    window.webkit?.messageHandlers?.native ||
    window.__IS_HELPEM_APP__ ||
    window.nativeBridge?.isNative
  );
}

// Strip markdown formatting from AI responses
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function loadSessionMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSessionMessages(messages: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

type InputMode = "type" | "talk";

// Press lock for push-to-talk (prevents duplicate START/END)
let isPressingToTalk = false;

// Detect intent from user message
function detectIntent(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes("appointment") || lower.includes("calendar") || lower.includes("schedule") || lower.includes("meeting")) {
    return "appointments";
  }
  if (lower.includes("todo") || lower.includes("to-do") || lower.includes("task") || lower.includes("need to do") || lower.includes("get done")) {
    return "todos";
  }
  if (lower.includes("routine") || lower.includes("habit")) {
    return "routines";
  }
  return null;
}

// Check if user is explicitly re-querying
function isRequery(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("again") || lower.includes("repeat") || lower.includes("tell me again");
}

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<Message["action"] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("type");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Web Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Track fulfilled intents to avoid repetitive suggestions
  const fulfilledIntentsRef = useRef<Set<string>>(new Set());

  const { todos, habits, appointments, addTodo, addHabit, addAppointment, updateTodoPriority } = useLife();
  
  // Native audio hook for iOS app
  const nativeAudio = useNativeAudio();
  const isNativeApp = nativeAudio.isNative;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    saveSessionMessages(messages);
  }, [messages]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const updated = [...prev, message];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, []);

  const sendMessageWithText = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim() || loading) return;

    // Detect intent from user message
    const intent = detectIntent(text);
    
    // Reset fulfilled intents if user explicitly re-queries
    if (isRequery(text)) {
      fulfilledIntentsRef.current.clear();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    addMessage(userMessage);
    setInput("");
    setLoading(true);
    setPendingAction(null);

    try {
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Send fulfilled intents to API so it knows what NOT to suggest
      const fulfilledIntents = Array.from(fulfilledIntentsRef.current);

      // Include current date/time for relative time queries like "tomorrow" or "next week"
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: recentMessages,
          userData: { todos, habits, appointments },
          currentDateTime,
          currentDateTimeISO: now.toISOString(),
          fulfilledIntents,
        }),
      });
      
      // Mark this intent as fulfilled after successful response
      if (intent) {
        fulfilledIntentsRef.current.add(intent);
      }

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();

      if (data.action === "add") {
        const displayType = data.type === "habit" ? "routine" : data.type;
        const internalType = data.type === "routine" ? "habit" : data.type;
        const responseText = `I'll add this ${displayType}: "${data.title}"`;
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
          action: {
            type: internalType as "todo" | "habit" | "appointment",
            title: data.title,
            priority: data.priority,
            datetime: data.datetime,
            frequency: data.frequency,
          },
        };
        
        addMessage(assistantMessage);
        setPendingAction(assistantMessage.action);
        setSelectedPriority(data.priority || "medium");
        // ALWAYS send to native for TTS when in native app
        if (isNativeApp) {
          window.webkit?.messageHandlers?.native?.postMessage({
            action: "speak",
            text: responseText + ". Would you like me to confirm?",
          });
        }
        
      } else if (data.action === "update_priority") {
        const todoToUpdate = todos.find(t => 
          t.title.toLowerCase() === data.todoTitle?.toLowerCase()
        );
        
        if (todoToUpdate) {
          updateTodoPriority(todoToUpdate.id, data.newPriority);
          const responseText = `Updated "${data.todoTitle}" to ${data.newPriority} priority.`;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `✓ ${responseText}`,
          });
          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
          }
        } else {
          const responseText = `I couldn't find a todo called "${data.todoTitle}".`;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: responseText,
          });
          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
          }
        }
        
      } else {
        const rawResponse = data.message || data.error || "I'm not sure how to help with that.";
        const responseText = stripMarkdown(rawResponse);
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
        });
        // ALWAYS send to native for TTS when in native app
        if (isNativeApp) {
          window.webkit?.messageHandlers?.native?.postMessage({
            action: "speak",
            text: responseText,
          });
        }
      }
    } catch {
      const errorText = "Sorry, something went wrong. Please try again.";
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorText,
      });
      // ALWAYS send to native for TTS when in native app
      if (isNativeApp) {
        window.webkit?.messageHandlers?.native?.postMessage({
          action: "speak",
          text: errorText,
        });
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [loading, messages, todos, habits, appointments, addMessage, updateTodoPriority, isNativeApp]);

  // Handle native transcription results (iOS native only)
  useEffect(() => {
    if (!isNativeApp) return;
    
    const handleTranscription = (payload: unknown) => {
      const text = (payload as { text?: string })?.text;
      if (text && text.length > 0) {
        setInput(text);
        // Note: isListening state is controlled by Talk button only
        setTimeout(() => sendMessageWithText(text, true), 300);
      }
    };
    
    const handleUserTranscript = (payload: unknown) => {
      const data = payload as { text?: string };
      if (data.text && data.text.length > 0) {
        setInput(data.text);
        sendMessageWithText(data.text, true);
      }
    };
    
    // Listen for TRANSCRIPTION_RESULT CustomEvent from native
    const handleTranscriptionResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const text = detail?.text;
      if (text && text.length > 0) {
        setInput(text);
        sendMessageWithText(text, true);
      }
    };
    
    window.nativeBridge?.on("TRANSCRIPTION_READY", handleTranscription);
    window.nativeBridge?.on("USER_TRANSCRIPT", handleUserTranscript);
    window.addEventListener("TRANSCRIPTION_RESULT", handleTranscriptionResult);
    
    return () => {
      window.nativeBridge?.off("TRANSCRIPTION_READY", handleTranscription);
      window.nativeBridge?.off("USER_TRANSCRIPT", handleUserTranscript);
      window.removeEventListener("TRANSCRIPTION_RESULT", handleTranscriptionResult);
    };
  }, [isNativeApp, sendMessageWithText]);

  // Global function for Swift to inject transcription directly
  useEffect(() => {
    // Define the global function that Swift calls via evaluateJavaScript
    (window as unknown as Record<string, unknown>).onNativeTranscription = (text: string) => {
      console.log("Received from Swift:", text);
      
      // Update the input field with the transcribed text
      setInput(text);
      
      // Clear processing state and send the message
      setIsProcessing(false);
      setIsListening(false);
      
      // Immediately trigger send logic - bypasses browser mediaRecorder
      if (text.trim()) {
        sendMessageWithText(text, true);
      }
    };

    // Alternative global function for native speech handling
    (window as unknown as Record<string, unknown>).handleNativeSpeech = (text: string) => {
      console.log("🎙️ Native speech:", text);
      
      // Update input and clear states
      setInput(text);
      setIsProcessing(false);
      setIsListening(false);
      
      // Auto-submit the transcribed text
      if (text.trim()) {
        sendMessageWithText(text, true);
      }
    };

    return () => {
      delete (window as unknown as Record<string, unknown>).onNativeTranscription;
      delete (window as unknown as Record<string, unknown>).handleNativeSpeech;
    };
  }, [sendMessageWithText]);

  // Native iOS listening controls
  const startListening = useCallback(async () => {
    if (!isNativeApp || isListening || loading) return;
    
    // Enable native audio ONCE per session
    if (!window.__audioEnabled) {
      window.__audioEnabled = true;
      window.webkit?.messageHandlers?.native?.postMessage({
        type: "ENABLE_AUDIO"
      });
    }
    
    // Force-send START_CONVERSATION directly (guarded to prevent duplicates)
    if (!window.__conversationStarted) {
      window.__conversationStarted = true;
      window.webkit?.messageHandlers?.native?.postMessage({
        type: "START_CONVERSATION"
      });
    }
    
    // Request mic access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Make the stream available to the voice pipeline
      window.dispatchEvent(
        new CustomEvent("VOICE_STREAM_READY", { detail: stream })
      );
    } catch {
      // Mic access failed - continue anyway, native will handle
    }
    
    setIsListening(true);
    nativeAudio.startConversation();
  }, [isNativeApp, isListening, loading, nativeAudio]);

  const stopListening = useCallback(() => {
    if (!isNativeApp) return;
    window.__conversationStarted = false;
    nativeAudio.endConversation();
    setIsListening(false);
  }, [isNativeApp, nativeAudio]);

  // Web Audio: Handle transcription from recorded blob
  const handleWebTranscription = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      console.error("Audio blob is empty");
      setIsProcessing(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error(`API returned ${response.status} ${response.statusText}`);
        setIsProcessing(false);
        return;
      }

      const data = await response.json();
      
      if (data.text) {
        sendMessageWithText(data.text, false);
      } else {
        console.error("Transcription returned no text:", data);
      }
    } catch (err) {
      console.error("Transcription API error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessageWithText]);

  // Web Audio: Start recording using MediaRecorder
  const startWebRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        await handleWebTranscription(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("Microphone access denied:", err);
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [handleWebTranscription]);

  // Web Audio: Stop recording
  const stopWebRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Unified handlers for Talk button (native + web)
  const handleTalkStart = useCallback(() => {
    if (isPressingToTalk) return;
    isPressingToTalk = true;
    setInputMode("talk");
    setIsListening(true);
    setIsProcessing(false);
    
    if (window.webkit?.messageHandlers?.native) {
      // Native iOS path - trigger Swift userContentController
      window.webkit.messageHandlers.native.postMessage({ action: "startRecording" });
    } else {
      // Web browser fallback
      startWebRecording();
    }
  }, [startWebRecording]);

  const handleTalkStop = useCallback(() => {
    if (!isPressingToTalk) return;
    isPressingToTalk = false;
    setIsListening(false);
    setIsProcessing(true);
    
    if (window.webkit?.messageHandlers?.native) {
      // Native iOS path - trigger Swift userContentController
      window.webkit.messageHandlers.native.postMessage({ action: "stopRecording" });
    } else {
      // Web browser fallback
      stopWebRecording();
    }
  }, [stopWebRecording]);

  // Note: Auto-start removed - now using press-and-hold on Talk button

  const sendMessage = useCallback(() => {
    sendMessageWithText(input, false);
  }, [input, sendMessageWithText]);

  const confirmAction = useCallback(() => {
    if (!pendingAction) return;

    const id = crypto.randomUUID();
    const now = new Date();

    switch (pendingAction.type) {
      case "todo":
        addTodo({ id, title: pendingAction.title, priority: selectedPriority, dueDate: pendingAction.datetime ? new Date(pendingAction.datetime) : undefined, createdAt: now });
        break;
      case "habit":
        addHabit({ id, title: pendingAction.title, frequency: pendingAction.frequency || "daily", createdAt: now, completions: [] });
        break;
      case "appointment":
        addAppointment({ id, title: pendingAction.title, datetime: pendingAction.datetime ? new Date(pendingAction.datetime) : now, createdAt: now });
        break;
    }

    const displayType = pendingAction.type === "habit" ? "routine" : pendingAction.type;
    const confirmText = `Done! Added to your ${displayType}s.`;
    
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: `✓ ${confirmText}` });
    if (isNativeApp) {
      window.webkit?.messageHandlers?.native?.postMessage({
        action: "speak",
        text: confirmText,
      });
    }
    setPendingAction(null);
  }, [pendingAction, selectedPriority, addTodo, addHabit, addAppointment, addMessage, isNativeApp]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    const cancelText = "No problem, cancelled.";
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: cancelText });
    if (isNativeApp) {
      window.webkit?.messageHandlers?.native?.postMessage({
        action: "speak",
        text: cancelText,
      });
    }
  }, [addMessage, isNativeApp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[500px]">
      {/* Header with Type/Talk toggle */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInputMode("type");
              window.__conversationStarted = false;
              if (isListening) stopListening();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "type"
                ? "bg-brandBlue text-white"
                : "bg-gray-100 text-brandTextLight hover:bg-gray-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Type
          </button>
          
          <button
            style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              handleTalkStart();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.currentTarget.releasePointerCapture(e.pointerId);
              handleTalkStop();
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              e.currentTarget.releasePointerCapture(e.pointerId);
              handleTalkStop();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all select-none touch-none ${
              isPressingToTalk
                ? "bg-red-500 text-white"
                : inputMode === "talk"
                  ? "bg-brandGreen text-white"
                  : "bg-gray-100 text-brandTextLight hover:bg-gray-200"
            }`}
          >
            <svg className="w-4 h-4 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span className="pointer-events-none">{isListening ? "Recording..." : "Hold to Talk"}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-brandTextLight py-6 md:py-8">
            <div className="text-3xl md:text-4xl mb-2 md:mb-3">
              {inputMode === "talk" && isNativeApp ? "🎙️" : "💬"}
            </div>
            <p className="text-base md:text-lg font-medium">
              {inputMode === "talk" && isNativeApp ? "I'm listening..." : "Chat with helpem"}
            </p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">
              {inputMode === "talk" && isNativeApp ? "Speak now" : "Type your message below"}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] md:max-w-[80%] p-2.5 md:p-3 rounded-2xl ${
              msg.role === "user"
                ? "bg-brandBlue text-white rounded-br-md"
                : "bg-gray-100 text-brandText rounded-bl-md"
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Priority selector for todos */}
        {pendingAction?.type === "todo" && (
          <div className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200">
            <p className="text-xs md:text-sm text-brandTextLight mb-2">Set priority:</p>
            <div className="flex gap-1.5 md:gap-2 mb-2 md:mb-3">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`flex-1 py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-medium transition-all capitalize
                    ${selectedPriority === p
                      ? p === "high" ? "bg-red-500 text-white" 
                        : p === "medium" ? "bg-amber-500 text-white" 
                        : "bg-green-500 text-white"
                      : "bg-gray-200 text-brandTextLight hover:bg-gray-300"}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={confirmAction} className="flex-1 py-2 bg-brandGreen text-white rounded-lg text-sm font-medium hover:bg-green-600">
                Confirm
              </button>
              <button onClick={cancelAction} className="py-2 px-3 md:px-4 bg-gray-200 text-brandTextLight rounded-lg text-sm hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        )}

        {pendingAction && pendingAction.type !== "todo" && (
          <div className="flex gap-2">
            <button onClick={confirmAction} className="flex-1 py-2 bg-brandGreen text-white rounded-lg text-sm font-medium hover:bg-green-600">
              Confirm
            </button>
            <button onClick={cancelAction} className="py-2 px-3 md:px-4 bg-gray-200 text-brandTextLight rounded-lg text-sm hover:bg-gray-300">
              Cancel
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-brandTextLight p-2.5 md:p-3 rounded-2xl rounded-bl-md">
              <span className="animate-pulse text-sm">helpem is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text Input Area - Only in Type mode */}
      {inputMode === "type" && (
        <div className="p-3 md:p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 min-w-0 border border-gray-200 p-2.5 md:p-3 rounded-xl text-sm md:text-base text-brandText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-brandBlue to-brandGreen text-white rounded-xl text-sm md:text-base font-medium disabled:opacity-50 hover:opacity-90 transition-all flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Voice status shown inline on the Talk button - removed separate status bars */}
    </div>
  );
}
