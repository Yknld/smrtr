-- =============================================================================
-- DATABASE SMOKE TEST - SIMPLIFIED VERSION
-- =============================================================================
-- This version tests the schema structure without RLS (for initial setup verification)
-- For full RLS testing, use the mobile app with real authenticated users
-- =============================================================================

-- =============================================================================
-- SECTION 1: CREATE TEST DATA
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := gen_random_uuid();
  v_user_id_2 uuid := gen_random_uuid();
  v_course_id uuid;   
  
  v_lesson_id uuid;
  v_session_id uuid;
BEGIN
  RAISE NOTICE '=== Creating test data ===';
  RAISE NOTICE 'Test User 1: %', v_user_id_1;
  RAISE NOTICE 'Test User 2: %', v_user_id_2;
  
  -- Create a course
  INSERT INTO courses (user_id, title, term, color)
  VALUES (v_user_id_1, 'Introduction to Computer Science', 'Fall 2024', '#3B82F6')
  RETURNING id INTO v_course_id;
  RAISE NOTICE '✓ Created course: %', v_course_id;
  
  -- Create a lesson
  INSERT INTO lessons (user_id, course_id, title, source_type, status)
  VALUES (v_user_id_1, v_course_id, 'Lecture 1: Variables and Data Types', 'live_session', 'ready')
  RETURNING id INTO v_lesson_id;
  RAISE NOTICE '✓ Created lesson: %', v_lesson_id;
  
  -- Create a lesson asset
  INSERT INTO lesson_assets (lesson_id, user_id, kind, storage_bucket, storage_path, mime_type, duration_ms)
  VALUES (v_lesson_id, v_user_id_1, 'audio', 'lesson-audio', 'test/lecture1.mp3', 'audio/mpeg', 3600000);
  RAISE NOTICE '✓ Created lesson asset';
  
  -- Create a study session
  INSERT INTO study_sessions (user_id, lesson_id, mode, status)
  VALUES (v_user_id_1, v_lesson_id, 'live_transcribe', 'active')
  RETURNING id INTO v_session_id;
  RAISE NOTICE '✓ Created study session: %', v_session_id;
  
  -- Insert transcript segments
  INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language, start_ms, end_ms, confidence)
  VALUES 
    (v_user_id_1, v_session_id, 1, 'Hello everyone, welcome to the lecture.', 'en', 0, 3000, 0.95),
    (v_user_id_1, v_session_id, 2, 'Today we will discuss variables and data types.', 'en', 3000, 7000, 0.92),
    (v_user_id_1, v_session_id, 3, 'Let''s start with integers and strings.', 'en', 7000, 11000, 0.94);
  RAISE NOTICE '✓ Created 3 transcript segments';
  
  -- Insert translation
  INSERT INTO live_translation_segments (user_id, study_session_id, source_seq, source_lang, target_lang, translated_text, provider)
  VALUES (v_user_id_1, v_session_id, 1, 'en', 'fr', 'Bonjour tout le monde, bienvenue à la conférence.', 'google');
  RAISE NOTICE '✓ Created translation segment';
  
  -- Insert TTS chunk
  INSERT INTO live_tts_chunks (user_id, study_session_id, target_lang, source_seq, audio_bucket, audio_path, duration_ms, provider, status)
  VALUES (v_user_id_1, v_session_id, 'fr', 1, 'tts-audio', 'test/seg1.mp3', 3200, 'elevenlabs', 'ready');
  RAISE NOTICE '✓ Created TTS chunk';
  
  -- Insert lesson progress
  INSERT INTO lesson_progress (user_id, lesson_id, last_position_ms, completed)
  VALUES (v_user_id_1, v_lesson_id, 11000, false);
  RAISE NOTICE '✓ Created lesson progress';
  
  -- Insert user settings
  INSERT INTO user_settings (user_id, default_source_lang, default_target_lang, live_listen_enabled)
  VALUES (v_user_id_1, 'en', 'fr', true);
  RAISE NOTICE '✓ Created user settings';
  
  RAISE NOTICE '=== All test data created successfully ===';
END $$;

