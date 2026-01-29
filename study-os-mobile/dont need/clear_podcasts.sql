-- Clear all podcast data for testing
-- This script will delete all podcast episodes and segments

-- Delete all podcast segments (child table first)
DELETE FROM podcast_segments;

-- Delete all podcast episodes (parent table)
DELETE FROM podcast_episodes;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM podcast_segments) as segments_count,
  (SELECT COUNT(*) FROM podcast_episodes) as episodes_count;
