# ✅ Smart Video Polling - COMPLETE

## How It Works Now (Much Smarter!)

Instead of blindly checking GitHub every 5 minutes, the polling system now:

1. **Checks OpenHand** conversation status first
2. Only polls GitHub when the conversation is **complete**
3. Polls **more frequently** (30-60 seconds) without wasting resources

```
┌────────────────────────────────────────┐
│         Smart Polling Flow             │
└────────────────────────────────────────┘

Every 30-60 seconds:
  ↓
1. Query: Videos with storage_path = null
   ↓
2. For each video:
   → Check OpenHand conversation status
   ↓
3. If status = "in_progress":
   → Skip to next video
   ↓
4. If status = "completed":
   → Check GitHub for video
   → Download if found
   → Upload to Supabase
   → Update database
   ↓
5. If status = "failed":
   → Mark as failed in database
```

## Why This Is Better

### Before (Dumb Polling)
- ❌ Polled GitHub every 5 minutes regardless of status
- ❌ Wasted API calls checking for videos that aren't ready
- ❌ Slower: Had to wait up to 5 minutes after video was ready
- ❌ No feedback on generation progress

### Now (Smart Polling)
- ✅ Checks OpenHand status first (cheap API call)
- ✅ Only checks GitHub when conversation is complete
- ✅ Faster: Can poll every 30-60 seconds safely
- ✅ Better feedback: Knows if still generating, complete, or failed

## 🧪 Testing

### Manual Polling (For Testing)

Run this script whenever you want:

```bash
./poll_github_videos.sh
```

**Output:**
```
🔍 Checking OpenHand conversations for completed videos...

{
  "checked": 1,
  "stillGenerating": 1,
  "found": 0,
  "processed": 0,
  "failed": 0,
  "timestamp": "2026-01-28T..."
}

📊 Summary:
  - Videos checked: 1
  - Still generating: 1
  - Videos completed & found: 0
  - Successfully processed: 0
  - Failed: 0

⏳ 1 video(s) still generating. Check again in 30-60 seconds.
```

### Watch Mode (Continuous Polling)

For testing, you can run this to poll every 30 seconds:

```bash
# Create a watch script
cat > watch_videos.sh << 'EOF'
#!/bin/bash
echo "🔄 Watching for completed videos (polls every 30 seconds)"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  ./poll_github_videos.sh
  echo ""
  echo "Waiting 30 seconds..."
  sleep 30
done
EOF

chmod +x watch_videos.sh
./watch_videos.sh
```

## 🔄 Automation (Production)

For production, set up a cron job that runs every 30-60 seconds.

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/poll-videos.yml` in your **main app repository**:

```yaml
name: Smart Video Polling
on:
  schedule:
    # Every minute (adjust as needed)
    - cron: '* * * * *'
  workflow_dispatch:

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Poll for completed videos
        run: |
          curl -X POST \
            "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

**Setup:**
```bash
# Get your service role key
cd /Users/danielntumba/smrtr/study-os-mobile
supabase status --output json | jq -r '.service_role_key'

# Add to GitHub secrets
gh secret set SUPABASE_SERVICE_ROLE_KEY -b "your-service-role-key"
```

### Option 2: cron-job.org (Easiest)

1. Go to https://cron-job.org/
2. Create account (free)
3. Create new cron job:
   - **URL**: `https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github`
   - **Schedule**: Every 1 minute
   - **HTTP Method**: POST
   - **Headers**:
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`
4. Save and enable

### Option 3: Your Server

Add to crontab (runs every minute):

```bash
* * * * * cd /path/to/study-os-mobile && ./poll_github_videos.sh >> /tmp/video-polling.log 2>&1
```

## 📊 Monitoring

### Check What's Generating

```sql
SELECT 
  id, 
  lesson_id, 
  conversation_id,
  created_at,
  metadata->>'github_path' as github_path
FROM lesson_assets
WHERE kind = 'video' 
  AND storage_path IS NULL
  AND conversation_id IS NOT NULL
ORDER BY created_at DESC;
```

### Check OpenHand Status Manually

```bash
# Replace with your conversation ID
CONVERSATION_ID="your-conversation-id"
OPENHAND_API_KEY="your-api-key"

