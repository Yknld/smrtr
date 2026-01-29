# GitHub Video Storage Setup

## Quick Start

### 1. Create GitHub Repository

```bash
# Create new repo via GitHub CLI
gh repo create smrtr-ai/video-artifacts --public --description "Video artifacts from SMRTR video generation"

# Or via web: https://github.com/new
# Repository name: video-artifacts
# Public repository
```

### 2. Initialize Repository Structure

```bash
# Clone the repo
gh repo clone smrtr-ai/video-artifacts
cd video-artifacts

# Create directory structure
mkdir -p videos
cat > README.md << 'EOF'
# SMRTR Video Artifacts

This repository stores generated educational videos before they're uploaded to Supabase storage.

## Structure

```
videos/
  ├── {lesson_id}_{video_id}.mp4    # Video files
  └── {lesson_id}_{video_id}.json   # Metadata
```

## Process

1. OpenHand generates video
2. Uploads to this repo
3. Polling service downloads and uploads to Supabase
4. Video available in mobile app

## Cleanup

Videos can be deleted after successful upload to Supabase storage.
EOF

# Create .gitattributes for large files
cat > .gitattributes << 'EOF'
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
EOF

# Commit and push
git add .
git commit -m "Initial repository structure"
git push
```

### 3. Create GitHub Personal Access Token

```bash
# Via CLI
gh auth refresh -s write:packages,repo

# Or via web:
# 1. Go to: https://github.com/settings/tokens
# 2. Click "Generate new token (classic)"
# 3. Select scopes: `repo` (all)
# 4. Generate token
# 5. Copy token (starts with ghp_...)
```

### 4. Set Supabase Secrets

```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# Set GitHub token
supabase secrets set GITHUB_TOKEN=ghp_your_token_here

# Verify
supabase secrets list | grep GITHUB_TOKEN
```

### 5. Set Up Polling Cron Job

**Option A: GitHub Actions (Recommended)**

Create `.github/workflows/poll-videos.yml` in this repo:

```yaml
name: Poll Videos from GitHub
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Call polling endpoint
        run: |
          curl -X POST \
            "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

**Add secret to this repository:**
```bash
# In your main repo (study-os-mobile)
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"
```

**Option B: External Cron Service**

Use services like:
- cron-job.org
- EasyCron
- Render Cron Jobs

URL to hit:
```
https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github
```

Headers:
```
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
```

Frequency: Every 5 minutes

**Option C: Supabase pg_cron (Advanced)**

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule polling job
SELECT cron.schedule(
  'poll-github-videos',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  $$
);
```

### 6. Test the Full Flow

```bash
# 1. Trigger video generation
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'

# Response will include:
# {
#   "video_id": "...",
#   "github_path": "videos/{lesson_id}_{video_id}.mp4",
#   "github_url": "https://raw.githubusercontent.com/smrtr-ai/video-artifacts/main/..."
# }

# 2. Wait 5-20 minutes for OpenHand to generate video

# 3. Check GitHub repo
gh repo view smrtr-ai/video-artifacts --web
# Or check directly:
# https://github.com/smrtr-ai/video-artifacts/tree/main/videos

# 4. Manual poll (or wait for cron)
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"

# Response:
# {
#   "checked": 1,
#   "found": 1,
#   "processed": 1,
#   "failed": 0
# }

# 5. Verify video in Supabase
# Check database: storage_path should be populated
# Check storage: File should exist in lesson-assets bucket
```

## Architecture

```
┌─────────────┐
│ Edge Func   │
│ Generate    │
└──────┬──────┘
       │ 1. Calls OpenHand
       ▼
┌─────────────┐
│  OpenHand   │
│  (Remote)   │
└──────┬──────┘
       │ 2. Generates video
       │ 3. Pushes to GitHub
       ▼
┌─────────────┐
│   GitHub    │
│video-       │
│artifacts    │
└──────┬──────┘
       │ 4. Stores video
       ▼
┌─────────────┐
│ Cron Job    │
│ (5 min)     │
└──────┬──────┘
       │ 5. Triggers polling
       ▼
┌─────────────┐
│ Edge Func   │
│ Poll GitHub │
└──────┬──────┘
       │ 6. Downloads video
       │ 7. Uploads to Supabase
       ▼
┌─────────────┐
│  Supabase   │
│  Storage    │
└──────┬──────┘
       │ 8. Updates DB
       ▼
┌─────────────┐
│ Mobile App  │
│ (Realtime)  │
└─────────────┘
       9. Shows "Generated"
```

