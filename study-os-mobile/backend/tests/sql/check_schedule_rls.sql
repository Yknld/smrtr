-- =============================================================================
-- SCHEDULE RLS DIAGNOSTIC CHECK
-- =============================================================================
-- Run this to verify schedule tables RLS setup before running smoke tests
-- =============================================================================

-- Check if tables exist
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
ORDER BY tablename;

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING clause present'
    ELSE 'No USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK clause present'
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
ORDER BY tablename, cmd;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
GROUP BY tablename
ORDER BY tablename;

-- Check if auth.uid() function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'uid' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  ) THEN
    RAISE NOTICE '✓ auth.uid() function exists';
  ELSE
    RAISE WARNING '✗ auth.uid() function MISSING - RLS will not work!';
  END IF;
END $$;

-- Test auth.uid() with sample JWT
DO $$
DECLARE
  v_test_uuid uuid := '12345678-1234-1234-1234-123456789012';
  v_result uuid;
BEGIN
  -- Set test JWT claims
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_test_uuid)::text, true);
  
  -- Try to call auth.uid()
  SELECT auth.uid() INTO v_result;
  
  IF v_result = v_test_uuid THEN
    RAISE NOTICE '✓ auth.uid() returns correct value: %', v_result;
  ELSIF v_result IS NULL THEN
    RAISE WARNING '✗ auth.uid() returned NULL - JWT claims not being read correctly';
  ELSE
    RAISE WARNING '✗ auth.uid() returned wrong value: % (expected %)', v_result, v_test_uuid;
  END IF;
  
  -- Clear the setting
  PERFORM set_config('request.jwt.claims', '', false);
END $$;

-- Summary
DO $$
DECLARE
  v_table_count int;
  v_rls_enabled_count int;
  v_policy_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCHEDULE RLS DIAGNOSTIC SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Count tables
  SELECT COUNT(*) INTO v_table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications');
  
  -- Count RLS enabled
  SELECT COUNT(*) INTO v_rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
    AND rowsecurity = true;
  
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications');
  
  RAISE NOTICE 'Tables found: % / 4', v_table_count;
  RAISE NOTICE 'RLS enabled: % / 4', v_rls_enabled_count;
  RAISE NOTICE 'Policies created: % (expect 16)', v_policy_count;
  RAISE NOTICE '';
  
  IF v_table_count < 4 THEN
    RAISE WARNING '⚠ Missing tables! Run migration 006_create_schedule_tables.sql';
  END IF;
  
  IF v_rls_enabled_count < 4 THEN
    RAISE WARNING '⚠ RLS not enabled on all tables! Run migration 007_schedule_rls_policies.sql';
  END IF;
  
  IF v_policy_count < 16 THEN
    RAISE WARNING '⚠ Missing policies! Run migration 007_schedule_rls_policies.sql';
  END IF;
  
  IF v_table_count = 4 AND v_rls_enabled_count = 4 AND v_policy_count = 16 THEN
    RAISE NOTICE '✓ All checks passed! Ready to run schedule_smoke_test.sql';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
