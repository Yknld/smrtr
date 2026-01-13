# AssemblyAI Quick Start Guide

**Goal**: Get live transcription working in 5 minutes.

---

## Step 1: Get AssemblyAI API Key (2 min)

1. Go to: https://www.assemblyai.com/
2. Sign up (free tier: 5 hours/month)
3. Dashboard → Copy API key
4. Keep it handy

---

## Step 2: Configure Environment (1 min)

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/apps/mobile

# Create .env file
cp env.example .env

# Edit .env and add:
ASSEMBLYAI_API_KEY=your-api-key-here
```

---

## Step 3: Run Database Migration (1 min)

**Option A: Supabase CLI**
```bash
cd /Users/danielntumba/smrtr/study-os-mobile
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql/new
2. Copy contents of: `backend/supabase/migrations/002_add_provider_field.sql`
3. Paste and run

---

## Step 4: Deploy Backend Function (30 sec)

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/supabase/functions
./deploy.sh
```

---

## Step 5: Test Mobile App (1 min)

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/apps/mobile

# Run on your device/simulator
npm run ios
# OR
npm run android
# OR
npm run dev
```

1. Open app
2. Navigate to Live Transcription
3. Tap "🎤 Start Recording"
4. Speak: "Testing AssemblyAI real-time transcription"
5. Watch text appear in real-time:
   - Gray italic = partial (live)
   - Black = final (stable)
6. Tap "⏹ Stop Recording"

---

## Verify It Worked ✅

### Check Console Logs

Should see:
```
Session created: <session_id>
Connecting to AssemblyAI WebSocket...
AssemblyAI WebSocket connected
AssemblyAI session begun: <session_id>
Partial: Testing AssemblyAI
Final: Testing AssemblyAI real-time transcription
Transcript persisted successfully: <session_id>
```

### Check Database

```sql
-- In Supabase SQL Editor
SELECT id, provider, status, created_at
FROM transcription_sessions
ORDER BY created_at DESC
LIMIT 1;

-- Should show: provider = 'assemblyai', status = 'done'
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "ASSEMBLYAI_API_KEY not configured" | Add key to `.env` file |
| "Connection timeout" | Check internet, verify API key |
| "WebSocket closed: 1002" | Invalid API key |
| No audio | Check mic permissions |
| No transcript saving | Check Supabase auth |

---

## What Changed?

### Old (Whisper Chunking)
- ❌ Upload audio every 3 seconds
- ❌ Wait for backend processing
- ❌ Chunking logic, overlap handling
- ❌ Polling for results

### New (AssemblyAI Streaming)
- ✅ Direct WebSocket to AssemblyAI
- ✅ True live transcription
- ✅ Partial + final transcripts
- ✅ Zero backend bottlenecks
- ✅ Word-by-word updates

---

## Next Steps

Once it works:
1. Test with longer recordings
2. Test with background noise
3. Test with different accents
4. Add speaker diarization (AssemblyAI feature)
5. Add Gemini for summaries/flashcards

---

## Cost

- **Free tier**: 5 hours/month
- **Paid**: $0.015/minute
- **Example**: 10-min session = $0.15

---

## Files Modified

- ✅ `supabase/functions/transcribe_start/index.ts` (added AssemblyAI support)
- ✅ `apps/mobile/src/services/assemblyLive.ts` (new streaming client)
- ✅ `apps/mobile/src/screens/LiveTranscription/LiveTranscriptionScreen.tsx` (use AssemblyAI)
- ✅ `backend/supabase/migrations/002_add_provider_field.sql` (add provider column)
- ✅ `apps/mobile/env.example` (add API key)

---

## Need Help?

See full docs: `ASSEMBLYAI_IMPLEMENTATION.md`

**Ready?** Get your API key and start testing! 🚀
