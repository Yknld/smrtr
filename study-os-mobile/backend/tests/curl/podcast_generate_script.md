# Manual Testing with curl: podcast_generate_script

Quick reference for testing `podcast_generate_script` Edge Function with curl.

## Prerequisites

1. **Create a podcast episode first** using `podcast_create`
2. **Have a lesson with content** (summary or transcript)
3. **Get user token and episode ID**

## Setup

### 1. Get a User Token

```bash
cd backend/tests
node get-token.js user1@test.com password123
```

Copy the access token from the output.

### 2. Set Environment Variables

```bash
export SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
export USER_TOKEN="<paste-token-here>"
```

### 3. Create an Episode (if needed)

```bash
# Get a lesson ID first
export LESSON_ID="<your-lesson-id>"

# Create episode
curl -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"$LESSON_ID\"}"

# Response will include episode_id
export EPISODE_ID="<paste-episode-id-here>"
```

## Test Cases

### Test 1: Generate Script with Defaults

Generate a podcast script with default settings (8 min, direct_review style).

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\"
  }"
```

**Expected Response (200):**
```json
{
  "episode_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Understanding Variables and Data Types",
  "total_segments": 64
}
```

**Expected Fields:**
- `episode_id`: UUID of the episode
- `title`: Generated podcast title from content
- `total_segments`: Number of dialogue turns created (typically 40-80 for 8 min)

### Test 2: Generate Longer Script

Generate a 12-minute podcast.

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\",
    \"duration_min\": 12
  }"
```

**Expected Response (200):**
```json
{
  "episode_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Deep Dive: Variables and Data Types",
  "total_segments": 96
}
```

**Note:** More segments (~96-120) for longer duration.

### Test 3: Generate with Friendly Style

Use a more conversational, friendly tone.

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\",
    \"style\": \"friendly\"
  }"
```

**Expected Response (200):**
```json
{
  "episode_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Let's Talk Variables!",
  "total_segments": 64
}
```

### Test 4: Generate with Exam Focus

Create an exam-prep focused script.

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\",
    \"style\": \"exam\",
    \"duration_min\": 10
  }"
```

**Expected Response (200):**
```json
{
  "episode_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Exam Prep: Variables and Data Types",
  "total_segments": 80
}
```

### Test 5: Error - Missing Authorization

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\"
  }"
```

**Expected Response (401):**
```json
{
  "error": "Missing authorization header"
}
```

### Test 6: Error - Invalid/Expired Token

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\"
  }"
```

**Expected Response (401):**
```json
{
  "error": "Invalid or expired session. Please sign in again."
}
```

### Test 7: Error - Missing episode_id

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (400):**
```json
{
  "error": "episode_id is required"
}
```

### Test 8: Error - Episode Not Found

```bash
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "episode_id": "00000000-0000-0000-0000-000000000000"
  }'
```

**Expected Response (404):**
```json
{
  "error": "Episode not found or unauthorized"
}
```

### Test 9: Error - Episode Belongs to Another User

```bash
# Get token for user2
node get-token.js user2@test.com password456
export USER2_TOKEN="<user2-token>"

# Try to generate script for user1's episode
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\"
  }"
```

**Expected Response (404):**
```json
{
  "error": "Episode not found or unauthorized"
}
```

**Note:** RLS policies prevent accessing another user's episode.

## Verify in Database

After running tests, check the database to verify segments were created correctly.

### Check Episode Status

```sql
-- View episode details
SELECT 
  id,
  lesson_id,
  status,
  title,
  total_segments,
  created_at,
  updated_at
FROM podcast_episodes
WHERE id = '<episode-id>';
```

**Expected:**
- `status`: 'voicing' (ready for TTS generation)
- `title`: Populated with generated title
- `total_segments`: Matches response (e.g., 64)
- `updated_at`: Recently updated

### Verify Segments Inserted in Order

```sql
-- Sanity check: segments in correct sequence
SELECT 
  seq,
  speaker,
  LEFT(text, 60) || '...' as text_preview,
  tts_status
FROM podcast_segments
WHERE episode_id = '<episode-id>'
ORDER BY seq;
```

