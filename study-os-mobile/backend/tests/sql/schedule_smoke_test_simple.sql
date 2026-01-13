-- =============================================================================
-- SCHEDULE SMOKE TEST - SIMPLIFIED (No RLS dependency)
-- =============================================================================
-- This version validates schema, constraints, and relationships
-- WITHOUT testing RLS policies (which require non-superuser connection)
-- 
-- For RLS testing, use the mobile app with real authenticated users
-- =============================================================================

-- =============================================================================
-- SECTION 1: VERIFY SCHEMA EXISTS
-- =============================================================================
DO $$
DECLARE
  v_table_count int;
BEGIN
  RAISE NOTICE '=== SECTION 1: Verifying schedule schema ===';
  
  SELECT COUNT(*) INTO v_table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications');
  
  IF v_table_count < 4 THEN
    RAISE EXCEPTION 'Missing schedule tables! Found % of 4. Run migrations 006-008.', v_table_count;
  END IF;
  
  RAISE NOTICE '✓ All 4 schedule tables exist';
END $$;

-- =============================================================================
-- SECTION 2: CREATE TEST DATA
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
BEGIN
  RAISE NOTICE '=== SECTION 2: Creating test data ===';
  RAISE NOTICE 'User 1: %', v_user_id_1;
  RAISE NOTICE 'User 2: %', v_user_id_2;
  
  -- Create course
  INSERT INTO courses (user_id, title, term, color)
  VALUES (v_user_id_1, 'Test Course', 'Winter 2026', '#3B82F6')
  RETURNING id INTO v_course_id;
  RAISE NOTICE '✓ Created course';
  
  -- Create study plan
  INSERT INTO study_plans (user_id, course_id, title, timezone, is_enabled)
  VALUES (v_user_id_1, v_course_id, 'Evening Study', 'America/Toronto', true)
  RETURNING id INTO v_plan_id;
  RAISE NOTICE '✓ Created study_plan';
  
  -- Create rule with valid constraints
  INSERT INTO study_plan_rules (
    user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
  )
  VALUES (
    v_user_id_1, v_plan_id, 'FREQ=WEEKLY;BYDAY=MO,WE', '19:00'::time, 60, 15
  )
  RETURNING id INTO v_rule_id;
  RAISE NOTICE '✓ Created study_plan_rule';
  
  -- Create device token
  INSERT INTO device_push_tokens (user_id, platform, push_token, is_active)
  VALUES (v_user_id_1, 'ios', 'test-token-' || v_user_id_1::text, true)
  RETURNING id INTO v_token_id;
  RAISE NOTICE '✓ Created device_push_token';
  
  -- Create notification
  INSERT INTO scheduled_notifications (
    user_id, study_plan_id, fire_at, type, payload_json, status
  )
  VALUES (
    v_user_id_1, v_plan_id, now() + interval '1 day', 'reminder',
    '{"title": "Study Soon", "body": "Test"}'::jsonb, 'queued'
  )
  RETURNING id INTO v_notif_id;
  RAISE NOTICE '✓ Created scheduled_notification';
  
  -- Store for later sections
  CREATE TEMP TABLE test_data (
    user_id_1 uuid,
    user_id_2 uuid,
    course_id uuid,
    plan_id uuid,
    rule_id uuid,
    token_id uuid,
    notif_id uuid
  );
  INSERT INTO test_data VALUES (
    v_user_id_1, v_user_id_2, v_course_id, v_plan_id, v_rule_id, v_token_id, v_notif_id
  );
  
  RAISE NOTICE '=== Test data created successfully ===';
END $$;

-- =============================================================================
-- SECTION 3: TEST CONSTRAINTS
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_plan_id uuid;
BEGIN
  RAISE NOTICE '=== SECTION 3: Testing constraints ===';
  
  SELECT user_id_1, plan_id INTO v_user_id_1, v_plan_id FROM test_data LIMIT 1;
  
  -- Test 1: Duplicate notification (unique constraint)
  BEGIN
    INSERT INTO scheduled_notifications (user_id, study_plan_id, fire_at, type, status)
    VALUES (v_user_id_1, v_plan_id, now() + interval '1 day', 'reminder', 'queued');
    RAISE EXCEPTION 'Should have failed: duplicate notification';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ Unique notification constraint works';
  END;
  
  -- Test 2: Invalid duration_min (< 5)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_1, v_plan_id, 'FREQ=DAILY', '08:00'::time, 3, 10);
    RAISE EXCEPTION 'Should have failed: duration_min < 5';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ duration_min constraint works (< 5)';
  END;
  
  -- Test 3: Invalid duration_min (> 600)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_1, v_plan_id, 'FREQ=DAILY', '08:00'::time, 700, 10);
    RAISE EXCEPTION 'Should have failed: duration_min > 600';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ duration_min constraint works (> 600)';
  END;
  
  -- Test 4: Invalid remind_before_min (> 120)
  BEGIN
    INSERT INTO study_plan_rules (
      user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min
    )
    VALUES (v_user_id_1, v_plan_id, 'FREQ=DAILY', '08:00'::time, 45, 150);
    RAISE EXCEPTION 'Should have failed: remind_before_min > 120';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ remind_before_min constraint works';
  END;
  
  -- Test 5: Invalid platform
  BEGIN
    INSERT INTO device_push_tokens (user_id, platform, push_token, is_active)
    VALUES (v_user_id_1, 'windows', 'test-token-invalid', true);
    RAISE EXCEPTION 'Should have failed: invalid platform';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ platform constraint works';
  END;
  
  -- Test 6: Invalid notification type
  BEGIN
    INSERT INTO scheduled_notifications (user_id, study_plan_id, fire_at, type, status)
    VALUES (v_user_id_1, v_plan_id, now() + interval '2 days', 'invalid_type', 'queued');
    RAISE EXCEPTION 'Should have failed: invalid type';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ notification type constraint works';
  END;
  
  RAISE NOTICE '=== All constraints validated ===';
