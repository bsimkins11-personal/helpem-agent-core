// useWebSpeech.ts
// Hook for Web Speech API: SpeechRecognition (STT) + SpeechSynthesis (TTS)
// Provides same interface patterns as useNativeAudio for easy swap

import { useEffect, useState, useCallback, useRef } from 'react';

type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Cross-browser SpeechRecognition
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

type WebSpeechState = {
  isRecording: boolean;
  isPlaying: boolean;
  lastTranscription: string | null;
  error: string | null;
  isConversationActive: boolean;
  conversationState: ConversationState;
  hasSpeechRecognition: boolean;
};

type WebSpeechActions = {
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  speakText: (text: string, voice?: string) => void;
  stopSpeaking: () => void;
  startConversation: () => void;
  endConversation: () => void;
};

export function useWebSpeech(): WebSpeechState & WebSpeechActions {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  const hasSpeechRecognition = !!SpeechRecognitionAPI;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // --- Speech-to-Text (SpeechRecognition API) ---

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    setError(null);
    setIsRecording(true);
    setConversationState('listening');

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setLastTranscription(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are normal user actions, not real errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
      setConversationState('idle');
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (isConversationActive) {
        setConversationState('thinking');
      } else {
        setConversationState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isConversationActive]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    setIsRecording(false);
    setLastTranscription(null);
    setConversationState('idle');
  }, []);

  // --- Text-to-Speech (SpeechSynthesis API) ---

  const flushSpeakQueue = useCallback(() => {
    if (isSpeakingRef.current) return;
    const nextText = speakQueueRef.current.shift();
    if (!nextText) return;

    if (!window.speechSynthesis) {
      console.warn('SpeechSynthesis not available');
      return;
    }

    isSpeakingRef.current = true;
    setIsPlaying(true);
    setConversationState('speaking');

    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && v.name.includes('Samantha')
    ) || voices.find(
      (v) => v.lang.startsWith('en') && v.localService
    ) || voices.find(
      (v) => v.lang.startsWith('en')
    );
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsPlaying(false);
      setConversationState(isConversationActive ? 'listening' : 'idle');
      // Process next in queue
      flushSpeakQueue();
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsPlaying(false);
      setConversationState('idle');
      flushSpeakQueue();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isConversationActive]);

  const speakText = useCallback((text: string) => {
    if (!text.trim()) return;
    speakQueueRef.current.push(text);
    flushSpeakQueue();
  }, [flushSpeakQueue]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    speakQueueRef.current = [];
    isSpeakingRef.current = false;
    setIsPlaying(false);
    setConversationState('idle');
  }, []);

  // --- Conversation mode ---

  const startConversation = useCallback(() => {
    setIsConversationActive(true);
    setConversationState('listening');
    startRecording();
  }, [startRecording]);

  const endConversation = useCallback(() => {
    setIsConversationActive(false);
    setConversationState('idle');
    cancelRecording();
    stopSpeaking();
  }, [cancelRecording, stopSpeaking]);

  return {
    isRecording,
    isPlaying,
    lastTranscription,
    error,
    isConversationActive,
    conversationState,
    hasSpeechRecognition,
    startRecording,
    stopRecording,
    cancelRecording,
    speakText,
    stopSpeaking,
    startConversation,
    endConversation,
  };
}