## Monitoring

### Check Polling Status

```bash
# Call polling endpoint manually
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

### Check Edge Function Logs

1. Go to Supabase Dashboard
2. Edge Functions → `video_poll_github`
3. Logs tab
4. Look for:
   - "Found X videos in generating state"
   - "✓ Video {id} successfully processed"

### Check GitHub Repository

```bash
# List videos in repo
gh api /repos/smrtr-ai/video-artifacts/contents/videos \
  | jq '.[] | select(.name | endswith(".mp4")) | {name, size, url}'
```

### Check Database

```sql
-- Pending videos
SELECT id, lesson_id, created_at
FROM lesson_assets
WHERE kind = 'video' AND storage_path IS NULL
ORDER BY created_at DESC;

-- Completed videos
SELECT id, lesson_id, storage_path, created_at
FROM lesson_assets
WHERE kind = 'video' AND storage_path IS NOT NULL
ORDER BY created_at DESC;
```

## Troubleshooting

### Video Not Appearing in GitHub

**Check OpenHand logs:**
- Go to Supabase Dashboard → Edge Functions → lesson_generate_video → Logs
- Look for "OpenHand conversation started"
- Check conversation_id in response

**Possible issues:**
- GITHUB_TOKEN not set in OpenHand environment
- GitHub repo doesn't exist
- OpenHand failed to install gh CLI
- Git authentication failed

### Polling Not Finding Video

**Check GitHub directly:**
```bash
# Check if file exists
curl -I "https://raw.githubusercontent.com/smrtr-ai/video-artifacts/main/videos/{lesson_id}_{video_id}.mp4"

# Should return 200 if exists
```

**Check polling logs:**
- Edge Functions → video_poll_github → Logs
- Look for "Not found at: ..." messages

### Video Found But Upload Failed

**Check storage bucket:**
- Settings → Storage → lesson-assets
- Verify MIME types include video/mp4
- Verify file size limit (>50MB)

**Check RLS policies:**
- Storage policies allow service role uploads

## Cleanup

### Remove Old Videos from GitHub

```bash
# After successful upload, clean up GitHub
cd video-artifacts
git rm videos/*_{video_id}.{mp4,json}
git commit -m "Clean up processed videos"
git push
```

Or automate with script:
```bash
#!/bin/bash
# cleanup_old_videos.sh

cd video-artifacts
git pull

# Remove videos older than 7 days
find videos -name "*.mp4" -mtime +7 -delete
find videos -name "*.json" -mtime +7 -delete

if [ -n "$(git status --porcelain)" ]; then
  git add videos
  git commit -m "Clean up videos older than 7 days"
  git push
fi
```

## Summary

✅ **What's Set Up:**
1. Edge function generates video
2. OpenHand pushes to GitHub
3. Polling service (5 min intervals) checks GitHub
4. Downloads and uploads to Supabase
5. Mobile app shows "Generated" badge

✅ **Benefits:**
- No long-running edge functions
- Reliable artifact storage
- Easy debugging (see videos in GitHub)
- Scalable (handles multiple videos)
- Resilient (retries on failure)

⏱️ **Expected Timing:**
- Video generation: 5-20 minutes
- Polling delay: 0-5 minutes (depends on cron schedule)
- Total: 5-25 minutes

🔧 **Next Steps:**
1. Create GitHub repo ✅
2. Set GitHub token ✅
3. Deploy edge functions ✅
4. Set up cron job ⏳
5. Test end-to-end ⏳