-- =============================================================================
-- SECTION 2: TEST UNIQUE CONSTRAINTS
-- =============================================================================
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_course_id uuid;
  v_lesson_id uuid;
  v_session_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Testing unique constraints ===';
  
  -- Create test data
  INSERT INTO courses (user_id, title) VALUES (v_user_id, 'Test Course') RETURNING id INTO v_course_id;
  INSERT INTO lessons (user_id, course_id, title, source_type, status) 
  VALUES (v_user_id, v_course_id, 'Test Lesson', 'upload', 'ready') RETURNING id INTO v_lesson_id;
  INSERT INTO study_sessions (user_id, lesson_id, mode, status)
  VALUES (v_user_id, v_lesson_id, 'listen', 'active') RETURNING id INTO v_session_id;
  
  INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language)
  VALUES (v_user_id, v_session_id, 1, 'Test segment', 'en');
  
  -- Try to insert duplicate (same session_id, seq) - should fail
  BEGIN
    INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language)
    VALUES (v_user_id, v_session_id, 1, 'Duplicate', 'en');
    RAISE EXCEPTION '✗ FAIL: Unique constraint on (study_session_id, seq) did not work!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ PASS: Unique constraint on (study_session_id, seq) works';
  END;
  
  -- Insert translation
  INSERT INTO live_translation_segments (user_id, study_session_id, source_seq, source_lang, target_lang, translated_text, provider)
  VALUES (v_user_id, v_session_id, 1, 'en', 'fr', 'Test', 'google');
  
  -- Try to insert duplicate translation - should fail
  BEGIN
    INSERT INTO live_translation_segments (user_id, study_session_id, source_seq, source_lang, target_lang, translated_text, provider)
    VALUES (v_user_id, v_session_id, 1, 'en', 'fr', 'Duplicate', 'google');
    RAISE EXCEPTION '✗ FAIL: Unique constraint on (study_session_id, source_seq, target_lang) did not work!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ PASS: Unique constraint on (study_session_id, source_seq, target_lang) works';
  END;
  
  -- Cleanup
  DELETE FROM courses WHERE id = v_course_id;
  
  RAISE NOTICE '=== Unique constraints verified ===';
END $$;

-- =============================================================================
-- SECTION 3: TEST CASCADE DELETES
-- =============================================================================
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_course_id uuid;
  v_lesson_id uuid;
  v_session_id uuid;
  v_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Testing cascade deletes ===';
  
  -- Create full hierarchy
  INSERT INTO courses (user_id, title) VALUES (v_user_id, 'Test Course') RETURNING id INTO v_course_id;
  INSERT INTO lessons (user_id, course_id, title, source_type, status) 
  VALUES (v_user_id, v_course_id, 'Test Lesson', 'upload', 'ready') RETURNING id INTO v_lesson_id;
  INSERT INTO lesson_assets (lesson_id, user_id, kind, storage_bucket, storage_path, mime_type)
  VALUES (v_lesson_id, v_user_id, 'pdf', 'test', 'test.pdf', 'application/pdf');
  INSERT INTO study_sessions (user_id, lesson_id, mode, status)
  VALUES (v_user_id, v_lesson_id, 'listen', 'active') RETURNING id INTO v_session_id;
  INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language)
  VALUES (v_user_id, v_session_id, 1, 'Test', 'en');
  INSERT INTO live_translation_segments (user_id, study_session_id, source_seq, source_lang, target_lang, translated_text, provider)
  VALUES (v_user_id, v_session_id, 1, 'en', 'fr', 'Test', 'google');
  INSERT INTO live_tts_chunks (user_id, study_session_id, target_lang, audio_bucket, audio_path, provider, status)
  VALUES (v_user_id, v_session_id, 'fr', 'test', 'test.mp3', 'google', 'ready');
  
  RAISE NOTICE 'Created complete test hierarchy';
  
  -- Verify data exists
  SELECT COUNT(*) INTO v_count FROM lessons WHERE id = v_lesson_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Test data not created correctly'; END IF;
  
  -- Delete the course
  DELETE FROM courses WHERE id = v_course_id;
  RAISE NOTICE 'Deleted course (should cascade)';
  
  -- Verify everything was deleted
  SELECT COUNT(*) INTO v_count FROM lessons WHERE id = v_lesson_id;
  IF v_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cascade delete removed lesson';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Lesson was not deleted';
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM study_sessions WHERE id = v_session_id;
  IF v_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cascade delete removed study session';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Study session was not deleted';
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM live_transcript_segments WHERE study_session_id = v_session_id;
  IF v_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cascade delete removed transcript segments';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Transcript segments were not deleted';
  END IF;
  
  RAISE NOTICE '=== Cascade deletes verified ===';
END $$;

-- =============================================================================
-- TEST COMPLETE
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '   DATABASE SMOKE TEST COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✓ Schema structure: PASS (all tables created)';
  RAISE NOTICE '  ✓ Unique constraints: PASS (duplicates blocked)';
  RAISE NOTICE '  ✓ Cascade deletes: PASS (related records deleted)';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: RLS policies are enabled but not tested here.';
  RAISE NOTICE 'Test RLS by using the mobile app with real authenticated users.';
  RAISE NOTICE '';
END $$;