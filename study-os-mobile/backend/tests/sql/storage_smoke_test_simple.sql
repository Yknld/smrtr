-- =============================================================================
-- STORAGE SMOKE TEST (SIMPLE VERSION)
-- Copy and paste this entire file into Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- TEST 1: VERIFY BUCKETS EXIST
-- =============================================================================
SELECT 
  '✅ TEST 1: Verify Buckets' as test_section,
  id as bucket_name,
  CASE WHEN public = false THEN '✅ Private' ELSE '❌ PUBLIC (SHOULD BE PRIVATE!)' END as privacy_status,
  CASE 
    WHEN id = 'lesson_assets' AND file_size_limit = 52428800 THEN '✅ 50MB limit'
    WHEN id = 'tts_audio' AND file_size_limit = 10485760 THEN '✅ 10MB limit'
    ELSE '❌ Wrong size limit: ' || file_size_limit::text
  END as size_limit_status
FROM storage.buckets
WHERE id IN ('lesson_assets', 'tts_audio')
ORDER BY id;

-- =============================================================================
-- TEST 2: VERIFY STORAGE POLICIES EXIST
-- =============================================================================
SELECT 
  '✅ TEST 2: Verify Policies' as test_section,
  CASE 
    WHEN policyname LIKE '%lesson%' THEN 'lesson_assets'
    WHEN policyname LIKE '%tts%' THEN 'tts_audio'
  END as bucket,
  cmd as operation,
  policyname as policy_name
FROM pg_policies 
WHERE tablename = 'objects' 
  AND (policyname LIKE '%lesson%' OR policyname LIKE '%tts%')
ORDER BY bucket, cmd;

-- =============================================================================
-- TEST 3: COUNT POLICIES
-- =============================================================================
SELECT 
  '✅ TEST 3: Policy Count' as test_section,
  CASE 
    WHEN policyname LIKE '%lesson%' THEN 'lesson_assets'
    WHEN policyname LIKE '%tts%' THEN 'tts_audio'
  END as bucket,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All 4 policies present (SELECT, INSERT, UPDATE, DELETE)'
    ELSE '❌ Missing policies! Expected 4, found ' || COUNT(*)::text
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
  AND (policyname LIKE '%lesson%' OR policyname LIKE '%tts%')
GROUP BY bucket
ORDER BY bucket;

-- =============================================================================
-- TEST 4: CREATE TEST USERS
-- =============================================================================
-- Create test user 1
INSERT INTO auth.users (
  id, 
  instance_id,
  email, 
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'storage_test_user_1@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- Create test user 2
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'storage_test_user_2@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

SELECT '✅ TEST 4: Test Users Created' as test_section,
       'User1: 11111111-1111-1111-1111-111111111111' as user1,
       'User2: 22222222-2222-2222-2222-222222222222' as user2;

-- =============================================================================
-- TEST 5: USER1 UPLOADS FILE TO OWN FOLDER
-- =============================================================================
-- Set session as User1
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET role = authenticated;

-- Insert object as User1
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'lesson_assets',
  '11111111-1111-1111-1111-111111111111/lesson_123/test.pdf',
  '11111111-1111-1111-1111-111111111111',
  '{"size": 1024, "mimetype": "application/pdf"}'::jsonb
);

SELECT '✅ TEST 5: User1 Upload' as test_section,
       '✅ User1 successfully uploaded to own folder' as result;

-- =============================================================================
-- TEST 6: USER1 CAN READ OWN FILE
-- =============================================================================
SELECT 
  '✅ TEST 6: User1 Read Own File' as test_section,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ User1 can read own file'
    ELSE '❌ User1 CANNOT read own file (policy failed)'
  END as result,
  COUNT(*) as files_found
FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name = '11111111-1111-1111-1111-111111111111/lesson_123/test.pdf';

-- =============================================================================
-- TEST 7: USER2 CANNOT READ USER1'S FILE
-- =============================================================================
-- Switch to User2
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT 
  '✅ TEST 7: User2 Cannot Read User1 File' as test_section,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User2 CANNOT read User1 file (policy working correctly)'
    ELSE '❌ User2 CAN read User1 file (POLICY FAILED!)'
  END as result,
  COUNT(*) as files_found
FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name = '11111111-1111-1111-1111-111111111111/lesson_123/test.pdf';

