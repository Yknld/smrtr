-- Check ALL storage policies (not just transcription)
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN length(qual) > 50 THEN substring(qual from 1 for 50) || '...'
    ELSE qual
  END as qual_preview
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