**Expected:**
- `seq`: Increments from 1, 2, 3, ... (no gaps)
- `speaker`: Alternates between 'a' and 'b' (mostly)
- `text`: Short dialogue turns (1-3 sentences each)
- `tts_status`: All 'queued'

### Count Segments

```sql
-- Verify segment count matches episode.total_segments
SELECT 
  COUNT(*) as actual_segments,
  (SELECT total_segments FROM podcast_episodes WHERE id = '<episode-id>') as reported_segments
FROM podcast_segments
WHERE episode_id = '<episode-id>';
```

**Expected:**
- `actual_segments` should equal `reported_segments`

### Check for Duplicate Sequences

```sql
-- Ensure no duplicate seq values (should return 0 rows)
SELECT seq, COUNT(*) as count
FROM podcast_segments
WHERE episode_id = '<episode-id>'
GROUP BY seq
HAVING COUNT(*) > 1;
```

**Expected:**
- Zero rows (no duplicates)

### View First and Last Segments

```sql
-- Check opening and closing segments
(
  SELECT seq, speaker, text
  FROM podcast_segments
  WHERE episode_id = '<episode-id>'
  ORDER BY seq ASC
  LIMIT 3
)
UNION ALL
(
  SELECT seq, speaker, text
  FROM podcast_segments
  WHERE episode_id = '<episode-id>'
  ORDER BY seq DESC
  LIMIT 3
);
```

**Expected Opening:**
- Brief intro (1-2 turns)
- Gets into content quickly
- No long "Welcome to the podcast" fluff

**Expected Closing:**
- Clean wrap-up
- Encouraging final line ("Let's get back to it!" style)

## Performance Notes

**Expected Duration:**
- Gemini API call: 5-15 seconds
- Database writes: < 1 second
- Total response time: 6-20 seconds

**For Testing:**
If you need faster iterations, use a lesson with a summary already generated:

```sql
-- Check if lesson has a summary
SELECT type, status
FROM lesson_outputs
WHERE lesson_id = '<lesson-id>'
  AND type = 'summary'
  AND status = 'ready';
```

If no summary exists, the function will fall back to transcripts or just the lesson title (which generates generic content).

## Cleanup

Delete test episodes and segments:

```sql
-- Delete specific episode (cascades to segments)
DELETE FROM podcast_episodes
WHERE id = '<episode-id>';

-- Or delete all episodes for a lesson
DELETE FROM podcast_episodes
WHERE lesson_id = '<lesson-id>';
```

## Next Steps

After script generation:
1. Episode status is now `'voicing'`
2. Segments are ready with `tts_status='queued'`
3. Next: Call `podcast_generate_audio` (Phase 3) to create actual audio files
4. Once all segments have `tts_status='ready'`, update episode to `status='ready'`

## Troubleshooting

### "Episode not found or unauthorized"
- Verify episode_id exists: `SELECT id FROM podcast_episodes WHERE id = '<id>';`
- Verify ownership: Episode must belong to authenticated user
- Check RLS policies are enabled

### "Failed to generate valid script"
- Gemini API returned invalid JSON
- Usually recoverable - just retry
- Check Supabase logs for details

### "Service configuration error"
- `GEMINI_API_KEY` not set in Edge Function secrets
- Contact admin to configure API key

### Segments not in expected order
- This shouldn't happen (seq increments from 1)
- If it does, run the duplicate check query above
- May indicate a race condition (very rare)

### Script is too generic
- Lesson may not have good source content
- Try generating a summary first: `lesson_generate_summary`
- Or add transcript segments from a live session

## Example Full Workflow

```bash
# 1. Get token
node get-token.js user1@test.com password123
export USER_TOKEN="..."

# 2. Get lesson ID (from database or app)
export LESSON_ID="abc-123-def"

# 3. Create episode
RESPONSE=$(curl -s -X POST $SUPABASE_URL/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"$LESSON_ID\"}")

export EPISODE_ID=$(echo $RESPONSE | jq -r '.episode_id')
echo "Created episode: $EPISODE_ID"

# 4. Generate script
curl -X POST $SUPABASE_URL/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\",
    \"duration_min\": 10,
    \"style\": \"direct_review\"
  }"

# 5. Verify in database
echo "Check segments: SELECT COUNT(*) FROM podcast_segments WHERE episode_id = '$EPISODE_ID';"
```
