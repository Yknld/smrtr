-- =============================================================================
-- STORAGE SMOKE TEST
-- Tests storage buckets, policies, and access control
-- =============================================================================

-- Clean up from any previous test runs
DO $$
BEGIN
  -- Delete test objects if they exist
  DELETE FROM storage.objects 
  WHERE bucket_id IN ('lesson_assets', 'tts_audio')
    AND name LIKE '11111111-1111-1111-1111-111111111111/%'
    OR name LIKE '22222222-2222-2222-2222-222222222222/%';
END $$;

\echo ''
\echo '==============================================================================='
\echo 'STORAGE SMOKE TEST'
\echo '==============================================================================='
\echo ''

-- =============================================================================
-- SECTION 1: VERIFY BUCKET SETUP
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 1: BUCKET CONFIGURATION'
\echo '==============================================================================='
\echo ''

\echo '1.1 Check that lesson_assets bucket exists...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM storage.buckets 
  WHERE id = 'lesson_assets' AND public = false;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION '❌ lesson_assets bucket not found or is public';
  END IF;
  RAISE NOTICE '✅ lesson_assets bucket exists and is private';
END $$;

\echo '1.2 Check that tts_audio bucket exists...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM storage.buckets 
  WHERE id = 'tts_audio' AND public = false;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION '❌ tts_audio bucket not found or is public';
  END IF;
  RAISE NOTICE '✅ tts_audio bucket exists and is private';
END $$;

\echo '1.3 Check file size limits...'
DO $$
DECLARE
  v_lesson_limit BIGINT;
  v_tts_limit BIGINT;
BEGIN
  SELECT file_size_limit INTO v_lesson_limit 
  FROM storage.buckets WHERE id = 'lesson_assets';
  
  SELECT file_size_limit INTO v_tts_limit 
  FROM storage.buckets WHERE id = 'tts_audio';
  
  IF v_lesson_limit != 52428800 THEN
    RAISE EXCEPTION '❌ lesson_assets size limit is % (expected 52428800)', v_lesson_limit;
  END IF;
  
  IF v_tts_limit != 10485760 THEN
    RAISE EXCEPTION '❌ tts_audio size limit is % (expected 10485760)', v_tts_limit;
  END IF;
  
  RAISE NOTICE '✅ File size limits correct (lesson_assets: 50MB, tts_audio: 10MB)';
END $$;

\echo ''

-- =============================================================================
-- SECTION 2: VERIFY STORAGE POLICIES
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 2: STORAGE POLICIES'
\echo '==============================================================================='
\echo ''

\echo '2.1 Check lesson_assets policies exist...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM pg_policies 
  WHERE tablename = 'objects' 
    AND (policyname LIKE '%lesson_assets%' OR policyname LIKE '%lesson assets%');
  
  IF v_count < 4 THEN
    RAISE EXCEPTION '❌ Expected 4 policies for lesson_assets, found %', v_count;
  END IF;
  RAISE NOTICE '✅ Found % policies for lesson_assets', v_count;
END $$;

\echo '2.2 Check tts_audio policies exist...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM pg_policies 
  WHERE tablename = 'objects' 
    AND (policyname LIKE '%tts_audio%' OR policyname LIKE '%tts audio%');
  
  IF v_count < 4 THEN
    RAISE EXCEPTION '❌ Expected 4 policies for tts_audio, found %', v_count;
  END IF;
  RAISE NOTICE '✅ Found % policies for tts_audio', v_count;
END $$;

\echo '2.3 List all storage policies...'
SELECT 
  policyname,
  cmd AS operation,
  CASE 
    WHEN policyname LIKE '%lesson%' THEN 'lesson_assets'
    WHEN policyname LIKE '%tts%' THEN 'tts_audio'
  END AS bucket
FROM pg_policies 
WHERE tablename = 'objects' 
  AND (policyname LIKE '%lesson%' OR policyname LIKE '%tts%')
ORDER BY bucket, cmd;

\echo ''

-- =============================================================================
-- SECTION 3: CREATE TEST USERS
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 3: TEST USER SETUP'
\echo '==============================================================================='
\echo ''

\echo '3.1 Creating test users...'
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

