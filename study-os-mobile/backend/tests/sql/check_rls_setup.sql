-- =============================================================================
-- RLS SETUP VERIFICATION
-- =============================================================================
-- Run this before the smoke test to verify RLS is properly configured
-- =============================================================================

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'courses', 
    'lessons', 
    'lesson_assets', 
    'study_sessions',
    'live_transcript_segments',
    'live_translation_segments',
    'live_tts_chunks',
    'lesson_outputs',
    'lesson_progress',
    'user_settings'
  )
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- Check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Should see 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

-- Test if auth.uid() is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
    RAISE NOTICE '✓ auth.uid() function exists';
  ELSE
    RAISE WARNING '✗ auth.uid() function NOT FOUND - RLS will not work!';
    RAISE NOTICE 'You may need to create the auth schema and uid() function manually';
  END IF;
END $$;

-- Check current session settings
SELECT 
  current_setting('request.jwt.claim.sub', true) AS current_user_id,
  current_user AS database_user,
  session_user AS session_user;
