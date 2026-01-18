// SpeechManager.swift
// Speech recognition with persistent permissions

import Foundation
import Speech
import AVFoundation
import UIKit

final class SpeechManager {
    
    var onFinalResult: ((String) -> Void)?
    
    private let recognizer: SFSpeechRecognizer?
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    
    private var latestPartial: String = ""
    private var finalTranscript: String?
    
    // Cache authorization status for efficiency
    private(set) var isAuthorized = false
    
    init() {
        // Try device locale first, fall back to en-US
        if let deviceRecognizer = SFSpeechRecognizer(locale: Locale.current) {
            print("✅ Using device locale for speech recognition:", Locale.current.identifier)
            self.recognizer = deviceRecognizer
        } else if let usRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")) {
            print("⚠️ Device locale not supported, using en-US")
            self.recognizer = usRecognizer
        } else {
            print("❌ CRITICAL: No speech recognizer available!")
            self.recognizer = nil
        }
        
        // Check if recognizer is available
        if recognizer == nil {
            print("❌ Speech recognition not available on this device")
        } else if recognizer?.isAvailable == false {
            print("❌ Speech recognizer exists but is NOT available")
        } else {
            print("✅ Speech recognizer is available and ready")
        }
        
        checkAuthorization()
    }
    
    deinit {
        // Force cleanup on deallocation
        forceCleanup()
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
        print("🎤 beginSession() called")
        
        // Check if recognizer exists and is available
        guard let recognizer = recognizer else {
            print("❌ CRITICAL: No speech recognizer available!")
            print("❌ Speech recognition may not be supported on this device")
            return
        }
        
        guard recognizer.isAvailable else {
            print("❌ CRITICAL: Speech recognizer is not available!")
            print("❌ This can happen if:")
            print("   - Device has restrictions (parental controls)")
            print("   - No network connection (some features need internet)")
            print("   - Language not supported")
            return
        }
        
        print("✅ Speech recognizer is ready")
        
        // Configure audio session
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .spokenAudio,
                options: [.defaultToSpeaker, .allowBluetoothHFP]
            )
            try session.setActive(true)
            print("✅ Audio session configured")
        } catch {
            print("❌ Audio session error:", error)
            print("❌ This usually means another app is using the microphone")
            return
        }
        
        // Create recognition request
        request = SFSpeechAudioBufferRecognitionRequest()
        request?.shouldReportPartialResults = true
        print("✅ Recognition request created")
        
        // Set up audio tap
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        
        print("🎤 Audio format: \(format)")
        print("🎤 Sample rate: \(format.sampleRate)")
        print("🎤 Channels: \(format.channelCount)")
        
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(
            onBus: 0,
            bufferSize: 1024,
            format: format
        ) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        print("✅ Audio tap installed")
        
        // Start audio engine
        audioEngine.prepare()
        do {
            try audioEngine.start()
            print("✅ Audio engine started")
        } catch {
            print("❌ Audio engine error:", error)
            print("❌ Failed to start audio engine - mic may be in use")
            return
        }
        
        // Start recognition task
        guard let request = request else {
            print("❌ Recognition request is nil!")
            return
        }
        
        print("🎤 Starting recognition task...")
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Recognition error:", error.localizedDescription)
                print("❌ Error code:", (error as NSError).code)
                print("❌ Error domain:", (error as NSError).domain)
                
                // Check for specific error codes
                let nsError = error as NSError
                if nsError.domain == "kLSRErrorDomain" {
                    switch nsError.code {
                    case 1110:
                        print("❌ Speech recognition service unavailable (need internet?)")
                    case 203:
                        print("❌ Speech recognition denied")
                    case 216:
                        print("❌ Speech recognition request was cancelled")
                    default:
                        print("❌ Unknown speech recognition error")
                    }
                }
                return
            }
            
            guard let result = result else {
                print("⚠️ Recognition result is nil (no error though)")
                return
            }
            
            let text = result.bestTranscription.formattedString
            self.latestPartial = text
            
            if !text.isEmpty {
                print("📝 Partial result:", text)
            }
            
            if result.isFinal {
                self.finalTranscript = text
                print("✅ Final transcript:", text)
            }
        }
        
        if task != nil {
            print("✅ Recognition task started successfully")
        } else {
            print("❌ Failed to create recognition task")
        }
    }
    
    func stopListening() {
        print("🛑 Stopping listening...")
        
        // Capture current transcript immediately
        let output = self.finalTranscript ?? 
                     self.latestPartial.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Stop audio engine IMMEDIATELY - no delays
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        
        // Cancel recognition task
        task?.cancel()
        task = nil
        request = nil
        
        // Deactivate audio session IMMEDIATELY
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ Audio session deactivated immediately")
        } catch {
            print("⚠️ Error deactivating audio session:", error)
        }
        
        // Send final result if we have one
        if !output.isEmpty {
            print("📝 Sending transcript:", output)
            self.onFinalResult?(output)
        }
        
        // Clear state
        self.latestPartial = ""
        self.finalTranscript = nil
    }
    
    // MARK: - Cleanup
    
    /// Force immediate cleanup of audio resources
    func forceCleanup() {
        print("🧹 Force cleanup: Releasing microphone")
        
        // Stop audio engine immediately
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
            print("✅ Audio engine stopped")
        }
        
        // Cancel recognition task
        task?.cancel()
        task = nil
        
        // End recognition request
        request?.endAudio()
        request = nil
        
        // Deactivate audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ Audio session force deactivated")
        } catch {
            print("⚠️ Error force deactivating audio session:", error)
        }
        
        // Clear state
        latestPartial = ""
        finalTranscript = nil
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
