# Testing lesson_generate_video

## Quick Test

Use the provided test script:

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/supabase/functions/lesson_generate_video
./test.sh [email] [password] [lesson_id]
```

**Example:**
```bash
./test.sh user1@test.com password123
```

The script will:
1. Authenticate and get a JWT token
2. Find your first lesson (or use provided lesson_id)
3. Call the video generation function
4. Show you the response

## Manual Testing

### Step 1: Get a JWT Token

**Option A: Use the get-token script**
```bash
cd /Users/danielntumba/smrtr/study-os-mobile/backend/tests
node get-token.js your-email@example.com your-password
```

**Option B: From your app**
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('JWT:', session.access_token);
```

### Step 2: Get a Lesson ID

Query your lessons:
```sql
SELECT id, title FROM lessons 
WHERE user_id = 'your-user-id' 
LIMIT 1;
```

Or use the Supabase REST API:
```bash
curl "https://euxfugfzmpsemkjpcpuz.supabase.co/rest/v1/lessons?user_id=eq.YOUR_USER_ID&select=id,title&limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 3: Call the Function

```bash
curl -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Authorization: Bearer YOUR_REAL_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "lesson_id": "your-real-lesson-id",
    "aspect_ratios": ["16:9"]
  }'
```

## Expected Response

**Success (200):**
```json
{
  "lesson_id": "uuid",
  "video_id": "uuid",
  "status": "generating",
  "conversation_id": "string"
}
```

**Errors:**
- `401`: Invalid or expired session (need real JWT)
- `404`: Lesson not found or unauthorized
- `500`: Missing API keys or configuration error

## What Happens Next

1. **Immediate Response**: Function returns with `status: "generating"`
2. **Background Processing**: 
   - Gemini generates story plan (30-60 seconds)
   - OpenHand generates video (5-20 minutes)
   - Video is downloaded and uploaded to storage
3. **Check Status**: Poll the `lesson_assets` table:
   ```sql
   SELECT * FROM lesson_assets 
   WHERE id = '<video_id>' AND kind = 'video';
   ```
4. **When Ready**: `storage_path` will be populated and `mime_type = 'video/mp4'`

## Troubleshooting

### "Invalid or expired session"
- You need a real JWT token from a logged-in user
- Token expires after 1 hour
- Get a new token using the get-token script

### "Lesson not found or unauthorized"
- Lesson must belong to the authenticated user
- Check `user_id` matches the JWT token's user

### "OPENHAND_API_KEY not configured"
```bash
cd /Users/danielntumba/smrtr/study-os-mobile
supabase secrets set OPENHAND_API_KEY=your_key
```

### "GEMINI_API_KEY not configured"
```bash
supabase secrets set GEMINI_API_KEY=your_key
```

### Video not appearing after 20 minutes
- Check function logs in Supabase Dashboard
- Background processing may have failed
- Check if OpenHand conversation completed
- Verify storage bucket allows `video/mp4` MIME type

## Monitoring

**View function logs:**
- Supabase Dashboard > Edge Functions > lesson_generate_video > Logs

**Check video status:**
```sql
SELECT 
  id,
  lesson_id,
  kind,
  storage_path,
  mime_type,
  duration_ms,
  created_at
FROM lesson_assets
WHERE kind = 'video'
ORDER BY created_at DESC
LIMIT 10;
```
