# YouTube Recommendations API

## Overview

The `lesson_youtube_recs` Edge Function uses AI to find the best YouTube study videos for any lesson. It intelligently generates search queries, ranks results based on study preferences, and caches recommendations for 24 hours.

## Endpoint

```
POST /functions/v1/lesson_youtube_recs
```

## Authentication

Requires JWT authentication:
```
Authorization: Bearer <supabase_access_token>
```

## Request Body

```json
{
  "lesson_id": "uuid",
  "count": 3,
  "regionCode": "CA",
  "relevanceLanguage": "en",
  "force": false
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lesson_id` | uuid | ✅ Yes | - | ID of the lesson to find videos for |
| `count` | number | No | 3 | Number of videos to return (1-10) |
| `regionCode` | string | No | "CA" | YouTube region code (ISO 3166-1 alpha-2) |
| `relevanceLanguage` | string | No | "en" | Language for search results (ISO 639-1) |
| `force` | boolean | No | false | Bypass 24h cache and generate fresh results |

## Response

### Success (200 OK)

```json
{
  "cached": false,
  "results": [
    {
      "video_id": "dQw4w9WgXcQ",
      "title": "Binary Search - Crash Course in 10 Minutes",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "channel": "CS Explained",
      "duration_seconds": 612,
      "view_count": 1250000,
      "reason": "ideal 10min length, crash course format, covers binary search"
    },
    {
      "video_id": "abc123def45",
      "title": "Binary Search Explained Simply",
      "url": "https://www.youtube.com/watch?v=abc123def45",
      "thumbnail_url": "https://i.ytimg.com/vi/abc123def45/mqdefault.jpg",
      "channel": "Khan Academy",
      "duration_seconds": 840,
      "view_count": 3500000,
      "reason": "clear explanation, covers binary search"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `cached` | boolean | Whether results came from cache (true) or fresh generation (false) |
| `results` | array | Array of video recommendations |
| `results[].video_id` | string | YouTube video ID |
| `results[].title` | string | Video title |
| `results[].url` | string | Full YouTube URL |
| `results[].thumbnail_url` | string | Thumbnail image URL |
| `results[].channel` | string | Channel name |
| `results[].duration_seconds` | number | Video length in seconds |
| `results[].view_count` | number | Number of views |
| `results[].reason` | string | Why this video was recommended |

### Error Responses

#### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization required"
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Lesson not found"
  }
}
```

```json
{
  "error": {
    "code": "NO_RESULTS",
    "message": "No videos found"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "CONFIG_ERROR",
    "message": "YouTube API key not configured"
  }
}
```

## How It Works

### 1. Lesson Context Gathering

The function gathers context about the lesson from multiple sources (in priority order):

1. **Lesson Summary** (`lesson_outputs` where `type='summary'`)
2. **Transcript** (`live_transcript_segments` concatenated)
3. **Lesson Title** (fallback)

Context is capped at 10,000 characters for efficiency.

### 2. AI Query Generation (Gemini)

Uses **Gemini 2.0 Flash Exp** to generate optimized search queries:

```json
{
  "queries": [
    "binary search algorithm crash course",
    "binary search tutorial for beginners",
    "binary search practice problems walkthrough"
  ],
  "must_include_topics": ["binary search", "algorithm", "complexity"],
  "avoid_topics": ["advanced data structures", "leetcode hard"],
  "target_level": "intermediate",
  "intent": "direct_review",
  "preferred_duration_min": [6, 18],
  "allowed_duration_min": [2, 45]
}
```

**Fallback**: If Gemini fails, generates simple queries from lesson title.

### 3. YouTube Search

For each generated query:
- Searches YouTube Data API v3 (`search.list`)
- Fetches up to 10 results per query
- Parameters:
  - `type=video`
  - `order=relevance`
  - `safeSearch=moderate`
  - Custom `regionCode` and `relevanceLanguage`

### 4. Video Details Fetch

Calls `videos.list` to get:
- Duration (ISO 8601 format parsed to seconds)
- View count
- Additional metadata

### 5. Intelligent Ranking

Videos are scored based on:

#### Duration Scoring
- **+50 points**: 6-18 minutes (ideal study length)
- **+25 points**: 2-45 minutes (acceptable)
- **-40 points**: <2 min or >60 min (too short/long)

#### Title Keywords (+20 each)
- "review", "crash course", "exam", "practice"
- "in 10 minutes", "in 15 minutes", "summary"
- "explained", "problems", "walkthrough", "tutorial"
- "lecture", "lesson", "guide", "introduction"

#### Topic Relevance
- **+15 points**: Must-include topics found in title
- **-30 points**: Avoid topics found in title

#### Popularity Bonus
- **+10 points**: >1M views
- **+5 points**: >100K views

#### Educational Channels (+15)
- Khan Academy, MIT, Stanford, Harvard
- Crash Course, 3Blue1Brown
- Channels with "Professor", "Academy", "Education"

### 6. Reason Generation

Each video gets a human-readable reason:
- "ideal 10min length, crash course format, covers binary search"
- "review content, covers algorithms"
- "practice problems, clear explanation"

### 7. Caching

Results are stored in `lesson_outputs`:
- `type='youtube_recs'`
- `status='ready'`
- `content_json` contains queries and results
- Valid for 24 hours
- Use `force=true` to bypass cache

## Configuration

### Environment Variables

