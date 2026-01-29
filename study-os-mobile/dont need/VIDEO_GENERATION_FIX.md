# Video Generation Display Fix

## Problem Summary

Video generation **was working correctly** - the OpenHand agent successfully:
1. ✅ Generated the video with Remotion
2. ✅ Uploaded it to Supabase storage  
3. ✅ Created the database record

**However**, the app wasn't displaying the video because:
- The `AssetsScreen.tsx` didn't include `'video'` as a recognized asset type
- Videos were being filtered out during asset grouping

## What Was Fixed

### 1. AssetsScreen.tsx - Added Video Support

**File:** `apps/mobile/src/screens/Assets/AssetsScreen.tsx`

Changes:
- Added `'video'` to `AssetKind` type definition
- Added `videos: Asset[]` array to `GroupedAssets` interface
- Added video grouping logic in `fetchAssets()`
- Added `{renderSection('Videos', assets.videos)}` to display videos
- Added videos to `getTotalAssets()` count
- Added videos to `handleAssetDelete()` logic

### 2. Lessons Repository - Track Video Assets

**File:** `apps/mobile/src/data/lessons.repository.ts`

Changes:
- Added `hasVideo: assets.some((a: any) => a.kind === 'video')` to track if lessons have videos
- This enables showing video indicators on lesson cards (similar to podcasts)

### 3. Edge Function - Storage Bucket Consistency

**File:** `supabase/functions/lesson_generate_video/index.ts`

Changes:
- Fixed storage bucket name from `"lesson_assets"` to `"lesson-assets"` to match the rest of the app
- Added comprehensive logging for debugging artifacts download
- Improved artifact detection (checks file signatures, content-type, file size)
- Better error handling with database error tracking

## Verification Steps

### 1. Check Existing Video

Run this SQL to verify your existing video:

```sql
SELECT 
  id,
  lesson_id,
  kind,
  storage_path,
  storage_bucket,
  mime_type,
  duration_ms,
  created_at
FROM lesson_assets
WHERE id = '9f9d76e0-9f2d-4e2c-a778-9e36532371ac';
```

Expected result:
- `kind`: "video"
- `storage_path`: path to .mp4 file
- `mime_type`: "video/mp4"

### 2. Check Storage Buckets

Run `check_storage_buckets.sql` to verify:
- Which bucket(s) exist (`lesson_assets` vs `lesson-assets`)
- Where the video file is stored
- If MIME types allow video/mp4

### 3. App Display

After rebuilding the mobile app:
1. Navigate to the lesson with ID `34b9a0c7-62d7-4002-a642-00488b2c7f7c`
2. Tap "Assets" 
3. You should now see a "Videos" section with your generated video

## Storage Bucket Investigation

There may be two different storage buckets in your Supabase project:
- `lesson_assets` (underscore) - Used by video generation
- `lesson-assets` (hyphen) - Used by manual asset uploads

**Action Required:**
1. Run `check_storage_buckets.sql` to confirm which bucket(s) exist
2. If both exist, consider consolidating to one bucket name
3. Ensure the chosen bucket has video MIME types enabled (video/mp4, video/mpeg)
4. Update all code to use consistent bucket name

## Testing Video Generation

To generate a new video with all fixes:

```bash
# Get your JWT token from the app
JWT_TOKEN="your-jwt-token-here"

# Trigger video generation
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "your-lesson-id",
    "aspect_ratios": ["16:9"]
  }'

# Response will include video_id and conversation_id
# Monitor logs in Supabase Dashboard → Edge Functions → lesson_generate_video → Logs
```

Watch for these log messages:
- ✓ "OpenHand conversation completed!" - Polling succeeded
- "Artifacts received:" - Shows artifact structure
- "Found video artifact - downloading from:" - Video detected
- "Video downloaded: X bytes" - Download worked
- "Video uploaded successfully" - Upload to storage succeeded
- "Video processing complete" - Full pipeline succeeded

## Known Issues & Future Improvements

### Current Limitations

1. **No Real-time Notifications**
   - App must manually refresh to see completed videos
   - Consider adding Supabase Realtime subscription

2. **No Progress Tracking**
   - Users can't see generation progress (takes 5-20 minutes)
   - Consider adding status field with values: pending, generating, ready, failed

3. **No Video Player**
   - `handleAssetPress()` for videos just logs to console
   - Need to implement video player (React Native Video or Expo AV)

### Recommended Enhancements

1. **Add Status Field to lesson_assets**
   ```sql
   ALTER TABLE lesson_assets 
   ADD COLUMN status TEXT DEFAULT 'ready'
   CHECK (status IN ('pending', 'generating', 'ready', 'failed'));
   
   ALTER TABLE lesson_assets
   ADD COLUMN error_message TEXT;
   ```

2. **Implement Realtime Subscriptions**
   ```typescript
   supabase
     .channel('video-updates')
     .on('postgres_changes', 
       { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'lesson_assets',
         filter: `kind=eq.video`
       },
       (payload) => {
         // Refresh video list
       }
     )
     .subscribe();
   ```

3. **Add Video Player**
   - Install `expo-av` or `react-native-video`
   - Implement video player screen
   - Add video playback controls

4. **Add Video Generation Button**
   - Add "Generate Video" option to lesson actions
   - Show generation progress/status
   - Notify when complete

## Summary

**The video generation feature was already working!** The issue was purely a display problem in the mobile app. With these fixes:

- ✅ Videos now appear in the Assets screen
- ✅ Lessons track video availability (`hasVideo` flag)
- ✅ Better logging for debugging future issues
- ✅ Consistent storage bucket naming (pending verification)

Your existing video `9f9d76e0-9f2d-4e2c-a778-9e36532371ac` should now be visible after rebuilding the mobile app.
