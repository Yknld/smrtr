-- ============================================================================
-- Notes Feature - Smoke Test
-- ============================================================================
-- 
-- Purpose: Verify notes support in lesson_outputs works correctly
-- 
-- Test Coverage:
-- 1. Insert lesson with course
-- 2. Insert notes output
-- 3. Update raw notes text
-- 4. Update last_committed_seq (incremental processing)
-- 5. Finalize notes (set notes_final_text)
-- 6. Query notes by lesson
-- 7. Cleanup
-- 
-- Expected: All operations succeed, constraints enforced, indexes used
-- 
-- ============================================================================

BEGIN;

-- =============================================================================
-- Setup: Create test user, course, and lesson
-- =============================================================================

-- Note: In real app, user_id comes from auth.users
-- For smoke test, we'll use a fake UUID
DO $$
DECLARE
  test_user_id uuid := 'a0000000-0000-0000-0000-000000000001';
  test_course_id uuid;
  test_lesson_id uuid;
  test_notes_id uuid;
BEGIN
  
  -- Clean up any existing test data
  DELETE FROM lesson_outputs WHERE user_id = test_user_id;
  DELETE FROM lessons WHERE user_id = test_user_id;
  DELETE FROM courses WHERE user_id = test_user_id;
  
  RAISE NOTICE '✓ Cleaned up existing test data';
  
  -- =============================================================================
  -- Test 1: Create course and lesson
  -- =============================================================================
  
  INSERT INTO courses (id, user_id, title, color)
  VALUES (gen_random_uuid(), test_user_id, 'Test Course', '#3B82F6')
  RETURNING id INTO test_course_id;
  
  RAISE NOTICE '✓ Test 1: Created course: %', test_course_id;
  
  INSERT INTO lessons (id, user_id, course_id, title, source_type, status)
  VALUES (gen_random_uuid(), test_user_id, test_course_id, 'Test Lesson', 'live_session', 'ready')
  RETURNING id INTO test_lesson_id;
  
  RAISE NOTICE '✓ Test 1: Created lesson: %', test_lesson_id;
  
  -- =============================================================================
  -- Test 2: Insert notes output
  -- =============================================================================
  
  INSERT INTO lesson_outputs (
    id,
    user_id,
    lesson_id,
    type,
    status,
    content_json,
    notes_raw_text,
    last_committed_seq
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    test_lesson_id,
    'notes',
    'queued',
    '{}'::jsonb,
    '',
    0
  )
  RETURNING id INTO test_notes_id;
  
  RAISE NOTICE '✓ Test 2: Created notes output: %', test_notes_id;
  
  -- Verify notes was created
  IF NOT EXISTS (
    SELECT 1 FROM lesson_outputs 
    WHERE id = test_notes_id AND type = 'notes'
  ) THEN
    RAISE EXCEPTION 'Test 2 FAILED: Notes output not found';
  END IF;
  
  -- =============================================================================
  -- Test 3: Update raw notes text (simulating incremental updates)
  -- =============================================================================
  
  -- First update: Process transcript segments 1-3
  UPDATE lesson_outputs
  SET 
    notes_raw_text = '# Design Sprints

A design sprint is a structured process for solving problems and testing ideas.',
    last_committed_seq = 3,
    status = 'ready',
    updated_at = now()
  WHERE id = test_notes_id;
  
  RAISE NOTICE '✓ Test 3: Updated notes (seq 0→3)';
  
  -- Second update: Process transcript segments 4-6
  UPDATE lesson_outputs
  SET 
    notes_raw_text = notes_raw_text || E'\n\n## Key Benefits

- Rapid validation
- Team alignment
- Reduced risk',
    last_committed_seq = 6,
    updated_at = now()
  WHERE id = test_notes_id;
  
  RAISE NOTICE '✓ Test 3: Updated notes (seq 3→6)';
  
  -- Verify incremental update worked
  IF (SELECT last_committed_seq FROM lesson_outputs WHERE id = test_notes_id) != 6 THEN
    RAISE EXCEPTION 'Test 3 FAILED: last_committed_seq not updated correctly';
  END IF;
  
  -- =============================================================================
  -- Test 4: Finalize notes (set final polished text)
  -- =============================================================================
  
  UPDATE lesson_outputs
  SET 
    notes_final_text = '# Design Sprints - Final Notes

A design sprint is a structured, time-constrained process for solving complex problems.

