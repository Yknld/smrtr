# YouTube Recommendations - cURL Tests

Testing guide for the `lesson_youtube_recs` Edge Function.

## Prerequisites

### 1. Get Supabase User Token

Use the existing token helper script:

```bash
cd backend/tests
npm install  # If not already done
node get-token.js
```

This will output your JWT token. Copy it for use in the tests below.

### 2. Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export JWT_TOKEN="eyJ..."  # Token from step 1
export LESSON_ID="your-lesson-uuid"  # Use an existing lesson ID
```

### 3. Verify API Keys

Ensure these secrets are set in your Supabase project:

```bash
supabase secrets list
# Should show:
# YOUTUBE_API_KEY
# GEMINI_API_KEY
```

If not set:
```bash
supabase secrets set YOUTUBE_API_KEY=AIza...
supabase secrets set GEMINI_API_KEY=AIza...
```

## Test Cases

### Test 1: Basic Request (Default Parameters)

Get 3 recommended videos using default settings.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\"
  }"
```

**Expected Response:**
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
      "reason": "ideal 10min length, crash course format"
    }
  ]
}
```

**What to Check:**
- ✅ Status: 200 OK
- ✅ `cached`: false (first request)
- ✅ `results`: Array with 3 videos
- ✅ Each video has: video_id, title, url, thumbnail_url, channel, reason
- ✅ Videos are relevant to lesson topic

---

### Test 2: Cached Results

Run the same request again within 24 hours.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\"
  }"
```

**Expected Response:**
```json
{
  "cached": true,
  "results": [...]
}
```

**What to Check:**
- ✅ Status: 200 OK
- ✅ `cached`: true (returned from cache)
- ✅ Same results as Test 1
- ✅ Response time: <1 second (much faster)

---

### Test 3: Custom Count

Request 5 videos instead of default 3.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"count\": 5
  }"
```

**Expected Response:**
```json
{
  "cached": true,
  "results": [...]
}
```

**What to Check:**
- ✅ Returns exactly 5 videos (or fewer if not enough found)
- ✅ Still uses cache (count doesn't affect caching)

---

### Test 4: Force Refresh

Bypass cache and generate fresh recommendations.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"force\": true
  }"
```

**Expected Response:**
```json
{
  "cached": false,
  "results": [...]
}
```

**What to Check:**
- ✅ Status: 200 OK
- ✅ `cached`: false (bypassed cache)
- ✅ May have different videos than cached version
- ✅ Response time: 5-10 seconds (slower, generating fresh)

---

### Test 5: Regional Settings (US)

Get videos relevant to US region in English.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"regionCode\": \"US\",
    \"relevanceLanguage\": \"en\",
    \"force\": true
  }"
```

**Expected Response:**
```json
{
  "cached": false,
  "results": [...]
}
```

**What to Check:**
- ✅ Videos more relevant to US audience
- ✅ Channels popular in US region

---

### Test 6: Different Language (French)

Get French language videos for a lesson.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"regionCode\": \"FR\",
    \"relevanceLanguage\": \"fr\",
    \"force\": true
  }"
```

**Expected Response:**
```json
{
  "cached": false,
  "results": [
    {
      "title": "Algorithme de recherche binaire expliqué",
      ...
    }
  ]
}
```

**What to Check:**
- ✅ Video titles in French
- ✅ Channels from French region

---

### Test 7: Missing Authorization (Error)

Request without JWT token.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\"
  }"
```

**Expected Response:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization required"
  }
}
```

**What to Check:**
- ✅ Status: 401 Unauthorized
- ✅ Structured error response

---

### Test 8: Invalid Lesson ID (Error)

Request with non-existent lesson.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "00000000-0000-0000-0000-000000000000"
  }'
```

**Expected Response:**
```json
{
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Lesson not found"
  }
}
```

**What to Check:**
- ✅ Status: 404 Not Found
- ✅ Error code indicates lesson doesn't exist

---

### Test 9: Missing Lesson ID (Error)

Request without required lesson_id field.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 3
  }'
```

**Expected Response:**
```json
{
  "error": {
    "code": "INVALID_LESSON_ID",
    "message": "lesson_id required"
  }
}
```

**What to Check:**
- ✅ Status: 400 Bad Request
- ✅ Error indicates missing parameter

---

### Test 10: Invalid JSON (Error)

