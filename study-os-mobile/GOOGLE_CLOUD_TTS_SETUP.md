# Google Cloud Text-to-Speech API Setup

## Overview
The podcast audio generation feature uses Google Cloud Text-to-Speech API to generate high-quality voice audio with different voices for the two podcast hosts.

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Text-to-Speech API
1. Navigate to [Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
2. Click "Enable"
3. Wait for the API to be enabled

### 3. Create API Key
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the API key (keep it secure!)
4. *Optional but recommended:* Click "Restrict key" and limit it to "Cloud Text-to-Speech API" only

### 4. Set Secret in Supabase
```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# Set the secret
supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="YOUR_API_KEY_HERE"

# Verify it was set
supabase secrets list
```

### 5. Re-deploy Edge Function (if already deployed)
```bash
supabase functions deploy podcast_generate_audio --no-verify-jwt
```

## Voice Configuration

Currently configured voices:
- **Speaker A (Host)**: `en-US-Neural2-J` (Male voice)
- **Speaker B (Co-host)**: `en-US-Neural2-F` (Female voice)

These are high-quality Neural2 voices optimized for natural conversation.

## Testing

Once the API key is set, test the audio generation:

```bash
cd backend/tests
node test-podcast-script.js
```

Or manually:
```bash
export EPISODE_ID="your-episode-id"
export JWT_TOKEN="your-jwt-token"

curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/podcast_generate_audio" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: "application/json" \
  -d "{\"episode_id\": \"${EPISODE_ID}\"}"
```

## Pricing

Google Cloud TTS pricing (as of 2026):
- **Neural2 voices**: $16 per 1 million characters
- Average podcast (8-12 min): ~8,000 characters = $0.13
- **First 1 million characters/month are FREE**

For typical usage (dozens of podcasts per month), you'll stay within the free tier.

## Monitoring Usage

Check usage in [Google Cloud Console](https://console.cloud.google.com/billing):
1. Go to "Billing" → "Reports"
2. Filter by "Cloud Text-to-Speech API"
3. View character count and costs

## Troubleshooting

### Error: "TTS service not configured"
- API key secret is not set in Supabase
- Run: `supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="..."`

### Error: "API key not valid"
- Check that the API key is correct
- Verify Text-to-Speech API is enabled in your project
- Check API key restrictions (shouldn't block TTS API)

### Error: "Quota exceeded"
- You've exceeded the free tier (1M chars/month)
- Enable billing in Google Cloud Console
- Or wait until next month for quota reset

### Slow audio generation
- Normal: ~1-2 seconds per segment (64 segments = 2-3 minutes total)
- Check Google Cloud TTS API quotas/limits
- Consider implementing batch processing if needed

## Alternative: Use Different TTS Service

If Google Cloud TTS is not suitable, you can swap it out:

1. Edit `/Users/danielntumba/smrtr/study-os-mobile/supabase/functions/podcast_generate_audio/index.ts`
2. Replace the TTS API call (lines ~160-180) with your preferred service:
   - OpenAI TTS
   - ElevenLabs
   - Amazon Polly
   - Azure Speech Services
3. Update voice configuration as needed
4. Re-deploy the function

## Next Steps

After setting up TTS:
1. ✅ API key is configured
2. ✅ Function is deployed
3. ✅ App is integrated
4. Test by opening a lesson in the app and navigating to the Podcasts tab
5. The app will automatically:
   - Create episode
   - Generate script
   - Generate audio
   - Show "Generating audio (X/Y segments)" progress
6. When ready, audio will be playable in the app
