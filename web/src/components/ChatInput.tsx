"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLife } from "@/state/LifeStore";
import { Priority, Todo } from "@/types/todo";
import { Appointment } from "@/types/appointment";
import { Habit } from "@/types/habit";
import { Grocery } from "@/types/grocery";
import { useNativeAudio } from "@/hooks/useNativeAudio";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    type: "todo" | "habit" | "appointment" | "grocery";
    title?: string; // Optional for groceries
    priority?: Priority;
    datetime?: string;
    frequency?: "daily" | "weekly";
    daysOfWeek?: string[];
    content?: string; // For grocery items
  };
  actionType?: "add" | "update" | "delete"; // Type of CRUD operation performed
  feedback?: "up" | "down"; // User feedback for RLHF
  feedbackId?: string; // Unique ID for this action (for feedback tracking)
  userMessage?: string; // Original user message that triggered this response
  correction?: string; // User's explanation of what went wrong (for thumbs down)
};

const MAX_MESSAGES = 50;
const SESSION_STORAGE_KEY = "helpem_chat_history";

function getDefaultTomorrowReminder(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function formatDateTimeForSpeech(date: Date) {
  return date.toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDateForSpeech(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTimeForSpeech(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isMidnight(date: Date) {
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
}

function setDefaultTime(date: Date, hour = 9, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Parse AI-provided datetime strings as local time when they end with "Z".
// The model often returns "Z" even though the time is intended to be local.
function parseAiDatetime(value: string): Date {
  const raw = value.trim();
  if (/Z$/i.test(raw) && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    const localCandidate = raw.replace(/Z$/i, "");
    const localDate = new Date(localCandidate);
    if (!isNaN(localDate.getTime())) {
      return localDate;
    }
  }
  return new Date(raw);
}

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

interface ChatInputProps {
  onNavigateCalendar?: (date: Date) => void;
}

type PendingDeletion = {
  itemId: string;
  itemTitle: string;
  itemType: "todo" | "appointment" | "routine" | "habit" | "grocery";
  confirmMessage: string;
};

export default function ChatInput({ onNavigateCalendar }: ChatInputProps = {}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<Message["action"] | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [pendingFeedback, setPendingFeedback] = useState<{ messageId: string; feedback: "down" } | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Web Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Track fulfilled intents to avoid repetitive suggestions
  const fulfilledIntentsRef = useRef<Set<string>>(new Set());

  const { todos, habits, appointments, groceries, addTodo, addHabit, addAppointment, addGrocery, updateTodo, updateHabit, updateAppointment, updateGrocery, updateTodoPriority, deleteTodo, deleteHabit, deleteAppointment, deleteRoutine, deleteGrocery, completeGrocery } = useLife();
  
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

  const handleFeedback = useCallback(async (feedbackId: string, feedback: "up" | "down") => {
    // Find message by feedbackId
    const message = messages.find(m => m.feedbackId === feedbackId);
    if (!message) return;

    // For thumbs down, ask for correction first
    if (feedback === "down") {
      setPendingFeedback({ messageId: feedbackId, feedback });
      // Add a prompt asking what went wrong
      addMessage({
        id: uuidv4(),
        role: "assistant",
        content: "I apologize for that. What should I have done instead? Please explain so I can learn and improve.",
      });
      return;
    }

    // For thumbs up, record immediately
    setMessages(prev => prev.map(msg => 
      msg.feedbackId === feedbackId ? { ...msg, feedback } : msg
    ));

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: feedbackId,
          feedback,
          userMessage: message.userMessage || "",
          assistantResponse: message.content,
          action: message.action,
          actionType: message.actionType,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`✅ Feedback recorded: ${feedback} for ${message.actionType} ${message.action?.type} action`);
    } catch (error) {
      console.error("❌ Failed to send feedback:", error);
    }
  }, [messages, addMessage]);

  const submitCorrectionFeedback = useCallback(async () => {
    if (!pendingFeedback || !correctionInput.trim()) return;

    const { messageId, feedback } = pendingFeedback;

    // Update message with feedback and correction
    setMessages(prev => prev.map(msg => 
      msg.feedbackId === messageId ? { ...msg, feedback, correction: correctionInput } : msg
    ));

    const message = messages.find(m => m.feedbackId === messageId);
    if (!message) return;

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          feedback,
          userMessage: message.userMessage,
          assistantResponse: message.content,
          action: message.action,
          correction: correctionInput,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`✅ Feedback with correction recorded for message ${messageId}`);

      // Clear pending state first
      setPendingFeedback(null);
      setCorrectionInput("");

      // AI acknowledges and tries again
      addMessage({
        id: uuidv4(),
        role: "assistant",
        content: "I understand. Let me try again with your correction...",
      });

      // Attempt to apply the correction by re-processing with the correction context
      // Include special marker to tell AI to ask for confirmation after
      const retryPrompt = `${message.userMessage}\n\n[Previous attempt was wrong. User correction: "${correctionInput}"]\n[After completing action, ask user: "Did I get it right this time? 👍 or 👎"]`;
      
      // Add user message for retry
      addMessage({
        id: uuidv4(),
        role: "user",
        content: message.userMessage || retryPrompt,
      });

      // Call API directly to retry (avoid circular dependency with sendMessageWithText)
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: retryPrompt,
            context: {
              todos: todos.map(t => ({ 
                id: t.id, 
                title: t.title, 
                priority: t.priority,
                dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate
              })),
              appointments: appointments.map(a => ({ 
                id: a.id, 
                title: a.title, 
                datetime: typeof a.datetime === 'string' ? a.datetime : a.datetime instanceof Date ? a.datetime.toISOString() : a.datetime 
              })),
              habits: habits.map(h => ({ id: h.id, title: h.title })),
              groceries: groceries.map(g => ({ id: g.id, content: g.content })),
            }
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Process the retry response (will be handled by the normal flow)
          // Note: This is simplified - in production you'd want to handle the full response
          console.log("✅ Retry response:", data);
        }
      } catch (retryError) {
        console.error("❌ Retry failed:", retryError);
      } finally {
        setLoading(false);
      }

    } catch (error) {
      console.error("❌ Failed to send feedback:", error);
    }
  }, [pendingFeedback, correctionInput, messages, addMessage, todos, appointments, habits, groceries]);

  const clearChat = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    fulfilledIntentsRef.current.clear();
    console.log("🗑️ Chat history cleared");
  }, []);

  const sendMessageWithText = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: text,
    };

    addMessage(userMessage);
    setInput("");

    // Check if user is responding to a pending deletion confirmation
    if (pendingDeletion) {
      const lowerText = text.toLowerCase().trim();
      const isYes = lowerText === "yes" || lowerText === "y" || lowerText === "yeah" || lowerText === "yep" || lowerText === "confirm";
      const isNo = lowerText === "no" || lowerText === "n" || lowerText === "nope" || lowerText === "cancel";
      
      if (isYes) {
        // Delete the item
        if (pendingDeletion.itemType === "todo") {
          deleteTodo(pendingDeletion.itemId);
        } else if (pendingDeletion.itemType === "appointment") {
          deleteAppointment(pendingDeletion.itemId);
        } else if (pendingDeletion.itemType === "routine" || pendingDeletion.itemType === "habit") {
          deleteHabit(pendingDeletion.itemId);
        } else if (pendingDeletion.itemType === "grocery") {
          deleteGrocery(pendingDeletion.itemId);
        }
        
        const responseText = pendingDeletion.confirmMessage;
        const feedbackId = uuidv4();
        addMessage({
          id: uuidv4(),
          role: "assistant",
          content: responseText,
          action: { type: pendingDeletion.itemType as any, title: pendingDeletion.itemTitle },
          actionType: "delete",
          feedbackId,
          userMessage: text,
        });
        
        if (isNativeApp) {
          window.webkit?.messageHandlers?.native?.postMessage({
            action: "speak",
            text: responseText,
          });
        }
        
        setPendingDeletion(null);
        return;
        
      } else if (isNo) {
        // User cancelled deletion
        const responseText = `Okay, I won't delete "${pendingDeletion.itemTitle}".`;
        addMessage({
          id: uuidv4(),
          role: "assistant",
          content: responseText,
        });
        
        if (isNativeApp) {
          window.webkit?.messageHandlers?.native?.postMessage({
            action: "speak",
            text: responseText,
          });
        }
        
        setPendingDeletion(null);
        return;
      }
      
      // If neither yes nor no, clear pending deletion and process as normal message
      setPendingDeletion(null);
    }

    // Detect intent from user message
    const intent = detectIntent(text);
    
    // Reset fulfilled intents if user explicitly re-queries
    if (isRequery(text)) {
      fulfilledIntentsRef.current.clear();
    }

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
            userData: { todos, habits, appointments, groceries },
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
      
      // DEBUG: Log what agent returned
      console.log("Agent response:", JSON.stringify(data, null, 2));

      // Store user message for feedback tracking
      const userMessageForFeedback = text;

      if (data.action === "add") {
        const displayType = data.type === "habit" ? "routine" : data.type;
        const internalType = data.type === "routine" ? "habit" : data.type;
        const id = uuidv4();
        const now = new Date();

        if (internalType === "todo") {
          const hasDate = !!data.datetime;
          const rawDate = hasDate ? parseAiDatetime(data.datetime) : null;
          const hasExplicitTime = hasDate && rawDate && !isMidnight(rawDate);
          const baseDate = hasDate && rawDate ? rawDate : null;
          const reminderDate: Date | undefined = hasExplicitTime ? baseDate! : undefined;
          const priorityValue = data.priority || "medium";

          // Add to local state first (always works)
          addTodo({
            id,
            title: data.title,
            priority: priorityValue,
            dueDate: reminderDate,
            reminderTime: reminderDate,
            createdAt: now,
          });
          
          // Try to save to database (non-blocking)
          try {
            const apiResponse = await fetch("/api/todos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: data.title,
                priority: priorityValue,
                dueDate: reminderDate?.toISOString(),
                reminderTime: reminderDate?.toISOString(),
              }),
            });
            
            if (!apiResponse.ok) {
              console.warn("⚠️ Failed to save todo to database (but added locally)");
            } else {
              console.log("✅ Todo saved to database successfully");
            }
          } catch (err) {
            console.error("❌ Database save failed (todo saved locally):", err);
          }

          // FORCE confirmation with details - never allow empty message
          let responseText = data.message;
          
          // If agent didn't provide proper confirmation, generate one
          if (!responseText || responseText.trim() === "Got it." || responseText.trim() === "Okay." || responseText.trim() === "Done.") {
            if (hasExplicitTime) {
              responseText = `Got it. I'll remind you to ${data.title.toLowerCase()} on ${formatDateTimeForSpeech(reminderDate!)}.`;
            } else if (hasDate) {
              responseText = `Got it. I'll remind you to ${data.title.toLowerCase()} on ${formatDateForSpeech(baseDate!)}.`;
            } else {
              responseText = `Got it. I'll remind you to ${data.title.toLowerCase()}.`;
            }
          }

          // ALWAYS add message to chat window (both native and web)
          const feedbackId = uuidv4();
          addMessage({
            id: uuidv4(),
            role: "assistant",
            content: responseText,
            action: { type: "todo", title: data.title, priority: priorityValue, datetime: reminderDate?.toISOString() },
            actionType: "add",
            feedbackId,
            userMessage: userMessageForFeedback,
          });

          if (isNativeApp) {
            // Also speak the confirmation for native app
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
            
            // Schedule notification ONLY for reminders (todos with specific time/date)
            // Regular todos/tasks without time do NOT get notifications
            if (reminderDate && hasExplicitTime) {
              console.log(`🔔 REMINDER: Scheduling notification for "${data.title}" at`, reminderDate);
              window.webkit?.messageHandlers?.native?.postMessage({
                action: "scheduleNotification",
                id: id,
                title: "Reminder",
                body: data.title,
                date: reminderDate.toISOString(),
              });
            } else {
              console.log(`📝 TODO: No notification (no specific time) for "${data.title}"`);
            }
          } else {
            // Only show follow-ups if agent didn't provide custom message (web only)
            if (!data.message) {
              // Visual follow-up for time and priority in type mode
              if (!hasExplicitTime) {
                const timePrompt = `Add a specific date or time for "${data.title}"?`;
                addMessage({
                  id: uuidv4(),
                  role: "assistant",
                  content: timePrompt,
                });
              }
              addMessage({
                id: uuidv4(),
                role: "assistant",
                content: `Set a priority for "${data.title}": high, medium, or low. Default is ${priorityValue}.`,
              });
            }
          }
        } else if (internalType === "habit") {
          addHabit({
            id,
            title: data.title,
            frequency: data.frequency || "daily",
            createdAt: now,
            completions: [],
            daysOfWeek: data.daysOfWeek,
          });

          const days = data.daysOfWeek?.length ? ` on ${data.daysOfWeek.join(", ")}` : "";
          const responseText = `Added routine "${data.title}"${days}.`;
          const feedbackId = uuidv4();
          addMessage({ 
            id: uuidv4(), 
            role: "assistant", 
            content: responseText,
            action: { type: "habit", title: data.title, frequency: data.frequency || "daily", daysOfWeek: data.daysOfWeek },
            actionType: "add",
            feedbackId,
            userMessage: userMessageForFeedback,
          });

          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
          }
        } else if (internalType === "appointment") {
          // Parse datetime with fallback logic
          let datetime: Date;
          if (data.datetime) {
            datetime = parseAiDatetime(data.datetime);
            // Check if datetime is valid
            if (isNaN(datetime.getTime())) {
              console.error("❌ Invalid datetime from AI:", data.datetime);
              datetime = getDefaultTomorrowReminder(); // Fallback to tomorrow 9am
            }
          } else {
            console.warn("⚠️ No datetime provided by AI for appointment, using tomorrow 9am");
            datetime = getDefaultTomorrowReminder(); // Fallback to tomorrow 9am
          }
          
          console.log("📅 Creating appointment:", {
            id,
            title: data.title,
            datetime: datetime.toISOString(),
            originalDatetime: data.datetime,
            isValid: !isNaN(datetime.getTime())
          });
          
          // Save to database
          const responseText = data.message || `Added appointment "${data.title}" for ${formatDateTimeForSpeech(datetime)}.`;
          
          // Always add to local state first (works even offline)
          console.log("📅 ChatInput: Calling addAppointment with:", {
            id,
            title: data.title,
            datetime: datetime.toISOString(),
            createdAt: now.toISOString(),
          });
          
          addAppointment({
            id,
            title: data.title,
            datetime,
            createdAt: now,
          });
          
          console.log("✅ ChatInput: addAppointment call completed");
          
          // Try to save to database (non-blocking)
          console.log('🌐 ========================================');
          console.log('🌐 ChatInput: Starting database save...');
          console.log('🌐 ========================================');
          
          try {
            console.log('🌐 Preparing fetch to /api/appointments');
            console.log('🌐 Request payload:', {
              title: data.title,
              datetime: datetime.toISOString(),
            });
            
            const apiResponse = await fetch("/api/appointments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: data.title,
                datetime: datetime.toISOString(),
              }),
            });
            
            console.log('📡 API Response received');
            console.log('📡 Status:', apiResponse.status, apiResponse.statusText);
            console.log('📡 OK:', apiResponse.ok);
            
            if (!apiResponse.ok) {
              const errorData = await apiResponse.json();
              console.error('❌ ========================================');
              console.error("❌ Failed to save appointment to database");
              console.error("❌ Status:", apiResponse.status);
              console.error("❌ Error data:", errorData);
              console.error('❌ ========================================');
              
              // Don't fail the whole operation - appointment is already in local state
              // Just log the issue
              if (apiResponse.status === 401) {
                console.error("❌ AUTHENTICATION FAILED - 401 Unauthorized");
                console.error("❌ This means the user session is not valid");
                console.error("❌ Check:");
                console.error("   - Is session token in keychain?");
                console.error("   - Is Authorization header being sent?");
                console.error("   - Is token valid/expired?");
              }
            } else {
              const successData = await apiResponse.json();
              console.log('✅ ========================================');
              console.log("✅ Appointment saved to database successfully!");
              console.log("✅ Response data:", successData);
              console.log('✅ ========================================');
            }
          } catch (err) {
            console.error('💥 ========================================');
            console.error("💥 EXCEPTION during database save");
            console.error("💥 Error:", err);
            console.error("💥 Error type:", err instanceof Error ? err.constructor.name : typeof err);
            console.error("💥 Error message:", err instanceof Error ? err.message : String(err));
            console.error('💥 ========================================');
            // Don't show error to user - appointment is in local state and working
          }

          console.log("✅ Appointment added to local state");

          // Show success message
          const feedbackId = uuidv4();
          addMessage({ 
            id: uuidv4(), 
            role: "assistant", 
            content: responseText,
            action: { type: "appointment", title: data.title, datetime: datetime.toISOString() },
            actionType: "add",
            feedbackId,
            userMessage: userMessageForFeedback,
          });

          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
            
            // Schedule notification for appointment (1 hour before)
            const notificationTime = new Date(datetime.getTime() - 60 * 60 * 1000); // 1 hour before
            if (notificationTime > new Date()) { // Only if in the future
              console.log(`🔔 Scheduling appointment notification for "${data.title}" at`, notificationTime);
              window.webkit?.messageHandlers?.native?.postMessage({
                action: "scheduleNotification",
                id: `${id}-reminder`,
                title: "Upcoming Appointment",
                body: `${data.title} in 1 hour`,
                date: notificationTime.toISOString(),
              });
            }
          }
        } else if (internalType === "grocery") {
          // Support both single item and multiple items (array)
          const items = data.items || [data.title || data.content];
          
          console.log("🛒 Creating grocery items:", { items });
          
          // Add all items to local state
          for (const itemContent of items) {
            if (itemContent && itemContent.trim()) {
              const id = uuidv4();
              addGrocery({
                id,
                content: itemContent.trim(),
                completed: false,
                createdAt: now,
              });
              
              // Try to save each item to database (non-blocking)
              try {
                const apiResponse = await fetch("/api/groceries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: itemContent.trim() }),
                });
                
                if (!apiResponse.ok) {
                  console.warn(`⚠️ Failed to save "${itemContent}" to database (but added locally)`);
                } else {
                  console.log(`✅ "${itemContent}" saved to database successfully`);
                }
              } catch (err) {
                console.error(`❌ Database save failed for "${itemContent}" (saved locally):`, err);
              }
            }
          }
          
          const responseText = data.message || `Added ${items.length} item${items.length > 1 ? 's' : ''} to your grocery list.`;
          const feedbackId = uuidv4();
          addMessage({ 
            id: uuidv4(), 
            role: "assistant", 
            content: responseText,
            action: { type: "grocery", content: items.join(", ") },
            actionType: "add",
            feedbackId,
            userMessage: userMessageForFeedback,
          });

          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
          }
        }

        // No confirmation flows; we add immediately.
        setPendingAction(null);
        setSelectedPriority(data.priority || "medium");

      } else if (data.action === "update_priority") {
        // Fuzzy match: find todo by partial title match
        const searchTitle = data.todoTitle?.toLowerCase() || "";
        const todoToUpdate = todos.find(t => 
          t.title.toLowerCase().includes(searchTitle) || 
          searchTitle.includes(t.title.toLowerCase())
        );
        
        if (todoToUpdate) {
          console.log(`🎯 Updating todo priority: "${todoToUpdate.title}" → ${data.newPriority}`);
          updateTodoPriority(todoToUpdate.id, data.newPriority);
          const responseText = data.message || `Updated "${todoToUpdate.title}" to ${data.newPriority} priority.`;
          addMessage({
            id: uuidv4(),
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
          console.warn(`❌ Could not find todo matching: "${data.todoTitle}"`);
          console.log(`Available todos: ${todos.map(t => t.title).join(', ')}`);
          const responseText = `I couldn't find a todo called "${data.todoTitle}".`;
          addMessage({
            id: uuidv4(),
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
        
      } else if (data.action === "navigate_calendar" && data.date) {
        // Navigate calendar to specific date
        const targetDate = new Date(data.date);
        if (onNavigateCalendar) {
          onNavigateCalendar(targetDate);
        }
        
        const responseText = data.message || "Showing your calendar for that day.";
        addMessage({
          id: uuidv4(),
          role: "assistant",
          content: responseText,
        });
        
        if (isNativeApp) {
          window.webkit?.messageHandlers?.native?.postMessage({
            action: "speak",
            text: responseText,
          });
        }
        
      } else if (data.action === "update") {
        // Handle UPDATE requests for todos, appointments, habits, and groceries
        const itemType = data.type; // "todo", "appointment", "routine", "habit", "grocery"
        const searchTitle = data.title;
        const updates = data.updates || {};
        
        console.log('🔄 UPDATE action received:', { itemType, searchTitle, updates });
        
        // Find the item by title (fuzzy match)
        let itemToUpdate: any = null;
        let actualType = itemType;
        
        if (itemType === "todo") {
          itemToUpdate = todos.find(t => 
            t.title.toLowerCase().includes(searchTitle?.toLowerCase()) ||
            searchTitle?.toLowerCase().includes(t.title.toLowerCase())
          );
        } else if (itemType === "appointment") {
          itemToUpdate = appointments.find(a => 
            a.title.toLowerCase().includes(searchTitle?.toLowerCase()) ||
            searchTitle?.toLowerCase().includes(a.title.toLowerCase())
          );
        } else if (itemType === "routine" || itemType === "habit") {
          actualType = "habit";
          itemToUpdate = habits.find(h => 
            h.title.toLowerCase().includes(searchTitle?.toLowerCase()) ||
            searchTitle?.toLowerCase().includes(h.title.toLowerCase())
          );
        } else if (itemType === "grocery") {
          itemToUpdate = groceries.find(g => 
            g.content.toLowerCase().includes(searchTitle?.toLowerCase()) ||
            searchTitle?.toLowerCase().includes(g.content.toLowerCase())
          );
        }
        
        if (!itemToUpdate) {
          const responseText = `I couldn't find a ${itemType} called "${searchTitle}".`;
          addMessage({
            id: uuidv4(),
            role: "assistant",
            content: responseText,
          });
          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
          }
        } else {
          // Perform the update
          try {
            if (actualType === "todo") {
              // Update TODO using context function
              
              // Handle priority separately with dedicated function for consistency
              if (updates.priority) {
                console.log(`🎯 Updating todo priority via update action: "${itemToUpdate.title}" → ${updates.priority}`);
                updateTodoPriority(itemToUpdate.id, updates.priority);
              }
              
              // Handle other updates
              const todoUpdates: Partial<Todo> = {};
              if (updates.newTitle) todoUpdates.title = updates.newTitle;
              if (updates.dueDate) todoUpdates.dueDate = parseAiDatetime(updates.dueDate);
              if (updates.markComplete) todoUpdates.completedAt = new Date();
              
              if (Object.keys(todoUpdates).length > 0) {
                updateTodo(itemToUpdate.id, todoUpdates);
              }
              
            } else if (actualType === "appointment") {
              // Update APPOINTMENT using context function
              const appointmentUpdates: Partial<Appointment> = {};
              
              if (updates.newTitle) appointmentUpdates.title = updates.newTitle;
              if (updates.datetime) appointmentUpdates.datetime = parseAiDatetime(updates.datetime);
              
              updateAppointment(itemToUpdate.id, appointmentUpdates);
              
            } else if (actualType === "habit") {
              // Update HABIT/ROUTINE using context function
              const habitUpdates: Partial<Habit> = {};
              
              if (updates.newTitle) habitUpdates.title = updates.newTitle;
              if (updates.frequency) habitUpdates.frequency = updates.frequency;
              if (updates.daysOfWeek) habitUpdates.daysOfWeek = updates.daysOfWeek;
              if (updates.logCompletion) {
                // Log completion by appending to completions array
                habitUpdates.completions = [...(itemToUpdate.completions || []), { date: new Date() }];
              }
              
              updateHabit(itemToUpdate.id, habitUpdates);
              
            } else if (actualType === "grocery") {
              // Update GROCERY using context function
              const groceryUpdates: Partial<Grocery> = {};
              
              if (updates.newContent || updates.newTitle) {
                groceryUpdates.content = updates.newContent || updates.newTitle;
              }
              if (updates.markComplete) {
                groceryUpdates.completed = true;
                groceryUpdates.completedAt = new Date();
              }
              
              updateGrocery(itemToUpdate.id, groceryUpdates);
            }
            
            // Show success message
            const displayTitle = actualType === "grocery" ? itemToUpdate.content : itemToUpdate.title;
            const responseText = data.message || `Updated "${displayTitle}".`;
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: responseText,
            });
            
            if (isNativeApp) {
              window.webkit?.messageHandlers?.native?.postMessage({
                action: "speak",
                text: responseText,
              });
            }
          } catch (error) {
            console.error('❌ Error updating item:', error);
            const errorText = `Sorry, I couldn't update "${searchTitle}".`;
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: errorText,
            });
            if (isNativeApp) {
              window.webkit?.messageHandlers?.native?.postMessage({
                action: "speak",
                text: errorText,
              });
            }
          }
        }
        
      } else if (data.action === "delete") {
        // Handle deletion requests with inline confirmation
        const itemType = data.type; // "todo", "appointment", "routine", "habit", "grocery"
        let itemToDelete: any = null;
        let itemTitle = "";
        
        // Find the item by title (fuzzy match)
        if (itemType === "todo") {
          itemToDelete = todos.find(t => 
            t.title.toLowerCase().includes(data.title?.toLowerCase()) ||
            data.title?.toLowerCase().includes(t.title.toLowerCase())
          );
          itemTitle = itemToDelete?.title;
        } else if (itemType === "appointment") {
          itemToDelete = appointments.find(a => 
            a.title.toLowerCase().includes(data.title?.toLowerCase()) ||
            data.title?.toLowerCase().includes(a.title.toLowerCase())
          );
          itemTitle = itemToDelete?.title;
        } else if (itemType === "routine" || itemType === "habit") {
          itemToDelete = habits.find(h => 
            h.title.toLowerCase().includes(data.title?.toLowerCase()) ||
            data.title?.toLowerCase().includes(h.title.toLowerCase())
          );
          itemTitle = itemToDelete?.title;
        } else if (itemType === "grocery") {
          itemToDelete = groceries.find(g => 
            g.content.toLowerCase().includes(data.title?.toLowerCase()) ||
            data.title?.toLowerCase().includes(g.content.toLowerCase())
          );
          itemTitle = itemToDelete?.content;
        }
        
        if (!itemToDelete) {
          const responseText = `I couldn't find a ${itemType} called "${data.title}".`;
          addMessage({
            id: uuidv4(),
            role: "assistant",
            content: responseText,
          });
          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: responseText,
            });
          }
        } else {
          // Store pending deletion and show inline confirmation
          setPendingDeletion({
            itemId: itemToDelete.id,
            itemTitle: itemTitle,
            itemType: itemType,
            confirmMessage: data.message || `Removed "${itemTitle}" from your ${itemType}s.`,
          });
          
          const confirmText = `Are you sure you want to delete "${itemTitle}"? Reply with "yes" to confirm or "no" to cancel.`;
          addMessage({
            id: uuidv4(),
            role: "assistant",
            content: confirmText,
          });
          
          if (isNativeApp) {
            window.webkit?.messageHandlers?.native?.postMessage({
              action: "speak",
              text: confirmText,
            });
          }
        }
        
      } else if (data.action === "clear_chat") {
        // Clear chat history
        clearChat();
        
        const responseText = data.message || "Chat cleared.";
        addMessage({
          id: uuidv4(),
          role: "assistant",
          content: responseText,
        });
        
        if (isNativeApp) {
          window.webkit?.messageHandlers?.native?.postMessage({
            action: "speak",
            text: responseText,
          });
        }
        
      } else {
        const rawResponse = data.message || data.error || "I'm not sure how to help with that.";
        let responseText = stripMarkdown(rawResponse);
        
        // Strip out any accidental JSON that might be in the response
        responseText = responseText.replace(/\{[^}]*"action"[^}]*\}/g, '').trim();
        
        addMessage({
          id: uuidv4(),
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
        id: uuidv4(),
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
  }, [loading, messages, todos, habits, appointments, addMessage, clearChat, updateTodoPriority, isNativeApp, pendingDeletion, deleteTodo, deleteAppointment, deleteHabit, addTodo, addAppointment, addHabit, updateTodo, updateAppointment, updateHabit]);

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

    const id = uuidv4();
    const now = new Date();
    
    // Extract title with fallback for groceries (which use content instead)
    const title = pendingAction.title || pendingAction.content || "Untitled";

    switch (pendingAction.type) {
      case "todo":
        addTodo({ id, title, priority: selectedPriority, dueDate: pendingAction.datetime ? parseAiDatetime(pendingAction.datetime) : undefined, createdAt: now });
        break;
      case "habit":
        addHabit({ id, title, frequency: pendingAction.frequency || "daily", createdAt: now, completions: [] });
        break;
      case "appointment":
        addAppointment({ id, title, datetime: pendingAction.datetime ? parseAiDatetime(pendingAction.datetime) : now, createdAt: now });
        break;
    }

    const displayType = pendingAction.type === "habit" ? "routine" : pendingAction.type;
    const confirmText = `Done! Added to your ${displayType}s.`;
    
    addMessage({ id: uuidv4(), role: "assistant", content: `✓ ${confirmText}` });
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
    addMessage({ id: uuidv4(), role: "assistant", content: cancelText });
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

  // Ref for scrolling to chat module
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to chat module when user clicks input buttons
  const scrollToChatModule = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, []);

  return (
    <div ref={chatContainerRef} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[500px]">
      {/* Header with Type/Talk toggle - STICKY below greeting module */}
      <div className="sticky top-[120px] z-10 bg-white flex items-center justify-between p-3 border-b border-gray-100 rounded-t-xl md:rounded-t-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInputMode("type");
              window.__conversationStarted = false;
              if (isListening) stopListening();
              scrollToChatModule(); // Auto-scroll to chat when clicked
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
              scrollToChatModule(); // Auto-scroll to chat when pressed
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

      {/* Messages - Scrollable content area */}
      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 ${inputMode === "type" ? "pb-4" : ""}`}>
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
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2 items-start`}>
            <div className={`max-w-[85%] md:max-w-[80%] p-2.5 md:p-3 rounded-2xl ${
              msg.role === "user"
                ? "bg-brandBlue text-white rounded-br-md"
                : "bg-gray-100 text-brandText rounded-bl-md"
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
            {/* Feedback buttons ONLY for action messages (add/update/delete across 4 categories) */}
            {msg.role === "assistant" && msg.feedbackId && msg.actionType && (
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => handleFeedback(msg.feedbackId!, "up")}
                  className={`p-1 rounded transition-colors ${
                    msg.feedback === "up" 
                      ? "bg-green-100 text-green-600" 
                      : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                  }`}
                  title="Correct action"
                >
                  👍
                </button>
                <button
                  onClick={() => handleFeedback(msg.feedbackId!, "down")}
                  className={`p-1 rounded transition-colors ${
                    msg.feedback === "down" 
                      ? "bg-red-100 text-red-600" 
                      : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                  title="Wrong action"
                >
                  👎
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Correction input for thumbs down */}
        {pendingFeedback && (
          <div className="bg-red-50 p-3 md:p-4 rounded-xl border border-red-200">
            <p className="text-xs md:text-sm text-red-700 font-medium mb-2">
              What should I have done instead?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={correctionInput}
                onChange={(e) => setCorrectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && correctionInput.trim()) {
                    submitCorrectionFeedback();
                  }
                }}
                placeholder="e.g., 'You should have created an appointment, not a todo'"
                className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <button
                onClick={submitCorrectionFeedback}
                disabled={!correctionInput.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setPendingFeedback(null);
                  setCorrectionInput("");
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Priority selector for todos */}
        {!isNativeApp && pendingAction?.type === "todo" && (
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

        {/* Confirm UI disabled for talk mode; not used for native */}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-brandTextLight p-2.5 md:p-3 rounded-2xl rounded-bl-md">
              <span className="animate-pulse text-sm">helpem is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text Input Area - Only in Type mode - STICKY at bottom */}
      {inputMode === "type" && (
        <div className="sticky bottom-0 bg-white p-3 md:p-4 border-t border-gray-100 rounded-b-xl md:rounded-b-2xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={scrollToChatModule}
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