curl -s "https://app.all-hands.dev/api/conversations/$CONVERSATION_ID" \
  -H "Authorization: Bearer $OPENHAND_API_KEY" | jq '.status'
```

### View Polling Logs

1. Supabase Dashboard: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/functions
2. Click `video_poll_github`
3. Logs tab

Look for:
- "OpenHand status: in_progress" (still generating)
- "✓ Conversation complete!" (ready to download)
- "✓ Video {id} successfully processed" (done!)

## 🎯 Complete Flow Test

### 1. Start Video Generation

From mobile app (after rebuild):
- Tap "Video" card
- Badge turns blue "GENERATING"

Or via curl:
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'
```

### 2. Poll While Generating

```bash
./poll_github_videos.sh
```

Expected output:
```
⏳ 1 video(s) still generating. Check again in 30-60 seconds.
```

### 3. Wait for Completion (5-20 minutes)

Keep running the poll script every 30-60 seconds.

### 4. When Complete

Output will change to:
```
✅ 1 video(s) ready! Check your app.
```

### 5. Verify in App

Badge should automatically turn green "GENERATED" (via Realtime subscription).

## ⏱️ Timeline

| Phase | Duration | Status Message |
|-------|----------|----------------|
| Video generation | 5-20 min | "still generating" |
| GitHub upload | 10-30 sec | (automatic) |
| Polling finds it | 0-60 sec | "completed & found" |
| Download + upload | 10-30 sec | "successfully processed" |
| Badge update | Instant | Green badge |
| **Total** | **5-22 min** | End to end |

## 🔧 Configuration

### Poll Frequency

The polling can run **much more frequently** now because:
- OpenHand status check is lightweight (just a status query)
- GitHub is only checked when conversation is complete
- No wasted bandwidth

**Recommended:**
- Development: Every 30 seconds (manual script)
- Production: Every 60 seconds (cron job)

### Environment Variables Required

Make sure these are set in Supabase:

```bash
supabase secrets list
```

Should show:
- ✅ `OPENHAND_API_KEY` (required for polling)
- ✅ `GITHUB_TOKEN` (required for GitHub access)
- ✅ `GEMINI_API_KEY` (for video generation)
- ✅ `REQUIRE_AUTH=false` (for testing without JWT)
- ✅ `DEFAULT_USER_ID` (fallback user ID)

## 🐛 Troubleshooting

### "OPENHAND_API_KEY not configured"

```bash
supabase secrets set OPENHAND_API_KEY=your-api-key
supabase functions deploy video_poll_github --no-verify-jwt
```

### "Still generating" for a long time

1. Check OpenHand conversation manually:
   ```bash
   curl "https://app.all-hands.dev/api/conversations/YOUR_CONVERSATION_ID" \
     -H "Authorization: Bearer $OPENHAND_API_KEY" | jq '.'
   ```

2. Check the lesson_generate_video logs in Supabase Dashboard

### "Conversation complete but video not in GitHub"

This means OpenHand finished but didn't successfully upload to GitHub.

Check:
1. GitHub repo: https://github.com/Yknld/video-artifacts/tree/main/videos
2. OpenHand logs (might have failed at upload step)
3. GITHUB_TOKEN is correct

### Badge not turning green

1. Mobile app needs rebuild: `npm run ios`
2. Or manually refresh by pulling down on screen
3. Check Realtime is working (should auto-update)

## ✅ Summary

**What Changed:**
- ✅ Polling now checks OpenHand status first
- ✅ Only checks GitHub when conversation is complete
- ✅ Can poll every 30-60 seconds safely
- ✅ Much more efficient and responsive

**What You Need to Do:**
1. Run `./poll_github_videos.sh` manually while testing
2. Set up automated cron for production (see options above)
3. Optional: Run `./watch_videos.sh` for continuous monitoring

**Expected Behavior:**
- Tap Video → Badge blue
- Poll shows "still generating" for 5-20 minutes
- Poll shows "completed & found" when ready
- Badge turns green automatically
- Video appears in app

Ready to test! 🚀
