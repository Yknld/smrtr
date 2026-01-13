# Supabase Edge Functions - Transcription MVP

Three serverless functions for pseudo-live audio transcription with overlapping chunks.

---

## Functions

### 1. `transcribe_start`

Initialize a new transcription session.

**Endpoint:** `POST /functions/v1/transcribe_start`

**Request:**
```json
{
  "language": "en-US"  // Optional
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "recording",
  "language": "en-US",
  "created_at": "2026-01-10T12:00:00Z"
}
```

---

### 2. `transcribe_chunk`

Transcribe an uploaded audio chunk.

**Endpoint:** `POST /functions/v1/transcribe_chunk`

**Request:**
```json
{
  "session_id": "uuid",
  "chunk_index": 0,
  "storage_path": "transcription/{user_id}/{session_id}/chunk_0.m4a",
  "duration_ms": 5000,
  "overlap_ms": 500
}
```

**Response:**
```json
{
  "chunk_id": "uuid",
  "chunk_index": 0,
  "status": "done",
  "tail_text": "...last 600 characters of full transcript..."
}
```

---

### 3. `transcribe_poll`

Poll for session status and retrieve results.

**Endpoint:** `GET /functions/v1/transcribe_poll?session_id=<uuid>`

**Response:**
```json
{
  "session_id": "uuid",
  "status": "recording",
  "language": "en-US",
  "progress": 75,
  "chunks": [
    { "chunk_index": 0, "status": "done", "duration_ms": 5000 },
    { "chunk_index": 1, "status": "transcribing", "duration_ms": 5000 }
  ],
  "total_chunks": 4,
  "completed_chunks": 3,
  "failed_chunks": 0,
  "full_text": "Complete transcript text...",
  "tail_text": "...last 600 characters...",
  "updated_at": "2026-01-10T12:01:30Z"
}
```

---

### 4. `gemini_live_token`

Mint ephemeral tokens for Gemini Live API WebSocket connections.

**Endpoint:** `POST /functions/v1/gemini_live_token`

**Request:**
```json
{}
```

**Response:**
```json
{
  "token": "ephemeral_token_string",
  "expire_time": "2026-01-10T12:30:00Z",
  "new_session_expire_time": "2026-01-10T12:01:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025"
}
```

---

### 5. `lesson_generate_summary`

Generate AI-powered lesson summaries using Gemini.

**Endpoint:** `POST /functions/v1/lesson_generate_summary`

**Request:**
```json
{
  "lesson_id": "uuid",
  "tone": "casual" | "exam" | "deep",
  "length": "short" | "medium" | "long"
}
```

**Response:**
```json
{
  "output_id": "uuid",
  "summary": "A clear, well-structured summary...",
  "key_concepts": ["concept 1", "concept 2", "..."],
  "example_questions": ["question 1?", "question 2?", "..."],
  "metadata": {
    "content_source": "live_transcript",
    "content_length": 12345,
    "tone": "casual",
    "length": "medium"
  }
}
```

---

### 6. `tutor_chat`

AI tutor chat with conversation history and RAG context.

**Endpoint:** `POST /functions/v1/tutor_chat`

**Request:**
```json
{
  "conversationId": "uuid (optional, null to create new)",
  "lessonId": "uuid (optional)",
  "courseId": "uuid (optional)",
  "message": "Student's question"
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "messageId": "uuid",
  "assistantMessage": "AI tutor's response",
  "title": "Conversation title"
}
```

**Documentation:** [AI Tutor Implementation Guide](../../AI_TUTOR_IMPLEMENTATION.md)

---

### 7. `push_token_upsert`

Register or update device push notification tokens.

**Endpoint:** `POST /functions/v1/push_token_upsert`

**Request:**
```json
{
  "platform": "ios",
  "push_token": "device_push_token_string"
}
```

