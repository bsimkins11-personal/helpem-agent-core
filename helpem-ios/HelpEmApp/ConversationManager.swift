// ConversationManager.swift
// Manages continuous conversation mode with VAD (Voice Activity Detection)
// This is an EVOLUTION of the existing audio system - does NOT replace AudioManager

import Foundation
import AVFoundation

// MARK: - Conversation Manager
class ConversationManager: NSObject, ObservableObject {
    
    // MARK: - State
    @Published private(set) var conversationId: String?
    @Published private(set) var state: NativeBridge.ConversationState = .idle
    @Published private(set) var isActive: Bool = false
    
    // MARK: - Audio Engine (continuous capture)
    private var audioEngine: AVAudioEngine?
    private var audioFile: AVAudioFile?
    private var recordingURL: URL?
    
    // MARK: - VAD Configuration
    private let silenceThreshold: Float = -40.0  // dB threshold for silence
    private let silenceDuration: TimeInterval = 0.7  // 700ms silence ends turn
    private let minSpeechDuration: TimeInterval = 0.3  // Min speech before processing
    
    // MARK: - VAD State
    private var silenceStartTime: Date?
    private var speechStartTime: Date?
    private var hasDetectedSpeech: Bool = false
    
    // MARK: - Audio Player (for TTS)
    private var audioPlayer: AVAudioPlayer?
    
    // MARK: - Callbacks
    var onStateChange: ((NativeBridge.ConversationState, String) -> Void)?  // (state, conversationId)
    var onAudioCaptured: ((Data, String) -> Void)?  // (audioData, conversationId)
    var onPlaybackComplete: ((String) -> Void)?  // (conversationId)
    var onError: ((String, String) -> Void)?  // (error, conversationId)
    
    // MARK: - Initialization
    override init() {
        super.init()
    }
    
    // MARK: - Conversation Lifecycle
    
    /// Start a new conversation session
    func startConversation() {
        guard !isActive else {
            print("⚠️ Conversation already active")
            return
        }
        
        // Generate new conversation ID
        conversationId = UUID().uuidString
        isActive = true
        
        print("🎙️ Starting conversation: \(conversationId ?? "?")")
        
        // Configure audio session for conversation
        configureAudioSession()
        
        // Start listening
        startListening()
    }
    
    /// End the current conversation session
    func endConversation() {
        guard isActive, let convId = conversationId else { return }
        
        print("👋 Ending conversation: \(convId)")
        
        stopListening()
        stopPlayback()
        
        isActive = false
        setState(.idle)
        conversationId = nil
    }
    
    /// Interrupt current speech and start listening
    func interruptSpeaking() {
        guard isActive, state == .speaking else { return }
        
        print("🛑 Interrupted speaking")
        stopPlayback()
        startListening()
    }
    
