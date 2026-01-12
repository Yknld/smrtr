# Gemini Live API - True Live Transcription

**Purpose:** Real-time audio transcription using Gemini Live API with WebSocket connections.

**Status:** Production-ready architecture

---

## 🏗️ **Architecture Overview**

### **Client-to-Server Direct Connection**

```
┌─────────────┐
│   Mobile    │
│   Client    │
└──────┬──────┘
       │ 1) POST /gemini_live_token
       │    Authorization: Bearer <user_jwt>
       ↓
┌─────────────────┐
│ Supabase Edge   │
│ Function        │
└──────┬──────────┘
       │ 2) Creates ephemeral token
       │    using GEMINI_API_KEY
       ↓
┌─────────────┐
│   Mobile    │ ← Returns ephemeral token
│   Client    │
└──────┬──────┘
       │ 3) WebSocket connection
       │    wss://generativelanguage.googleapis.com/...
       │    using ephemeral token (NOT API key)
       ↓
┌─────────────────┐
│  Gemini Live    │
│      API        │
└─────────────────┘
```

**Why Direct Connection?**
- ✅ Lower latency (no backend proxy)
- ✅ Better for streaming audio/video
- ✅ Ephemeral tokens prevent API key leakage
- ✅ Session limits enforced by token expiration

---

## 🔑 **Ephemeral Token Flow**

### **1. Client Requests Token**

```bash
POST /gemini_live_token
Authorization: Bearer <user_jwt>
```

**Response:**
```json
{
  "token": "projects/123/locations/us-central1/cachedTokens/abc...",
  "expire_time": "2026-01-10T08:00:00Z",
  "new_session_expire_time": "2026-01-10T07:31:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "request_id": "uuid..."
}
```

### **2. Token Configuration**

**Ephemeral Token Settings:**
- **`uses: 1`** - Token can only be used once
- **`expireTime`** - Token valid for 30 minutes
- **`newSessionExpireTime`** - Must start session within 1 minute
- **`apiVersion: v1alpha`** - Required for Live API

**Live API Constraints Locked In:**
- **Model:** `gemini-2.5-flash-native-audio-preview-12-2025`
- **Response Modalities:** `["AUDIO"]` (audio output from Gemini)
- **Session Resumption:** Enabled (`{}`)
- **Input Audio Transcription:** Enabled (`{}`) ← **This gives us live transcription!**

---

## 🎤 **Audio Requirements**

### **Input Audio Format**

**Required Format:**
- **Encoding:** Raw PCM16 (16-bit, little-endian)
- **Sample Rate:** 16kHz (recommended)
- **Channels:** Mono
- **MIME Type:** `"audio/pcm;rate=16000"`

**Client Responsibilities:**
1. Capture audio from microphone
2. Convert to PCM16 format (if not already)
3. Resample to 16kHz mono (if needed)
4. Stream raw audio bytes over WebSocket

**Example Audio Capture (React Native - pseudocode):**
```typescript
// Mobile app would use react-native-audio or similar
const audioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 'MIC',
  wavFile: false, // Raw PCM, no WAV header
};
```

---

## 📡 **WebSocket Communication**

### **1. Connect to Gemini Live API**

**Endpoint:**
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
```

**Authentication:**
Use the ephemeral token as if it were an API key:
```typescript
const ws = new WebSocket(
  `wss://generativelanguage.googleapis.com/ws/...?key=${ephemeralToken}`
);
```

### **2. Send Audio Data**

**Message Format (JSON):**
```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "mimeType": "audio/pcm;rate=16000",
        "data": "<base64-encoded-pcm16-audio>"
      }
    ]
  }
}
```

**Recommended Chunk Size:**
- Send audio in ~100-200ms chunks
- Example: 16kHz × 2 bytes × 0.1s = 3,200 bytes per chunk

### **3. Receive Transcription Events**

**Gemini sends back two types of events:**

**A) Input Transcription Events** (what we want for transcription):
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "text": "user said hello world"
        }
      ]
    },
    "turnComplete": false
  }
}
```