## Key Benefits
- **Rapid Validation**: Test ideas in days, not months
- **Team Alignment**: Get everyone on the same page
- **Reduced Risk**: Find problems before building',
    updated_at = now()
  WHERE id = test_notes_id;
  
  RAISE NOTICE '✓ Test 4: Finalized notes (set notes_final_text)';
  
  -- Verify both raw and final exist
  IF NOT EXISTS (
    SELECT 1 FROM lesson_outputs 
    WHERE id = test_notes_id 
      AND notes_raw_text IS NOT NULL 
      AND notes_final_text IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Test 4 FAILED: Final text not set correctly';
  END IF;
  
  -- =============================================================================
  -- Test 5: Query notes by lesson
  -- =============================================================================
  
  -- Query notes for specific lesson (common operation)
  IF NOT EXISTS (
    SELECT 1 FROM lesson_outputs
    WHERE lesson_id = test_lesson_id 
      AND type = 'notes'
      AND status = 'ready'
  ) THEN
    RAISE EXCEPTION 'Test 5 FAILED: Could not query notes by lesson_id';
  END IF;
  
  RAISE NOTICE '✓ Test 5: Queried notes by lesson_id';
  
  -- =============================================================================
  -- Test 6: Verify indexes exist
  -- =============================================================================
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lesson_outputs_lesson_type'
  ) THEN
    RAISE EXCEPTION 'Test 6 FAILED: Index idx_lesson_outputs_lesson_type missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lesson_outputs_user_type'
  ) THEN
    RAISE EXCEPTION 'Test 6 FAILED: Index idx_lesson_outputs_user_type missing';
  END IF;
  
  RAISE NOTICE '✓ Test 6: Verified indexes exist';
  
  -- =============================================================================
  -- Test 7: Test constraint - invalid type should fail
  -- =============================================================================
  
  BEGIN
    INSERT INTO lesson_outputs (
      user_id, lesson_id, type, status, content_json
    ) VALUES (
      test_user_id, test_lesson_id, 'invalid_type', 'ready', '{}'::jsonb
    );
    RAISE EXCEPTION 'Test 7 FAILED: Invalid type was accepted';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Test 7: Type constraint working (rejected invalid type)';
  END;
  
  -- =============================================================================
  -- Test 8: Full notes record retrieval
  -- =============================================================================
  
  -- Verify we can retrieve complete notes record
  DECLARE
    notes_record RECORD;
  BEGIN
    SELECT 
      lo.id,
      lo.type,
      lo.status,
      lo.notes_raw_text,
      lo.notes_final_text,
      lo.last_committed_seq,
      lo.updated_at,
      l.title as lesson_title
    INTO notes_record
    FROM lesson_outputs lo
    JOIN lessons l ON l.id = lo.lesson_id
    WHERE lo.id = test_notes_id;
    
    RAISE NOTICE '✓ Test 8: Retrieved full notes record:';
    RAISE NOTICE '  - Lesson: %', notes_record.lesson_title;
    RAISE NOTICE '  - Type: %', notes_record.type;
    RAISE NOTICE '  - Status: %', notes_record.status;
    RAISE NOTICE '  - Last committed seq: %', notes_record.last_committed_seq;
    RAISE NOTICE '  - Raw text length: % chars', length(notes_record.notes_raw_text);
    RAISE NOTICE '  - Final text length: % chars', length(notes_record.notes_final_text);
  END;
  
  -- =============================================================================
  -- Cleanup
  -- =============================================================================
  
  DELETE FROM lesson_outputs WHERE user_id = test_user_id;
  DELETE FROM lessons WHERE user_id = test_user_id;
  DELETE FROM courses WHERE user_id = test_user_id;
  
  RAISE NOTICE '✓ Cleanup: Removed test data';
  
  -- =============================================================================
  -- Summary
  -- =============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✓ ALL TESTS PASSED';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Notes feature is working correctly:';
  RAISE NOTICE '  - Type constraint includes "notes"';
  RAISE NOTICE '  - notes_raw_text column working';
  RAISE NOTICE '  - notes_final_text column working';
  RAISE NOTICE '  - last_committed_seq tracking working';
  RAISE NOTICE '  - Incremental updates working';
  RAISE NOTICE '  - Indexes created';
  RAISE NOTICE '  - Queries working';
  RAISE NOTICE '================================================';
  
END $$;

ROLLBACK;
