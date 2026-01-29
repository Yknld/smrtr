-- Check current podcast episode status
SELECT 
  id as episode_id,
  lesson_id,
  status,
  title,
  total_segments,
  created_at,
  updated_at,
  (SELECT COUNT(*) FROM podcast_segments WHERE episode_id = pe.id) as actual_segment_count,
  (SELECT COUNT(*) FROM podcast_segments WHERE episode_id = pe.id AND tts_status = 'ready') as ready_segments,
  (SELECT COUNT(*) FROM podcast_segments WHERE episode_id = pe.id AND tts_status = 'generating') as generating_segments,
  (SELECT COUNT(*) FROM podcast_segments WHERE episode_id = pe.id AND tts_status = 'queued') as queued_segments
FROM podcast_episodes pe
WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c'
ORDER BY created_at DESC
LIMIT 1;