**B) Audio Response Events** (Gemini's audio reply):
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "audio/pcm",
            "data": "<base64-audio>"
          }
        }
      ]
    }
  }
}
```

**For transcription only:**
- Listen for `serverContent.modelTurn.parts` with `text` field
- Ignore `inlineData` audio responses (or play them if building a voice assistant)

---

## 💾 **Storing Transcriptions**

### **Option 1: Real-Time Storage (Recommended for Live Captions)**

**Flow:**
1. Client receives transcription events from Gemini Live API
2. Client immediately displays text as "live captions"
3. Client buffers transcriptions locally
4. When session ends, client sends buffered text to our existing backend

**Advantages:**
- Instant feedback (no backend latency)
- Works offline during recording
- Can still use our existing `transcripts` table for storage

### **Option 2: Store Each Event (Optional)**

**Flow:**
1. Client receives transcription event
2. Client immediately calls our backend: `POST /store_live_transcript`
3. Backend inserts into `transcript_segments` table

**Schema Reuse:**
```sql
INSERT INTO transcript_segments (session_id, chunk_index, text, confidence)
VALUES (
  'session_uuid',
  0, -- or use event sequence number
  'transcribed text from Gemini',
  0.95
);
```

**Note:** For true live transcription, Option 1 (buffer then send) is more efficient.

---

## ⏱️ **Session Duration & Limits**

### **Ephemeral Token Expiration**

| Limit | Value | Meaning |
|-------|-------|---------|
| **New Session Expire Time** | 1 minute | Client must connect to WebSocket within 1 minute of getting token |
| **Expire Time** | 30 minutes | Session can last max 30 minutes after connection |
| **Uses** | 1 | Token can only be used once (single WebSocket connection) |

**Behavior:**
- Client gets token at `T+0`
- Must connect by `T+1m` (or token is invalid)
- Once connected, session can last until `T+30m`
- If disconnected, cannot reconnect with same token (uses = 1)

**Best Practice:**
- Request token immediately before starting recording
- Connect to WebSocket within seconds
- If session exceeds 30 minutes, request new token and start new session

---

## 🛡️ **Security**

### **API Key Protection**

**❌ NEVER do this:**
```typescript
// DON'T: Expose API key in client code
const geminiApiKey = "AIzaSy...";
const ws = new WebSocket(`wss://...?key=${geminiApiKey}`);
```

**✅ DO this:**
```typescript
// 1. Get ephemeral token from our backend
const response = await fetch('/gemini_live_token', {
  headers: { Authorization: `Bearer ${userJwt}` }
});
const { token } = await response.json();

// 2. Use ephemeral token (short-lived, single-use)
const ws = new WebSocket(`wss://...?key=${token}`);
```

**Why Ephemeral Tokens?**
- Short-lived (1-30 minutes)
- Single-use (can't be reused)
- User-specific (tied to authenticated user)
- Scoped (locked to specific model + config)
- If leaked, minimal damage (expires quickly)

---

## 🔧 **Edge Function Configuration**

### **Supabase Secrets**

**Required:**
```bash
# Set in Supabase Dashboard or CLI
GEMINI_API_KEY=AIzaSy...
```

**Get your Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Store in Supabase: `supabase secrets set GEMINI_API_KEY=<key>`

### **Deploy Edge Function**

```bash
cd study-os-mobile
supabase functions deploy gemini_live_token --no-verify-jwt
```

---

## 🧪 **Testing the Flow**

### **1. Get Ephemeral Token**

```bash
# Get user JWT
TOKEN=$(node backend/tests/get-token.js user1@test.com password123 | tail -1)

# Request ephemeral token
curl -X POST https://your-project.supabase.co/functions/v1/gemini_live_token \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "token": "projects/.../cachedTokens/...",
  "expire_time": "2026-01-10T08:00:00Z",
  "new_session_expire_time": "2026-01-10T07:31:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "request_id": "uuid"
}
```

### **2. Connect to Gemini Live API (Client)**

```typescript
// Mobile client code (pseudocode)
const { token } = await getEphemeralToken();

