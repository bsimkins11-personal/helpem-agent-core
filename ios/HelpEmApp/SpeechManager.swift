import Foundation
import Speech
import AVFoundation

final class SpeechManager {

    var onFinalResult: ((String) -> Void)?

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    private var latestPartial: String = ""
    private var finalTranscript: String?

    func startListening() {
        latestPartial = ""
        finalTranscript = nil

        SFSpeechRecognizer.requestAuthorization { auth in
            guard auth == .authorized else {
                return
            }
            DispatchQueue.main.async {
                self.beginSession()
            }
        }
    }

    private func beginSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(
            .playAndRecord,
            mode: .spokenAudio,
            options: [.defaultToSpeaker, .allowBluetoothHFP]
        )
        try? session.setActive(true)

        request = SFSpeechAudioBufferRecognitionRequest()
        request?.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        inputNode.removeTap(onBus: 0)
        inputNode.installTap(
            onBus: 0,
            bufferSize: 1024,
            format: format
        ) { buffer, _ in
            self.request?.append(buffer)
        }

        audioEngine.prepare()
        try? audioEngine.start()

        task = recognizer?.recognitionTask(with: request!) { result, _ in
            guard let result = result else { return }

            let text = result.bestTranscription.formattedString
            self.latestPartial = text

            if result.isFinal {
                self.finalTranscript = text
            }
        }
    }

    func stopListening() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            self.audioEngine.stop()
            self.audioEngine.inputNode.removeTap(onBus: 0)
            self.request?.endAudio()

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                self.task?.cancel()
                self.task = nil
                self.request = nil
                try? AVAudioSession.sharedInstance().setActive(false)

                let output =
                    self.finalTranscript ??
                    self.latestPartial.trimmingCharacters(in: .whitespacesAndNewlines)

                if !output.isEmpty {
                    self.onFinalResult?(output)
                }

                self.latestPartial = ""
                self.finalTranscript = nil
            }
        }
    }
}