Request with malformed JSON.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{lesson_id: "not-valid-json"'
```

**Expected Response:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid JSON"
  }
}
```

**What to Check:**
- ✅ Status: 400 Bad Request
- ✅ Error indicates JSON parsing failure

---

## Verification Queries

After running tests, verify data in the database:

### Check Cached Recommendations

```sql
SELECT 
  l.title as lesson_title,
  lo.type,
  lo.status,
  lo.content_json->>'generated_at' as generated_at,
  jsonb_array_length(lo.content_json->'results') as num_videos,
  lo.content_json->'queries_used' as queries_used,
  lo.created_at,
  lo.updated_at
FROM lesson_outputs lo
JOIN lessons l ON l.id = lo.lesson_id
WHERE lo.type = 'youtube_recs'
  AND lo.user_id = auth.uid()
ORDER BY lo.created_at DESC;
```

### View Specific Recommendations

```sql
SELECT 
  l.title as lesson_title,
  jsonb_pretty(lo.content_json) as recommendations
FROM lesson_outputs lo
JOIN lessons l ON l.id = lo.lesson_id
WHERE lo.type = 'youtube_recs'
  AND lo.lesson_id = 'your-lesson-id'
  AND lo.user_id = auth.uid();
```

### Check Cache Age

```sql
SELECT 
  l.title,
  lo.created_at,
  EXTRACT(EPOCH FROM (NOW() - lo.created_at)) / 3600 as age_hours,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - lo.created_at)) / 3600 < 24 THEN 'Valid'
    ELSE 'Expired'
  END as cache_status
FROM lesson_outputs lo
JOIN lessons l ON l.id = lo.lesson_id
WHERE lo.type = 'youtube_recs'
  AND lo.user_id = auth.uid()
ORDER BY lo.created_at DESC;
```

## Performance Benchmarks

### Response Times

| Scenario | Expected Time | Notes |
|----------|---------------|-------|
| Cached result | <1 second | Fast, no API calls |
| Fresh generation (success) | 5-10 seconds | Multiple API calls |
| Fresh generation (fallback) | 3-5 seconds | Gemini failed, simpler queries |
| Error response | <1 second | Validation errors |

### API Usage Per Call

| Service | Calls | Cost (units/quota) |
|---------|-------|-------------------|
| Gemini | 1 | Free (preview) |
| YouTube search | 3-6 | 300-600 units |
| YouTube videos.list | 1 | 1 unit |
| **Total** | 5-8 calls | ~301-601 units |

**Daily Limit**: With 10,000 YouTube API units/day, you can make ~16-33 function calls/day.

## Troubleshooting

### No Videos Found

If you get `NO_RESULTS` error:

1. **Check lesson has content**:
   ```sql
   SELECT 
     l.title,
     EXISTS(SELECT 1 FROM lesson_outputs WHERE lesson_id = l.id AND type = 'summary') as has_summary,
     EXISTS(SELECT 1 FROM study_sessions WHERE lesson_id = l.id) as has_sessions
   FROM lessons l
   WHERE l.id = 'your-lesson-id';
   ```

2. **Try different region/language**:
   ```bash
   curl ... -d '{"lesson_id": "...", "regionCode": "US", "relevanceLanguage": "en", "force": true}'
   ```

3. **Check API keys are set**:
   ```bash
   supabase secrets list
   ```

### Quota Exceeded

If you hit YouTube API quota limits:

1. **Check current usage**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
   - Select your project
   - View "YouTube Data API v3" usage

2. **Wait for reset**:
   - Quota resets at midnight Pacific Time
   - Cached results will still work

3. **Consider upgrading**:
   - Request quota increase in Google Cloud Console
   - Or enable billing for higher limits

### Poor Quality Results

If videos aren't relevant:

1. **Add lesson context**:
   - Create a summary for the lesson
   - Add transcript data
   - More context = better queries

2. **Force refresh**:
   ```bash
   curl ... -d '{"lesson_id": "...", "force": true}'
   ```

3. **Try different parameters**:
   ```bash
   curl ... -d '{"lesson_id": "...", "count": 5, "force": true}'
   ```

## Integration Example

### TypeScript/JavaScript

```typescript
// Get recommendations for a lesson
async function getYouTubeRecommendations(lessonId: string, forceRefresh = false) {
  const { data, error } = await supabase.functions.invoke('lesson_youtube_recs', {
    body: {
      lesson_id: lessonId,
      count: 3,
      force: forceRefresh
    }
  });

  if (error) {
    console.error('Failed to get recommendations:', error);
    return null;
  }

  console.log(`Found ${data.results.length} videos (${data.cached ? 'cached' : 'fresh'})`);
  
  return data.results.map((video: any) => ({
    id: video.video_id,
    title: video.title,
    url: video.url,
    thumbnail: video.thumbnail_url,
    channel: video.channel,
    duration: `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, '0')}`,
    views: video.view_count.toLocaleString(),
    reason: video.reason
  }));
}

// Usage
const videos = await getYouTubeRecommendations('lesson-uuid');
if (videos) {
  videos.forEach(video => {
    console.log(`
      ${video.title}
      ${video.channel} • ${video.duration} • ${video.views} views
      Why recommended: ${video.reason}
      Watch: ${video.url}
    `);
  });
}
```

### React Native Component

```typescript
const LessonVideosScreen = ({ lessonId }: { lessonId: string }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [lessonId]);

  const loadRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    
    const { data, error } = await supabase.functions.invoke('lesson_youtube_recs', {
      body: { lesson_id: lessonId, count: 5, force: forceRefresh }
    });

    if (error) {
      Alert.alert('Error', 'Failed to load video recommendations');
      return;
    }

    setVideos(data.results);
    setCached(data.cached);
    setLoading(false);
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      <Text>Recommended Study Videos {cached && '(cached)'}</Text>
      <Button 
        title="Refresh" 
        onPress={() => loadRecommendations(true)}
      />
      
      <FlatList
        data={videos}
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            onPress={() => Linking.openURL(item.url)}
          />
        )}
      />
    </View>
  );
};
```

## Success Criteria

- ✅ Returns 3 relevant videos by default
- ✅ Cached results served in <1 second
- ✅ Fresh generation completes in 5-10 seconds
- ✅ Videos are study-focused (6-18 min preferred)
- ✅ Each video has a reason for recommendation
- ✅ Handles errors gracefully
- ✅ Respects API quotas with 24h caching

## Next Steps

1. **Deploy function**:
   ```bash
   supabase functions deploy lesson_youtube_recs
   ```

2. **Set API keys**:
   ```bash
   supabase secrets set YOUTUBE_API_KEY=your_key
   supabase secrets set GEMINI_API_KEY=your_key
   ```

3. **Run tests**:
   - Execute all test cases above
   - Verify cached responses
   - Check database for stored recommendations

4. **Monitor usage**:
   - Watch YouTube API quota in Google Cloud Console
   - Check function logs for errors
   - Track cache hit rates

## Support

- Function code: `supabase/functions/lesson_youtube_recs/index.ts`
- API documentation: `backend/docs/youtube-recs.md`
- YouTube API docs: https://developers.google.com/youtube/v3
- Gemini API docs: https://ai.google.dev/docs
