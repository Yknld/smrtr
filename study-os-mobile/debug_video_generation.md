# Debug Video Generation

## Problem
Video generation completed in OpenHand but the edge function didn't download/upload the video.

## Diagnosis Steps

### 1. Check Database for Video Record

Run this SQL in Supabase SQL Editor:

```sql
-- Find recent video generation attempts
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
LIMIT 5;
```

**What to look for:**
- If `storage_path` is NULL → video never uploaded
- If `mime_type` starts with "error:" → processing failed with that error
- Check the `created_at` timestamp to find your attempt

### 2. Check OpenHand Conversation Status

From your logs, the conversation ID was: `ff8780368fc446f69e13c30af56cd3b3`

Run:
```bash
export OPENHAND_API_KEY='your-openhand-api-key'
./check_openhand_status.sh ff8780368fc446f69e13c30af56cd3b3
```

**What to look for:**
- `status`: Should be "completed"
- `artifacts`: Array of files/outputs
  - Check if there's a `.mp4` file
  - Check the `url` field for download links
  - Check the `path` field for file locations

### 3. Check Edge Function Logs

In Supabase Dashboard → Edge Functions → lesson_generate_video → Logs

**Look for these log messages:**
- ✓ "OpenHand conversation completed!" - means polling succeeded
- "Artifacts received:" - shows the actual artifact structure
- "Video downloaded: X bytes" - means download worked
- "Video uploaded successfully" - means upload worked
- "Video processing complete" - means entire flow succeeded

**Error patterns:**
- "No video artifact found" - artifacts don't match expected pattern
- "Failed to download video" - download from OpenHand failed
- "Upload error" - Supabase storage upload failed
- Missing logs after "Starting background video processing" - edge function timed out

## Common Issues

### Issue 1: Edge Function Timeout
**Symptom:** Logs stop after "Starting background video processing"

**Cause:** Edge functions have execution time limits. The background async processing might not complete before the function shuts down.

**Solution:** OpenHand polling can take 5-20 minutes, but edge functions typically timeout earlier. We need a better background job system.

### Issue 2: Artifacts Not Found
**Symptom:** "No video artifact found. Available artifacts: [...]"

**Cause:** OpenHand returns artifacts in an unexpected format.

**Solution:** Check the artifacts structure in logs and update the download logic.

### Issue 3: Storage Upload Failed
**Symptom:** "Upload error: new row violates row-level security policy"

**Cause:** Storage bucket policies or MIME type restrictions.

**Solution:** 
1. Check bucket MIME types include `video/mp4`
2. Check storage policies allow uploads for authenticated users

## Immediate Fixes

### Fix 1: Manual Video Download (if OpenHand has completed)

If OpenHand successfully generated the video, you can manually download and upload it:

```bash
# 1. Get the artifact URL from OpenHand status
ARTIFACT_URL="<url from OpenHand API response>"

# 2. Download video
curl -o video.mp4 "$ARTIFACT_URL"

# 3. Upload to Supabase storage via CLI or Dashboard
# Dashboard: Storage → lesson_assets → Upload
```

### Fix 2: Retry with Better Logging

The updated edge function now has comprehensive logging. Try again:

```bash
# Test the edge function
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "your-lesson-id"}'
```

Then watch the logs carefully to see where it fails.

## Long-term Solution

The current architecture has a fundamental flaw: background processing in edge functions is unreliable.

**Better approach:**
1. Edge function immediately returns with "generating" status
2. Insert a job record in `video_generation_jobs` table
3. Use Supabase pg_cron or external worker to poll/process jobs
4. Worker downloads from OpenHand and uploads to storage
5. Update job status → App can subscribe to changes via Realtime

Would you like me to implement this?
