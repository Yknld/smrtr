-- Delete failed podcast episode so it can be regenerated with the new working code
DELETE FROM podcast_episodes
WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c'
AND status = 'failed';
