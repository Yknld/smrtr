# YouTube Recommendations Test - SQL Approach

Since the database tables are ready but RLS policies need verification, here's how to test the YouTube recommendations function using SQL directly.

## Step 1: Create Test Data in SQL Editor

Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql/new

Run this SQL:

```sql
-- Create test course
INSERT INTO courses (user_id, title, term, color)
VALUES (
  (SELECT auth.uid()),
  'Machine Learning Basics',
  'Test 2026',
  '#4CAF50'
)
RETURNING id;

-- Note the course_id from above, then create lesson
INSERT INTO lessons (user_id, course_id, title, source_type, status)
VALUES (
  (SELECT auth.uid()),
  'PASTE_COURSE_ID_HERE',  -- Replace with course_id from above
  'Neural Networks and Deep Learning',
  'import',
  'ready'
)
RETURNING id;

-- Note the lesson_id from above for testing
```

## Step 2: Test YouTube Recommendations

Using the `lesson_id` from above:

```bash
# Set your JWT token
export JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

# Set the lesson ID from SQL
export LESSON_ID="YOUR_LESSON_ID_HERE"

# Call the recommendations function
curl -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"count\": 3
  }" | jq '.'
```

## Expected Response

You should see something like:

```json
{
  "cached": false,
  "results": [
    {
      "video_id": "aircAruvnKk",
      "title": "But what is a neural network? | Chapter 1, Deep learning",
      "url": "https://www.youtube.com/watch?v=aircAruvnKk",
      "thumbnail_url": "https://i.ytimg.com/vi/aircAruvnKk/mqdefault.jpg",
      "channel": "3Blue1Brown",
      "duration_seconds": 1140,
      "view_count": 8500000,
      "reason": "educational channel, covers neural networks"
    },
    {
      "video_id": "IHZwWFHWa-w",
      "title": "Machine Learning Crash Course",
      "url": "https://www.youtube.com/watch?v=IHZwWFHWa-w",
      "thumbnail_url": "https://i.ytimg.com/vi/IHZwWFHWa-w/mqdefault.jpg",
      "channel": "freeCodeCamp.org",
      "duration_seconds": 900,
      "view_count": 2400000,
      "reason": "crash course format, ideal 15min length"
    },
    {
      "video_id": "i8D90DkCLhI",
      "title": "Neural Networks Explained in 10 Minutes",
      "url": "https://www.youtube.com/watch?v=i8D90DkCLhI",
      "thumbnail_url": "https://i.ytimg.com/vi/i8D90DkCLhI/mqdefault.jpg",
      "channel": "TechWithTim",
      "duration_seconds": 612,
      "view_count": 1200000,
      "reason": "ideal 10min length, covers deep learning"
    }
  ]
}
```

## Alternative: Quick Test with Existing Lesson

If you already have lessons in your database:

```bash
# Get JWT token
cd /Users/danielntumba/smrtr/study-os-mobile/backend/tests
export JWT_TOKEN=$(node get-token.js 2>&1 | grep 'eyJ' | head -1)

# Find existing lessons
curl -s \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/rest/v1/lessons?select=id,title&limit=5" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI" \
  | jq '.'

# Use any lesson_id from the results above
export LESSON_ID="pick_one_from_above"

# Get recommendations
curl -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 3}" \
  | jq '.'
```

## What's Happening Under the Hood

1. **Context Gathering**: Function reads lesson title/summary
2. **Gemini AI**: Generates optimized search queries like:
   - "machine learning crash course"
   - "neural networks explained"
   - "deep learning tutorial for beginners"
3. **YouTube Search**: Fetches ~10 results per query
4. **Smart Ranking**: Scores based on:
   - Duration (6-18 min = best)
   - Keywords (crash course, review, explained)
   - Educational channels
   - View count
5. **Returns Top 3**: With reasons for each pick

## Timing

- **First call**: 5-10 seconds (fresh generation)
- **Subsequent calls**: <1 second (24h cache)

## Verify in Database

Check the cached results:

```sql
SELECT 
  l.title as lesson_title,
  lo.content_json->>'generated_at' as generated_at,
  jsonb_array_length(lo.content_json->'results') as num_videos,
  lo.content_json->'results'->0->>'title' as first_video
FROM lesson_outputs lo
JOIN lessons l ON l.id = lo.lesson_id
WHERE lo.type = 'youtube_recs'
  AND lo.user_id = auth.uid()
ORDER BY lo.created_at DESC
LIMIT 5;
```

## If RLS Issues Persist

The core migrations (001-009) need to be applied. Check if these exist:

```sql
-- Check if courses table has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'lessons');

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'lessons');
```

If no policies exist, the earlier migrations need to be applied through the dashboard.
