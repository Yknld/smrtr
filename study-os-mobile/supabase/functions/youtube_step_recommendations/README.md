# youtube_step_recommendations

Returns YouTube videos relevant to a **single homework step**. Used by GeminiLoop’s “Feeling stuck?” button.

## Flow

1. Client sends step context: `topic` (step explanation) and optional `contentContext` (problem text).
2. **Gemini** generates 3–5 YouTube search queries for that exact step.
3. **YouTube Data API** runs those queries and returns video metadata.
4. Response is filtered by optional duration preference and limited to `count` videos.

## Request

- **URL:** `POST /functions/v1/youtube_step_recommendations`
- **Headers:** `Authorization: Bearer <supabase_anon_key>`, `apikey: <supabase_anon_key>`, `Content-Type: application/json`
- **Body:**
  - `topic` (string, required) – step explanation or step summary
  - `contentContext` (string, optional) – full problem text for context
  - `count` (number, optional) – max videos to return (default 3, max 10)
  - `preferredDurationMin` (array, optional) – e.g. `[5, 20]` for 5–20 minute videos

## Response

```json
{
  "videos": [
    {
      "video_id": "...",
      "title": "...",
      "channel_name": "...",
      "duration_seconds": 600,
      "thumbnail_url": "https://...",
      "description": "..."
    }
  ]
}
```

## Secrets

Set in Supabase Edge Function secrets:

- `GEMINI_API_KEY` – for generating search queries
- `YOUTUBE_API_KEY` – for YouTube Data API v3

**Important:** The Google Cloud project that owns `YOUTUBE_API_KEY` must have **YouTube Data API v3** enabled. In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Library → search “YouTube Data API v3” → Enable. If it’s not enabled, search returns 0 videos and you’ll see an error in the function logs.

## Deploy

From repo root:

```bash
supabase functions deploy youtube_step_recommendations
supabase secrets set GEMINI_API_KEY=xxx YOUTUBE_API_KEY=yyy
```

No auth required beyond the anon key (GeminiLoop uses it without user login).
