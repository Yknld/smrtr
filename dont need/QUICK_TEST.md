# Quick Video Generation Test

## From Root Directory

```bash
cd /Users/danielntumba/smrtr

# 1. Poll for videos (checks OpenHand status)
./poll_videos.sh

# 2. Generate a test video
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'

# 3. Watch progress (every 30 seconds)
while true; do ./poll_videos.sh; echo "---"; sleep 30; done
```

## From study-os-mobile Directory

```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# 1. Poll for videos
./poll_github_videos.sh

# 2. Generate a test video
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'

# 3. Watch progress
while true; do ./poll_github_videos.sh; echo "---"; sleep 30; done
```

## What to Expect

### When No Videos Generating
```
✨ No pending videos.
```

### When Video Is Generating
```
📊 Summary:
  - Videos checked: 1
  - Still generating: 1
  ⏳ 1 video(s) still generating. Check again in 30-60 seconds.
```

### When Video Completes
```
📊 Summary:
  - Videos checked: 1
  - Videos completed & found: 1
  - Successfully processed: 1
  ✅ 1 video(s) ready! Check your app.
```

## Timeline

- **Video generation**: 5-20 minutes
- **GitHub upload**: automatic (10-30 seconds)
- **Polling finds it**: 0-30 seconds (depends on when you poll)
- **Total**: 5-21 minutes

## Troubleshooting

### If stuck on "still generating" for >20 minutes

Check OpenHand directly:
```bash
# Get conversation_id from database
# Then check:
curl "https://app.all-hands.dev/api/conversations/YOUR_CONVERSATION_ID" \
  -H "Authorization: Bearer YOUR_OPENHAND_API_KEY" | jq '.status'
```

### If you see errors

Check edge function logs:
https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/functions

Click on:
- `lesson_generate_video` - for generation errors
- `video_poll_github` - for polling errors
