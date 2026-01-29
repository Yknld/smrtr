# Deploy Translation Edge Function

Quick guide to deploy the Gemini translation function to Supabase.

## Prerequisites

1. Supabase CLI installed
2. Logged into your Supabase project
3. Google Gemini API key

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new project or select existing
4. Copy the API key

## Step 2: Set the API Key as Secret

```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# Set the Gemini API key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

## Step 3: Deploy the Function

```bash
# Deploy the translation function
supabase functions deploy gemini_translate

# Verify deployment
supabase functions list
```

Expected output:
```
┌──────────────────┬─────────┬───────────┬─────────────────────┐
│ NAME             │ VERSION │ STATUS    │ CREATED_AT          │
├──────────────────┼─────────┼───────────┼─────────────────────┤
│ gemini_translate │ 1       │ ACTIVE    │ 2026-01-12 ...      │
└──────────────────┴─────────┴───────────┴─────────────────────┘
```

## Step 4: Test the Function

```bash
# Get your user token (from mobile app or Supabase dashboard)
# Then test:

supabase functions invoke gemini_translate \
  --body '{
    "text": "Hello, how are you today?",
    "targetLanguage": "Spanish",
    "context": {
      "topic": "Casual conversation"
    }
  }' \
  --header "Authorization: Bearer YOUR_USER_SESSION_TOKEN"
```

Expected response:
```json
{
  "translation": "Hola, ¿cómo estás hoy?",
  "sourceLanguage": "en",
  "targetLanguage": "Spanish"
}
```

## Step 5: Verify in Mobile App

1. Open the mobile app
2. Go to Settings → Study Preferences
3. Select a language (e.g., Spanish)
4. Open Live Transcription
5. Start recording
6. Speak in English
7. Translation should appear below in ~3 seconds

## Troubleshooting

### Function not deploying
```bash
# Check Supabase connection
supabase status

# Re-login if needed
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF
```

### Secret not set
```bash
# List all secrets
supabase secrets list

# Should see GEMINI_API_KEY
# If not, set it again
supabase secrets set GEMINI_API_KEY=your_key
```

### Testing fails
```bash
# Check function logs
supabase functions logs gemini_translate --tail

# Common issues:
# - Invalid API key → Set correct key
# - Missing auth token → Get fresh session token
# - Rate limit → Wait and retry
```

### Translation not working in app
1. Check network connection
2. Verify user is authenticated
3. Check console logs in app
4. Ensure language is not set to English
5. Wait 3 seconds for translation

## Monitoring

```bash
# Watch real-time logs
supabase functions logs gemini_translate --tail

# Check recent invocations
supabase functions logs gemini_translate --limit 50
```

## Cost Optimization

The function uses Gemini 2.0 Flash Exp which is currently free during preview.

To monitor usage:
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Check "API Usage" dashboard
3. Set up billing alerts if needed

## Local Development

For testing locally:

```bash
# Create local env file
cat > supabase/.env.local << EOF
GEMINI_API_KEY=your_key_here
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key
EOF

# Start local functions
supabase functions serve gemini_translate --env-file supabase/.env.local

# Test locally
curl -i --location --request POST 'http://localhost:54321/functions/v1/gemini_translate' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "text": "Hello world",
    "targetLanguage": "Spanish"
  }'
```

## Production Checklist

- [ ] Gemini API key set as secret
- [ ] Function deployed successfully
- [ ] Function appears in `supabase functions list`
- [ ] Test request returns translation
- [ ] Mobile app can call function
- [ ] Logs show successful requests
- [ ] Error handling works (try with invalid key)
- [ ] CORS works from mobile app

## Next Steps

After deployment:
1. Test with all 23 supported languages
2. Monitor API usage and costs
3. Set up error alerting
4. Consider rate limiting for production
5. Add caching for common phrases

## Support

If issues persist:
1. Check [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions)
2. Check [Gemini API docs](https://ai.google.dev/docs)
3. Review function logs: `supabase functions logs gemini_translate`
4. Check mobile app console logs
5. Verify network requests in browser/mobile debugger

## Alternative: Direct API Key in App

If you prefer not to use edge functions, you can set the API key directly in the mobile app:

1. Create `.env` file:
```bash
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

2. The app will automatically use direct API calls as fallback

**Note**: Edge function is recommended for security (API key not exposed in app).
