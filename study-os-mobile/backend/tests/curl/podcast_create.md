# Manual Testing with curl: podcast_create

Quick reference for testing `podcast_create` Edge Function with curl.

## Setup

### 1. Get a User Token

```bash
cd backend/tests
node get-token.js user1@test.com password123
```

Copy the access token from the output.

### 2. Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export LESSON_ID="your-lesson-uuid-here"
```

To get a lesson ID for testing:

```sql
-- Run in Supabase SQL Editor
SELECT id, title FROM lessons WHERE user_id = auth.uid() LIMIT 5;
```

## Test Cases

### Test 1: Create Podcast with Defaults

Create a podcast episode using default language and voices.

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\"
  }"
```

**Expected Response (201):**
```json
{
  "episode_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

**Expected Fields:**
- `episode_id`: UUID of the created podcast episode
- `status`: Should be `"queued"`

### Test 2: Create Podcast with Custom Options

Create a podcast with custom language and voice settings.

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"language\": \"es\",
    \"voice_a_id\": \"spanish_voice_1\",
    \"voice_b_id\": \"spanish_voice_2\"
  }"
```

**Expected Response (201):**
```json
{
  "episode_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "queued"
}
```

### Test 3: Create Podcast for Same Lesson (Idempotent)

Try creating another podcast for the same lesson. Should return existing episode.

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\"
  }"
```

**Expected Response (200):**
```json
{
  "episode_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Episode already exists for this lesson"
}
```

**Note:** Returns the existing episode_id (same as Test 1), not a new one.

### Test 4: Error - Missing Authorization

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\"
  }"
```

**Expected Response (401):**
```json
{
  "error": "Missing authorization header"
}
```

### Test 5: Error - Invalid/Expired Token

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\"
  }"
```

**Expected Response (401):**
```json
{
  "error": "Invalid or expired session. Please sign in again."
}
```

### Test 6: Error - Missing lesson_id

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (400):**
```json
{
  "error": "lesson_id is required"
}
```

### Test 7: Error - Lesson Not Found

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "00000000-0000-0000-0000-000000000000"
  }'
```

**Expected Response (404):**
```json
{
  "error": "Lesson not found or unauthorized",
  "error_code": "LESSON_NOT_FOUND"
}
```

### Test 8: Error - Lesson Belongs to Another User

```bash
# Get token for user2
node get-token.js user2@test.com password123
export USER2_TOKEN="<user2-token>"

# Try to create podcast for user1's lesson
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\"
  }"
```

**Expected Response (404):**
```json
{
  "error": "Lesson not found or unauthorized",
  "error_code": "LESSON_NOT_FOUND"
}
```

**Note:** RLS policies prevent accessing another user's lesson.

## Verify in Database

After running tests, check the database:

```sql
-- View all podcast episodes for the authenticated user
SELECT 
  pe.id,
  pe.lesson_id,
  l.title as lesson_title,
  pe.status,
  pe.language,
  pe.voice_a_id,
  pe.voice_b_id,
  pe.total_segments,
  pe.created_at
FROM podcast_episodes pe
JOIN lessons l ON l.id = pe.lesson_id
WHERE pe.user_id = auth.uid()
ORDER BY pe.created_at DESC;
```

**Expected:**
- Episode from Test 1 with default values (language='en', voice_a_id='gemini_voice_a', voice_b_id='gemini_voice_b')
- Episode from Test 2 with custom values (language='es', custom voice IDs)
- Test 3 did not create a new episode (same episode_id as Test 1)

## Check Episode Details

Get details for a specific episode:

```bash
export EPISODE_ID="<episode-id-from-test-1>"

curl -X GET "$SUPABASE_URL/rest/v1/podcast_episodes?id=eq.$EPISODE_ID&select=*" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "apikey: <your-anon-key>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7f3c4a89-1234-5678-9abc-def012345678",
    "lesson_id": "abc-123-def",
    "status": "queued",
    "title": "Introduction to Biology",
    "language": "en",
    "voice_a_id": "gemini_voice_a",
    "voice_b_id": "gemini_voice_b",
    "total_segments": 0,
    "error": null,
    "created_at": "2026-01-11T07:30:00.000Z",
    "updated_at": "2026-01-11T07:30:00.000Z"
  }
]
```

## Cleanup

Delete test podcast episodes:

```sql
-- Delete specific episode
DELETE FROM podcast_episodes
WHERE id = '<episode-id-from-test>';

-- Or delete all episodes for a lesson
DELETE FROM podcast_episodes
WHERE lesson_id = '<lesson-id>';

-- Note: This will cascade delete all podcast_segments
```

## Next Steps

After creating a podcast episode:
1. The episode status will be `'queued'`
2. A background job (not yet implemented) will:
   - Change status to `'scripting'`
   - Generate dialogue script using AI
   - Create `podcast_segments` rows
   - Change status to `'voicing'`
   - Generate TTS audio for each segment
   - Upload audio to storage
   - Change status to `'ready'`
3. Mobile client can then fetch and play the episode

## Troubleshooting

### "Lesson not found or unauthorized"
- Verify the lesson ID exists: `SELECT id, title FROM lessons WHERE id = '<lesson-id>';`
- Verify the lesson belongs to the authenticated user
- Check RLS policies are enabled

### "Failed to create podcast episode"
- Check Supabase logs for detailed error message
- Verify `podcast_episodes` table exists
- Verify RLS policies allow INSERT for authenticated users

### Episode already exists
- This is expected behavior (idempotent)
- To create a new episode, delete the existing one first
- Or implement episode regeneration logic in the future