-- =============================================================================
-- TEST 8: USER2 UPLOADS TO OWN FOLDER
-- =============================================================================
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'lesson_assets',
  '22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf',
  '22222222-2222-2222-2222-222222222222',
  '{"size": 2048, "mimetype": "application/pdf"}'::jsonb
);

SELECT '✅ TEST 8: User2 Upload' as test_section,
       '✅ User2 successfully uploaded to own folder' as result;

-- =============================================================================
-- TEST 9: USER2 CAN READ OWN FILE
-- =============================================================================
SELECT 
  '✅ TEST 9: User2 Read Own File' as test_section,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ User2 can read own file'
    ELSE '❌ User2 CANNOT read own file (policy failed)'
  END as result,
  COUNT(*) as files_found
FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name = '22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf';

-- =============================================================================
-- TEST 10: TTS AUDIO - USER1 UPLOAD
-- =============================================================================
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'tts_audio',
  '11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3',
  '11111111-1111-1111-1111-111111111111',
  '{"size": 512, "mimetype": "audio/mpeg"}'::jsonb
);

SELECT '✅ TEST 10: User1 TTS Upload' as test_section,
       '✅ User1 successfully uploaded TTS audio' as result;

-- =============================================================================
-- TEST 11: TTS AUDIO - USER2 CANNOT READ USER1'S FILE
-- =============================================================================
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT 
  '✅ TEST 11: User2 Cannot Read User1 TTS' as test_section,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User2 CANNOT read User1 TTS audio (policy working)'
    ELSE '❌ User2 CAN read User1 TTS audio (POLICY FAILED!)'
  END as result,
  COUNT(*) as files_found
FROM storage.objects
WHERE bucket_id = 'tts_audio'
  AND name = '11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3';

-- =============================================================================
-- TEST 12: TTS AUDIO - USER2 UPLOADS TO OWN FOLDER
-- =============================================================================
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'tts_audio',
  '22222222-2222-2222-2222-222222222222/session_300/de/chunk_0.mp3',
  '22222222-2222-2222-2222-222222222222',
  '{"size": 768, "mimetype": "audio/mpeg"}'::jsonb
);

SELECT '✅ TEST 12: User2 TTS Upload' as test_section,
       '✅ User2 successfully uploaded TTS audio to own folder' as result;

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
SELECT 
  '📊 FINAL SUMMARY' as section,
  bucket_id,
  COUNT(*) as object_count,
  SUM((metadata->>'size')::integer) as total_bytes
FROM storage.objects
WHERE bucket_id IN ('lesson_assets', 'tts_audio')
  AND (name LIKE '11111111-1111-1111-1111-111111111111/%'
    OR name LIKE '22222222-2222-2222-2222-222222222222/%')
GROUP BY bucket_id
ORDER BY bucket_id;

-- Show all test objects
SELECT 
  '📁 Test Objects Created' as section,
  bucket_id,
  name,
  owner,
  (metadata->>'size')::integer as size_bytes
FROM storage.objects
WHERE bucket_id IN ('lesson_assets', 'tts_audio')
  AND (name LIKE '11111111-1111-1111-1111-111111111111/%'
    OR name LIKE '22222222-2222-2222-2222-222222222222/%')
ORDER BY bucket_id, name;

-- =============================================================================
-- CLEANUP (Run this separately if you want to clean up test data)
-- =============================================================================
-- Uncomment the lines below to clean up test data:

-- DELETE FROM storage.objects 
-- WHERE bucket_id IN ('lesson_assets', 'tts_audio')
--   AND (name LIKE '11111111-1111-1111-1111-111111111111/%'
--     OR name LIKE '22222222-2222-2222-2222-222222222222/%');

-- SELECT '🧹 Cleanup Complete' as section, 'Test data removed' as status;

-- Reset session
RESET request.jwt.claim.sub;
RESET role;

-- =============================================================================
-- ✅ ALL TESTS COMPLETE!
-- =============================================================================
-- If you see all ✅ green checkmarks above, your storage is configured correctly!
-- 
-- What was tested:
--   ✅ Both buckets exist and are private
--   ✅ File size limits are correct
--   ✅ All 8 storage policies exist
--   ✅ User1 can upload and read own files
--   ✅ User2 cannot read User1's files
--   ✅ User2 can upload and read own files
--   ✅ Same isolation works for TTS audio bucket
--
-- Next steps:
--   1. Test with actual file uploads via Supabase client
--   2. Test signed URL generation
--   3. Integrate with mobile app
-- =============================================================================
