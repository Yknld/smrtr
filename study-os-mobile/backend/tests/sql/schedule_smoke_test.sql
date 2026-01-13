-- =============================================================================
-- SCHEDULE SMOKE TEST
-- =============================================================================
-- Tests RLS policies, constraints, and data isolation for scheduling tables
--
-- SETUP: Run after migrations 006, 007, 008 are applied
--
-- To run this test:
-- 1. Execute the entire script in Supabase SQL Editor or any SQL client
-- 2. The test uses randomly generated UUIDs for isolated testing
--
-- Expected behavior:
-- - User 1 can create and view their own schedules
-- - Constraints enforce data validity (duration, unique notifications)
-- - User 2 cannot see user 1's data
-- - User 2 cannot link to user 1's study_plans (RLS blocks cross-user references)
--
-- NOTE: This test forces RLS to be respected even in service_role mode
-- =============================================================================

-- Force RLS to be respected (even for service_role during testing)
SET row_security = on;

-- =============================================================================
-- SECTION 0A: CLEANUP PRE-EXISTING TEST DATA
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== SECTION 0A: Cleaning up any pre-existing test data ===';
  
  -- Temporarily disable RLS to clean everything
  ALTER TABLE study_plans DISABLE ROW LEVEL SECURITY;
  ALTER TABLE study_plan_rules DISABLE ROW LEVEL SECURITY;
  ALTER TABLE device_push_tokens DISABLE ROW LEVEL SECURITY;
  ALTER TABLE scheduled_notifications DISABLE ROW LEVEL SECURITY;
  
  -- Delete all data from schedule tables (fresh start)
  DELETE FROM scheduled_notifications;
  DELETE FROM study_plan_rules;
  DELETE FROM study_plans;
  DELETE FROM device_push_tokens;
  
  -- Re-enable RLS
  ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE study_plan_rules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;
  ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✓ Cleanup complete - starting with clean tables';
END $$;

-- =============================================================================
-- SECTION 0B: VERIFY RLS IS ENABLED
-- =============================================================================
DO $$
DECLARE
  v_rls_count int;
BEGIN
  RAISE NOTICE '=== SECTION 0: Verifying RLS setup ===';
  
  -- Check that RLS is enabled on all schedule tables
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
    AND rowsecurity = true;
  
  IF v_rls_count < 4 THEN
    RAISE EXCEPTION 'RLS not enabled on all schedule tables! Found % of 4. Run migration 007_schedule_rls_policies.sql', v_rls_count;
  END IF;
  
  RAISE NOTICE '✓ RLS enabled on all 4 schedule tables';
  
  -- Verify auth.uid() function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'uid' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  ) THEN
    RAISE EXCEPTION 'auth.uid() function does not exist! Run migration 000_setup_auth_helpers.sql';
  END IF;
  
  RAISE NOTICE '✓ auth.uid() function exists';
  
  -- Test that auth.uid() actually works with set_config
  DECLARE
    v_test_uuid uuid := gen_random_uuid();
    v_result uuid;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_test_uuid)::text, true);
    SELECT auth.uid() INTO v_result;
    
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'auth.uid() returned NULL! RLS policies will not work. Check Supabase auth configuration.';
    ELSIF v_result != v_test_uuid THEN
      RAISE EXCEPTION 'auth.uid() returned wrong value: % (expected: %)', v_result, v_test_uuid;
    END IF;
    
    RAISE NOTICE '✓ auth.uid() works correctly with test JWT';
    PERFORM set_config('request.jwt.claims', '', false);
  END;
  
  RAISE NOTICE '=== RLS verification complete ===';
END $$;

-- =============================================================================
-- SECTION A: USER 1 CREATES SCHEDULE DATA
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := gen_random_uuid();
  v_user_id_2 uuid := gen_random_uuid();
  v_course_id uuid;
  v_plan_id uuid;
  v_rule_id uuid;
  v_token_id uuid;
  v_notif_id uuid;
  v_fire_at timestamptz := now() + interval '1 day';
