// AudioManager.swift
// Handles native audio recording and playback

import Foundation
import AVFoundation

class AudioManager: NSObject, ObservableObject {
    
    // MARK: - Properties
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingURL: URL?
    
    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var hasPermission = false
    
    // MARK: - Callbacks (set by Coordinator)
    var onRecordingComplete: ((Data) -> Void)?
    var onPlaybackComplete: (() -> Void)?
    var onError: ((String) -> Void)?
    
    // MARK: - Initialization
    override init() {
        super.init()
        setupAudioSession()
    }
    
    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true)
            print("🎤 Audio session configured")
        } catch {
            print("❌ Audio session error: \(error)")
            onError?("Failed to configure audio: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Permissions
    func requestMicrophonePermission() {
        AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                self?.hasPermission = granted
                print(granted ? "✅ Microphone permission granted" : "❌ Microphone permission denied")
            }
        }
    }
    
    // MARK: - Recording
    func startRecording() {
        guard hasPermission else {
            onError?("Microphone permission not granted")
            requestMicrophonePermission()
            return
        }
        
        // Stop any existing recording
        if isRecording {
            stopRecording()
        }
        
        // Create temporary file URL
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        recordingURL = documentsPath.appendingPathComponent("recording_\(Date().timeIntervalSince1970).m4a")
        
        // Recording settings (AAC format, good for speech)
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000,  // 16kHz - good for speech recognition
            AVNumberOfChannelsKey: 1,  // Mono
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()
            isRecording = true
            print("🎙️ Recording started")
        } catch {
            print("❌ Recording error: \(error)")
            onError?("Failed to start recording: \(error.localizedDescription)")
        }
    }
    
    func stopRecording() {
        guard isRecording, let recorder = audioRecorder else { return }
        
        recorder.stop()
        isRecording = false
        print("⏹️ Recording stopped")
        
        // Read the recorded audio data
        if let url = recordingURL, let data = try? Data(contentsOf: url) {
            print("📁 Recorded \(data.count) bytes")
            onRecordingComplete?(data)
            
            // Clean up the file
            try? FileManager.default.removeItem(at: url)
        }
        
        audioRecorder = nil
        recordingURL = nil
    }
    
    func cancelRecording() {
        guard isRecording else { return }
        
        audioRecorder?.stop()
        isRecording = false
        
        // Delete the file without sending
        if let url = recordingURL {
            try? FileManager.default.removeItem(at: url)
        }
        
        audioRecorder = nil
        recordingURL = nil
        print("🚫 Recording cancelled")
    }
    
    // MARK: - Playback
    func playAudio(from url: URL) {
        // Stop any current playback
        stopPlayback()
        
        // Download and play audio
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else {
                DispatchQueue.main.async {
                    self?.onError?("Failed to download audio: \(error?.localizedDescription ?? "unknown")")
                }
                return
            }
            
            DispatchQueue.main.async {
                self.playAudioData(data)
            }
        }
        task.resume()
    }
    
    func playAudioData(_ data: Data) {
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.play()
            isPlaying = true
            print("🔊 Playing audio")
        } catch {
            print("❌ Playback error: \(error)")
            onError?("Failed to play audio: \(error.localizedDescription)")
        }
    }
    
    func stopPlayback() {
        audioPlayer?.stop()
        audioPlayer = nil
        isPlaying = false
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioManager: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            onError?("Recording finished unsuccessfully")
        }
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        onError?("Recording encode error: \(error?.localizedDescription ?? "unknown")")
    }
}

// MARK: - AVAudioPlayerDelegate
extension AudioManager: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isPlaying = false
        onPlaybackComplete?()
        print("✅ Playback finished")
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        isPlaying = false
        onError?("Playback decode error: \(error?.localizedDescription ?? "unknown")")
    }
}
