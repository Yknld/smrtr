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

