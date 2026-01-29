# ✅ Smart Video Polling - READY TO TEST

## What's Fixed

1. ✅ **Template variable bug** - Fixed "LESSON_ID is not defined" error
2. ✅ **Script path** - Added wrapper script at root (`./poll_videos.sh`)
3. ✅ **Smart polling** - Checks OpenHand status before GitHub
4. ✅ **Faster polling** - Can run every 30-60 seconds safely

## ⚠️ IMPORTANT: Apply Migration First!

The polling needs new database columns. Run this once:

1. **Open SQL Editor**: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql/new

2. **Copy & paste** this SQL:
   ```sql
   -- Make storage_path nullable
   ALTER TABLE lesson_assets 
   ALTER COLUMN storage_path DROP NOT NULL;

   -- Add conversation_id column
   ALTER TABLE lesson_assets
   ADD COLUMN IF NOT EXISTS conversation_id text NULL;

   -- Add metadata column
   ALTER TABLE lesson_assets
   ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

   -- Verify
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'lesson_assets'
     AND column_name IN ('conversation_id', 'metadata', 'storage_path')
   ORDER BY column_name;
   ```

3. **Click "Run"**

## Test Flow

### From Root Directory

```bash
cd /Users/danielntumba/smrtr

# 1. Start video generation
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'

# Response includes conversation_id (for tracking)

# 2. Poll to check status
./poll_videos.sh

# 3. Watch continuously (every 30 seconds)
while true; do ./poll_videos.sh; echo "---"; sleep 30; done
```

### Expected Output

**When generating:**
```
⏳ 1 video(s) still generating. Check again in 30-60 seconds.
```

**When complete:**
```
✅ 1 video(s) ready! Check your app.
```

## How It Works

```
1. User taps "Video" or calls API
   ↓
2. Edge function starts OpenHand
   Returns: conversation_id, status: "generating"
   ↓
3. Poll every 30-60 seconds:
   → Check OpenHand: "in_progress"? Skip GitHub
   → Check OpenHand: "completed"? Check GitHub
   → Download from GitHub
   → Upload to Supabase
   ↓
4. Database updated (storage_path set)
   ↓
5. Badge turns green automatically (Realtime)
```

## Timeline

- **Generation**: 5-20 minutes (OpenHand + Remotion)
- **GitHub upload**: Automatic (10-30 seconds)
- **Polling finds it**: 0-30 seconds (next poll after completion)
- **Total**: 5-21 minutes

## Test Result

Just tested successfully:
```json
{
  "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c",
  "video_id": "e887a8ce-ac7c-4f05-ba71-0f269684651f",
  "status": "generating",
  "conversation_id": "c676ebf95e304d059a99035ab6f734d2",
  "github_path": "videos/34b9a0c7-62d7-4002-a642-00488b2c7f7c_e887a8ce-ac7c-4f05-ba71-0f269684651f.mp4"
}
```

## Monitoring

### Check edge function logs
https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/functions

Look for:
- **lesson_generate_video** - Generation started
- **video_poll_github** - Polling status checks

### Check database
```sql
SELECT id, lesson_id, conversation_id, storage_path, created_at
FROM lesson_assets
WHERE kind = 'video'
ORDER BY created_at DESC
LIMIT 5;
```

## Next Steps

1. **Apply migration** (see SQL above)
2. **Test generation** (curl command above)
3. **Watch polling** (`./poll_videos.sh`)
4. **Set up cron** for production (see `SMART_POLLING_SETUP.md`)

Ready to go! 🚀
