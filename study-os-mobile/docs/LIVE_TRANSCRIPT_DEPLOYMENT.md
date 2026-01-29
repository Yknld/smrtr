# Live Transcript Feature - Deployment Guide

This guide walks you through deploying the Live Transcript feature with AssemblyAI integration.

## Status: ✅ Code Complete, Ready for Deployment

**What's Done:**
- ✅ Backend edge function updated (`transcribe_start`)
- ✅ Frontend service updated (`assemblyLive.ts`)
- ✅ Frontend screen ready (`LiveTranscriptionScreen.tsx`)
- ✅ Integration pattern documented

**What's Needed:**
- ⏳ Set AssemblyAI API key in Supabase
- ⏳ Deploy edge function
- ⏳ Test end-to-end

---

## Prerequisites

1. **AssemblyAI Account**
   - Sign up at: https://www.assemblyai.com/
   - Get your API key from dashboard
   - Free tier: 5 hours/month

2. **Supabase CLI**
   ```bash
   # Install if not already installed
   brew install supabase/tap/supabase
   
   # Verify installation
   supabase --version
   ```

3. **Project Linked**
   ```bash
   # Link to your Supabase project (if not already linked)
   cd /Users/danielntumba/smrtr/study-os-mobile
   supabase link --project-ref euxfugfzmpsemkjpcpuz
   ```

---

## Deployment Steps

### Step 1: Set AssemblyAI API Key (2 minutes)

The backend edge function needs your AssemblyAI API key to generate temporary tokens.

```bash
# Set the secret in Supabase
supabase secrets set ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here

# Verify it's set
supabase secrets list
```

**Expected output:**
```
NAME                  DIGEST
ASSEMBLYAI_API_KEY    sha256:abc123...
GEMINI_API_KEY        sha256:def456...
```

### Step 2: Deploy Edge Function (1 minute)

Deploy the updated `transcribe_start` function:

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/supabase/functions

# Deploy single function
supabase functions deploy transcribe_start --no-verify-jwt

# OR deploy all functions
./deploy.sh
```

**Expected output:**
```
Deploying transcribe_start (project ref: euxfugfzmpsemkjpcpuz)
✓ Deployed function transcribe_start
```

### Step 3: Verify Deployment (1 minute)

Check that the function is deployed:

```bash
# List all deployed functions
supabase functions list
```

**Expected output:**
```
NAME                            VERSION  CREATED AT
transcribe_start                1        2024-01-11 10:30:00
gemini_live_token               1        2024-01-10 15:20:00
...
```

### Step 4: Test Backend Function (2 minutes)

Test the edge function directly with curl:

```bash
# First, get an auth token from your mobile app
# Add this to your app temporarily:
# console.log('Auth token:', session.access_token);

# Then test the function:
curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_start \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"assemblyai","language":"en-US"}'
```

**Expected response:**
```json
{
  "session_id": "uuid-here",
  "status": "recording",
  "language": "en-US",
  "created_at": "2024-01-11T10:30:00Z",
  "assemblyai_ws_url": "wss://streaming.assemblyai.com/v3/ws?...",
  "assemblyai_token": "token-here",
  "expires_at": "2024-01-11T10:40:00Z"
}
```

### Step 5: Test Mobile App (5 minutes)

Now test the full integration in the mobile app:

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/apps/mobile

# Run the app
npm run ios
# OR
npm run android
```

**Test flow:**
1. Open the app
2. Sign in (if not already signed in)
3. Navigate to Live Transcription screen
4. Tap "🎤 Start Recording"
5. Speak clearly: "Testing AssemblyAI live transcription"
6. Watch for:
   - Status changes to "Connected - listening..."
   - Partial text appears in gray italic
   - Final text appears in black
7. Tap "⏹ Stop Recording"
8. Verify status shows "Complete"

**Check console logs:**
```
🔍 Starting AssemblyAI transcription...
✅ Authenticated as: user@example.com
📞 Calling backend /transcribe_start...
✅ Backend session created: uuid-here
✅ AssemblyAI WebSocket URL ready
📝 Session ready: uuid-here
Connecting to AssemblyAI WebSocket...
✅ AssemblyAI WebSocket connected (v3 universal streaming)
✅ AssemblyAI session begun: session-id
📝 Partial turn 0: Testing AssemblyAI
✅ Final formatted turn 0: Testing AssemblyAI live transcription
Transcript persisted successfully: uuid-here
```

### Step 6: Verify Database (1 minute)

Check that the transcript was saved:

```sql
-- In Supabase SQL Editor
SELECT 
  ts.id,
  ts.provider,
  ts.status,
  ts.created_at,
  t.full_text
FROM transcription_sessions ts
LEFT JOIN transcripts t ON t.session_id = ts.id
WHERE ts.provider = 'assemblyai'
ORDER BY ts.created_at DESC
LIMIT 1;
```

**Expected result:**
```
id                  | provider    | status | created_at          | full_text
--------------------|-------------|--------|---------------------|---------------------------
uuid-here           | assemblyai  | done   | 2024-01-11 10:30:00 | Testing AssemblyAI live...
```

---

## Troubleshooting

