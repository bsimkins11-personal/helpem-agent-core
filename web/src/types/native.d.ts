// Native iOS bridge type declarations

interface NativeBridge {
  isNative: boolean;
  send: (type: string, payload?: Record<string, unknown>) => void;
  on: (type: string, callback: (payload: unknown) => void) => void;
  off: (type: string, callback: (payload: unknown) => void) => void;
  // Single-turn methods
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  playAudio: (url: string) => void;
  speakText: (text: string, voice?: string) => void;
  // Conversation mode methods
  startConversation: () => void;
  endConversation: () => void;
  interruptSpeaking: () => void;
}

interface WebKitMessageHandler {
  postMessage: (message: NativeMessage) => void;
}

interface NativeMessage {
  type?: string;
  action?: string;
  text?: string;
  voice?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    nativeBridge?: NativeBridge;
    webkit?: {
      messageHandlers?: {
        native?: WebKitMessageHandler;
      };
    };
    __IS_HELPEM_APP__?: boolean;
    __audioEnabled?: boolean;
    __conversationStarted?: boolean;
  }
}

export {};
