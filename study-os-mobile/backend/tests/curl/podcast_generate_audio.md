# Test: podcast_generate_audio Edge Function

## Overview
This Edge Function generates TTS audio for all queued podcast segments using Google Cloud Text-to-Speech API with different voices for speakers A and B.

## Prerequisites
1. Get a valid user JWT token (see `get-token.js`)
2. Have an episode in 'voicing' status with queued segments
3. Set GOOGLE_CLOUD_TTS_API_KEY secret in Supabase

## Setup: Set Google Cloud TTS API Key

```bash
# Get your API key from Google Cloud Console: https://console.cloud.google.com/apis/credentials
# Enable Text-to-Speech API: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com

supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="YOUR_GOOGLE_CLOUD_API_KEY"
```

## Test 1: Generate Audio for Episode

### Get Episode ID
First, create an episode and generate script using previous tests, or query:

```sql
SELECT id, status, total_segments, title
FROM podcast_episodes
WHERE user_id = auth.uid()
  AND status = 'voicing'
ORDER BY created_at DESC
LIMIT 1;
```

### Call Function

```bash
export SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
export JWT_TOKEN="<your-token-from-get-token.js>"
export EPISODE_ID="<episode-id-from-above>"

curl -X POST "${SUPABASE_URL}/functions/v1/podcast_generate_audio" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"episode_id\": \"${EPISODE_ID}\"}"
```

### Expected Response

```json
{
  "episode_id": "uuid",
  "processed": 64,
  "failed": 0,
  "status": "ready"
}
```

## Test 2: Verify Audio Files in Storage

```bash
# List audio files for the episode
curl -X GET "${SUPABASE_URL}/storage/v1/object/list/tts_audio/podcasts/${USER_ID}/${EPISODE_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

Expected: Array of objects with names like `seg_1_a.mp3`, `seg_2_b.mp3`, etc.

## Test 3: Verify Database Updates

```sql
-- Check episode status
SELECT id, status, total_segments, title
FROM podcast_episodes
WHERE id = '<episode-id>';

-- Expected: status = 'ready'

-- Check segment statuses
SELECT seq, speaker, tts_status, audio_bucket, audio_path, duration_ms
FROM podcast_segments
WHERE episode_id = '<episode-id>'
ORDER BY seq;

-- Expected: All segments should have tts_status = 'ready', audio_path populated
```

## Test 4: Error Cases

### 4a. Missing episode_id
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/podcast_generate_audio" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{}"
```
Expected: 400, `"error": "episode_id is required"`

### 4b. Episode not in 'voicing' state
```bash
# Try with an episode that's already 'ready'
curl -X POST "${SUPABASE_URL}/functions/v1/podcast_generate_audio" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"episode_id\": \"<ready-episode-id>\"}"
```
Expected: 400, `"error": "Episode must be in 'voicing' state, currently: ready"`

### 4c. Unauthorized (wrong user)
Use a different user's JWT with another user's episode_id.
Expected: 404, `"error": "Episode not found or access denied"`

## Complete End-to-End Test Script

See `backend/tests/test-podcast-full.js` for automated testing of the complete flow:
1. Create episode (podcast_create)
2. Generate script (podcast_generate_script)
3. Generate audio (podcast_generate_audio)
4. Verify all segments are ready
5. Check storage files

## Notes

- **Voice Configuration**: Currently uses:
  - Speaker A: `en-US-Neural2-J` (Male, host)
  - Speaker B: `en-US-Neural2-F` (Female, co-host)
- **Processing Time**: ~1-2 seconds per segment (64 segments = ~2-3 minutes total)
- **Audio Format**: MP3, 1.0 speaking rate, 0.0 pitch
- **Storage Path**: `tts_audio/podcasts/{user_id}/{episode_id}/seg_{seq}_{speaker}.mp3`
- **Duration Estimation**: Currently rough estimate (50ms per character), could be improved by parsing TTS response metadata
- **Retry Logic**: If a segment fails, it remains in 'failed' status. Re-calling the function will only process 'queued' segments.
