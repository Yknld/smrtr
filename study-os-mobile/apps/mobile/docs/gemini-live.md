# Gemini Live API Integration

Real-time audio transcription using Google's Gemini Live API with ephemeral tokens.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│             │  Auth   │   Supabase Edge  │  Secret │                 │
│  React      │────────▶│    Function      │─────────▶│  Google GenAI  │
│  Native App │         │ gemini_live_token│         │      API        │
│             │◀────────│                  │◀─────────│                 │
└─────────────┘  Token  └──────────────────┘  Token   └─────────────────┘
       │
       │ WebSocket (ephemeral token)
       │
       ▼
┌─────────────────────────────────┐
│   Gemini Live API (WebSocket)   │
│  v1alpha BidiGenerateContent    │
│                                 │
│  • Audio In  (PCM16 mono 16kHz) │
│  • Text Out  (transcription)    │
└─────────────────────────────────┘
```

## Key Features

✅ **Secure**: GEMINI_API_KEY never leaves the server  
✅ **Ephemeral**: Short-lived tokens (30 min max, 1 min new session)  
✅ **Real-time**: True live transcription with partial updates  
✅ **Native Audio**: Direct microphone capture on device  

## Flow

### 1. Token Request
```typescript
// App calls Supabase Edge Function with user JWT
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/gemini_live_token`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userJWT}`,
      'Content-Type': 'application/json',
    },
  }
);

// Receive ephemeral token
const { token, expire_time, new_session_expire_time, model } = await response.json();
```

Response:
```json
{
  "token": "auth_tokens/cd02d243f0cc8cc2d2aa5d0295e927b6240cdd991ff05757954fd64327221495",
  "expire_time": "2026-01-10T07:53:02.434Z",
  "new_session_expire_time": "2026-01-10T07:24:02.434Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "request_id": "3997eee1-e51b-4948-be79-f947360ac0b7"
}
```

### 2. WebSocket Connection
```typescript
// Connect using ephemeral token as access_token query param
const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?access_token=${token}`;

const ws = new WebSocket(wsUrl);
```

### 3. Setup Message
Once WebSocket is open, send config to enable input transcription:

```typescript
ws.send(JSON.stringify({
  setup: {
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    config: {
      responseModalities: [],              // No audio output (text-only)
      inputAudioTranscription: {},         // Enable transcription
    }
  }
}));
```

### 4. Audio Streaming
Stream PCM16 mono 16kHz audio:

```typescript
ws.send(JSON.stringify({
  realtimeInput: {
    mediaChunks: [{
      mimeType: "audio/pcm;rate=16000",
      data: base64EncodedPCM16Audio,       // Base64-encoded PCM16 LE bytes
    }]
  }
}));
```

### 5. Receive Transcription
Listen for transcription events:

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  // Setup complete
  if (message.setupComplete) {
    console.log('Ready to transcribe');
  }
  
  // Transcription result (check both formats)
  if (message.serverContent?.modelTurn?.parts) {
    const parts = message.serverContent.modelTurn.parts;
    for (const part of parts) {
      if (part.text) {
        const isFinal = message.serverContent.turnComplete || false;
        onTranscript(part.text, isFinal);
      }
    }
  }
  
  // Alternative format: inputTranscription
  if (message.inputTranscription?.text) {
    const isFinal = message.inputTranscription.isFinal || false;
    onTranscript(message.inputTranscription.text, isFinal);
  }
};
```

## Audio Requirements

### Format
- **Encoding**: PCM16 (16-bit linear PCM, little-endian)
- **Sample Rate**: 16 kHz (16000 Hz)
- **Channels**: Mono (1 channel)
- **MIME Type**: `"audio/pcm;rate=16000"`

### Frame Size
Recommended frame duration: **20–40 ms**

At 16 kHz mono PCM16:
- 20ms = 640 bytes (320 samples × 2 bytes)
- 40ms = 1280 bytes (640 samples × 2 bytes)

### iOS Implementation Notes

**expo-av** (used in MVP) does not provide raw audio buffer access.

For production, use one of:
1. **react-native-audio-recorder** (native PCM access)
2. **Custom native module** (Audio Queue Services on iOS)
3. **react-native-audio-api** (Web Audio API for RN)

Example native audio capture (iOS):
```swift
// AudioQueueServices - record PCM16 mono 16kHz
let format = AudioStreamBasicDescription(
  mSampleRate: 16000.0,
  mFormatID: kAudioFormatLinearPCM,
  mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked,
  mBytesPerPacket: 2,
  mFramesPerPacket: 1,
  mBytesPerFrame: 2,
  mChannelsPerFrame: 1,
  mBitsPerChannel: 16,
  mReserved: 0
)
```

## Token Lifecycle

### Expiry Times
- **`expire_time`**: Token can't be used after this (30 min)
- **`new_session_expire_time`**: Must connect WebSocket before this (1 min)

### Handling Expiry
```typescript
// Before connecting
const newSessionExpire = new Date(new_session_expire_time);
if (new Date() > newSessionExpire) {
  // Re-fetch token
  token = await fetchEphemeralToken();
}

