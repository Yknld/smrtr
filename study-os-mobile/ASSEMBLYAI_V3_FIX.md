# AssemblyAI v3 Universal Streaming Fix

## Changes Made

### 1. ✅ Updated to v3 Endpoint
- **OLD**: `wss://api.assemblyai.com/v2/realtime/ws` (deprecated)
- **NEW**: `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&formatted_finals=true&token={temp_token}`

### 2. ✅ Fixed Authentication
- Now gets **temporary token** from `https://streaming.assemblyai.com/v3/token?expires_in_seconds=600`
- Passes token as query param in WebSocket URL (proper v3 auth method)
- Reduced API key logging (no longer logs partial key)

### 3. ✅ Fixed Audio Streaming (CRITICAL)
**Before** (broken):
```typescript
// Bad: stop/start loop every 250ms
setInterval(async () => {
  const audioData = await AudioRecord.stop(); // Creates gaps!
  AudioRecord.start(); // Restart recorder
  await sendAudioFrame(audioData); // Read WAV file, base64 encode
}, 250);
```

**After** (correct):
```typescript
// Good: Continuous streaming with data callback
AudioRecord.on('data', (base64Chunk: string) => {
  this.ws.send(base64Chunk); // Send PCM chunks directly
});
AudioRecord.start(); // Start once, streams continuously
```

**Key improvements**:
- ✅ No gaps in audio (continuous capture)
- ✅ No file I/O (direct base64 PCM chunks)
- ✅ Lower latency (immediate streaming)
- ✅ Proper PCM16 mono 16kHz format

### 4. ✅ Updated Message Parsing for v3
**v2 messages** (old):
- `SessionBegins`, `PartialTranscript`, `FinalTranscript`, `SessionTerminated`

**v3 messages** (new):
- `Begin` - Session started
- `Turn` - Contains `transcript` field with text
- `End` - Session ended

**Code changes**:
```typescript
// v3 API Turn message
if (messageType === 'Turn') {
  const text = data.transcript || '';
  this.onTranscript?.({
    type: 'final',
    text: text
  });
}
```

### 5. ✅ Cleanup Improvements
- Removed unused `audioRecordingInterval` property
- Updated terminate message: `{ type: 'Terminate' }` for v3
- Simplified stop logic (no interval to clear)

## Critical Fixes Applied

### Issue 1: "Invalid JSON" Error
**Problem**: Sending base64 text instead of binary PCM data
**Fix**: Decode base64 → Uint8Array → ArrayBuffer before sending

### Issue 2: "Input Duration Violation: 0.0 ms"
**Problem**: Audio chunks too small (< 50ms). AssemblyAI v3 requires 50-1000ms chunks.
**Fix**: Buffer audio chunks until we have ≥1600 bytes (50ms at 16kHz 16-bit mono)

```typescript
// Buffer small chunks
this.audioBuffer.push(bytes);
const totalSize = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);

// Send when we have >= 50ms
if (totalSize >= 1600) {
  const combined = new Uint8Array(totalSize);
  // ... concatenate and send
  this.ws.send(combined.buffer);
}
```

## Testing

**To test**:
1. Reload the app
2. Go to Live Transcription
3. Tap "🎤 Start Recording"
4. **Speak into your microphone**

**Expected logs**:
```
🎫 Getting temporary token from AssemblyAI...
✅ Got temporary token
✅ AssemblyAI WebSocket connected (v3 universal streaming)
✅ AssemblyAI session begun: <id>
🎙️ Continuous audio recording started
Turn transcript: <your words>
```

## Architecture

```
Mobile App
    ↓
1. GET temp token from https://streaming.assemblyai.com/v3/token
    ↓
2. Connect WebSocket to wss://streaming.assemblyai.com/v3/ws?token=...
    ↓
3. Stream continuous PCM16 audio chunks (base64)
    ↓
4. Receive Turn messages with transcripts
    ↓
5. Display in UI (final transcripts)
```

## Files Changed
- `apps/mobile/src/services/assemblyLive.ts` - Complete rewrite of audio streaming logic

## Next Steps
- Test with real speech and verify transcription accuracy
- Add partial transcript support if needed (v3 may provide turn-based updates)
- Consider adding error recovery/reconnection logic
- Move to backend-generated tokens for production (don't expose API key in app)