BEGIN
  RAISE NOTICE '=== SECTION A: User 1 creates schedule data ===';
  RAISE NOTICE 'Test User 1: %', v_user_id_1;
  RAISE NOTICE 'Test User 2: %', v_user_id_2;
  
  -- Set session as user 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_1)::text, true);
  
  -- A1: Create a course (optional - schedules can exist without courses)
  INSERT INTO courses (user_id, title, term, color)
  VALUES (v_user_id_1, 'CS 101', 'Winter 2026', '#3B82F6')
  RETURNING id INTO v_course_id;
  RAISE NOTICE 'Created course: %', v_course_id;
  
  -- A2: Create a study plan linked to the course
  INSERT INTO study_plans (user_id, course_id, title, timezone, is_enabled)
  VALUES (v_user_id_1, v_course_id, 'Evening Study Sessions', 'America/Toronto', true)
  RETURNING id INTO v_plan_id;
  RAISE NOTICE 'Created study_plan: %', v_plan_id;
  
  -- A3: Create a recurrence rule for the plan
  INSERT INTO study_plan_rules (
    user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
  )
  VALUES (
    v_user_id_1, v_plan_id, 'FREQ=WEEKLY;BYDAY=MO,WE,FR', '19:00'::time, 60, 15
  )
  RETURNING id INTO v_rule_id;
  RAISE NOTICE 'Created study_plan_rule: %', v_rule_id;
  
  -- A4: Register a device push token
  INSERT INTO device_push_tokens (user_id, platform, push_token, is_active)
  VALUES (v_user_id_1, 'ios', 'test-token-user1-device1', true)
  RETURNING id INTO v_token_id;
  RAISE NOTICE 'Created device_push_token: %', v_token_id;
  
  -- A5: Create a scheduled notification
  INSERT INTO scheduled_notifications (
    user_id, study_plan_id, fire_at, type, payload_json, status
  )
  VALUES (
    v_user_id_1, v_plan_id, v_fire_at, 'reminder',
    '{"title": "Study Session Soon", "body": "CS 101 in 15 minutes"}'::jsonb,
    'queued'
  )
  RETURNING id INTO v_notif_id;
  RAISE NOTICE 'Created scheduled_notification: %', v_notif_id;
  
  RAISE NOTICE '=== User 1 data created successfully ===';
  
  -- Store IDs in temp table for later sections
  CREATE TEMP TABLE IF NOT EXISTS test_ids (
    user_id_1 uuid,
    user_id_2 uuid,
    course_id uuid,
    plan_id uuid,
    rule_id uuid,
    token_id uuid,
    notif_id uuid,
    fire_at timestamptz
  );
  INSERT INTO test_ids VALUES (
    v_user_id_1, v_user_id_2, v_course_id, v_plan_id, v_rule_id, v_token_id, v_notif_id, v_fire_at
  );
END $$;

-- =============================================================================
-- SECTION B: USER 1 VERIFICATION
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_plans_count int;
  v_rules_count int;
  v_tokens_count int;
  v_notifs_count int;
BEGIN
  RAISE NOTICE '=== SECTION B: User 1 verification ===';
  
  SELECT user_id_1 INTO v_user_id_1 FROM test_ids LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_1)::text, true);
  
  SELECT COUNT(*) INTO v_plans_count FROM study_plans;
  RAISE NOTICE 'User 1 sees % study_plans -- expect 1', v_plans_count;
  ASSERT v_plans_count = 1, 'User 1 should see 1 study_plan';
  
  SELECT COUNT(*) INTO v_rules_count FROM study_plan_rules;
  RAISE NOTICE 'User 1 sees % study_plan_rules -- expect 1', v_rules_count;
  ASSERT v_rules_count = 1, 'User 1 should see 1 study_plan_rule';
  
  SELECT COUNT(*) INTO v_tokens_count FROM device_push_tokens;
  RAISE NOTICE 'User 1 sees % device_push_tokens -- expect 1', v_tokens_count;
  ASSERT v_tokens_count = 1, 'User 1 should see 1 device_push_token';
  
  SELECT COUNT(*) INTO v_notifs_count FROM scheduled_notifications;
  RAISE NOTICE 'User 1 sees % scheduled_notifications -- expect 1', v_notifs_count;
  ASSERT v_notifs_count = 1, 'User 1 should see 1 scheduled_notification';
  
  RAISE NOTICE '=== User 1 verification passed ===';
END $$;

-- =============================================================================
-- SECTION C: CONSTRAINT TESTS (USER 1)
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_plan_id uuid;
  v_fire_at timestamptz;
  v_error_caught boolean;
