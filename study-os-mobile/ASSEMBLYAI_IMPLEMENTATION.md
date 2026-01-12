# AssemblyAI Real-time Transcription Implementation

## Overview

This implementation switches the speech-to-text system from chunked Whisper to **AssemblyAI's Real-time Streaming API** for true live transcription with partial and final results.

## Architecture

```
┌─────────────┐
│ Mobile App  │
│             │
│ 1. Start    │──────┐
│ Recording   │      │ POST /transcribe_start
└─────────────┘      │ (creates session)
                     ▼
              ┌─────────────┐
              │  Supabase   │
              │  Backend    │
              └─────────────┘
                     │
                     │ Returns: session_id,
                     │          assemblyai_ws_url
                     ▼
┌─────────────┐
│ Mobile App  │
│             │
│ 2. Opens    │─────────────────────┐
│ WebSocket   │                     │ Direct WebSocket
└─────────────┘                     │ connection
                                    ▼
                          ┌──────────────────┐
                          │   AssemblyAI     │
                          │   Realtime API   │
                          └──────────────────┘
                                    │
                                    │ Streams:
                                    │ - Partial transcripts
                                    │ - Final transcripts
                                    ▼
┌─────────────┐
│ Mobile App  │
│             │
│ 3. Updates  │ ← Partial text (gray, italic)
│ UI in       │ ← Final text (black, appended)
│ Real-time   │
└─────────────┘
        │
        │ 4. On stop: POST final transcript
        ▼
┌─────────────┐
│  Supabase   │
│  Database   │
│             │
│ - transcripts
│ - sessions  │
└─────────────┘
```

## Key Design Decisions

### ✅ What We Did

1. **Direct WebSocket Connection**
   - Mobile app connects directly to AssemblyAI
   - No audio proxying through backend
   - Minimal latency

2. **Minimal Backend Role**
   - Session creation only
   - Persistence only (after stop)
   - No real-time processing

3. **True Live Transcription**
   - Partial transcripts update in real-time
   - Final transcripts append permanently
   - Zero polling, zero chunking

4. **Provider Abstraction**
   - Added `provider` field to database
   - Easy to switch providers later
   - Gemini reserved for summaries/flashcards

### ❌ What We Avoided

- No Gemini STT
- No Whisper chunking
- No WebSocket proxy
- No chunk upload logic
- No overlap handling
- No ephemeral token complexity

## Files Changed

### Backend

1. **`supabase/functions/transcribe_start/index.ts`**
   - Added `provider` parameter (default: "assemblyai")
   - Returns `assemblyai_ws_url` and `expires_at`
   - Creates session in database

2. **`backend/supabase/migrations/002_add_provider_field.sql`**
   - Added `provider` column to `transcription_sessions`
   - Added index for provider queries

### Mobile

1. **`apps/mobile/src/services/assemblyLive.ts`** (NEW)
   - AssemblyAI WebSocket client
   - Audio streaming logic
   - Event handling (partial/final/error)
   - Methods: `start()`, `stop()`, `onTranscript()`

2. **`apps/mobile/src/screens/LiveTranscription/LiveTranscriptionScreen.tsx`**
   - Replaced chunked Whisper logic with AssemblyAI
   - Added partial text display (gray, italic)
   - Final text appends permanently (black)
   - Auto-scroll to bottom
   - Persistence on stop

3. **`apps/mobile/env.example`**
   - Added `ASSEMBLYAI_API_KEY`

## Setup Instructions

### 1. Get AssemblyAI API Key

1. Go to: https://www.assemblyai.com/
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

### 2. Configure Environment

Create `.env` file in `apps/mobile/`:

```bash
# Copy from example
cp env.example .env

# Add your keys
SUPABASE_URL=https://euxfugfzmpsemkjpcpuz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
```

### 3. Run Database Migration

```bash
# From project root
cd /Users/danielntumba/smrtr/study-os-mobile

# Run migration (if using Supabase CLI)
supabase db push

# OR apply manually in Supabase Dashboard
# Copy contents of backend/supabase/migrations/002_add_provider_field.sql
# and run in SQL Editor
```

