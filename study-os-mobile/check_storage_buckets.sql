-- Check which storage buckets exist
SELECT 
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE id LIKE '%lesson%'
ORDER BY created_at;

-- Check if video file exists in either bucket
SELECT 
  'lesson_assets' as bucket,
  name,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name LIKE '%9f9d76e0-9f2d-4e2c-a778-9e36532371ac%'

UNION ALL

SELECT 
  'lesson-assets' as bucket,
  name,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'lesson-assets'
  AND name LIKE '%9f9d76e0-9f2d-4e2c-a778-9e36532371ac%';
