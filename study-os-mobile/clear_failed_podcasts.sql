-- Clear all failed podcast episodes so they can be regenerated
-- Run this in Supabase SQL Editor

DELETE FROM podcast_episodes
WHERE status = 'failed';

-- Verify deletion
SELECT 
  COUNT(*) as remaining_failed_episodes
FROM podcast_episodes
WHERE status = 'failed';