**Response:**
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7f3c4a89-1234-5678-9abc-def012345678"
}
```

---

### 6. `study_plan_upsert`

Atomically create or update study plans with their recurrence rules.

**Endpoint:** `POST /functions/v1/study_plan_upsert`

**Request:**
```json
{
  "plan": {
    "id": "uuid (optional)",
    "title": "Morning Study",
    "timezone": "America/Toronto",
    "is_enabled": true
  },
  "rules": [
    {
      "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      "start_time_local": "19:00",
      "duration_min": 60,
      "remind_before_min": 15
    }
  ]
}
```

**Response:**
```json
{
  "plan": { "id": "...", "title": "...", ... },
  "rules": [ { "id": "...", "rrule": "...", ... } ]
}
```

---

### 7. `lesson_create_from_youtube`

Import YouTube videos as lessons with automatic transcript extraction and AI-generated summaries.

**Endpoint:** `POST /functions/v1/lesson_create_from_youtube`

**Request:**
```json
{
  "course_id": "uuid",
  "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "lesson_title": "Optional Custom Title"
}
```

**Response:**
```json
{
  "lesson_id": "uuid",
  "status": "ready",
  "message": "Lesson created successfully with transcript and summary"
}
```

**Features:**
- Extracts video ID from various YouTube URL formats
- Fetches transcript if available (auto-generated or manual captions)
- Generates AI summary using Gemini
- Stores YouTube URL as lesson asset
- Creates lesson with `source_type='import'`

**See:** `lesson_create_from_youtube/README.md` for full documentation and test examples.

---

### 8. `lesson_generate_flashcards`

Generate AI-powered flashcards and quiz from lesson content.

**Endpoint:** `POST /functions/v1/lesson_generate_flashcards`

**Request:**
```json
{
  "lesson_id": "uuid",
  "count": 15  // Optional: 10-25, default 15
}
```

**Response:**
```json
{
  "flashcards": {
    "id": "uuid",
    "type": "flashcards",
    "status": "ready",
    "content_json": {
      "cards": [
        { "front": "Question", "back": "Answer" }
      ]
    }
  },
  "quiz": {
    "id": "uuid",
    "type": "quiz",
    "status": "ready",
    "content_json": {
      "questions": [
        {
          "q": "Question text?",
          "choices": ["A", "B", "C", "D"],
          "answer_index": 0,
          "explanation": "Why this is correct"
        }
      ]
    }
  }
}
```

---

## Deployment

### Prerequisites

1. **Supabase CLI installed:**
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Link to your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Set environment variables:**
   ```bash
   supabase secrets set GEMINI_API_KEY=your_gemini_api_key
   ```

---

### Deploy All Functions

```bash
cd backend/functions

# Deploy transcribe_start
supabase functions deploy transcribe_start

# Deploy transcribe_chunk
supabase functions deploy transcribe_chunk

# Deploy transcribe_poll
supabase functions deploy transcribe_poll

# Deploy gemini_live_token
supabase functions deploy gemini_live_token

# Deploy lesson_generate_summary
supabase functions deploy lesson_generate_summary

# Deploy push_token_upsert
supabase functions deploy push_token_upsert

# Deploy study_plan_upsert
supabase functions deploy study_plan_upsert

# Deploy lesson_create_from_youtube
supabase functions deploy lesson_create_from_youtube
```

---

### Environment Variables

Set these in Supabase Dashboard → Edge Functions → Settings:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Or via CLI:

```bash
supabase secrets set GEMINI_API_KEY=your_key
```

---

## Local Development

### Run Locally

```bash
# Start Supabase local stack
supabase start

# Serve functions locally
supabase functions serve transcribe_start --env-file .env.local
```

### Test with cURL

**Start Session:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/transcribe_start \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en-US"}'
```

**Submit Chunk:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/transcribe_chunk \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "uuid-from-start",
    "chunk_index": 0,
    "storage_path": "transcription/user_id/session_id/chunk_0.m4a",
    "duration_ms": 5000,
    "overlap_ms": 500
  }'
```

**Poll Status:**
```bash
curl "https://your-project.supabase.co/functions/v1/transcribe_poll?session_id=uuid" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## Architecture

### Flow

1. **Client → Storage:** Upload audio chunk to Supabase Storage
   ```typescript
   const { data, error } = await supabase.storage
     .from('raw_audio_chunks')
     .upload(storagePath, audioBlob);
   ```

2. **Client → transcribe_chunk:** Notify function with `storage_path`

