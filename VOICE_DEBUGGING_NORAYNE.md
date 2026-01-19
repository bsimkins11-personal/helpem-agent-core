# Voice Input Debugging - Norayne's Issue

## 🐛 Issue Description

**Symptom:** Voice is activating but not taking voice inputs, agent not responding

**What Works:**
- ✅ Mic button activates
- ✅ Permissions granted
- ✅ Recording starts

**What Doesn't Work:**
- ❌ No transcription happening
- ❌ Agent not receiving input
- ❌ No response from AI

---

## 🔍 Root Cause Analysis

This is **NOT** a permissions issue (that was Build 8).

**Possible causes:**
1. **SFSpeechRecognizer not available** - Device/locale issue
2. **Network required** - Speech recognition needs internet connection
3. **Audio engine failure** - Mic in use by another app
4. **Locale mismatch** - en-US not supported on device
5. **Recognition service down** - Apple's servers

---

## ✅ Fix Applied (Build 9)

### Added Comprehensive Diagnostics

**Before (Silent Failures):**
```swift
private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
// If this fails, nothing happens - no logs, no errors
```

**After (Full Logging):**
```swift
// Try device locale first, fallback to en-US
if let deviceRecognizer = SFSpeechRecognizer(locale: Locale.current) {
    print("✅ Using device locale:", Locale.current.identifier)
    self.recognizer = deviceRecognizer
} else if let usRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")) {
    print("⚠️ Device locale not supported, using en-US")
    self.recognizer = usRecognizer
} else {
    print("❌ CRITICAL: No speech recognizer available!")
    self.recognizer = nil
}
```

### Enhanced Error Detection

**New checks in `beginSession()`:**
1. ✅ Verify recognizer exists
2. ✅ Verify `recognizer.isAvailable`
3. ✅ Log audio session configuration
4. ✅ Log audio format details (sample rate, channels)
5. ✅ Log each step: request → tap → engine → task
6. ✅ Decode specific error codes from speech framework

### Error Code Decoder

**Added specific error handling:**
```swift
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
```

---

## 📱 Testing Instructions for Norayne

### Step 1: Install Build 9

1. Open TestFlight
2. Update to Build 9 (or delete and reinstall)
3. Open helpem app

### Step 2: Connect Device to Mac (for logs)

**Option A: Xcode (Best)**
1. Connect iPhone to Mac with cable
2. Open Xcode
3. Window → Devices and Simulators
4. Select her iPhone
5. Click "Open Console"
6. Filter: "helpem"

**Option B: Console App (Mac)**
1. Connect iPhone to Mac
2. Open Console app (in Applications/Utilities)
3. Select her iPhone from sidebar
4. Filter: "🎤" or "helpem"

### Step 3: Test Voice Input

1. In helpem app, press mic button
2. Speak: "Add a reminder to test voice"
3. Release mic button

### Step 4: Check Console Logs

**Look for these key messages:**

#### ✅ **Success Pattern:**
```
✅ Speech recognizer is available and ready
✅ Audio session configured
✅ Recognition request created
✅ Audio tap installed
✅ Audio engine started
✅ Recognition task started successfully
📝 Partial result: add a reminder
✅ Final transcript: Add a reminder to test voice
```

#### ❌ **Failure Patterns:**

**Pattern 1: Recognizer Not Available**
```
❌ CRITICAL: No speech recognizer available!
❌ Speech recognition may not be supported on this device
```
→ **Solution:** Device or locale issue, need to check device settings

**Pattern 2: Network Issue**
```
❌ Recognition error: kLSRErrorDomain error 1110
❌ Speech recognition service unavailable (need internet?)
```
→ **Solution:** Connect to WiFi or cellular data

**Pattern 3: Permissions**
```
❌ Recognition error: kLSRErrorDomain error 203
❌ Speech recognition denied
```
→ **Solution:** Go to Settings → Privacy → Speech Recognition → Enable helpem

**Pattern 4: Audio Engine**
```
❌ Audio engine error: ...
❌ Failed to start audio engine - mic may be in use
```
→ **Solution:** Close other apps using microphone

**Pattern 5: No Partial Results**
```
✅ Audio engine started
✅ Recognition task started successfully
(nothing after this when speaking)
```
→ **Solution:** Mic not picking up audio, check hardware

---

## 🎯 Quick Diagnostic Checklist

Have norayne check these while testing:

- [ ] Connected to internet (WiFi or cellular)?
- [ ] Microphone permissions granted in Settings?
- [ ] Speech Recognition enabled in Settings → Privacy?
- [ ] No other apps using microphone (close all apps)?
- [ ] Phone language is English (Settings → General → Language)?
- [ ] Not in airplane mode?
- [ ] Phone not on silent/mute?
- [ ] Speaking close to microphone?
- [ ] Speaking clearly and at normal volume?

