# GitHub Cron Setup - Quick Guide

## ✅ Already Done

1. ✅ GitHub repository created: https://github.com/Yknld/video-artifacts
2. ✅ Repository initialized with videos/ directory
3. ✅ GitHub token set in Supabase secrets
4. ✅ Edge functions updated and deployed

## 🎯 Next: Set Up Automatic Polling

### Option 1: Manual Polling (For Testing - Do This First)

Run this script every few minutes while testing:

```bash
./poll_github_videos.sh
```

Or run directly:
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" | jq '.'
```

### Option 2: GitHub Actions (Recommended for Production)

Create `.github/workflows/poll-videos.yml` in your **main app repository**:

```yaml
name: Poll Videos from GitHub
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allows manual trigger

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

Then add the secret:
```bash
# Get your service role key
cd /Users/danielntumba/smrtr/study-os-mobile
supabase status --output json | jq -r '.service_role_key'

# Add to GitHub (replace with actual key)
gh secret set SUPABASE_SERVICE_ROLE_KEY -b "your-service-role-key"
```

### Option 3: cron-job.org (Easiest)

1. Go to https://cron-job.org/
2. Sign up for free
3. Create new cron job:
   - **URL**: `https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github`
   - **Schedule**: Every 5 minutes
   - **HTTP Method**: POST
   - **Headers**:
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`
4. Save and enable

## 🧪 Test the Complete Flow

### 1. Start Video Generation

From your mobile app:
- Tap "Video" card
- Badge should turn blue "GENERATING"

Or via curl:
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'
```

Response includes `github_url` - save this for later.

### 2. Wait for OpenHand (5-20 minutes)

Check the edge function logs:
1. Go to Supabase Dashboard
2. Edge Functions → lesson_generate_video
3. Logs tab
4. Look for "OpenHand conversation started"

### 3. Check GitHub Repo

After 5-20 minutes, check if video was uploaded:

```bash
# Via GitHub CLI
gh api /repos/Yknld/video-artifacts/contents/videos

# Or visit in browser
open https://github.com/Yknld/video-artifacts/tree/main/videos
```

You should see: `{lesson_id}_{video_id}.mp4`

### 4. Run Polling Script

```bash
./poll_github_videos.sh
```

Expected output:
```json
{
  "checked": 1,
  "found": 1,
  "processed": 1,
  "failed": 0,
  "timestamp": "2026-01-28T..."
}
```

### 5. Verify in Mobile App

The badge should automatically turn green "GENERATED" (via Realtime subscription)

Or refresh the screen manually.

## 📊 Monitoring

### Check Pending Videos

```sql
SELECT id, lesson_id, created_at
FROM lesson_assets
WHERE kind = 'video' AND storage_path IS NULL
ORDER BY created_at DESC;
```

### Check Completed Videos

```sql
SELECT id, lesson_id, storage_path, created_at
FROM lesson_assets  
WHERE kind = 'video' AND storage_path IS NOT NULL
ORDER BY created_at DESC;
```

### Check Polling Logs

1. Supabase Dashboard
2. Edge Functions → video_poll_github
3. Logs tab

Look for:
- "Found X videos in generating state"
- "✓ Found video at: ..."
- "✓ Video {id} successfully processed"

## 🔧 Troubleshooting

### Video Not in GitHub

**Check OpenHand logs:**
- Edge Functions → lesson_generate_video → Logs
- Look for conversation_id
- Check if OpenHand completed successfully

### Polling Not Finding Video

**Test GitHub URL directly:**
```bash
# Replace with your actual IDs
curl -I "https://raw.githubusercontent.com/Yknld/video-artifacts/main/videos/34b9a0c7_6f3e7386.mp4"
```

Should return `200 OK` if video exists.

### Video Found But Not Uploading

**Check storage:**
1. Supabase Dashboard → Storage → lesson-assets
2. Verify MIME types include `video/mp4`
3. Check RLS policies allow service role uploads

## ✅ Summary

**Current Status:**
- ✅ GitHub repo ready: https://github.com/Yknld/video-artifacts
- ✅ Token configured
- ✅ Functions deployed
- ⏳ Need to set up cron (use manual script for now)

**To Generate a Video:**
1. Tap "Video" card in app (badge turns blue)
2. Wait 5-20 minutes for OpenHand
3. Run `./poll_github_videos.sh` every few minutes
4. Badge turns green when complete

**Expected Timeline:**
- Video generation: 5-20 minutes
- Polling (manual): Check every 2-5 minutes
- Total: 5-25 minutes

Ready to test! 🎉
