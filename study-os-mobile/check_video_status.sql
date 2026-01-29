-- Check video generation status
-- Run this after triggering video generation

-- Check all recent video assets
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
WHERE kind = 'video'
ORDER BY created_at DESC
LIMIT 10;

-- Check specific video by ID (replace with your video_id)
-- SELECT * FROM lesson_assets WHERE id = 'your-video-id-here';

-- If no results, check if any video records exist at all
-- SELECT COUNT(*) as video_count FROM lesson_assets WHERE kind = 'video';