// During session
ws.onerror = async (error) => {
  if (error.message.includes('expired') || error.message.includes('401')) {
    // Re-fetch token and reconnect
    token = await fetchEphemeralToken();
    await connectWebSocket();
  }
};
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing authorization header` | No user JWT | Ensure user is logged in via Supabase Auth |
| `TOKEN_CREATE_FAILED` | Gemini API error | Check `GEMINI_API_KEY` in Supabase secrets |
| `WebSocket 401` | Expired token | Re-fetch ephemeral token |
| `WebSocket 403` | Invalid token | Re-fetch ephemeral token |
| `Microphone permission denied` | iOS permissions | Request `AVAudioSession` permission |

### Retry Strategy
```typescript
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Fetch fresh token
      const token = await fetchEphemeralToken();
      
      // Connect
      await connectWebSocket(token);
      return; // Success
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

## Files

### Service Layer
- **`src/services/geminiLive.ts`**: Core service handling token fetch, WebSocket, audio capture

### UI
- **`src/screens/LiveTranscription/LiveTranscriptionScreen.tsx`**: Live transcription screen

### Backend
- **`backend/functions/gemini_live_token/index.ts`**: Supabase Edge Function for token minting
- **`backend/docs/gemini-live-transcription.md`**: Backend architecture docs
- **`backend/docs/gemini-ephemeral-token.md`**: Ephemeral token details

## Testing

### 1. Manual Test (curl)
```bash
# Get user JWT
TOKEN=$(node backend/tests/get-token.js user1@test.com password123 | tail -1)

# Fetch ephemeral token
curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_live_token \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

### 2. WebSocket Test (Node.js)
See `backend/tests/test-gemini-live.js` for full WebSocket test script.

### 3. Mobile Test
1. Run app on iOS simulator/device
2. Navigate to "Live Transcription" screen
3. Tap "Start" button
4. Grant microphone permission
5. Speak and verify transcript appears
6. Tap "Stop" to end session

## Known Limitations (MVP)

⚠️ **Audio buffer access**: expo-av doesn't provide raw PCM buffers  
⚠️ **iOS only**: Android audio capture not implemented  
⚠️ **No resampling**: Assumes device captures at 16kHz natively  

### Next Steps for Production

1. **Implement native audio capture**  
   Use native module or react-native-audio-recorder for raw PCM16 access

2. **Add resampling**  
   Device may capture at 44.1kHz/48kHz - resample to 16kHz before sending

3. **Optimize frame size**  
   Test 20ms vs 40ms frames for best latency/quality tradeoff

4. **Add network resilience**  
   Handle reconnection, buffering, and offline states

5. **Implement Android support**  
   Add Android audio capture via MediaRecorder/AudioRecord

## References

- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live-api)
- [Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [iOS Audio Queue Services](https://developer.apple.com/documentation/audiotoolbox/audio_queue_services)
- [React Native Audio](https://docs.expo.dev/versions/latest/sdk/audio/)
