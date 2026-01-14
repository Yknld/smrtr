-- Check join-in segments status
SELECT 
  id,
  episode_id,
  seq,
  speaker,
  tts_status,
  audio_bucket,
  audio_path,
  LEFT(text, 50) as text_preview,
  created_at
FROM podcast_segments 
WHERE seq >= 1000  -- Join-in segments have seq offset
ORDER BY created_at DESC
LIMIT 10;

-- Also check recent episodes
SELECT id, lesson_id, status, total_segments, created_at 
FROM podcast_episodes 
ORDER BY created_at DESC
LIMIT 5;
