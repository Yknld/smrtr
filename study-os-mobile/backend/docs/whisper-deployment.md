# Whisper Integration - Deployment Guide

## Prerequisites

✅ You already have:
- Supabase project configured
- Edge Functions deployed
- Database tables created
- Storage bucket configured
- Mobile client working

## What Changed

### 1️⃣ New Files
```
backend/lib/transcription/
├── Transcriber.ts              # Interface for transcription providers
└── WhisperTranscriber.ts       # OpenAI Whisper implementation
```

### 2️⃣ Modified Files
```
backend/functions/transcribe_chunk/index.ts
  - Removed: Gemini transcription
  - Added: WhisperTranscriber integration
```

### 3️⃣ Removed Dependencies
```
backend/functions/shared/transcriber.ts  # No longer used
```

## Deployment Steps

### Step 1: Add OpenAI API Key

Get your API key from: https://platform.openai.com/api-keys

Add it to Supabase secrets:
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

Verify:
```bash
supabase secrets list | grep OPENAI
```

### Step 2: Deploy Updated Edge Function

From `backend/functions/`:
```bash
supabase functions deploy transcribe_chunk
```

Expected output:
```
Deploying function transcribe_chunk...
Function transcribe_chunk deployed successfully!
```

### Step 3: Test Transcription

#### Option A: Via Mobile App
1. Open your React Native app
2. Navigate to recording screen
3. Record 5-10 seconds of speech
4. Verify transcript appears

#### Option B: Via curl (with existing session)
```bash
# 1. Create session
TOKEN="your_user_jwt_here"
SESSION_ID=$(curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/transcribe_start \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"language":"en"}' | jq -r '.session_id')

# 2. Upload audio chunk to Storage
# (Use Supabase client or manual upload)

# 3. Trigger transcription
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/transcribe_chunk \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_id": "'$SESSION_ID'",
    "chunk_index": 0,
    "storage_path": "transcription/'$USER_ID'/'$SESSION_ID'/chunk_0.m4a",
    "duration_ms": 5000,
    "overlap_ms": 500
  }' | jq '.'
```

Expected response:
```json
{
  "chunk_id": "uuid-here",
  "chunk_index": 0,
  "status": "done",
  "tail_text": "Your transcribed text appears here..."
}
```

### Step 4: Verify Database

Check that segments were created:
```sql
SELECT 
  ts.id,
  ts.chunk_index,
  LEFT(ts.text, 100) as text_preview,
  ts.confidence,
  ts.created_at
FROM transcript_segments ts
WHERE ts.session_id = 'your-session-id'
ORDER BY ts.chunk_index;
```

Check merged transcript:
```sql
SELECT 
  LEFT(full_text, 200) as text_preview,
  LENGTH(full_text) as total_chars,
  updated_at
FROM transcripts
WHERE session_id = 'your-session-id';
```

## Troubleshooting

### Error: "OPENAI_API_KEY not configured"
**Fix:** Make sure you set the secret (Step 1) and redeployed (Step 2)

### Error: "Whisper API error: 401"
**Fix:** Your API key is invalid. Get a fresh one from OpenAI dashboard.

### Error: "Whisper API error: 429"
**Fix:** Rate limit hit. Wait 60 seconds or upgrade OpenAI plan.

### Error: "Audio buffer too large"
**Fix:** Audio chunks must be < 10MB. Check `duration_ms` and audio quality settings.

### Transcription is empty/wrong
**Possible causes:**
- Audio file is corrupt or empty
- Wrong storage_path
- Audio format not supported (we expect m4a)
- Audio is too noisy/quiet

**Debug:**
1. Check function logs: `supabase functions logs transcribe_chunk`
2. Download the audio file manually from Storage and verify it plays
3. Check `transcription_chunks` table for error messages

### Transcription is slow
**Expected latency:**
- 5-second chunk → ~2-3 seconds to transcribe
- 10-second chunk → ~4-6 seconds

If slower, check:
- Network latency to OpenAI
- Audio file size (larger = slower download)

## Cost Monitoring

Check your usage:
```bash
# View OpenAI dashboard
https://platform.openai.com/usage
```

Estimate:
- 1 minute of audio = $0.006
- 10-minute session = $0.06
- 100 sessions/month = ~$6

## Rollback Plan (If Needed)

If Whisper integration has issues:

1. Restore previous `transcribe_chunk` from git:
```bash
git checkout HEAD~1 -- backend/functions/transcribe_chunk/index.ts
```

2. Redeploy:
```bash
supabase functions deploy transcribe_chunk
```

3. Restore `shared/transcriber.ts` if you removed it

## Next Steps

✅ **MVP Complete!** You now have:
- Reliable chunk-based transcription
- Overlap deduplication
- Live captions via tail_text
- Full transcript merging

### Future Enhancements
- [ ] Add speaker diarization (AssemblyAI)
- [ ] Add word-level timestamps
- [ ] A/B test Whisper vs. other providers
- [ ] Add Gemini for summaries/flashcards (text processing, not STT)

## Success Checklist

Before marking this done:
- [ ] `OPENAI_API_KEY` secret is set
- [ ] `transcribe_chunk` deployed successfully
- [ ] Mobile app transcription works end-to-end
- [ ] Database shows segments and merged transcript
- [ ] Function logs show "Transcription successful"
- [ ] No Gemini STT calls remain in code

---

**Questions?** Check `/backend/docs/transcription-provider.md` for architecture details.
