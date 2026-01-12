// NativeBridge.swift
// Defines the communication protocol between Web and Native

import Foundation

struct NativeBridge {
    
    // MARK: - Message Types
    enum MessageType: String, Codable {
        // Web → Native (existing single-turn)
        case startRecording = "START_RECORDING"
        case stopRecording = "STOP_RECORDING"
        case cancelRecording = "CANCEL_RECORDING"
        case playAudio = "PLAY_AUDIO"
        case speakText = "SPEAK_TEXT"
        
        // Web → Native (conversation mode)
        case startConversation = "START_CONVERSATION"
        case endConversation = "END_CONVERSATION"
        case interruptSpeaking = "INTERRUPT_SPEAKING"
        
        // Native → Web (existing)
        case bridgeReady = "BRIDGE_READY"
        case recordingStarted = "RECORDING_STARTED"
        case recordingComplete = "RECORDING_COMPLETE"
        case transcriptionReady = "TRANSCRIPTION_READY"
        case playbackComplete = "PLAYBACK_COMPLETE"
        case error = "ERROR"
        
        // Native → Web (conversation mode)
        case conversationStarted = "CONVERSATION_STARTED"
        case conversationEnded = "CONVERSATION_ENDED"
        case conversationStateUpdate = "CONVERSATION_STATE_UPDATE"
        case userTranscript = "USER_TRANSCRIPT"
    }
    
    // MARK: - Conversation States
    enum ConversationState: String, Codable {
        case idle = "idle"
        case listening = "listening"
        case thinking = "thinking"
        case speaking = "speaking"
    }
    
    // MARK: - Message Structure
    struct Message {
        let type: MessageType
        let payload: [String: Any]?
        
        func toJSON() -> String {
            var dict: [String: Any] = ["type": type.rawValue]
            if let payload = payload {
                dict["payload"] = payload
            }
            
            guard let data = try? JSONSerialization.data(withJSONObject: dict),
                  let json = String(data: data, encoding: .utf8) else {
                return "{\"type\": \"\(type.rawValue)\"}"
            }
            return json
        }
    }
    
    // MARK: - Injected JavaScript
    // This creates window.nativeBridge for web to use
    static let injectedJavaScript = """
    (function() {
        // Create native bridge object
        window.nativeBridge = {
            // Check if running in native app
            isNative: true,
            
            // Send message to native
            send: function(type, payload) {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native) {
                    window.webkit.messageHandlers.native.postMessage({
                        type: type,
                        payload: payload || {}
                    });
                    console.log('[NativeBridge] Sent:', type, payload);
                } else {
                    console.warn('[NativeBridge] Not available');
                }
            },
            
            // Receive message from native (called by Swift)
            receive: function(message) {
                console.log('[NativeBridge] Received:', message);
                
                // Dispatch custom event for web app to listen to
                const event = new CustomEvent('nativeBridgeMessage', { 
                    detail: message 
                });
                window.dispatchEvent(event);
                
                // Also call any registered callbacks
                if (this._callbacks[message.type]) {
                    this._callbacks[message.type].forEach(cb => cb(message.payload));
                }
            },
            
            // Callback registry
            _callbacks: {},
            
            // Register callback for specific message type
            on: function(type, callback) {
                if (!this._callbacks[type]) {
                    this._callbacks[type] = [];
                }
                this._callbacks[type].push(callback);
            },
            
            // Remove callback
            off: function(type, callback) {
                if (this._callbacks[type]) {
                    this._callbacks[type] = this._callbacks[type].filter(cb => cb !== callback);
                }
            },
            
            // Convenience methods
            startRecording: function() {
                this.send('START_RECORDING');
            },
            
            stopRecording: function() {
                this.send('STOP_RECORDING');
            },
            
            cancelRecording: function() {
                this.send('CANCEL_RECORDING');
            },
            
            playAudio: function(url) {
                this.send('PLAY_AUDIO', { url: url });
            },
            
            speakText: function(text, voice) {
                this.send('SPEAK_TEXT', { text: text, voice: voice || 'nova' });
            },
            
            // Conversation mode methods (Phase 1 - Evolution)
            startConversation: function() {
                this.send('START_CONVERSATION');
            },
            
            endConversation: function() {
                this.send('END_CONVERSATION');
            },
            
            interruptSpeaking: function() {
                this.send('INTERRUPT_SPEAKING');
            }
        };
        
        // Notify that bridge is injected
        console.log('[NativeBridge] Injected and ready');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('nativeBridgeInjected'));
    })();
    """
}
