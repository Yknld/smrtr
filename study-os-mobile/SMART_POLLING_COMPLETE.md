# ✅ Smart Video Polling - READY

## What Changed

Instead of polling GitHub every 5 minutes (wasteful), the system now:

1. **Checks OpenHand status first** (lightweight API call)
2. **Only polls GitHub when conversation is complete** (efficient)
3. **Can run every 30-60 seconds** (fast and responsive)

## Before vs After

### Old Way (Dumb)
```
Every 5 minutes:
  → Check GitHub (video not there yet)
  → Check GitHub (video not there yet)
  → Check GitHub (video not there yet)
  → Finally finds video ✓
Total: Up to 5 minute delay after video ready
```

### New Way (Smart)
```
Every 30 seconds:
  → Check OpenHand: "in_progress" (skip GitHub)
  → Check OpenHand: "in_progress" (skip GitHub)
  → Check OpenHand: "completed!" (now check GitHub)
  → Download from GitHub ✓
Total: 0-30 second delay after video ready
```

## 🚨 IMPORTANT: Run Migration First

The system needs two new columns. **You must apply this SQL first**:

👉 **See [`APPLY_MIGRATION_NOW.md`](./APPLY_MIGRATION_NOW.md) for instructions**

Or quickly:
1. Open: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql/new
2. Paste contents of `apply_migration_018.sql`
3. Click "Run"

## How to Use

### Testing (Manual Polling)

```bash
# Run whenever you want to check
./poll_github_videos.sh
```

**Output when no videos:**
```
✨ No pending videos.
```

**Output when generating:**
```
⏳ 1 video(s) still generating. Check again in 30-60 seconds.
```

**Output when complete:**
```
✅ 1 video(s) ready! Check your app.
```

### Continuous Watching (Testing)

```bash
# Polls every 30 seconds automatically
while true; do
  ./poll_github_videos.sh
  echo "---"
  sleep 30
done
```

### Production (Set Up Cron)

See [`SMART_POLLING_SETUP.md`](./SMART_POLLING_SETUP.md) for options:
- GitHub Actions (free, reliable)
- cron-job.org (easiest)
- Your own server

## Complete Test Flow

### 1. Apply Migration
```bash
# See APPLY_MIGRATION_NOW.md
```

### 2. Start Video Generation
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'
```

Response includes:
- `video_id`
- `conversation_id` ← **New! Used for polling**
- `github_path`
- `status: "generating"`

### 3. Watch Progress
```bash
# In terminal 1: Watch logs
watch -n 2 'supabase functions logs video_poll_github --limit 5'

# In terminal 2: Poll every 30 seconds
while true; do ./poll_github_videos.sh; echo "---"; sleep 30; done
```

### 4. Observe Stages

**Minutes 0-5:**
```
OpenHand status: in_progress
⏳ still generating
```

**Minutes 5-20:**
```
OpenHand status: in_progress
⏳ still generating
```

**When complete:**
```
OpenHand status: completed
✓ Found video at: videos/lesson_video.mp4
✓ Uploading to storage...
✓ Video successfully processed
✅ ready!
```

### 5. Verify in Database

```sql
SELECT 
  id,
  kind,
  storage_path,
  conversation_id,
  metadata->>'github_path' as github_path,
  created_at
FROM lesson_assets
WHERE kind = 'video'
ORDER BY created_at DESC
LIMIT 5;
```

### 6. Check in Mobile App

Badge should automatically turn green "GENERATED" (via Realtime).

## Monitoring

### Check Polling Logs

Supabase Dashboard → Functions → video_poll_github → Logs

Look for:
- `"Found X videos in generating state"`
- `"OpenHand status: in_progress"` (still working)
- `"✓ Conversation complete!"` (ready!)
- `"✓ Video {id} successfully processed"` (done!)

### Check What's Generating

```sql
SELECT 
  id,
  lesson_id,
  conversation_id,
  created_at
FROM lesson_assets
WHERE kind = 'video' 
  AND storage_path IS NULL
  AND conversation_id IS NOT NULL;
```

### Check OpenHand Manually

```bash
CONVERSATION_ID="your-conversation-id"
OPENHAND_API_KEY="your-api-key"

curl -s "https://app.all-hands.dev/api/conversations/$CONVERSATION_ID" \
  -H "Authorization: Bearer $OPENHAND_API_KEY" | jq '.status'
```

## Timeline

| Phase | Duration | Polling Shows |
|-------|----------|---------------|
| OpenHand generating | 5-20 min | "still generating" |
| GitHub upload | 10-30 sec | (automatic) |
| Polling finds it | 0-30 sec | "completed & found" |
| Download + upload | 10-30 sec | "successfully processed" |
| Badge update | Instant | Green "GENERATED" |
| **Total** | **5-21 min** | End to end |

## Environment Variables

Make sure these are set:

```bash
supabase secrets list
```

Required:
- ✅ `OPENHAND_API_KEY` - For checking conversation status
- ✅ `GITHUB_TOKEN` - For downloading from GitHub
- ✅ `GEMINI_API_KEY` - For video generation

Optional (for testing):
- `REQUIRE_AUTH=false` - Skip JWT validation
- `DEFAULT_USER_ID` - Fallback user ID

## Files Created

- ✅ `poll_github_videos.sh` - Manual polling script
- ✅ `apply_migration_018.sql` - Database migration
- ✅ `APPLY_MIGRATION_NOW.md` - Migration instructions
- ✅ `SMART_POLLING_SETUP.md` - Complete setup guide
- ✅ `SMART_POLLING_COMPLETE.md` - This file

## What's Better Now

### Efficiency
- **Before**: Wasted GitHub API calls checking for videos that aren't ready
- **After**: Only checks GitHub when OpenHand confirms completion

### Speed
- **Before**: Up to 5 minute delay after video ready
- **After**: 0-30 second delay (can poll every 30 seconds safely)

### Visibility
- **Before**: No idea if still generating or failed
- **After**: Clear status: "still generating", "completed", or "failed"

### Cost
- **Before**: Many wasted GitHub API calls
- **After**: Minimal API usage, only when needed

## Next Steps

1. **Apply migration** (see `APPLY_MIGRATION_NOW.md`)
2. **Test generation** (curl command above)
3. **Watch polling** (`./poll_github_videos.sh`)
4. **Set up cron** for production (see `SMART_POLLING_SETUP.md`)

Ready to go! 🚀