BEGIN
  RAISE NOTICE '=== SECTION C: Constraint tests ===';
  
  SELECT user_id_1, plan_id, fire_at INTO v_user_id_1, v_plan_id, v_fire_at FROM test_ids LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_1)::text, true);
  
  -- C1: Test unique notification constraint (duplicate insert should fail)
  BEGIN
    INSERT INTO scheduled_notifications (user_id, study_plan_id, fire_at, type, status)
    VALUES (v_user_id_1, v_plan_id, v_fire_at, 'reminder', 'queued');
    RAISE EXCEPTION 'Duplicate notification insert should have failed!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ Duplicate notification correctly rejected (unique constraint)';
  END;
  
  -- C2: Test duration_min constraint (< 5 should fail)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_1, v_plan_id, 'FREQ=DAILY', '08:00'::time, 3, 10);
    RAISE EXCEPTION 'Invalid duration_min (< 5) should have failed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Invalid duration_min correctly rejected (check constraint)';
  END;
  
  -- C3: Test duration_min constraint (> 600 should fail)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_1, v_plan_id, 'FREQ=DAILY', '08:00'::time, 700, 10);
    RAISE EXCEPTION 'Invalid duration_min (> 600) should have failed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Invalid duration_min correctly rejected (check constraint)';
  END;
  
  -- C4: Test remind_before_min constraint (> 120 should fail)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_1, v_plan_id, 'FREQ=DAILY', '08:00'::time, 45, 150);
    RAISE EXCEPTION 'Invalid remind_before_min (> 120) should have failed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Invalid remind_before_min correctly rejected (check constraint)';
  END;
  
  -- C5: Test platform constraint (invalid value should fail)
  BEGIN
    INSERT INTO device_push_tokens (user_id, platform, push_token, is_active)
    VALUES (v_user_id_1, 'windows', 'test-token-invalid-platform', true);
    RAISE EXCEPTION 'Invalid platform should have failed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Invalid platform correctly rejected (check constraint)';
  END;
  
  -- C6: Test notification type constraint (invalid value should fail)
  BEGIN
    INSERT INTO scheduled_notifications (user_id, study_plan_id, fire_at, type, status)
    VALUES (v_user_id_1, v_plan_id, now() + interval '2 days', 'invalid_type', 'queued');
    RAISE EXCEPTION 'Invalid notification type should have failed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Invalid notification type correctly rejected (check constraint)';
  END;
  
  -- C7: Test notification status constraint (invalid value should fail)
  BEGIN
    INSERT INTO scheduled_notifications (user_id, study_plan_id, fire_at, type, status)
    VALUES (v_user_id_1, v_plan_id, now() + interval '2 days', 'start', 'invalid_status');
    RAISE EXCEPTION 'Invalid notification status should have failed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Invalid notification status correctly rejected (check constraint)';
  END;
  
  RAISE NOTICE '=== Constraint tests passed ===';
END $$;

-- =============================================================================
-- SECTION D: USER 2 RLS ISOLATION
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_user_id_2 uuid;
  v_plans_count int;
  v_rules_count int;
  v_tokens_count int;
  v_notifs_count int;
  v_auth_result uuid;
BEGIN
  RAISE NOTICE '=== SECTION D: User 2 RLS isolation ===';
  
  SELECT user_id_1, user_id_2 INTO v_user_id_1, v_user_id_2 FROM test_ids LIMIT 1;
  RAISE NOTICE 'Switching to User 2: %', v_user_id_2;
  RAISE NOTICE 'User 1 (should NOT see): %', v_user_id_1;
  
  -- Set JWT for User 2
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_2)::text, true);
  
  -- Verify auth.uid() is returning User 2's ID
  SELECT auth.uid() INTO v_auth_result;
  RAISE NOTICE 'auth.uid() returns: % (should be User 2)', v_auth_result;
  
  IF v_auth_result != v_user_id_2 THEN
    RAISE WARNING 'auth.uid() mismatch! Expected %, got %', v_user_id_2, v_auth_result;
  END IF;
  
  -- D1: User 2 should see 0 rows in all schedule tables
  SELECT COUNT(*) INTO v_plans_count FROM study_plans;
  RAISE NOTICE 'User 2 sees % study_plans -- expect 0', v_plans_count;
  
  -- Debug: Show what User 2 sees (if any)
  IF v_plans_count > 0 THEN
    DECLARE
      v_plan RECORD;
    BEGIN
      RAISE WARNING 'User 2 unexpectedly sees study_plans! Showing details:';
      FOR v_plan IN SELECT id, user_id, title FROM study_plans LOOP
        RAISE NOTICE '  Plan: id=%, user_id=%, title=%', v_plan.id, v_plan.user_id, v_plan.title;
      END LOOP;
    END;
  END IF;
  
  ASSERT v_plans_count = 0, 'User 2 should see 0 study_plans (RLS isolation)';
  
  SELECT COUNT(*) INTO v_rules_count FROM study_plan_rules;
  RAISE NOTICE 'User 2 sees % study_plan_rules -- expect 0', v_rules_count;
  ASSERT v_rules_count = 0, 'User 2 should see 0 study_plan_rules (RLS isolation)';
  
  SELECT COUNT(*) INTO v_tokens_count FROM device_push_tokens;
  RAISE NOTICE 'User 2 sees % device_push_tokens -- expect 0', v_tokens_count;
  ASSERT v_tokens_count = 0, 'User 2 should see 0 device_push_tokens (RLS isolation)';
  
  SELECT COUNT(*) INTO v_notifs_count FROM scheduled_notifications;
  RAISE NOTICE 'User 2 sees % scheduled_notifications -- expect 0', v_notifs_count;
  ASSERT v_notifs_count = 0, 'User 2 should see 0 scheduled_notifications (RLS isolation)';
  
  RAISE NOTICE '=== User 2 RLS isolation verified ===';
