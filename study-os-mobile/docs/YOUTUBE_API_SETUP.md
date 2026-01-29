# YouTube API Setup Guide

## Prerequisites

You need a YouTube Data API v3 key from Google Cloud Console.

---

## Step 1: Get YouTube API Key

### 1. Go to Google Cloud Console
https://console.cloud.google.com/

### 2. Create/Select a Project
- Click "Select a project" → "New Project"
- Name: "StudyOS YouTube Integration"
- Click "Create"

### 3. Enable YouTube Data API v3
- Go to "APIs & Services" → "Library"
- Search for "YouTube Data API v3"
- Click "Enable"

### 4. Create API Key
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "API Key"
- Copy the API key (looks like: `AIzaSyC...`)

### 5. Restrict API Key (Recommended)
- Click "Edit API key"
- Under "API restrictions":
  - Select "Restrict key"
  - Enable only: "YouTube Data API v3"
- Click "Save"

---

## Step 2: Add API Key to Supabase

### Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/settings/functions

2. Scroll to "Environment Variables"

3. Click "Add new secret"

4. Add:
   - **Name:** `YOUTUBE_API_KEY`
   - **Value:** Your YouTube API key (e.g., `AIzaSyC...`)

5. Click "Save"

### Via Supabase CLI

```bash
cd study-os-mobile
supabase secrets set YOUTUBE_API_KEY=AIzaSyC...
```

---

## Step 3: Verify Setup

Run the test script:

```bash
cd study-os-mobile
node scripts/test-youtube-recommendations.js
```

Expected output:
```
✅ Signed in as: user1@test.com
✅ Found lesson with content
🔍 Generating YouTube recommendations...
✅ Generated 3 videos!
   1. "Video Title" by Channel Name
   2. "Video Title" by Channel Name
   3. "Video Title" by Channel Name
```

---

## Troubleshooting

### Error: "YOUTUBE_API_KEY not configured"
- Make sure you added the secret in Supabase Dashboard
- Wait 1-2 minutes for edge functions to pick up new secrets
- Redeploy the function:
  ```bash
  supabase functions deploy generate_youtube_recommendations --no-verify-jwt
  ```

### Error: "Quota exceeded"
- YouTube Data API has a daily quota (10,000 units/day by default)
- Each search uses ~100 units
- Each video details request uses ~1 unit
- Request quota increase in Google Cloud Console if needed

### Error: "No YouTube videos found"
- The lesson might not have enough content
- Gemini might have generated invalid search queries
- Check the function logs in Supabase Dashboard

### Error: "Invalid API key"
- Verify the API key is correct
- Check that YouTube Data API v3 is enabled
- Make sure API key restrictions allow YouTube Data API v3

---

## API Quota Management

### Default Quota
- 10,000 units per day
- ~50 recommendation generations per day

### Cost per Generation
- 3-5 search queries: ~300-500 units
- Video details for 15-25 videos: ~15-25 units
- **Total: ~315-525 units per generation**

### Optimization Tips
1. **Cache aggressively** - Don't regenerate for same content
2. **Limit searches** - Use 3 queries instead of 5
3. **Reduce results** - Get 3 videos per query instead of 5
4. **Request quota increase** - Free up to 1M units/day

---

## Testing Without YouTube API

If you don't have a YouTube API key yet, you can:

1. **Use mock data** in the frontend
2. **Manually add videos** via SQL:

```sql
-- Insert a video
INSERT INTO youtube_videos (video_id, title, channel_name, duration_seconds, thumbnail_url)
VALUES ('dQw4w9WgXcQ', 'Example Video', 'Example Channel', 600, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');

-- Link to lesson
INSERT INTO youtube_lesson_resources (lesson_id, video_id, is_primary)
VALUES ('your-lesson-id', 'dQw4w9WgXcQ', true);
```

3. **View in app** - Videos will show up in the play button menu

---

## Security Notes

### API Key Protection
- ✅ API key is stored as Supabase secret (server-side)
- ✅ Never exposed to client
- ✅ Only accessible to edge functions

### Rate Limiting
- Consider adding rate limiting per user
- Prevent abuse of expensive API calls
- Track usage in `ai_usage` table

---

## Summary

1. Get YouTube Data API v3 key from Google Cloud Console
2. Add as `YOUTUBE_API_KEY` secret in Supabase
3. Test with `test-youtube-recommendations.js`
4. Use in app by tapping play button → "Generate Recommendations"

**You're all set!** 🎉
