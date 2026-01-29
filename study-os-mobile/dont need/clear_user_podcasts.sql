-- Clear podcast data for a specific user (safer option)
-- Replace 'YOUR_USER_ID' with your actual user ID

-- First, find your user ID if you don't know it:
-- SELECT id, email FROM auth.users;

-- Delete segments for your user
DELETE FROM podcast_segments 
WHERE user_id = 'YOUR_USER_ID';

-- Delete episodes for your user
DELETE FROM podcast_episodes 
WHERE user_id = 'YOUR_USER_ID';

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM podcast_segments WHERE user_id = 'YOUR_USER_ID') as my_segments_count,
  (SELECT COUNT(*) FROM podcast_episodes WHERE user_id = 'YOUR_USER_ID') as my_episodes_count;
