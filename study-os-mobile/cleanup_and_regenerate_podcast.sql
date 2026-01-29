-- Cleanup Podcast Database and Cache
-- This script deletes all podcast episodes and their segments
-- Run this in the Supabase SQL Editor or via API

-- Step 1: Find and display existing podcast episodes
SELECT 
  'Current Episodes:' as info,
  id,
  lesson_id,
  status,
  total_segments,
  language,
  created_at
FROM podcast_episodes
ORDER BY created_at DESC;

-- Step 2: Delete all podcast segments
-- This will cascade delete audio files in storage
DELETE FROM podcast_segments;

-- Step 3: Delete all podcast episodes
DELETE FROM podcast_episodes;

-- Step 4: Verify cleanup
SELECT 
  'Remaining Episodes:' as info,
  COUNT(*) as episode_count
FROM podcast_episodes;

SELECT 
  'Remaining Segments:' as info,
  COUNT(*) as segment_count
FROM podcast_segments;

-- Done! You can now regenerate podcasts with the new voices.
-- The audio files in storage will be overwritten when new podcasts are generated.
