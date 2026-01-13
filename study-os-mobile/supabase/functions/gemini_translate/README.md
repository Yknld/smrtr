# Gemini Translation Edge Function

Context-aware translation service using Google Gemini AI for live captions.

## Purpose

Translates English text to any of 23 supported languages with conversation context for better accuracy.

## Authentication

Requires valid Supabase user session token in Authorization header.

## Request

```typescript
POST /functions/v1/gemini_translate

Headers:
  Authorization: Bearer {user_session_token}
  Content-Type: application/json

Body:
{
  "text": "This is a sentence to translate.",
  "targetLanguage": "Spanish",
  "context": {
    "previousSentences": [
      "This is the previous sentence.",
      "This provides context."
    ],
    "topic": "Live lecture or conversation",
    "domain": "Academic"
  }
}
```

## Response

```typescript
{
  "translation": "Esta es una oración para traducir.",
  "sourceLanguage": "en",
  "targetLanguage": "Spanish"
}
```

## Error Response

```typescript
{
  "error": "Error message",
  "translation": "original text as fallback",
  "sourceLanguage": "en",
  "targetLanguage": "Spanish"
}
```

## Environment Variables

Required:
- `GEMINI_API_KEY` - Your Google Gemini API key

Auto-provided by Supabase:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Features

1. **Context-Aware Translation**
   - Uses previous sentences for better coherence
   - Understands topic and domain
   - Maintains conversation flow

2. **Error Handling**
   - Returns original text on API failure
   - Logs errors for debugging
   - Graceful degradation

3. **Security**
   - Validates user authentication
   - Per-user request logging
   - CORS enabled

4. **Performance**
   - Low temperature (0.3) for accuracy
   - Optimized token limits
   - Fast response times

## Deployment

```bash
# Set the Gemini API key
supabase secrets set GEMINI_API_KEY=your_api_key_here

# Deploy the function
supabase functions deploy gemini_translate

# Test the function
supabase functions invoke gemini_translate \
  --body '{"text":"Hello world","targetLanguage":"Spanish"}' \
  --header "Authorization: Bearer YOUR_USER_TOKEN"
```

## Testing

```bash
# Local development
supabase functions serve gemini_translate --env-file .env.local

# Test request
curl -i --location --request POST 'http://localhost:54321/functions/v1/gemini_translate' \
  --header 'Authorization: Bearer YOUR_USER_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"text":"Hello world","targetLanguage":"Spanish","context":{}}'
```

## Usage from Mobile App

```typescript
import { supabase } from '../config/supabase';

const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_translate',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: 'Hello world',
      targetLanguage: 'Spanish',
      context: {
        previousSentences: ['Previous context...'],
        topic: 'Live lecture',
      },
    }),
  }
);

const result = await response.json();
console.log(result.translation); // "Hola mundo"
```

## Cost Considerations

- Uses Gemini 2.0 Flash Exp (currently free during preview)
- ~100-500 tokens per translation request
- Context adds ~50-200 tokens per request
- Recommended: Monitor usage in Google AI Studio

## Monitoring

Check logs:
```bash
supabase functions logs gemini_translate --tail
```

Look for:
- `[Translation] User: {id}, Target: {lang}, Length: {chars}`
- `[Translation] Gemini API error: {error}`
- Request/response times

## Troubleshooting

### "Missing authorization header"
- Ensure user is authenticated
- Pass session token in Authorization header

### "Gemini API key not configured"
- Set secret: `supabase secrets set GEMINI_API_KEY=...`
- Redeploy function after setting secret

### "Translation service error"
- Check Gemini API key is valid
- Verify API quota not exceeded
- Check network connectivity

### Poor translation quality
- Add more context sentences
- Specify topic/domain more precisely
- Consider adjusting temperature parameter

## Rate Limiting

Currently no rate limiting implemented. Consider adding:
- Per-user request limits
- Cost tracking
- Usage quotas

## Related

- Mobile app: `apps/mobile/src/services/geminiTranslation.ts`
- Live transcription: `apps/mobile/src/screens/LiveTranscription/LiveTranscriptionScreen.tsx`
- Supported languages: `apps/mobile/src/components/LanguageSelector/LanguageSelector.tsx`
