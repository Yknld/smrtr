-- Check if video file exists in storage
-- Run this in Supabase SQL Editor

SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name LIKE '%9f9d76e0-9f2d-4e2c-a778-9e36532371ac%'
ORDER BY created_at DESC;

-- Also check the exact path
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name = '00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3/34b9a0c7-62d7-4002-a642-00488b2c7f7c/9f9d76e0-9f2d-4e2c-a778-9e36532371ac.mp4';
