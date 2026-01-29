-- This is what the app should be seeing
-- Run this as the authenticated user
SELECT 
  id,
  kind,
  storage_path,
  created_at
FROM lesson_assets 
WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c'
  AND user_id = '00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3'
  AND kind = 'video'
ORDER BY created_at DESC;

-- Result should show 8 videos (5 completed + 3 pending)
