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
  inputMode?: InputMode;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

type PendingDeletion = {
  itemId: string;
  itemTitle: string;
  itemType: "todo" | "appointment" | "routine" | "habit" | "grocery";
  confirmMessage: string;
};

export default function ChatInput({ 
  onNavigateCalendar, 
  inputMode: externalInputMode,
  onRecordingStart,
  onRecordingStop 
}: ChatInputProps = {}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<Message["action"] | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localInputMode, setLocalInputMode] = useState<InputMode>("type");
  const inputMode = externalInputMode || localInputMode;
  const [pendingFeedback, setPendingFeedback] = useState<{ messageId: string; feedback: "down" } | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptRef = useRef<string | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const pendingPriorityTodoIdRef = useRef<string | null>(null);
  const pendingPriorityTodoTitleRef = useRef<string | null>(null);
  
  // Simple appointment state tracker
  type AppointmentBuilder = {
    id: string;
    title?: string;
    datetime?: Date;
    durationMinutes?: number;
    withWhom?: string | null;
    topic?: string | null;
    location?: string | null;
    askedForOptionalFields: boolean;
  };
  const appointmentBuilderRef = useRef<AppointmentBuilder | null>(null);
  
  // Legacy refs - to be removed
  const pendingAppointmentContextRef = useRef<string | null>(null);
  const pendingAppointmentWithWhomRef = useRef<string | null>(null);
  const pendingAppointmentTopicRef = useRef<string | null>(null);
  const pendingAppointmentDeclinedWhoRef = useRef(false);
  const pendingAppointmentDeclinedWhatRef = useRef(false);
  const pendingAppointmentQuestionRef = useRef<"who_what" | "what" | null>(null);
  const pendingAppointmentUpdateRef = useRef<any | null>(null);
  const lastAppointmentIdRef = useRef<string | null>(null);
  const lastAppointmentTitleRef = useRef<string | null>(null);
  const askedWhoWhatForAppointmentRef = useRef<string | null>(null);
  const waitingForOptionalFieldsRef = useRef(false);

  // Simple state checkers
  // Check if appointment has ALL 4 mandatory fields
  const hasAllMandatoryFields = (builder: AppointmentBuilder) => {
    return !!(builder.title && builder.datetime && builder.durationMinutes && builder.withWhom);
  };
  
  const needsOptionalFields = (builder: AppointmentBuilder) => {
    return !builder.askedForOptionalFields;
  };

  const deriveAppointmentTitle = (
    title: string | undefined,
    withWhom?: string | null,
    topic?: string | null
  ) => {
    const trimmed = title?.trim() || "";
    const safeWithWhom = withWhom?.trim();
    const safeTopic = topic?.trim();
    const isGenericTitle = !trimmed || /^(meeting|appointment)$/i.test(trimmed);

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const overlaps = (a?: string | null, b?: string | null) => {
      if (!a || !b) return false;
      const na = normalize(a);
      const nb = normalize(b);
      if (!na || !nb) return false;
      return na.includes(nb) || nb.includes(na);
    };

    // If title is specific, keep it unless it's essentially the same as topic.
    if (!isGenericTitle) {
      if (safeTopic && overlaps(trimmed, safeTopic)) return trimmed;
      return trimmed;
    }

    if (safeTopic && safeWithWhom) {
      return `${safeTopic} with ${safeWithWhom}`;
    }
    if (safeTopic) return safeTopic;

    if (safeWithWhom) {
      return `Meeting with ${safeWithWhom}`;
    }
    return "Meeting";
  };
  
  const isDeclineReply = (text: string) => {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized === "no" ||
      normalized === "nope" ||
      normalized === "nah" ||
      normalized.startsWith("no ") ||
      normalized.startsWith("not ") ||
      normalized.includes("no thanks") ||
      normalized.includes("don't") ||
      normalized.includes("do not") ||
      normalized.includes("doesn't matter") ||
      normalized.includes("no particular") ||
      normalized.includes("not about") ||
      normalized.includes("not sure")
    );
  };
  
  // Check if user is trying to correct appointment details (time, date, duration)
  // IMPORTANT: Distinguish between DECLINING optional fields vs CORRECTING appointment details
  const isCorrectionAttempt = (text: string) => {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return false;
    
    // Check if this is a simple decline (answering optional field question)
    // These are responses to "Would you like to add [optional fields]?"
    const isSimpleDecline = 
      normalized === "no" ||
      normalized === "nope" ||
      normalized === "nah" ||
      normalized === "no thanks" ||
      normalized.startsWith("no that") ||  // "no that's fine", "no that's okay"
      normalized.startsWith("no it's") ||  // "no it's fine", "no it's good"
      normalized.startsWith("no its") ||   // "no its fine"
      normalized.startsWith("no i don't") ||  // "no i don't need to", "no i don't want to"
      normalized.startsWith("no i do not") ||
      normalized.startsWith("i said no") ||
      normalized.includes("i do not want to add") ||
      normalized.includes("i don't want to add") ||
      normalized.includes("i dont want to add") ||
      normalized.startsWith("not needed") ||
      normalized.startsWith("not necessary") ||
      normalized.match(/^no[,.]?\s*(thanks|that'?s\s*(fine|okay|good|alright|unnecessary)|i\s+don'?t|not\s+(needed|necessary))$/i);
    
    if (isSimpleDecline) return false; // NOT a correction, just declining

    const mentionsOptionalFields = /\b(about|what it's about|what it'?s about|where|location|address|at|in)\b/i.test(normalized);
    const hasOptionalFieldNegation = /(\bnot\b|\bno\b|\bdon't\b|\bdo not\b|\bdont\b).*(about|what|where|location)/i.test(normalized);
    if (mentionsOptionalFields && hasOptionalFieldNegation) {
      return false;
    }
    
    // EXPLICIT correction phrases (user is providing NEW information or contradicting)
    const hasCorrectionPhrase = 
      normalized.includes("i said") ||
      normalized.includes("i meant") ||
      normalized.includes("meant to say") ||
      normalized.includes("actually") ||
      normalized.includes("correction") ||
      normalized.includes("that's wrong") ||
      normalized.includes("that's incorrect") ||
      normalized.includes("mistake") ||
      (normalized.includes("not") && normalized.includes("said")) ||
      (normalized.includes("didn't") && normalized.includes("say")) ||
      (normalized.startsWith("no") && (
        normalized.includes("i said") ||
        normalized.includes("it's") ||
        normalized.includes("set it") ||
        normalized.includes("supposed to")
      ));
    
    const hasDateOrTime =
      /\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(normalized) ||
      /\b(at|around)\s+\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(normalized) ||
      /\b\d{1,2}\s*(am|pm)\b/i.test(normalized);
    const hasDuration = /\b(\d+)\s*(hours?|hrs?|minutes?|mins?)\b/i.test(normalized);
    const hasWhoCorrection = /\b(with|who)\b/i.test(normalized);
    const hasMandatoryCorrection = hasDateOrTime || hasDuration || hasWhoCorrection;

    if (mentionsOptionalFields && !hasMandatoryCorrection) {
      return false;
    }

    return hasCorrectionPhrase || hasMandatoryCorrection;
  };
  
  // Extract OPTIONAL fields only (topic and location)
  // withWhom is MANDATORY and handled by AI, so we don't extract it here
  const extractOptionalFields = (input: string) => {
    const text = input.trim();
    let topic: string | null = null;
    let location: string | null = null;
    
    // Extract "about [topic]"
    const aboutMatch = text.match(/\babout\b\s+(.*?)(?:\s+\b(?:at|in)\b|$)/i);
    if (aboutMatch && aboutMatch[1]) {
      topic = aboutMatch[1].trim();
    }
    
    // Extract "at [location]" or "in [location]"
    const locationMatch = text.match(/\b(?:at|in)\b\s+(.+?)$/i);
    if (locationMatch && locationMatch[1]) {
      location = locationMatch[1].trim();
    }
    
    // If no "about" keyword, try to extract topic after affirmatives
    // e.g., "Yeah the quarterly review" or "Yes project planning"
    if (!topic && !location) {
      const topicMatch = text.match(/(?:yeah|yes|sure|okay|it'?s)\s+(?:the\s+)?(?:meeting|appointment)?\s*(?:is\s+)?(?:about\s+)?(.+)/i);
      if (topicMatch && topicMatch[1]) {
        const extracted = topicMatch[1].trim();
        // Make sure it's not just filler words
        const fillerWords = /(yeah|yes|sure|okay|the|meeting|appointment|is|about|with|at|in|and|or|it)/i;
        if (extracted && !fillerWords.test(extracted)) {
          topic = extracted;
        }
      }
    }
    
    return { topic, location };
  };
  
  // Legacy helper functions
  const titleHasTopic = (title?: string | null) => {
    if (!title) return false;
    return /\babout\b/i.test(title);
  };
  
  const getWhoWhatPrompt = (title?: string | null, withWhom?: string | null) => {
    const hasTopic = titleHasTopic(title);
    const needsWhat = Boolean(withWhom) && !hasTopic && !pendingAppointmentDeclinedWhatRef.current;
    const needsWho = !withWhom && !pendingAppointmentDeclinedWhoRef.current;
    
    if (needsWho) {
      return "Would you like for me to add who the meeting is with and what it's about?";
    } else if (needsWhat) {
      return "Would you like for me to add what the meeting is about?";
    }
    return null;
  };
  
  const extractFollowupDetails = (input: string) => {
    const text = input.trim();
    const durationMatch = text.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)\b/i);
    let durationMinutes: number | null = null;
    if (durationMatch) {
      const value = Number(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (Number.isFinite(value)) {
        durationMinutes = unit.startsWith("hour") || unit.startsWith("hr")
          ? Math.round(value * 60)
          : Math.round(value);
      }
    }

    let withWhom: string | null = null;
    const withMatch = text.match(/\bwith\b\s+(.*?)(?:\s+\babout\b|$)/i);
    if (withMatch && withMatch[1]) {
      withWhom = withMatch[1].trim();
    }

    let topic: string | null = null;
    const aboutMatch = text.match(/\babout\b\s+(.*)$/i);
    if (aboutMatch && aboutMatch[1]) {
      topic = aboutMatch[1].trim();
    }

    return { durationMinutes, withWhom, topic };
  };
  
  // Web Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Track fulfilled intents to avoid repetitive suggestions
  const fulfilledIntentsRef = useRef<Set<string>>(new Set());

  const { todos, habits, appointments, groceries, addTodo, addHabit, addAppointment, addGrocery, updateTodo, updateHabit, updateAppointment, updateGrocery, updateTodoPriority, deleteTodo, deleteHabit, deleteAppointment, deleteRoutine, deleteGrocery, completeGrocery } = useLife();
  
  // Native audio hook for iOS app
  const nativeAudio = useNativeAudio();
  const isNativeApp = nativeAudio.isNative;

  const speakQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const speakReleaseTimerRef = useRef<number | null>(null);

  const estimateSpeechMs = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 800;
    const perCharMs = 45;
    const baseMs = 600;
    return Math.min(12000, baseMs + trimmed.length * perCharMs);
  };

  const flushSpeakQueue = useCallback(() => {
    if (!isNativeApp) return;
    if (isSpeakingRef.current) return;
    const nextText = speakQueueRef.current.shift();
    if (!nextText) return;
    isSpeakingRef.current = true;
    window.webkit?.messageHandlers?.native?.postMessage({
      action: "speak",
      text: nextText,
    });
    if (speakReleaseTimerRef.current) {
      window.clearTimeout(speakReleaseTimerRef.current);
    }
    const estimatedMs = estimateSpeechMs(nextText);
    speakReleaseTimerRef.current = window.setTimeout(() => {
      isSpeakingRef.current = false;
      flushSpeakQueue();
    }, estimatedMs + 250);
  }, [isNativeApp, estimateSpeechMs]);

  const speakNative = useCallback((text: string, delayMs = 0) => {
    if (!isNativeApp) return;
    const enqueue = () => {
      speakQueueRef.current.push(text);
      flushSpeakQueue();
    };
    if (delayMs > 0) {
      window.setTimeout(enqueue, delayMs);
      return;
    }
    enqueue();
  }, [isNativeApp, flushSpeakQueue]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    saveSessionMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (!isNativeApp) return;
    if (!nativeAudio.isPlaying && isSpeakingRef.current) {
      isSpeakingRef.current = false;
    }
    if (!nativeAudio.isPlaying) {
      flushSpeakQueue();
    }
  }, [isNativeApp, nativeAudio.isPlaying, flushSpeakQueue]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const updated = [...prev, message];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, []);

  const queueTranscript = useCallback((text: string) => {
    pendingTranscriptRef.current = text;
    setInput(text);
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
    const trimmedText = text.trim();
    lastUserMessageRef.current = trimmedText;

    if (/^(cancel|nevermind|never mind|stop)$/i.test(trimmedText)) {
      appointmentBuilderRef.current = null;
      return;
    }

    // CLIENT-SIDE INTERCEPTION: If we're building an appointment and asked for optional fields
    const builderExists = !!appointmentBuilderRef.current;
    const flagValue = appointmentBuilderRef.current?.askedForOptionalFields;
    const isCorrection = isCorrectionAttempt(trimmedText);
    console.log("=".repeat(80));
    console.log("🔍 INTERCEPTION CHECK START");
    console.log("   hasBuilder:", builderExists);
    console.log("   askedForOptionalFields:", flagValue);
    console.log("   isCorrection:", isCorrection);
    console.log("   userMessage:", trimmedText);
    console.log("   Builder state:", appointmentBuilderRef.current);
    console.log("=".repeat(80));
    
    // If user is trying to correct appointment details, don't intercept - let AI handle it
    if (appointmentBuilderRef.current?.askedForOptionalFields && !isCorrection) {
      console.log("✅✅✅ INTERCEPTING - Client handling optional field response ✅✅✅");
      const builder = appointmentBuilderRef.current;
      if (!hasAllMandatoryFields(builder)) {
        console.warn("⚠️ Builder missing mandatory fields during optional follow-up.");
        appointmentBuilderRef.current = null;
      } else {
      const declined = isDeclineReply(trimmedText);
      const { topic, location } = declined ? { topic: null, location: null } : extractOptionalFields(trimmedText);
      console.log("📝 Extracted:", { declined, topic, location });
      
      // Update builder with OPTIONAL fields only (topic and location)
      // withWhom is MANDATORY and should already be set by AI - don't touch it!
      if (topic) builder.topic = topic;
      if (location) builder.location = location;
      
      // If declined, only null out the MISSING OPTIONAL fields
      // DO NOT touch withWhom - it's mandatory and already set!
      if (declined) {
        if (!builder.topic) builder.topic = null;
        if (!builder.location) builder.location = null;
      }
      
      // Add user message to chat
      addMessage({
        id: uuidv4(),
        role: "user",
        content: trimmedText,
      });
      
      // Finalize appointment - we have everything we need now
      // withWhom is MANDATORY - if missing, use fallback
      const finalWithWhom = builder.withWhom?.trim() || "Just me";
      const finalTitle = deriveAppointmentTitle(builder.title, finalWithWhom, builder.topic);
      
      if (!builder.withWhom) {
        console.warn("⚠️⚠️⚠️ withWhom is MISSING at finalization! Using fallback.");
        console.warn("   This means AI didn't ask for mandatory 'who' field.");
        console.warn("   Builder:", builder);
      }
      
      const finalAppointment: Appointment = {
        id: builder.id,
        title: finalTitle,
        datetime: builder.datetime!,
        durationMinutes: builder.durationMinutes!,
        withWhom: finalWithWhom,  // MANDATORY - always has a value
        topic: builder.topic || null,  // OPTIONAL
        location: builder.location || null,  // OPTIONAL
        createdAt: new Date(),
      };
      
      // Add to local state
      addAppointment(finalAppointment);
      
      // Save to database
      try {
        const response = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalAppointment.title,
            withWhom: finalAppointment.withWhom,
            topic: finalAppointment.topic,
            location: finalAppointment.location,
            datetime: finalAppointment.datetime.toISOString(),
            durationMinutes: finalAppointment.durationMinutes,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Failed to save appointment:", response.status, errorText);
        }
      } catch (error) {
        console.error("❌ Error saving appointment:", error);
      }
      
      // Build response
      const parts = [];
      if (finalAppointment.withWhom) parts.push(`with ${finalAppointment.withWhom}`);
      if (finalAppointment.topic) parts.push(`about ${finalAppointment.topic}`);
      const responseText = parts.length > 0
        ? `Perfect. I've scheduled your meeting ${parts.join(" ")} for ${formatDateTimeForSpeech(finalAppointment.datetime)}.`
        : `Got it. Your meeting is scheduled for ${formatDateTimeForSpeech(finalAppointment.datetime)}.`;
      
      addMessage({
        id: uuidv4(),
        role: "assistant",
        content: responseText,
      });
      speakNative(responseText);
      
      // Clear builder
      console.log("🧹 Clearing appointmentBuilderRef after finalization");
      appointmentBuilderRef.current = null;
      return;
      }
    }
    
    // If we have a builder and asked for optional fields, but user is making a correction
    if (appointmentBuilderRef.current?.askedForOptionalFields && isCorrection) {
      console.log("🔄🔄🔄 CORRECTION DETECTED - Resetting builder and sending to AI 🔄🔄🔄");
      console.log("   User is trying to correct appointment details (time/date/duration)");
      console.log("   Resetting askedForOptionalFields flag and clearing builder");
      // Clear the builder so AI can re-process from scratch
      appointmentBuilderRef.current = null;
      // Let the message go through to AI below
    }

    const pendingPriorityTodoId = pendingPriorityTodoIdRef.current;
    if (pendingPriorityTodoId) {
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: trimmedText,
      };
      addMessage(userMessage);
      setInput("");

      const priorityMatch = trimmedText.match(/\b(high|medium|low)\b/i);
      const isNo = /^(no|nope|nah|not now|skip)$/i.test(trimmedText);
      const isYes = /^(yes|yeah|yep|sure|ok|okay)$/i.test(trimmedText);

      if (priorityMatch) {
        const nextPriority = priorityMatch[1].toLowerCase() as Priority;
        const pendingTitle = pendingPriorityTodoTitleRef.current ?? "that todo";
        updateTodoPriority(pendingPriorityTodoId, nextPriority);
        pendingPriorityTodoIdRef.current = null;
        pendingPriorityTodoTitleRef.current = null;
        const responseText = `Got it. I set "${pendingTitle}" to ${nextPriority} priority.`;
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
        return;
      }

      if (isNo) {
        pendingPriorityTodoIdRef.current = null;
        pendingPriorityTodoTitleRef.current = null;
        const responseText = "Okay, I’ll keep it at medium priority.";
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
        return;
      }

      if (isYes) {
        const responseText = "Which priority would you like: high, medium, or low?";
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
        return;
      }
    }

    // No need for complex message rewriting - client intercepts appointment responses now
    let messageToSend = trimmedText;
    if (pendingAppointmentWithWhomRef.current && pendingAppointmentContextRef.current) {
      messageToSend = `${trimmedText}\n\n[Context: meeting is with ${pendingAppointmentWithWhomRef.current}]`;
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: trimmedText,
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
            message: messageToSend,
            conversationHistory: recentMessages,
            userData: { todos, habits, appointments, groceries },
            currentDateTime,
            currentDateTimeISO: now.toISOString(),
            fulfilledIntents,
            connectionInfo: (window as any).__connectionInfo || null,
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

          if (data.type === "appointment") {
            if (pendingAppointmentContextRef.current && lastAppointmentIdRef.current) {
              let updatePayload: Partial<Appointment> = {};
              if (typeof data.title === "string" && data.title.trim().length > 0) {
                const previousTitle = lastAppointmentTitleRef.current;
                const nextTitle = data.title.trim();
                if (!previousTitle || previousTitle.toLowerCase() !== nextTitle.toLowerCase()) {
                  updatePayload.title = nextTitle;
                }
              }
              if (data.datetime) {
                updatePayload.datetime = parseAiDatetime(data.datetime);
              }
              if (Number.isFinite(data.durationMinutes) || Number.isFinite(data.duration)) {
                const nextDuration = Number(data.durationMinutes ?? data.duration);
                if (!Number.isNaN(nextDuration)) {
                  updatePayload.durationMinutes = nextDuration;
                }
              }
              if (typeof data.withWhom === "string" && data.withWhom.trim().length > 0) {
                updatePayload.withWhom = data.withWhom.trim();
              }

              const pendingUpdate = pendingAppointmentUpdateRef.current;
              if (pendingUpdate) {
                updatePayload = { ...pendingUpdate, ...updatePayload };
              }

              const currentAppointment = appointments.find(a => a.id === lastAppointmentIdRef.current);
              const effectiveTitle = updatePayload.title || lastAppointmentTitleRef.current || currentAppointment?.title;
              const effectiveWithWhom = updatePayload.withWhom ?? currentAppointment?.withWhom ?? null;
              const hasTopic = Boolean(pendingAppointmentTopicRef.current) || titleHasTopic(effectiveTitle);
              const needsWhat = Boolean(effectiveWithWhom) && !hasTopic && !pendingAppointmentDeclinedWhatRef.current;
              const needsWho = !effectiveWithWhom && !pendingAppointmentDeclinedWhoRef.current;
              const askText = needsWho
                ? "Would you like for me to add who the meeting is with and what it's about?"
                : needsWhat
                  ? "Would you like for me to add what the meeting is about?"
                  : null;

              if (askText) {
                pendingAppointmentUpdateRef.current = updatePayload;
                pendingAppointmentQuestionRef.current = needsWho ? "who_what" : "what";
                if (askedWhoWhatForAppointmentRef.current != lastAppointmentIdRef.current) {
                  askedWhoWhatForAppointmentRef.current = lastAppointmentIdRef.current;
                  addMessage({
                    id: uuidv4(),
                    role: "assistant",
                    content: askText,
                  });
                }
                speakNative(askText);
                return;
              }

              if (Object.keys(updatePayload).length > 0) {
                updateAppointment(lastAppointmentIdRef.current, updatePayload);
                try {
                  await fetch("/api/appointments", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: lastAppointmentIdRef.current, ...updatePayload }),
                  });
                } catch (error) {
                  console.error("❌ Error updating appointment from follow-up:", error);
                }
              }

              pendingAppointmentContextRef.current = null;
              pendingAppointmentWithWhomRef.current = null;
              pendingAppointmentTopicRef.current = null;
              pendingAppointmentDeclinedWhoRef.current = false;
              pendingAppointmentDeclinedWhatRef.current = false;
              pendingAppointmentQuestionRef.current = null;
              pendingAppointmentUpdateRef.current = null;
              const followupMessage = data.message || "Got it. I’ve updated that appointment with the extra details.";
              addMessage({
                id: uuidv4(),
                role: "assistant",
                content: followupMessage,
              });
              speakNative(followupMessage);
              return;
            }
            pendingAppointmentContextRef.current = null;
            pendingAppointmentWithWhomRef.current = null;
            pendingAppointmentTopicRef.current = null;
            pendingAppointmentDeclinedWhoRef.current = false;
            pendingAppointmentDeclinedWhatRef.current = false;
            pendingAppointmentQuestionRef.current = null;
          }
        if (internalType === "todo") {
          const hasDate = !!data.datetime;
          const rawDate = hasDate ? parseAiDatetime(data.datetime) : null;
          const hasExplicitTime = hasDate && rawDate && !isMidnight(rawDate);
          const baseDate = hasDate && rawDate ? rawDate : null;
          const reminderDate: Date | undefined = hasExplicitTime ? baseDate! : undefined;
            const priorityValue = data.priority || "medium";
            const userMentionedPriority = /(\bhigh\b|\bmedium\b|\blow\b|priority|urgent|asap|critical|emergency)/i.test(userMessageForFeedback || "");

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

          if (!userMentionedPriority) {
            pendingPriorityTodoIdRef.current = id;
            pendingPriorityTodoTitleRef.current = data.title;
            const followup = "Would you like to set a priority level for this?";
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: followup,
            });
            if (isNativeApp) {
              window.webkit?.messageHandlers?.native?.postMessage({
                action: "speak",
                text: followup,
              });
            }
          }

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
              if (!userMentionedPriority) {
                pendingPriorityTodoIdRef.current = id;
                pendingPriorityTodoTitleRef.current = data.title;
                addMessage({
                  id: uuidv4(),
                  role: "assistant",
                  content: "Would you like to set a priority level for this?",
                });
              }
            }
            if (!userMentionedPriority && data.message) {
              pendingPriorityTodoIdRef.current = id;
              pendingPriorityTodoTitleRef.current = data.title;
              addMessage({
                id: uuidv4(),
                role: "assistant",
                content: "Would you like to set a priority level for this?",
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
          // Initialize appointment builder with data from AI
          const datetime = data.datetime ? parseAiDatetime(data.datetime) : getDefaultTomorrowReminder();
          const durationMinutes = Number.isFinite(data.durationMinutes) ? Number(data.durationMinutes) : 
                                  Number.isFinite(data.duration) ? Number(data.duration) : undefined;
          const withWhom = typeof data.withWhom === "string" && data.withWhom.trim() ? data.withWhom.trim() : undefined;
          let topic = typeof data.topic === "string" && data.topic.trim() ? data.topic.trim() : undefined;
          let location = typeof data.location === "string" && data.location.trim() ? data.location.trim() : undefined;

          if ((!topic || !location) && lastUserMessageRef.current) {
            const extracted = extractOptionalFields(lastUserMessageRef.current);
            if (!topic && extracted.topic) {
              topic = extracted.topic;
            }
            if (!location && extracted.location && /[a-zA-Z]/.test(extracted.location)) {
              location = extracted.location;
            }
          }

          const title = deriveAppointmentTitle(data.title, withWhom, topic);
          
          console.log("=".repeat(80));
          console.log("📋📋📋 CREATING NEW BUILDER FROM AI RESPONSE 📋📋📋");
          console.log("   Old builder ID:", appointmentBuilderRef.current?.id);
          console.log("   Old askedForOptionalFields:", appointmentBuilderRef.current?.askedForOptionalFields);
          console.log("   New data:", { title, datetime, durationMinutes, withWhom, topic, location });
          console.log("=".repeat(80));
          
          appointmentBuilderRef.current = {
            id,
            title,
            datetime,
            durationMinutes,
            withWhom,
            topic,
            location,
            askedForOptionalFields: false,
          };
          
          console.log("   ⚠️ NEW BUILDER CREATED - askedForOptionalFields reset to FALSE");
          
          // Check if we have all mandatory fields
          if (!hasAllMandatoryFields(appointmentBuilderRef.current)) {
            // Missing mandatory fields - let AI handle asking for them
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: data.message || "I need more details about this appointment.",
            });
            speakNative(data.message || "I need more details about this appointment.");
            return;
          }
          
          // We have all mandatory fields (date, time, duration, who)
          // Now check if we need OPTIONAL fields (what, where)
          const builder = appointmentBuilderRef.current;
          const hasWhat = Boolean(builder.topic);
          const hasWhere = Boolean(builder.location);
          
          // ⚠️ withWhom is MANDATORY and should already be present from AI
          // If it's missing, that's an AI error - log warning but proceed
          if (!builder.withWhom) {
            console.warn("⚠️⚠️⚠️ withWhom is MISSING but it's MANDATORY! AI should have asked for it.");
            console.warn("   Builder:", builder);
          }
          
          // Only ask for missing OPTIONAL fields (topic and location)
          if (!hasWhat || !hasWhere) {
            appointmentBuilderRef.current.askedForOptionalFields = true;
            let promptText = "";
            
            // Build dynamic question based on what's missing
            if (!hasWhat && !hasWhere) {
              promptText = "Would you like to add what it's about and where it's located?";
            } else if (!hasWhat) {
              promptText = "Would you like to add what it's about?";
            } else if (!hasWhere) {
              promptText = "Would you like to add where it's located?";
            }
            
            console.log("=".repeat(80));
            console.log("🔔🔔🔔 CLIENT ASKING OPTIONAL FIELD QUESTION 🔔🔔🔔");
            console.log("   hasWhat:", hasWhat);
            console.log("   hasWhere:", hasWhere);
            console.log("   promptText:", promptText);
            console.log("   🎯 SET askedForOptionalFields = TRUE");
            console.log("   Builder ID:", appointmentBuilderRef.current.id);
            console.log("   Full builder:", appointmentBuilderRef.current);
            console.log("=".repeat(80));
            
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: promptText,
            });
            speakNative(promptText);
            return;
          }
          
          // We have everything - finalize immediately without asking
          const finalAppointment: Appointment = {
            id: builder.id,
            title: deriveAppointmentTitle(builder.title, builder.withWhom, builder.topic),
            datetime: builder.datetime!,
            durationMinutes: builder.durationMinutes!,
            withWhom: builder.withWhom?.trim() || "Just me",
            topic: builder.topic || null,
            location: builder.location || null,
            createdAt: new Date(),
          };
          
          addAppointment(finalAppointment);
          
          try {
            const response = await fetch("/api/appointments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: finalAppointment.title,
                withWhom: finalAppointment.withWhom,
                topic: finalAppointment.topic,
                location: finalAppointment.location,
                datetime: finalAppointment.datetime.toISOString(),
                durationMinutes: finalAppointment.durationMinutes,
              }),
            });
            if (!response.ok) {
              const errorText = await response.text();
              console.error("❌ Failed to save appointment:", response.status, errorText);
            }
          } catch (error) {
            console.error("Error saving appointment:", error);
          }
          
          const confirmText = `Perfect. I've scheduled "${finalAppointment.title}" for ${formatDateTimeForSpeech(finalAppointment.datetime)}.`;
          addMessage({
            id: uuidv4(),
            role: "assistant",
            content: confirmText,
          });
          speakNative(confirmText);
          appointmentBuilderRef.current = null;
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
          if (!itemToUpdate && lastAppointmentIdRef.current) {
            itemToUpdate = appointments.find(a => a.id === lastAppointmentIdRef.current);
          }
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
        
        if (!itemToUpdate && actualType === "appointment" && pendingAppointmentContextRef.current && lastAppointmentIdRef.current) {
          const fallbackId = lastAppointmentIdRef.current;
          const fallbackUpdates: Partial<Appointment> = {};
          if (typeof updates.newTitle === "string" && updates.newTitle.trim().length > 0) {
            fallbackUpdates.title = updates.newTitle.trim();
          }
          if (updates.datetime) {
            fallbackUpdates.datetime = parseAiDatetime(updates.datetime);
          }
          if (typeof updates.topic === "string" && updates.topic.trim().length > 0) {
            fallbackUpdates.topic = updates.topic.trim();
          }
          if (typeof updates.location === "string" && updates.location.trim().length > 0) {
            fallbackUpdates.location = updates.location.trim();
          }
          if (Number.isFinite(updates.durationMinutes) || Number.isFinite(updates.duration)) {
            const nextDuration = Number(updates.durationMinutes ?? updates.duration);
            if (!Number.isNaN(nextDuration)) {
              fallbackUpdates.durationMinutes = nextDuration;
            }
          }
          if (typeof updates.withWhom === "string" && updates.withWhom.trim().length > 0) {
            fallbackUpdates.withWhom = updates.withWhom.trim();
          }

          if (Object.keys(fallbackUpdates).length === 0) {
            const responseText = "What should I update about that appointment?";
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
            return;
          }

          updateAppointment(fallbackId, fallbackUpdates);
          try {
            await fetch("/api/appointments", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: fallbackId, ...fallbackUpdates }),
            });
          } catch (error) {
            console.error("❌ Error updating appointment from fallback update:", error);
          }

          pendingAppointmentContextRef.current = null;
          const responseText = data.message || "Got it. I’ve updated that appointment.";
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

          const appointmentSnapshot = appointments.find(a => a.id === fallbackId);
          const effectiveTitle = fallbackUpdates.title || appointmentSnapshot?.title || lastAppointmentTitleRef.current;
          const effectiveWithWhom = fallbackUpdates.withWhom ?? appointmentSnapshot?.withWhom ?? null;
          const askText = getWhoWhatPrompt(effectiveTitle, effectiveWithWhom);
          if (askText && askedWhoWhatForAppointmentRef.current != fallbackId) {
            askedWhoWhatForAppointmentRef.current = fallbackId;
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: askText,
            });
            if (isNativeApp) {
              window.webkit?.messageHandlers?.native?.postMessage({
                action: "speak",
                text: askText,
              });
            }
          }
          return;
        }

        if (!itemToUpdate) {
          if (actualType === "appointment") {
            const responseText = "Which meeting should I update?";
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
            return;
          }

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
              if (typeof updates.withWhom === "string") {
                appointmentUpdates.withWhom = updates.withWhom.trim();
              }
              if (typeof updates.topic === "string") {
                appointmentUpdates.topic = updates.topic.trim();
              }
              if (typeof updates.location === "string") {
                appointmentUpdates.location = updates.location.trim();
              }
              if (updates.durationMinutes || updates.duration) {
                const nextDuration = Number(updates.durationMinutes ?? updates.duration);
                if (!Number.isNaN(nextDuration)) {
                  appointmentUpdates.durationMinutes = nextDuration;
                }
              }

              if (!appointmentUpdates.title) {
                const derivedTitle = deriveAppointmentTitle(
                  itemToUpdate.title,
                  appointmentUpdates.withWhom ?? itemToUpdate.withWhom,
                  appointmentUpdates.topic ?? itemToUpdate.topic
                );
                if (derivedTitle && derivedTitle !== itemToUpdate.title) {
                  appointmentUpdates.title = derivedTitle;
                }
              }
              
              updateAppointment(itemToUpdate.id, appointmentUpdates);
              try {
                if (Object.keys(appointmentUpdates).length > 0) {
                  await fetch("/api/appointments", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: itemToUpdate.id, ...appointmentUpdates }),
                  });
                }
              } catch (error) {
                console.error("❌ Error updating appointment:", error);
              }

              const askedId = askedWhoWhatForAppointmentRef.current;
              const durationUpdated = Boolean(updates.durationMinutes || updates.duration);
              if (durationUpdated) {
                const effectiveTitle = updates.newTitle || itemToUpdate.title;
                const effectiveWithWhom = typeof updates.withWhom === "string" && updates.withWhom.trim().length > 0
                  ? updates.withWhom.trim()
                  : itemToUpdate.withWhom;
                const responseText = getWhoWhatPrompt(effectiveTitle, effectiveWithWhom);
                if (responseText && askedId !== itemToUpdate.id) {
                  askedWhoWhatForAppointmentRef.current = itemToUpdate.id;
                addMessage({
                  id: uuidv4(),
                  role: "assistant",
                  content: responseText,
                });
                  speakNative(responseText, 900);
                }
              }
              
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

        const appointmentPrompt = /(appointment|meeting|calendar|schedule)/i.test(lastUserMessageRef.current || "");
        const askingForOptionalFields = /would you like.*add.*(who|what)/i.test(responseText);
        const askingForDetails = /(what date|what time|when is|when should|how long|duration|who is .* with|with whom|what's it about|what is it about)/i.test(responseText);
        
        // Set flag when agent asks about optional fields
        if (askingForOptionalFields) {
          waitingForOptionalFieldsRef.current = true;
        }
        
        if (appointmentPrompt && askingForDetails && lastUserMessageRef.current) {
          pendingAppointmentContextRef.current = lastUserMessageRef.current;
          const parsed = extractFollowupDetails(lastUserMessageRef.current);
          if (parsed.withWhom) {
            pendingAppointmentWithWhomRef.current = parsed.withWhom;
          }
          if (parsed.topic) {
            pendingAppointmentTopicRef.current = parsed.topic;
          }
        }
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
  }, [loading, messages, todos, habits, appointments, addMessage, clearChat, updateTodoPriority, isNativeApp, speakNative, pendingDeletion, deleteTodo, deleteAppointment, deleteHabit, addTodo, addAppointment, addHabit, updateTodo, updateAppointment, updateHabit]);

  // Handle native transcription results (iOS native only)
  useEffect(() => {
    if (!isNativeApp) return;
    
    const handleTranscription = (payload: unknown) => {
      const text = (payload as { text?: string })?.text;
      if (text && text.length > 0) {
        if (externalInputMode === "talk") {
          queueTranscript(text);
          return;
        }
        setInput(text);
        setIsProcessing(false);
        setIsListening(false);
        // Note: isListening state is controlled by Talk button only
        setTimeout(() => sendMessageWithText(text, true), 300);
      }
    };
    
    const handleUserTranscript = (payload: unknown) => {
      const data = payload as { text?: string };
      if (data.text && data.text.length > 0) {
        if (externalInputMode === "talk") {
          queueTranscript(data.text);
          return;
        }
        setInput(data.text);
        setIsProcessing(false);
        setIsListening(false);
        sendMessageWithText(data.text, true);
      }
    };
    
    // Listen for TRANSCRIPTION_RESULT CustomEvent from native
    const handleTranscriptionResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const text = detail?.text;
      if (text && text.length > 0) {
        if (externalInputMode === "talk") {
          queueTranscript(text);
          return;
        }
        setInput(text);
        setIsProcessing(false);
        setIsListening(false);
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
  }, [isNativeApp, sendMessageWithText, externalInputMode, queueTranscript]);

  // Global function for Swift to inject transcription directly
  useEffect(() => {
    // Define the global function that Swift calls via evaluateJavaScript
    (window as unknown as Record<string, unknown>).onNativeTranscription = (text: string) => {
      console.log("Received from Swift:", text);
      
      if (externalInputMode === "talk") {
        queueTranscript(text);
        return;
      }
      
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
      
      if (externalInputMode === "talk") {
        queueTranscript(text);
        return;
      }
      
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
  }, [sendMessageWithText, externalInputMode, queueTranscript]);

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
    setLocalInputMode("talk");
    setIsListening(true);
    setIsProcessing(false);
    
    if (window.webkit?.messageHandlers?.native) {
      // Native iOS path - trigger Swift userContentController
      window.webkit.messageHandlers.native.postMessage({ action: "startRecording" });
    } else {
      // Web browser fallback
      startWebRecording();
    }
    
    // Notify parent component
    onRecordingStart?.();
  }, [startWebRecording, onRecordingStart]);

  const handleTalkStop = useCallback(() => {
    if (!isPressingToTalk) return;
    isPressingToTalk = false;
    setIsListening(false);
    setIsProcessing(true);
    
    if (window.webkit?.messageHandlers?.native) {
      // Native iOS path - trigger Swift userContentController
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
      }
      stopTimerRef.current = window.setTimeout(() => {
        window.webkit?.messageHandlers?.native?.postMessage({ action: "stopRecording" });
      }, 800);
    } else {
      // Web browser fallback
      stopWebRecording();
    }
    
    // Notify parent component
    onRecordingStop?.();
  }, [stopWebRecording, onRecordingStop]);

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
        addAppointment({ id, title, withWhom: null, topic: null, location: null, datetime: pendingAction.datetime ? parseAiDatetime(pendingAction.datetime) : now, durationMinutes: 30, createdAt: now });
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

  // Handle external inputMode changes (when controlled by parent)
  useEffect(() => {
    if (externalInputMode === "talk" && !isListening) {
      handleTalkStart();
    } else if (externalInputMode === "type" && isListening) {
      handleTalkStop();
    }
  }, [externalInputMode, isListening]);

  useEffect(() => {
    if (externalInputMode !== "type") return;
    const pendingTranscript = pendingTranscriptRef.current;
    if (pendingTranscript && pendingTranscript.trim()) {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = window.setTimeout(() => {
        pendingTranscriptRef.current = null;
        setIsProcessing(false);
        setIsListening(false);
        sendMessageWithText(pendingTranscript, true);
      }, 1200);
    }
    return () => {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, [externalInputMode, sendMessageWithText]);

  return (
    <div ref={chatContainerRef} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[500px]">
      {/* Messages - Scrollable content area */}
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

      {/* Text Input Area - Only in Type mode */}
      {inputMode === "type" && (
        <div className="border-t border-gray-200 bg-white p-3 md:p-4">
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
