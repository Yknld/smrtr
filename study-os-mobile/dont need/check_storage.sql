-- Check existing storage buckets
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets;

-- Check existing storage policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;