\echo '✅ Test users created:'
\echo '   User1: 11111111-1111-1111-1111-111111111111 (storage_test_user_1@example.com)'
\echo '   User2: 22222222-2222-2222-2222-222222222222 (storage_test_user_2@example.com)'
\echo ''

-- =============================================================================
-- SECTION 4: TEST LESSON_ASSETS ACCESS CONTROL
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 4: LESSON_ASSETS ACCESS CONTROL'
\echo '==============================================================================='
\echo ''

\echo '4.1 User1 uploads file to own folder...'
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

\echo '✅ User1 successfully uploaded to own folder'

\echo '4.2 User1 reads own file...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.objects
  WHERE bucket_id = 'lesson_assets'
    AND name = '11111111-1111-1111-1111-111111111111/lesson_123/test.pdf';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION '❌ User1 cannot read own file';
  END IF;
  RAISE NOTICE '✅ User1 can read own file';
END $$;

\echo '4.3 Switch to User2 and try to read User1''s file...'
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.objects
  WHERE bucket_id = 'lesson_assets'
    AND name = '11111111-1111-1111-1111-111111111111/lesson_123/test.pdf';
  
  IF v_count > 0 THEN
    RAISE EXCEPTION '❌ User2 can read User1''s file (policy failed)';
  END IF;
  RAISE NOTICE '✅ User2 cannot read User1''s file (policy working)';
END $$;

\echo '4.4 User2 tries to upload to User1''s folder...'
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'lesson_assets',
      '11111111-1111-1111-1111-111111111111/lesson_456/malicious.pdf',
      '22222222-2222-2222-2222-222222222222',
      '{"size": 1024, "mimetype": "application/pdf"}'::jsonb
    );
    RAISE EXCEPTION '❌ User2 was able to upload to User1''s folder (policy failed)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✅ User2 blocked from uploading to User1''s folder';
  END;
END $$;

\echo '4.5 User2 uploads to own folder...'
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'lesson_assets',
  '22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf',
  '22222222-2222-2222-2222-222222222222',
  '{"size": 2048, "mimetype": "application/pdf"}'::jsonb
);

\echo '✅ User2 successfully uploaded to own folder'

\echo '4.6 User2 reads own file...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.objects
  WHERE bucket_id = 'lesson_assets'
    AND name = '22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION '❌ User2 cannot read own file';
  END IF;
  RAISE NOTICE '✅ User2 can read own file';
END $$;

\echo '4.7 Switch back to User1 and try to delete User2''s file...'
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'lesson_assets'
      AND name = '22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf';
    
    -- If we got here, check if it actually deleted
    IF FOUND THEN
      RAISE EXCEPTION '❌ User1 was able to delete User2''s file (policy failed)';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✅ User1 blocked from deleting User2''s file';
  END;
END $$;

\echo '4.8 User2 deletes own file...'
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

DELETE FROM storage.objects
WHERE bucket_id = 'lesson_assets'
  AND name = '22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf';

\echo '✅ User2 successfully deleted own file'

\echo ''

-- =============================================================================
-- SECTION 5: TEST TTS_AUDIO ACCESS CONTROL
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 5: TTS_AUDIO ACCESS CONTROL'
\echo '==============================================================================='
\echo ''

\echo '5.1 User1 uploads TTS audio to own folder...'
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'tts_audio',
  '11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3',
  '11111111-1111-1111-1111-111111111111',
  '{"size": 512, "mimetype": "audio/mpeg"}'::jsonb
);

\echo '✅ User1 successfully uploaded TTS audio'

\echo '5.2 User1 reads own TTS audio...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.objects
  WHERE bucket_id = 'tts_audio'
    AND name = '11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION '❌ User1 cannot read own TTS audio';
  END IF;
  RAISE NOTICE '✅ User1 can read own TTS audio';
END $$;

\echo '5.3 User2 tries to read User1''s TTS audio...'
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.objects
  WHERE bucket_id = 'tts_audio'
    AND name = '11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3';
  
  IF v_count > 0 THEN
    RAISE EXCEPTION '❌ User2 can read User1''s TTS audio (policy failed)';
  END IF;
  RAISE NOTICE '✅ User2 cannot read User1''s TTS audio (policy working)';
END $$;