### Issue: "ASSEMBLYAI_API_KEY not configured on server"

**Cause:** Secret not set in Supabase.

**Fix:**
```bash
supabase secrets set ASSEMBLYAI_API_KEY=your-key-here
```

### Issue: "Failed to get AssemblyAI token"

**Cause:** Invalid API key or AssemblyAI service issue.

**Fix:**
1. Verify API key is correct: https://www.assemblyai.com/app/account
2. Check AssemblyAI status: https://status.assemblyai.com/
3. Test API key directly:
   ```bash
   curl https://streaming.assemblyai.com/v3/token?expires_in_seconds=600 \
     -H "Authorization: YOUR_ASSEMBLYAI_KEY"
   ```

### Issue: "Invalid or expired session"

**Cause:** Auth token expired or invalid.

**Fix:**
1. Sign out and sign back in
2. Check token in console: `console.log(session.access_token)`
3. Verify token is being sent in Authorization header

### Issue: "WebSocket connection failed"

**Cause:** Network issue or invalid WebSocket URL.

**Fix:**
1. Check internet connection
2. Verify WebSocket URL in response includes token parameter
3. Check console for WebSocket error details

### Issue: "No audio being captured"

**Cause:** Microphone permission denied or audio recorder not initialized.

**Fix:**
1. Check app permissions: Settings → App → Permissions → Microphone
2. On Android, manually grant permission if needed
3. Check console for "Microphone permission denied" error

---

## Monitoring

### View Function Logs

```bash
# Stream logs in real-time
supabase functions logs transcribe_start --follow

# View recent logs
supabase functions logs transcribe_start --limit 50
```

### Check Function Metrics

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz
2. Navigate to: Edge Functions → transcribe_start
3. View:
   - Invocations (requests per minute)
   - Errors (error rate)
   - Duration (response time)

### Monitor AssemblyAI Usage

1. Go to AssemblyAI Dashboard: https://www.assemblyai.com/app
2. Check:
   - Monthly usage (hours transcribed)
   - Remaining free tier quota
   - Billing (if on paid plan)

---

## Cost Estimation

### AssemblyAI Pricing

- **Free Tier**: 5 hours/month
- **Paid**: $0.00025/second = $0.015/minute = $0.90/hour

### Example Usage

| Scenario | Duration | Cost |
|----------|----------|------|
| Quick test | 1 minute | $0.015 |
| Study session | 30 minutes | $0.45 |
| Lecture | 1 hour | $0.90 |
| Heavy user (10 hrs/month) | 10 hours | $9.00 |

### Supabase Edge Functions

- **Free Tier**: 500,000 invocations/month
- **Paid**: $2 per 1M invocations

**Note:** Each recording session = 1 invocation, so you'll likely stay in free tier.

---

## Production Checklist

Before going live:

- [ ] AssemblyAI API key set in Supabase secrets
- [ ] Edge function deployed successfully
- [ ] Tested with real device (not just simulator)
- [ ] Tested with poor network conditions
- [ ] Tested microphone permissions flow
- [ ] Verified transcripts persist to database
- [ ] Checked function logs for errors
- [ ] Monitored AssemblyAI usage/quota
- [ ] Documented any custom configuration
- [ ] Trained users on feature (if needed)

---

## Rollback Plan

If issues arise in production:

### Option 1: Redeploy Previous Version

```bash
# List function versions
supabase functions list --show-versions

# Rollback to previous version
supabase functions deploy transcribe_start --version <previous-version>
```

### Option 2: Disable Feature

Temporarily disable in mobile app:

```typescript
// In LiveTranscriptionScreen.tsx
const FEATURE_ENABLED = false;

if (!FEATURE_ENABLED) {
  return <Text>Feature temporarily unavailable</Text>;
}
```

### Option 3: Switch to Fallback

If AssemblyAI has issues, you can temporarily switch back to the old Whisper chunking approach (code still exists in git history).

---

## Next Steps

After successful deployment:

1. **Monitor usage** for first 24 hours
2. **Collect user feedback** on transcription quality
3. **Optimize settings** (turn confidence threshold, silence detection)
4. **Add features**:
   - Language selection UI
   - Speaker diarization
   - Punctuation/formatting options
   - Export transcript as PDF/text
5. **Connect to other features**:
   - Generate flashcards from transcript
   - Create summary from transcript
   - Link transcript to lessons

---

## Support

- **AssemblyAI Docs**: https://www.assemblyai.com/docs/
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: File in GitHub repo
- **Emergency**: Contact team lead

---

## Success! 🎉

If you've completed all steps and tests pass, the Live Transcript feature is now live!

**What users can do:**
- Record live audio with real-time transcription
- See partial results as they speak (gray italic)
- See final results instantly (black text)
- Save transcripts to their account
- Access transcripts later from database

**What's happening under the hood:**
1. Mobile app authenticates with Supabase
2. Backend creates session and gets AssemblyAI token
3. Mobile app streams audio directly to AssemblyAI
4. AssemblyAI returns live transcription results
5. Mobile app saves final transcript to Supabase
6. User can access transcript anytime

Enjoy the feature! 🎤✨