### 4. Deploy Backend Function

```bash
cd supabase/functions
./deploy.sh
```

### 5. Install Mobile Dependencies (if needed)

```bash
cd apps/mobile
npm install
```

### 6. Run Mobile App

```bash
# iOS
npm run ios

# Android
npm run android

# Expo Dev Client
npm run dev
```

## Usage Flow

### Recording

1. Tap "🎤 Start Recording"
2. Status changes to "Connected - listening..."
3. Speak into microphone
4. See partial text appear in gray italic (live)
5. See final text append in black (stable)
6. Tap "⏹ Stop Recording"
7. Transcript saves to Supabase

### UI Behavior

- **Partial transcripts**: Gray, italic, replaces current line
- **Final transcripts**: Black, appends to previous text
- **Auto-scroll**: ScrollView follows transcript
- **Status**: Shows connection state

## AssemblyAI WebSocket Protocol

### 1. Connect

```
wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000
```

### 2. Authenticate

Send immediately after connection:

```json
{
  "token": "YOUR_ASSEMBLYAI_API_KEY"
}
```

### 3. Stream Audio

Send audio frames as base64-encoded PCM16:

```json
{
  "audio_data": "base64_encoded_pcm16_data"
}
```

### 4. Receive Transcripts

**Session Begins:**
```json
{
  "message_type": "SessionBegins",
  "session_id": "...",
  "expires_at": "..."
}
```

**Partial Transcript:**
```json
{
  "message_type": "PartialTranscript",
  "text": "Hello, how are",
  "audio_start": 0,
  "audio_end": 1500,
  "confidence": 0.95
}
```

**Final Transcript:**
```json
{
  "message_type": "FinalTranscript",
  "text": "Hello, how are you?",
  "audio_start": 0,
  "audio_end": 2000,
  "confidence": 0.98
}
```

### 5. Terminate

Send before closing:

```json
{
  "terminate_session": true
}
```

## Audio Configuration

- **Sample Rate**: 16kHz (16000 Hz)
- **Channels**: Mono (1 channel)
- **Bits Per Sample**: 16-bit
- **Format**: PCM16
- **Encoding**: Base64 (for WebSocket JSON)
- **Chunk Interval**: 250ms (for low latency)

## Error Handling

### Connection Errors

- WebSocket fails to connect → Show "Disconnected"
- Auth fails → Check API key in `.env`
- Timeout → Retry with new WebSocket

### Runtime Errors

- Microphone permission denied → Alert user
- Session expires → Create new session
- Network drops → Show "Disconnected", allow retry

### Logging

All errors logged with:
- `session_id`
- `provider = "assemblyai"`
- `ws_close_code` (if WebSocket close)

## Database Schema

### transcription_sessions