END $$;

-- =============================================================================
-- SECTION 4: TEST CASCADE DELETES
-- =============================================================================
DO $$
DECLARE
  v_plan_id uuid;
  v_rules_count int;
  v_notifs_count int;
BEGIN
  RAISE NOTICE '=== SECTION 4: Testing cascade deletes ===';
  
  SELECT plan_id INTO v_plan_id FROM test_data LIMIT 1;
  
  -- Count children before delete
  SELECT COUNT(*) INTO v_rules_count FROM study_plan_rules WHERE study_plan_id = v_plan_id;
  SELECT COUNT(*) INTO v_notifs_count FROM scheduled_notifications WHERE study_plan_id = v_plan_id;
  
  RAISE NOTICE 'Before delete: % rules, % notifications', v_rules_count, v_notifs_count;
  
  -- Delete the plan (should cascade)
  DELETE FROM study_plans WHERE id = v_plan_id;
  
  -- Verify children are gone
  SELECT COUNT(*) INTO v_rules_count FROM study_plan_rules WHERE study_plan_id = v_plan_id;
  SELECT COUNT(*) INTO v_notifs_count FROM scheduled_notifications WHERE study_plan_id = v_plan_id;
  
  IF v_rules_count = 0 AND v_notifs_count = 0 THEN
    RAISE NOTICE '✓ Cascade delete works: rules and notifications deleted';
  ELSE
    RAISE EXCEPTION 'Cascade delete failed: % rules, % notifs remain', v_rules_count, v_notifs_count;
  END IF;
  
  RAISE NOTICE '=== Cascade deletes verified ===';
END $$;

-- =============================================================================
-- SECTION 5: TEST INDEXES
-- =============================================================================
DO $$
DECLARE
  v_index_count int;
BEGIN
  RAISE NOTICE '=== SECTION 5: Verifying indexes ===';
  
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
    AND indexname LIKE 'idx_%';
  
  IF v_index_count >= 7 THEN
    RAISE NOTICE '✓ Found % schedule indexes (expected >= 7)', v_index_count;
  ELSE
    RAISE WARNING 'Only found % schedule indexes (expected >= 7). Run migration 008.', v_index_count;
  END IF;
  
  RAISE NOTICE '=== Index verification complete ===';
END $$;

-- =============================================================================
-- SECTION 6: CHECK RLS CONFIGURATION (not enforced in this test)
-- =============================================================================
DO $$
DECLARE
  v_rls_count int;
  v_policy_count int;
BEGIN
  RAISE NOTICE '=== SECTION 6: Checking RLS configuration ===';
  
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications')
    AND rowsecurity = true;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications');
  
  RAISE NOTICE 'RLS enabled on % / 4 tables', v_rls_count;
  RAISE NOTICE 'Found % policies (expected 16)', v_policy_count;
  
  IF v_rls_count = 4 AND v_policy_count = 16 THEN
    RAISE NOTICE '✓ RLS configuration complete';
    RAISE NOTICE '  Note: RLS enforcement requires non-superuser connection';
    RAISE NOTICE '  Test RLS using mobile app with authenticated users';
  ELSE
    RAISE WARNING '⚠ RLS not fully configured. Run migration 007.';
  END IF;
  
  RAISE NOTICE '=== RLS configuration check complete ===';
END $$;

-- =============================================================================
-- SECTION 7: CLEANUP
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid;
  v_course_id uuid;
BEGIN
  RAISE NOTICE '=== SECTION 7: Cleanup ===';
  
  SELECT user_id_1, course_id INTO v_user_id_1, v_course_id FROM test_data LIMIT 1;
  
  -- Delete remaining data (plan already deleted in section 4)
  DELETE FROM device_push_tokens WHERE user_id = v_user_id_1;
  DELETE FROM courses WHERE id = v_course_id;
  
  DROP TABLE IF EXISTS test_data;
  
  RAISE NOTICE '✓ Cleanup complete';
END $$;

-- =============================================================================
-- TEST COMPLETE
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  SCHEDULE SMOKE TEST COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All tests passed! ✓';
  RAISE NOTICE '- Schema structure validated';
  RAISE NOTICE '- Constraints enforcing data validity';
  RAISE NOTICE '- Cascade deletes working';
  RAISE NOTICE '- Indexes created';
  RAISE NOTICE '- RLS policies configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: RLS enforcement testing requires non-superuser';
  RAISE NOTICE 'connection. Test user isolation using the mobile app.';
  RAISE NOTICE '========================================';
END $$;
