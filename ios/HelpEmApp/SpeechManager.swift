// SpeechManager.swift
// Speech recognition with persistent permissions

import Foundation
import Speech
import AVFoundation
import Combine

final class SpeechManager: ObservableObject {
    
    var onFinalResult: ((String) -> Void)?
    
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    
    private var latestPartial: String = ""
    private var finalTranscript: String?
    
    // Cache authorization status for efficiency
    @Published private(set) var isAuthorized = false
    
    init() {
        checkAuthorization()
    }
    
    // MARK: - Authorization
    
    /// Check current authorization status (cached, instant)
    func checkAuthorization() {
        let status = SFSpeechRecognizer.authorizationStatus()
        isAuthorized = (status == .authorized)
        print("🎤 Speech authorization status:", status.description)
    }
    
    /// Request authorization if needed (shows dialog only first time)
    func requestAuthorizationIfNeeded() async -> Bool {
        let currentStatus = SFSpeechRecognizer.authorizationStatus()
        
        // Already authorized - return immediately
        if currentStatus == .authorized {
            isAuthorized = true
            return true
        }
        
        // Already denied/restricted - can't request again
        if currentStatus == .denied || currentStatus == .restricted {
            print("⚠️ Speech recognition denied or restricted")
            isAuthorized = false
            return false
        }
        
        // Not determined - request permission
        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { [weak self] status in
                let authorized = (status == .authorized)
                self?.isAuthorized = authorized
                print("🎤 Speech authorization:", authorized ? "✅ Granted" : "❌ Denied")
                continuation.resume(returning: authorized)
            }
        }
    }
    
    // MARK: - Recording
    
    /// Start listening (checks permission automatically)
    func startListening() {
        latestPartial = ""
        finalTranscript = nil
        
        // Fast path: If already authorized, start immediately
        if isAuthorized {
            beginSession()
            return
        }
        
        // Otherwise, request authorization first
        Task {
            let granted = await requestAuthorizationIfNeeded()
            if granted {
                await MainActor.run {
                    beginSession()
                }
            } else {
                print("❌ Cannot start listening - permission denied")
            }
        }
    }
    
    private func beginSession() {
        // Configure audio session
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .spokenAudio,
                options: [.defaultToSpeaker, .allowBluetoothHFP]
            )
            try session.setActive(true)
        } catch {
            print("❌ Audio session error:", error)
            return
        }
        
        // Create recognition request
        request = SFSpeechAudioBufferRecognitionRequest()
        request?.shouldReportPartialResults = true
        
        // Set up audio tap
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(
            onBus: 0,
            bufferSize: 1024,
            format: format
        ) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        
        // Start audio engine
        audioEngine.prepare()
        do {
            try audioEngine.start()
            print("🎤 Started listening...")
        } catch {
            print("❌ Audio engine error:", error)
            return
        }
        
        // Start recognition task
        guard let recognizer = recognizer, let request = request else {
            print("❌ Recognizer or request not available")
            return
        }
        
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Recognition error:", error)
                return
            }
            
            guard let result = result else { return }
            
            let text = result.bestTranscription.formattedString
            self.latestPartial = text
            
            if result.isFinal {
                self.finalTranscript = text
                print("✅ Final transcript:", text)
            }
        }
    }
    
    func stopListening() {
        print("🛑 Stopping listening...")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            self.audioEngine.stop()
            self.audioEngine.inputNode.removeTap(onBus: 0)
            self.request?.endAudio()
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                self.task?.cancel()
                self.task = nil
                self.request = nil
                
                do {
                    try AVAudioSession.sharedInstance().setActive(false)
                } catch {
                    print("⚠️ Error deactivating audio session:", error)
                }
                
                // Send final result
                let output = self.finalTranscript ?? 
                             self.latestPartial.trimmingCharacters(in: .whitespacesAndNewlines)
                
                if !output.isEmpty {
                    print("📝 Sending transcript:", output)
                    self.onFinalResult?(output)
                }
                
                self.latestPartial = ""
                self.finalTranscript = nil
            }
        }
    }
}

// MARK: - Authorization Status Extension

extension SFSpeechRecognizerAuthorizationStatus {
    var description: String {
        switch self {
        case .notDetermined:
            return "Not Determined (will ask user)"
        case .denied:
            return "Denied (user said no)"
        case .restricted:
            return "Restricted (parental controls, etc.)"
        case .authorized:
            return "Authorized (user said yes)"
        @unknown default:
            return "Unknown"
        }
    }
}