const ws = new WebSocket(
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${token}`
);

ws.onopen = () => {
  console.log('Connected to Gemini Live API');
  startAudioCapture();
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Check for transcription text
  const text = data.serverContent?.modelTurn?.parts?.[0]?.text;
  if (text) {
    console.log('Transcription:', text);
    updateLiveCaptions(text);
  }
};

function sendAudioChunk(pcm16Data: Uint8Array) {
  const base64Audio = btoa(String.fromCharCode(...pcm16Data));
  
  ws.send(JSON.stringify({
    realtimeInput: {
      mediaChunks: [{
        mimeType: "audio/pcm;rate=16000",
        data: base64Audio
      }]
    }
  }));
}
```

---

## 📊 **Comparison: Chunked vs Live Transcription**

| Feature | Chunked Transcription | Gemini Live Transcription |
|---------|----------------------|---------------------------|
| **Architecture** | Client → Storage → Edge Function → Gemini | Client → Gemini (via WebSocket) |
| **Latency** | ~2-5 seconds per chunk | ~100-500ms (real-time) |
| **Audio Format** | M4A, WAV, MP3 | PCM16 only |
| **Use Case** | Post-recording transcription | Live captions during recording |
| **Overlap Handling** | Manual dedupe merge | Gemini handles context |
| **Storage** | Automatic (chunks + segments) | Manual (buffer then send) |
| **Cost** | Pay per audio minute | Pay per connection minute |
| **Complexity** | Backend-heavy | Client-heavy |

**When to Use Each:**

**Chunked:**
- Recording lectures for later review
- Batch processing existing audio files
- Need permanent storage of audio chunks
- Offline recording with later upload

**Live:**
- Real-time meeting transcription
- Live lecture captions
- Voice assistant interactions
- Immediate feedback needed

---

## 🚀 **Integration with Existing System**

### **Keep Both Pipelines**

**Chunked Pipeline (Existing):**
```
POST /transcribe_start
  → Upload chunks to Storage
    → POST /transcribe_chunk
      → GET /transcribe_poll
```

**Live Pipeline (New):**
```
POST /gemini_live_token
  → WebSocket to Gemini
    → Display live captions
      → (Optional) Save final transcript
```

**Unified Storage:**
Both pipelines can store final transcripts in the same `transcripts` table:

```sql
-- Create session for either pipeline
INSERT INTO transcription_sessions (user_id, source_type, status)
VALUES (auth.uid(), 'live_recording', 'recording');

-- Store final transcript (from either pipeline)
INSERT INTO transcripts (session_id, full_text)
VALUES ('session_uuid', 'final transcription text...');
```

---

## 📚 **Official Documentation**

- **Live API Overview:** https://ai.google.dev/gemini-api/docs/live
- **Live API Capabilities:** https://ai.google.dev/gemini-api/docs/live-guide
- **Ephemeral Tokens:** https://ai.google.dev/gemini-api/docs/oauth (v1alpha section)
- **WebSocket Protocol:** https://cloud.google.com/vertex-ai/generative-ai/docs/live-api

---

## ⚠️ **Important Notes**

1. **Model Name May Change:**
   - Currently: `gemini-2.5-flash-native-audio-preview-12-2025`
   - This is a preview model; check docs for latest stable model name

2. **API Version:**
   - Must use `apiVersion: v1alpha` for ephemeral tokens
   - Live API is in alpha/preview stage

3. **Audio Transcription:**
   - Enabled via `inputAudioTranscription: {}` in token config
   - Transcription events arrive as text in `serverContent.modelTurn.parts`

4. **Session Limits:**
   - 30 minutes max per session
   - For longer recordings, split into multiple sessions

5. **Error Handling:**
   - WebSocket disconnections require new token
   - Token expiration requires new token request
   - Always implement reconnection logic with exponential backoff

---

## ✅ **Next Steps (Mobile Implementation)**

1. Request ephemeral token from `/gemini_live_token`
2. Connect to Gemini Live WebSocket using token
3. Capture audio in PCM16 format (16kHz mono)
4. Stream audio chunks to WebSocket
5. Listen for transcription events
6. Display live captions in UI
7. Buffer transcriptions locally
8. When session ends, optionally save to backend

**Mobile client code is outside the scope of this backend documentation.**

---

**Gemini Live API integration complete!** ✅

Backend provides secure ephemeral token minting. Client handles WebSocket streaming and live transcription display.