    // MARK: - Audio Session
    
    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true)
            print("✅ Audio session configured for conversation")
        } catch {
            print("❌ Audio session error: \(error)")
            onError?("Failed to configure audio: \(error.localizedDescription)", conversationId ?? "")
        }
    }
    
    // MARK: - Listening (Continuous Capture with VAD)
    
    private func startListening() {
        guard isActive else { return }
        
        setState(.listening)
        
        // Reset VAD state
        silenceStartTime = nil
        speechStartTime = nil
        hasDetectedSpeech = false
        
        // Create audio engine
        audioEngine = AVAudioEngine()
        
        guard let audioEngine = audioEngine else {
            onError?("Failed to create audio engine", conversationId ?? "")
            return
        }
        
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        
        // Create temporary file for recording
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        recordingURL = documentsPath.appendingPathComponent("conv_\(Date().timeIntervalSince1970).m4a")
        
        // Set up audio file writer
        do {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 16000,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            audioFile = try AVAudioFile(forWriting: recordingURL!, settings: audioSettings)
        } catch {
            print("❌ Failed to create audio file: \(error)")
            onError?("Failed to create audio file", conversationId ?? "")
            return
        }
        
        // Install tap for audio capture + VAD
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer)
        }
        
        // Start the engine
        do {
            try audioEngine.start()
            print("🎧 Listening started (continuous)")
        } catch {
            print("❌ Failed to start audio engine: \(error)")
            onError?("Failed to start listening", conversationId ?? "")
        }
    }
    
    private func stopListening() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        audioFile = nil
        
        print("⏹️ Listening stopped")
    }
    
    // MARK: - Voice Activity Detection
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        // Calculate RMS power
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameCount = Int(buffer.frameLength)
        
        var sum: Float = 0
        for i in 0..<frameCount {
            sum += channelData[i] * channelData[i]
        }
        let rms = sqrt(sum / Float(frameCount))
        let power = 20 * log10(rms + 1e-10)  // Convert to dB
        
        let isSpeech = power > silenceThreshold
        let now = Date()
        
        if isSpeech {
            // Speech detected
            silenceStartTime = nil
            
            if !hasDetectedSpeech {
                hasDetectedSpeech = true
                speechStartTime = now
                print("🗣️ Speech started")
            }
            
            // Write to file
            do {
                try audioFile?.write(from: buffer)
            } catch {
                print("⚠️ Failed to write audio buffer")
            }
            
        } else if hasDetectedSpeech {
            // Silence after speech
            if silenceStartTime == nil {
                silenceStartTime = now
            }
            
            // Still write buffer during silence detection window
            do {
                try audioFile?.write(from: buffer)
            } catch {}
            
            // Check if silence duration exceeded
            if let silenceStart = silenceStartTime {
                let silenceTime = now.timeIntervalSince(silenceStart)
                
                if silenceTime >= silenceDuration {
                    // Check minimum speech duration
                    if let speechStart = speechStartTime {
                        let speechTime = now.timeIntervalSince(speechStart)
                        
                        if speechTime >= minSpeechDuration {
                            // End of user turn - process the audio
                            print("🔇 Silence detected - ending turn (speech: \(String(format: "%.1f", speechTime))s)")
                            endUserTurn()
                        } else {
                            // Too short, ignore
                            print("⚠️ Speech too short, ignoring")
                            resetVADState()
                        }
                    }
                }
            }
        }
    }
    
    private func resetVADState() {
        silenceStartTime = nil
        speechStartTime = nil
        hasDetectedSpeech = false
    }
    
    // MARK: - Turn Management
    
    private func endUserTurn() {
        guard isActive, let convId = conversationId else { return }
        
        // Stop listening
        stopListening()
        
        // Change to thinking state
        setState(.thinking)
        
        // Read the audio data
        if let url = recordingURL, let audioData = try? Data(contentsOf: url) {
            print("📤 Captured \(audioData.count) bytes")
            
            // Send to web layer for processing
            onAudioCaptured?(audioData, convId)
            
            // Clean up
            try? FileManager.default.removeItem(at: url)
        } else {
            print("❌ No audio data captured")
            // Resume listening
            startListening()
        }
        
        recordingURL = nil
    }
    
    // MARK: - Speaking (TTS Playback)
    
    /// Play TTS audio and resume listening when done
    func playAudio(_ data: Data) {
        guard isActive, let convId = conversationId else { return }
        
        setState(.speaking)
        
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.play()
            print("🔊 Playing TTS response")
        } catch {
            print("❌ Playback error: \(error)")
            onError?("Failed to play audio: \(error.localizedDescription)", convId)
            // Resume listening on error
            startListening()
        }
    }
    
    private func stopPlayback() {
        audioPlayer?.stop()
        audioPlayer = nil
    }
    
    // MARK: - State Management
    
    private func setState(_ newState: NativeBridge.ConversationState) {
        guard newState != state else { return }
        
        state = newState
        
        if let convId = conversationId {
            print("📊 State: \(newState.rawValue) (conv: \(convId.prefix(8)))")
            onStateChange?(newState, convId)
        }
    }
}

// MARK: - AVAudioPlayerDelegate
extension ConversationManager: AVAudioPlayerDelegate {
    
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard isActive, let convId = conversationId else { return }
        
        print("✅ TTS playback complete")
        onPlaybackComplete?(convId)
        
        // Auto-resume listening for next turn
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            if self?.isActive == true {
                self?.startListening()
            }
        }
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        guard let convId = conversationId else { return }
        
        print("❌ Playback decode error")
        onError?("Audio decode error", convId)
        
        // Resume listening on error
        if isActive {
            startListening()
        }
    }
}