3. **Edge Function:** 
   - Validates session ownership
   - Downloads audio from Storage (using service role)
   - Transcribes with Gemini
   - Merges with existing transcript (overlap detection)
   - Returns `tail_text` for live captions

4. **Client → transcribe_poll:** Periodically poll for progress

---

## Key Features

### ✅ Security
- User authentication via JWT
- Session ownership validation (`auth.uid()`)
- RLS policies on all database tables
- Storage policies enforce path isolation

### ✅ Guardrails
- Max chunk duration: 10 seconds
- Max file size: 5 MB
- Status validation (can't add chunks to completed sessions)

### ✅ Overlap Merging
- Detects largest overlap between old tail and new prefix
- 80% similarity threshold
- Supports live captions style (allows revision of last 20 tokens)
- Returns `tail_text` (600 chars) for real-time display

### ✅ Provider Abstraction
- Transcription wrapped in `shared/transcriber.ts`
- Easy to swap Gemini → Whisper/AssemblyAI
- Commented example for OpenAI Whisper included

---

## Monitoring

### Check Function Logs

```bash
supabase functions logs transcribe_chunk --tail
```

### Database Queries

**Check session status:**
```sql
SELECT id, status, created_at, updated_at 
FROM transcription_sessions 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC;
```

**Check chunk statuses:**
```sql
SELECT chunk_index, status, error 
FROM transcription_chunks 
WHERE session_id = 'your-session-id' 
ORDER BY chunk_index;
```

---

## Error Handling

Functions return structured errors:

```json
{
  "error": "Human-readable error message"
}
```

**Common Error Codes:**
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (session doesn't belong to user)
- `404` - Session not found
- `400` - Invalid request parameters / guardrail violations
- `500` - Internal server error (transcription failure, storage error, etc.)

---

## Cost Optimization

### Recommendations:
1. **Client-side chunking:** Use 5s chunks with 0.5s overlap
2. **Batch polling:** Poll every 1-2s, not per chunk
3. **Gemini Pricing:** ~$0.0001/second of audio (check current rates)
4. **Storage retention:** Auto-delete chunks after 24h

### Estimated Costs (1 hour recording):
- Storage: ~50 MB × $0.021/GB/month = negligible
- Edge Functions: 720 invocations × $2/million = $0.00144
- Gemini: 3600s × $0.0001 = $0.36
- **Total: ~$0.36 per hour**

---

## Troubleshooting

### "Bucket not found"
- Verify `raw_audio_chunks` bucket exists in Storage
- Check Storage policies allow authenticated uploads

### "Unauthorized"
- Ensure client sends `Authorization: Bearer <user_token>`
- Check token is valid (not expired)

### "Transcription failed"
- Check `GEMINI_API_KEY` is set in Edge Function secrets
- Verify audio format is supported (m4a, webm, mp3)
- Check function logs for detailed error

### "Session not found"
- Verify session was created via `transcribe_start`
- Check session belongs to authenticated user

---

## Next Steps

1. ✅ Deploy functions
2. ✅ Set `GEMINI_API_KEY` secret
3. ✅ Test with storage verification (see `backend/tests/`)
4. ⏭️ Implement mobile client
5. ⏭️ Add session finalization (status: `recording` → `complete`)
6. ⏭️ Add cleanup job for old chunks

---

## Files

```
backend/functions/
├── transcribe_start/
│   └── index.ts          # Initialize session
├── transcribe_chunk/
│   └── index.ts          # Process + transcribe chunk
├── transcribe_poll/
│   └── index.ts          # Get status + results
├── gemini_live_token/
│   └── index.ts          # Mint ephemeral tokens for Gemini Live API
├── push_token_upsert/
│   └── index.ts          # Register/update device push tokens
├── study_plan_upsert/
│   └── index.ts          # Create/update study plans with rules
└── shared/
    ├── transcriber.ts    # Gemini wrapper (swappable)
    └── transcript-merger.ts  # Overlap-dedupe merge logic
```

---

## Support

See also:
- `docs/transcription-mvp-plan.md` - Full MVP breakdown
- `backend/docs/edge-functions-transcription.md` - Detailed API spec
- `backend/docs/transcription-storage.md` - Storage setup
- `backend/ai/gemini/prompts.transcription.md` - Prompt engineering