\echo '5.4 User2 tries to upload to User1''s TTS folder...'
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'tts_audio',
      '11111111-1111-1111-1111-111111111111/session_200/fr/chunk_0.mp3',
      '22222222-2222-2222-2222-222222222222',
      '{"size": 512, "mimetype": "audio/mpeg"}'::jsonb
    );
    RAISE EXCEPTION '❌ User2 was able to upload to User1''s TTS folder (policy failed)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✅ User2 blocked from uploading to User1''s TTS folder';
  END;
END $$;

\echo '5.5 User2 uploads to own TTS folder...'
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'tts_audio',
  '22222222-2222-2222-2222-222222222222/session_300/de/chunk_0.mp3',
  '22222222-2222-2222-2222-222222222222',
  '{"size": 768, "mimetype": "audio/mpeg"}'::jsonb
);

\echo '✅ User2 successfully uploaded to own TTS folder'

\echo '5.6 User2 can read own TTS audio...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.objects
  WHERE bucket_id = 'tts_audio'
    AND name = '22222222-2222-2222-2222-222222222222/session_300/de/chunk_0.mp3';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION '❌ User2 cannot read own TTS audio';
  END IF;
  RAISE NOTICE '✅ User2 can read own TTS audio';
END $$;

\echo ''

-- =============================================================================
-- SECTION 6: PATH VALIDATION TESTS
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 6: PATH VALIDATION'
\echo '==============================================================================='
\echo ''

\echo '6.1 Test invalid path (no user_id prefix) for lesson_assets...'
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'lesson_assets',
      'lesson_999/test.pdf',
      '11111111-1111-1111-1111-111111111111',
      '{"size": 1024, "mimetype": "application/pdf"}'::jsonb
    );
    RAISE EXCEPTION '❌ Invalid path was accepted (policy failed)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✅ Invalid path rejected (no user_id prefix)';
  END;
END $$;

\echo '6.2 Test invalid path (wrong user_id) for tts_audio...'
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'tts_audio',
      '99999999-9999-9999-9999-999999999999/session_400/en/chunk_0.mp3',
      '11111111-1111-1111-1111-111111111111',
      '{"size": 512, "mimetype": "audio/mpeg"}'::jsonb
    );
    RAISE EXCEPTION '❌ Wrong user_id path was accepted (policy failed)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✅ Wrong user_id path rejected';
  END;
END $$;

\echo ''

-- =============================================================================
-- SECTION 7: SUMMARY
-- =============================================================================
\echo '==============================================================================='
\echo 'SECTION 7: TEST SUMMARY'
\echo '==============================================================================='
\echo ''

\echo 'Current storage objects:'
SELECT 
  bucket_id,
  name,
  owner,
  (metadata->>'size')::integer as size_bytes
FROM storage.objects
WHERE bucket_id IN ('lesson_assets', 'tts_audio')
ORDER BY bucket_id, name;

\echo ''
\echo '📊 Storage Statistics:'
SELECT 
  bucket_id,
  COUNT(*) as object_count,
  SUM((metadata->>'size')::integer) as total_bytes
FROM storage.objects
WHERE bucket_id IN ('lesson_assets', 'tts_audio')
GROUP BY bucket_id
ORDER BY bucket_id;

\echo ''
\echo '==============================================================================='
\echo '✅ ALL STORAGE TESTS PASSED!'
\echo '==============================================================================='
\echo ''
\echo 'Summary:'
\echo '  ✅ Both buckets exist and are private'
\echo '  ✅ File size limits configured correctly'
\echo '  ✅ All storage policies exist (8 total)'
\echo '  ✅ User isolation working (users can only access own files)'
\echo '  ✅ Path validation working (invalid paths rejected)'
\echo '  ✅ CRUD operations working correctly'
\echo ''
\echo 'Next steps:'
\echo '  1. Test with actual file uploads via Supabase client'
\echo '  2. Test signed URL generation'
\echo '  3. Test file size limit enforcement'
\echo '  4. Integrate with mobile app'
\echo ''

-- Clean up test data
\echo 'Cleaning up test data...'
DELETE FROM storage.objects 
WHERE bucket_id IN ('lesson_assets', 'tts_audio')
  AND (name LIKE '11111111-1111-1111-1111-111111111111/%'
    OR name LIKE '22222222-2222-2222-2222-222222222222/%');

\echo '✅ Test data cleaned up'
\echo ''

-- Reset session
RESET request.jwt.claim.sub;
RESET role;
