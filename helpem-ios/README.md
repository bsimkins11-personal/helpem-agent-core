# HelpEm iOS Native Shell

A thin iOS wrapper around the HelpEm web app for native audio capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     iOS Native Shell                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  AudioManager   │  │    WebView      │                   │
│  │  - Recording    │  │  (WKWebView)    │                   │
│  │  - Playback     │  │                 │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│           └──────┬─────────────┘                            │
│                  │                                          │
│           ┌──────┴──────┐                                   │
│           │ NativeBridge │                                  │
│           │ (Messages)   │                                  │
│           └──────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vercel Web App                            │
│  - Conversation UI                                          │
│  - Agent Logic                                              │
│  - Backend APIs                                             │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Xcode Project

1. Open Xcode
2. File → New → Project
3. Choose "App" under iOS
4. Settings:
   - Product Name: `HelpEmApp`
   - Team: Your development team
   - Organization Identifier: `com.yourcompany`
   - Interface: SwiftUI
   - Language: Swift
5. Create the project

### 2. Add Source Files

Copy these files into your Xcode project:
- `HelpEmApp.swift` (replace the generated one)
- `ContentView.swift` (replace the generated one)
- `WebViewContainer.swift`
- `NativeBridge.swift`
- `AudioManager.swift`

### 3. Configure Info.plist

Add these keys to your Info.plist (or merge with the provided one):
- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`
- `UIBackgroundModes` → `audio`

### 4. Update Web App URL

In `WebViewContainer.swift`, update:
```swift
static let webAppURL = "https://your-app.vercel.app"
```

### 5. Run on Device

- Select your iOS device (simulator won't have real mic)
- Build and run

## Web Integration

Add this to your web app to detect and use native audio:

```javascript
// Check if running in native app
const isNativeApp = window.nativeBridge?.isNative === true;

if (isNativeApp) {
  // Use native audio instead of Web Speech API
  
  // Start recording
  window.nativeBridge.startRecording();
  
  // Stop recording
  window.nativeBridge.stopRecording();
  
  // Listen for events
  window.nativeBridge.on('TRANSCRIPTION_READY', (payload) => {
    console.log('Transcribed:', payload.text);
  });
  
  window.nativeBridge.on('PLAYBACK_COMPLETE', () => {
    console.log('Audio finished playing');
  });
}
```

## Message Types

### Web → Native
| Message | Payload | Description |
|---------|---------|-------------|
| `START_RECORDING` | - | Start mic recording |
| `STOP_RECORDING` | - | Stop and process recording |
| `CANCEL_RECORDING` | - | Stop without processing |
| `PLAY_AUDIO` | `{ url: string }` | Play audio from URL |

### Native → Web
| Message | Payload | Description |
|---------|---------|-------------|
| `BRIDGE_READY` | `{ platform: "ios" }` | Native bridge initialized |
| `RECORDING_STARTED` | - | Recording has begun |
| `RECORDING_COMPLETE` | `{ size: number }` | Recording finished |
| `TRANSCRIPTION_READY` | `{ text: string }` | Speech-to-text result |
| `PLAYBACK_COMPLETE` | - | Audio finished playing |
| `ERROR` | `{ message: string }` | Error occurred |

## Phase 2: Backend Integration

Update `WebViewContainer.swift` `sendAudioToBackend()` to:

1. Send audio data to your backend endpoint
2. Receive transcription and/or TTS audio URL
3. Notify web of transcription
4. Play TTS audio if provided

Example:
```swift
private func sendAudioToBackend(audioData: Data) {
    var request = URLRequest(url: URL(string: "https://your-api/transcribe")!)
    request.httpMethod = "POST"
    request.setValue("audio/m4a", forHTTPHeaderField: "Content-Type")
    request.httpBody = audioData
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

## Files Overview

| File | Purpose |
|------|---------|
| `HelpEmApp.swift` | App entry point |
| `ContentView.swift` | Main view with WebView |
| `WebViewContainer.swift` | WKWebView setup + bridge coordinator |
| `NativeBridge.swift` | Message types + injected JavaScript |
| `AudioManager.swift` | Native audio recording/playback |
| `Info.plist` | Permissions configuration |
