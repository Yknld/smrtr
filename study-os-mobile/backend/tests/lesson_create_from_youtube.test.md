# YouTube Lesson Import Tests

Manual test cases for the `lesson_create_from_youtube` Edge Function.

## Setup

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export JWT_TOKEN="$(node get-token.js)"  # Get a valid JWT token
export COURSE_ID="your-course-uuid"      # Use an existing course ID
```

To get a valid JWT token, use the existing test helper:
```bash
cd backend/tests
npm install
node get-token.js
```

## Test Cases

### Test 1: Basic Import with Full URL

Test importing a YouTube video with a full URL format.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lesson_title": "Rick Astley - Never Gonna Give You Up"
  }'
```

**Expected Result:**
- Status: 200
- Returns `lesson_id` and status
- Lesson created in database with `source_type='import'`
- Transcript fetched if available
- Summary generated if transcript exists

---

### Test 2: Import with Short URL

Test with YouTube's short URL format.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://youtu.be/jNQXAC9IVRw"
  }'
```

**Expected Result:**
- Status: 200
- Lesson created with default title format: "YouTube: jNQXAC9IVRw"

---

### Test 3: Import with Video ID Only

Test with just the 11-character video ID.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "dQw4w9WgXcQ",
    "lesson_title": "Test Video"
  }'
```

**Expected Result:**
- Status: 200
- Video ID correctly extracted
- Lesson created successfully

---

### Test 4: Import Educational Content (with transcript)

Test with a video known to have captions/transcript available.

```bash
# MIT OpenCourseWare video (usually has transcripts)
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=ytpJdnlu9C8",
    "lesson_title": "MIT 6.006 Introduction to Algorithms"
  }'
```

**Expected Result:**
- Status: 200
- Message indicates transcript was found
- Summary generated and stored in `lesson_outputs`

---

### Test 5: Missing Course ID (Error)

Test validation of required course_id field.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

**Expected Result:**
- Status: 400
- Error code: `INVALID_COURSE_ID`
- Error message about missing course_id

---

### Test 6: Missing YouTube URL (Error)

Test validation of required youtube_url field.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'"
  }'
```

**Expected Result:**
- Status: 400
- Error code: `INVALID_URL`
- Error message about missing youtube_url

---

### Test 7: Invalid YouTube URL Format (Error)

Test with an invalid URL that doesn't match YouTube patterns.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://vimeo.com/123456789"
  }'
```

**Expected Result:**
- Status: 400
- Error code: `INVALID_YOUTUBE_URL`
- Error message about invalid URL format

---

### Test 8: Invalid Course ID (Error)

Test with a course_id that doesn't exist or user doesn't own.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "00000000-0000-0000-0000-000000000000",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

**Expected Result:**
- Status: 404
- Error code: `COURSE_NOT_FOUND`
- Error message about course not found or access denied

---

### Test 9: Missing Authorization (Error)

Test without JWT token.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

**Expected Result:**
- Status: 401
- Error code: `UNAUTHORIZED`
- Error message about missing Authorization header

---

### Test 10: Invalid/Expired Token (Error)

Test with an invalid JWT token.

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

**Expected Result:**
- Status: 401
- Error code: `UNAUTHORIZED`
- Error message about invalid or expired token

---

## Verification Queries

After successful imports, verify the data in the database:

### Check Lesson Created

```sql
SELECT 
  id,
  title,
  source_type,
  status,
  course_id,
  created_at
FROM lessons
WHERE source_type = 'import'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Lesson Asset (YouTube URL)

```sql
SELECT 
  la.id,
  l.title as lesson_title,
  la.kind,
  la.storage_bucket,
  la.storage_path,
  la.mime_type,
  la.created_at
FROM lesson_assets la
JOIN lessons l ON l.id = la.lesson_id
WHERE la.kind = 'other'
  AND la.storage_bucket = 'external'
ORDER BY la.created_at DESC
LIMIT 5;
```

### Check AI-Generated Summary

```sql
SELECT 
  lo.id,
  l.title as lesson_title,
  lo.type,
  lo.status,
  lo.content_json->>'summary' as summary_preview,
  lo.content_json->>'language' as transcript_language,
  lo.content_json->>'video_id' as video_id,
  length(lo.content_json->>'transcript') as transcript_length,
  lo.created_at
FROM lesson_outputs lo
JOIN lessons l ON l.id = lo.lesson_id
WHERE lo.type = 'summary'
  AND l.source_type = 'import'
ORDER BY lo.created_at DESC
LIMIT 5;
```

### Full Lesson Details with Assets and Outputs

```sql
SELECT 
  l.id as lesson_id,
  l.title,
  l.source_type,
  l.status as lesson_status,
  l.created_at as lesson_created,
  
  -- Asset info
  la.storage_path as youtube_url,
  la.created_at as asset_created,
  
  -- Output info
  lo.type as output_type,
  lo.status as output_status,
  lo.content_json->>'video_id' as video_id,
  length(lo.content_json->>'transcript') as transcript_chars,
  length(lo.content_json->>'summary') as summary_chars,
  lo.created_at as output_created
  
FROM lessons l
LEFT JOIN lesson_assets la ON la.lesson_id = l.id AND la.kind = 'other'
LEFT JOIN lesson_outputs lo ON lo.lesson_id = l.id AND lo.type = 'summary'
WHERE l.source_type = 'import'
ORDER BY l.created_at DESC
LIMIT 10;
```

## Performance Testing

### Measure Response Time

```bash
time curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lesson_title": "Performance Test"
  }'
```

**Expected Response Time:**
- Without transcript: < 2 seconds
- With transcript: 3-5 seconds
- With transcript + summary: 5-10 seconds

### Concurrent Requests

Test with multiple concurrent imports:

```bash
for i in {1..5}; do
  curl -X POST \
    "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "course_id": "'"${COURSE_ID}"'",
      "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "lesson_title": "Concurrent Test '"$i"'"
    }' &
done
wait
```

## Edge Cases

### Very Long Video (1+ hour)

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    "lesson_title": "LoFi Hip Hop - Long Video Test"
  }'
```

**Notes:**
- Transcript may be very long (truncated for summary)
- Should still complete successfully

### Video Without Transcript

```bash
# Find a video without captions (music videos often don't have them)
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "YOUR_VIDEO_WITHOUT_TRANSCRIPT",
    "lesson_title": "No Transcript Test"
  }'
```

**Expected:**
- Still creates lesson
- Message indicates transcript not available
- No summary generated

## Cleanup

Remove test lessons after testing:

```sql
-- Delete test lessons (be careful with this!)
DELETE FROM lessons
WHERE title LIKE '%Test%'
  AND source_type = 'import'
  AND user_id = 'YOUR_USER_ID';
```

## Success Criteria

- ✅ All valid inputs create lessons successfully
- ✅ Invalid inputs return appropriate error codes
- ✅ Transcripts extracted when available
- ✅ AI summaries generated when transcripts exist
- ✅ Graceful handling when transcript unavailable
- ✅ Proper authentication and authorization
- ✅ Response times within acceptable range
- ✅ Data correctly stored in all tables
