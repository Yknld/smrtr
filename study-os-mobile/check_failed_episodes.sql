-- Check for failed podcast episodes with error messages
SELECT 
  episode_id,
  lesson_id,
  status,
  error_message,
  created_at,
  updated_at
FROM podcast_episodes
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 5;