```sql
CREATE TABLE transcription_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  source_type text NOT NULL DEFAULT 'live_recording',
  status text NOT NULL DEFAULT 'recording', -- recording, done, failed
  language text,
  provider text DEFAULT 'whisper',  -- NEW: whisper, assemblyai, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### transcripts

```sql
CREATE TABLE transcripts (
  session_id uuid PRIMARY KEY,
  full_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Cost Estimation

### AssemblyAI Pricing

- **Free Tier**: 5 hours/month
- **Paid**: $0.00025/second = $0.015/minute = $0.90/hour
- **Streaming**: Same as batch (no premium)

### Example Usage

- 10-minute study session = $0.15
- 1-hour lecture = $0.90
- 100 hours/month = $90

**Compare to Whisper:**
- Whisper: $0.006/minute = $36/100 hours
- **AssemblyAI is 2.5x more expensive**

### Optimization Ideas

- Use AssemblyAI for live, Whisper for batch
- Detect silence, pause streaming
- Cache common phrases

## Testing Checklist

### Manual Testing

- [ ] Start recording → see "Connected - listening..."
- [ ] Speak → see partial text (gray, italic)
- [ ] Pause → see final text (black)
- [ ] Continue speaking → more finals append
- [ ] Stop → transcript persists to database
- [ ] Check Supabase → session marked "done"
- [ ] Check transcripts table → full_text populated

### Edge Cases

- [ ] No internet → error message
- [ ] Invalid API key → auth error
- [ ] Microphone permission denied → alert
- [ ] Stop before any speech → empty transcript
- [ ] Very long recording (1+ hour) → works?
- [ ] Background app → reconnects?

### Browser (if web support)

- [ ] Chrome → works
- [ ] Safari → works
- [ ] Firefox → works

## Debugging

### Enable Verbose Logging

In `assemblyLive.ts`, all WebSocket events are logged:

```typescript
console.log('AssemblyAI WebSocket connected');
console.log('Partial:', text);
console.log('Final:', text);
console.error('AssemblyAI WebSocket error:', error);
```

### Check Network

```bash
# In Chrome DevTools or React Native Debugger
# Filter network for: api.assemblyai.com
# Should see WebSocket connection (101 Switching Protocols)
```

### Check Database

```sql
-- Recent sessions
SELECT id, user_id, provider, status, created_at
FROM transcription_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Transcript for session
SELECT full_text
FROM transcripts
WHERE session_id = 'YOUR_SESSION_ID';
```

## Production Considerations

### Security

⚠️ **Current Implementation**: API key in mobile app (dev only)

**For production:**
1. Move API key to backend
2. Backend proxies WebSocket OR
3. Backend generates short-lived tokens

### Scalability

- AssemblyAI handles scaling
- No backend bottleneck (direct connection)
- Supabase RLS protects user data

### Monitoring

Add tracking for:
- Session start/stop events
- Transcript word count
- API errors/retries
- Cost per user

## Next Steps

### Immediate (MVP)

1. Get AssemblyAI API key
2. Test with real device
3. Verify transcripts persist
4. Demo to stakeholders

### Short-term

1. Add silence detection
2. Add speaker diarization (AssemblyAI feature)
3. Add language selection UI
4. Improve error messages

### Long-term

1. Hybrid approach (AssemblyAI live, Whisper batch)
2. Cost optimization
3. Offline mode (buffer audio, sync later)
4. Add Gemini for summaries/flashcards

## Troubleshooting

### "ASSEMBLYAI_API_KEY not configured"

**Fix:** Add key to `.env` file:

```bash
ASSEMBLYAI_API_KEY=your-key-here
```

### "Connection timeout"

**Causes:**
- Network issue
- API key invalid
- AssemblyAI service down

**Fix:**
1. Check internet connection
2. Verify API key in dashboard
3. Check AssemblyAI status page

### "WebSocket closed: 1002"

**Cause:** Protocol error (bad auth)

**Fix:** Verify API key is correct

### "No audio being streamed"

**Causes:**
- Microphone permission denied
- Wrong audio source
- Audio recorder not initialized

**Fix:**
1. Check app permissions (Settings → App → Permissions)
2. Verify `AudioRecord.init()` called
3. Check `audioSource: 6` (VOICE_RECOGNITION)

### Transcripts not persisting

**Causes:**
- Supabase auth expired
- RLS policy blocking writes
- Network error on stop

**Fix:**
1. Check auth session valid
2. Verify RLS policies allow writes
3. Check console for persistence errors

## Resources

- **AssemblyAI Docs**: https://www.assemblyai.com/docs/
- **Real-time Streaming**: https://www.assemblyai.com/docs/speech-to-text/streaming
- **React Native Audio**: https://github.com/goodatlas/react-native-audio-record
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

## Success Criteria ✅

MVP is complete when:
- ✅ Live transcription updates word-by-word
- ✅ Partial → final transitions feel instant
- ✅ No auth errors
- ✅ Mobile app works without backend bottlenecks
- ✅ Gemini is untouched (reserved for summaries)
- ✅ Code is clean, documented, and maintainable

**Status**: Implementation complete, ready for testing!