Set in Supabase Dashboard → Edge Functions → Settings:

```bash
YOUTUBE_API_KEY=AIza...your_key_here
GEMINI_API_KEY=AIza...your_key_here
```

Or via CLI:
```bash
supabase secrets set YOUTUBE_API_KEY=your_key
supabase secrets set GEMINI_API_KEY=your_key
```

### API Keys Setup

#### YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select project
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Restrict key to YouTube Data API v3 only

#### Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy key to environment

## API Quotas & Costs

### YouTube Data API v3

**Free Quota**: 10,000 units/day

**Cost per request**:
- `search.list`: 100 units
- `videos.list`: 1 unit

**Usage per function call**:
- Typically 3-6 search queries = 300-600 units
- 1 videos.list call for ~20 videos = 1 unit
- **Total**: ~301-601 units per call

**Daily limit**: ~16-33 function calls/day (with default settings)

### Gemini API

**Model**: `gemini-3-flash-preview` (Free during preview)

**Future pricing** (estimated when GA):
- Input: ~$0.00001 per 1K chars
- Output: ~$0.00003 per 1K chars
- Cost per call: <$0.001

### Cost Optimization

1. **Use caching**: Default 24h cache reduces API calls by ~90%
2. **Limit query count**: Gemini generates 3-6 queries (configurable)
3. **Reduce maxResults**: Currently 10 per query (adjustable)
4. **Monitor quotas**: Check Google Cloud Console regularly

### Quota Exceeded Error

If YouTube quota is exceeded:
```json
{
  "error": {
    "code": "YOUTUBE_QUOTA_EXCEEDED",
    "message": "YouTube API quota exceeded. Try again tomorrow."
  }
}
```

Cached results will still be served if available.

## Database Schema

### lesson_outputs

Recommendations are stored as:

```sql
INSERT INTO lesson_outputs (
  user_id,
  lesson_id,
  type,
  status,
  content_json
) VALUES (
  'user-uuid',
  'lesson-uuid',
  'youtube_recs',
  'ready',
  '{
    "queries_used": ["query1", "query2"],
    "results": [...],
    "generated_at": "2026-01-10T..."
  }'
);
```

### Cache Invalidation

Old recommendations are deleted before inserting new ones:

```sql
DELETE FROM lesson_outputs
WHERE lesson_id = 'lesson-uuid'
  AND user_id = 'user-uuid'
  AND type = 'youtube_recs';
```

## Example Usage

### Basic Request

```bash
curl -X POST \
  "https://your-project.supabase.co/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Custom Parameters

```bash
curl -X POST \
  "https://your-project.supabase.co/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
    "count": 5,
    "regionCode": "US",
    "relevanceLanguage": "en",
    "force": true
  }'
```

### Response Processing

```typescript
const { data, error } = await supabase.functions.invoke('lesson_youtube_recs', {
  body: { lesson_id: lessonId }
});

if (error) {
  console.error('Failed to get recommendations:', error);
  return;
}

console.log(`${data.cached ? 'Cached' : 'Fresh'} results:`);
for (const video of data.results) {
  console.log(`
    ${video.title}
    ${video.channel} - ${Math.round(video.duration_seconds / 60)} min
    ${video.reason}
    ${video.url}
  `);
}
```

## Deployment

```bash
cd supabase/functions
supabase functions deploy lesson_youtube_recs

# Set secrets if not already set
supabase secrets set YOUTUBE_API_KEY=your_youtube_key
supabase secrets set GEMINI_API_KEY=your_gemini_key
```

## Monitoring

### Check Function Logs

```bash
supabase functions logs lesson_youtube_recs --tail
```

### Monitor API Usage

- **YouTube**: [Google Cloud Console → APIs & Services → Dashboard](https://console.cloud.google.com/apis/dashboard)
- **Gemini**: [Google AI Studio → Usage](https://makersuite.google.com/)

### Query Cached Results

```sql
SELECT 
  l.title as lesson_title,
  lo.content_json->>'generated_at' as generated_at,
  jsonb_array_length(lo.content_json->'results') as num_videos,
  lo.created_at
FROM lesson_outputs lo
JOIN lessons l ON l.id = lo.lesson_id
WHERE lo.type = 'youtube_recs'
  AND lo.user_id = auth.uid()
ORDER BY lo.created_at DESC;
```

## Troubleshooting

### No Results Found

- Lesson context may be too vague (add summary/transcript)
- Topic may be too niche
- Try different region/language settings

### Poor Quality Recommendations

- Add more detailed lesson summary
- Use `force=true` to regenerate with fresh queries
- Adjust ranking logic in function code

### Quota Errors

- Check YouTube API quota in Google Cloud Console
- Wait 24 hours for quota reset
- Consider upgrading to paid quota

### Slow Response

- First request after cache expiry: 5-10 seconds (normal)
- Cached requests: <1 second
- Reduce `count` parameter to speed up

## Related Functions

- `lesson_youtube_resource_add` - Manually add videos to lesson
- Future: `lesson_youtube_recs_refresh` - Batch refresh all lessons
- Future: `lesson_youtube_recs_feedback` - Rate recommendations

## Support

- Function code: `supabase/functions/lesson_youtube_recs/index.ts`
- Test examples: `backend/tests/curl/lesson_youtube_recs.md`
- YouTube API docs: https://developers.google.com/youtube/v3
- Gemini API docs: https://ai.google.dev/docs
