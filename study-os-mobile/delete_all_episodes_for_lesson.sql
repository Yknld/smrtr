-- Delete ALL podcast episodes for Lesson 1 to start completely fresh
DELETE FROM podcast_episodes 
WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c';

-- Verify all are gone
SELECT 
  COUNT(*) as remaining_episodes,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All clear - ready to generate fresh podcast!'
    ELSE '❌ Still have episodes - run delete again'
  END as status
FROM podcast_episodes
WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c';
