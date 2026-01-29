-- Delete the incomplete episode so we can start fresh
DELETE FROM podcast_episodes 
WHERE id = 'a5434c53-2f2f-400c-b664-657b6758eb8d';

-- Verify it's gone
SELECT COUNT(*) as remaining_episodes
FROM podcast_episodes
WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c';