END $$;

-- =============================================================================
-- SECTION E: USER 2 CROSS-USER REFERENCE PREVENTION
-- =============================================================================
DO $$
DECLARE
  v_user_id_2 uuid;
  v_plan_id uuid;
BEGIN
  RAISE NOTICE '=== SECTION E: Cross-user reference prevention ===';
  
  SELECT user_id_2, plan_id INTO v_user_id_2, v_plan_id FROM test_ids LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_2)::text, true);
  
  -- E1: User 2 attempts to create a rule for User 1's plan (should fail via RLS)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_2, v_plan_id, 'FREQ=DAILY', '10:00'::time, 30, 5);
    RAISE EXCEPTION 'User 2 should not be able to insert rule for User 1''s plan!';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✓ User 2 correctly blocked from linking to User 1''s plan (RLS)';
  END;
  
  -- E2: User 2 attempts to create a notification for User 1's plan (should fail via RLS)
  BEGIN
    INSERT INTO scheduled_notifications (
      user_id, study_plan_id, fire_at, type, status
    )
    VALUES (v_user_id_2, v_plan_id, now() + interval '3 days', 'nudge', 'queued');
    RAISE EXCEPTION 'User 2 should not be able to insert notification for User 1''s plan!';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✓ User 2 correctly blocked from creating notification for User 1''s plan (RLS)';
  END;
  
  RAISE NOTICE '=== Cross-user reference prevention verified ===';
END $$;

-- =============================================================================
-- SECTION F: USER 1 FINAL VERIFICATION
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_plans_count int;
BEGIN
  RAISE NOTICE '=== SECTION F: User 1 final verification ===';
  
  -- Switch back to User 1
  SELECT user_id_1 INTO v_user_id_1 FROM test_ids LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_1)::text, true);
  
  -- User 1's data should still be intact
  SELECT COUNT(*) INTO v_plans_count FROM study_plans;
  RAISE NOTICE 'User 1 still sees % study_plans -- expect 1', v_plans_count;
  ASSERT v_plans_count = 1, 'User 1 data should remain intact';
  
  RAISE NOTICE '=== User 1 data remains intact ===';
END $$;

-- =============================================================================
-- SECTION G: CLEANUP
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_course_id uuid;
  v_plan_id uuid;
  v_deleted_count int;
BEGIN
  RAISE NOTICE '=== SECTION G: Cleanup ===';
  
  SELECT user_id_1, course_id, plan_id INTO v_user_id_1, v_course_id, v_plan_id 
  FROM test_ids LIMIT 1;
  
  -- Delete as User 1 (who owns the data)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id_1)::text, true);
  
  -- Delete study_plan (cascades to rules and notifications)
  DELETE FROM study_plans WHERE id = v_plan_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % study_plan(s) (cascaded to rules and notifications)', v_deleted_count;
  
  -- Delete device tokens
  DELETE FROM device_push_tokens WHERE user_id = v_user_id_1;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % device_push_token(s)', v_deleted_count;
  
  -- Delete course
  DELETE FROM courses WHERE id = v_course_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % course(s)', v_deleted_count;
  
  DROP TABLE IF EXISTS test_ids;
  
  RAISE NOTICE '=== SMOKE TEST COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'All tests passed! ✓';
  RAISE NOTICE '- User isolation (RLS) working correctly';
  RAISE NOTICE '- Constraints enforcing data validity';
  RAISE NOTICE '- Cross-user references blocked';
  RAISE NOTICE '- Unique notification constraint working';
END $$;

-- Reset row_security setting
RESET row_security;