---

## 🔧 Common Issues & Solutions

### Issue 1: "Speech recognizer not available"

**Possible causes:**
- Device language not English
- Parental controls restricting speech recognition
- Device too old (iOS version?)

**Solutions:**
1. Check Settings → General → Language & Region
2. Check Screen Time restrictions
3. Verify iOS version (need iOS 15+)

---

### Issue 2: "Service unavailable (need internet?)"

**Possible causes:**
- No internet connection
- Apple's speech recognition servers down
- Firewall blocking speech recognition

**Solutions:**
1. Connect to WiFi
2. Try cellular data
3. Try again in a few minutes
4. Check if other speech apps work (Siri, dictation)

---

### Issue 3: "Speech recognition denied"

**Possible causes:**
- Speech Recognition permission denied
- Different from Microphone permission

**Solutions:**
1. Settings → Privacy & Security → Speech Recognition
2. Find "helpem" in list
3. Toggle ON
4. Restart app

---

### Issue 4: No audio captured (engine starts but no results)

**Possible causes:**
- Microphone hardware issue
- Another app has exclusive access to mic
- Bluetooth headset paired but not connected

**Solutions:**
1. Test microphone in Voice Memos app
2. Close all other apps
3. Disconnect Bluetooth devices
4. Restart phone

---

### Issue 5: Partial results show but no final transcript

**Possible causes:**
- Network connection dropped during recognition
- Recognition request timeout

**Solutions:**
1. Check network stability
2. Try shorter phrases
3. Speak clearly and pause at the end

---

## 📊 Diagnostic Report Template

**Have norayne fill this out:**

```
Date: ___________
Build: 1.0 (9)
Device: iPhone _____ (model)
iOS Version: _________
Language: _________
Network: WiFi / Cellular / None

CONSOLE LOGS:
(Paste logs from Console app here)

_____________________________________
_____________________________________
_____________________________________

CHECKLIST:
[ ] Internet connected
[ ] Microphone permission granted
[ ] Speech Recognition permission granted
[ ] No other apps using mic
[ ] Phone language is English
[ ] Speaking clearly near mic

OBSERVED BEHAVIOR:
[ ] Mic button activates
[ ] Haptic feedback felt
[ ] Recording indicator shows
[ ] No transcription appears
[ ] No agent response

ERROR MESSAGES SEEN:
_____________________________________
_____________________________________
_____________________________________
```

---

## 🚀 Next Steps

### If Build 9 Shows Errors:
1. Read the console logs
2. Identify the specific error code
3. Follow the solution for that error
4. Report back with results

### If Build 9 Shows Success Logs But Still No Transcription:
1. This means audio is captured but not sent to web
2. Check web console logs too (Safari Web Inspector)
3. Possible JavaScript bridge issue

### If Still Stuck:
1. Send full console log output
2. Include diagnostic report
3. Test on a different iPhone (if available)
4. Compare to working device (your phone)

---

## 🎓 Understanding Speech Recognition Flow

**Full pipeline (what needs to work):**

```
User Speaks
    ↓
Microphone captures audio ✅ (we know this works - permissions granted)
    ↓
AVAudioEngine sends to SFSpeechRecognizer ❓ (checking in Build 9)
    ↓
SFSpeechRecognizer transcribes ❓ (checking in Build 9)
    ↓
SpeechManager gets final text ❓ (checking in Build 9)
    ↓
WebViewContainer sends to JavaScript ❓ (next to check)
    ↓
ChatInput receives text ❓ (next to check)
    ↓
Agent processes and responds ❓ (last step)
```

**Build 9 adds diagnostics for steps 2-5.**

If those all pass but agent still doesn't respond, the issue is in steps 6-7 (web side).

---

## 🔍 Expected Console Output (Normal Flow)

```
🎤 Speech authorization status: Authorized (user said yes)
✅ Using device locale for speech recognition: en-US
✅ Speech recognizer is available and ready
📨 Received action from web: startRecording
🔊 Speaking: (any previous speech stops)
🎤 Started recording
🎤 beginSession() called
✅ Speech recognizer is ready
✅ Audio session configured
✅ Recognition request created
🎤 Audio format: <AVAudioFormat: 0x...>
🎤 Sample rate: 48000.0
🎤 Channels: 1
✅ Audio tap installed
✅ Audio engine started
🎤 Starting recognition task...
✅ Recognition task started successfully
📝 Partial result: add a
📝 Partial result: add a reminder
📝 Partial result: add a reminder to test
📝 Partial result: add a reminder to test voice
✅ Final transcript: Add a reminder to test voice
🛑 Stopping listening...
📝 Sending transcript: Add a reminder to test voice
```

**This is what we want to see!** ✅

---

**Build 9 will show us EXACTLY where the failure is happening.** 🎯
