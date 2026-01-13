-- =============================================================================
-- DATABASE SMOKE TEST
-- =============================================================================
-- Tests RLS policies and basic data isolation between users
--
-- SETUP: Run after all migrations are applied
-- 
-- To run this test:
-- 1. Replace the test UUIDs below (user_id_1 and user_id_2) with actual UUIDs
-- 2. Execute the entire script in Supabase SQL Editor or any SQL client
--
-- Expected behavior:
-- - User 1 can see their own data
-- - User 2 cannot see user 1's data
-- - User 2 cannot insert into user 1's resources
-- =============================================================================

-- =============================================================================
-- SECTION A: USER 1 CREATES DATA
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
  v_user_id_2 uuid := '22222222-2222-2222-2222-222222222222'; -- REPLACE WITH ACTUAL UUID
  v_course_id uuid;
  v_lesson_id uuid;
  v_session_id uuid;
BEGIN
  RAISE NOTICE '=== SECTION A: User 1 creates data ===';
  
  -- Set session as user 1
  PERFORM set_config('request.jwt.claim.sub', v_user_id_1::text, true);
  
  -- A1: Create a course
  INSERT INTO courses (user_id, title, term, color)
  VALUES (v_user_id_1, 'Introduction to Computer Science', 'Fall 2024', '#3B82F6')
  RETURNING id INTO v_course_id;
  RAISE NOTICE 'Created course: %', v_course_id;
  
  -- A2: Create a lesson in that course
  INSERT INTO lessons (user_id, course_id, title, source_type, status)
  VALUES (v_user_id_1, v_course_id, 'Lecture 1: Variables and Data Types', 'live_session', 'ready')
  RETURNING id INTO v_lesson_id;
  RAISE NOTICE 'Created lesson: %', v_lesson_id;
  
  -- A3: Create a lesson asset
  INSERT INTO lesson_assets (lesson_id, user_id, kind, storage_bucket, storage_path, mime_type, duration_ms)
  VALUES (v_lesson_id, v_user_id_1, 'audio', 'lesson-audio', 'user1/lecture1.mp3', 'audio/mpeg', 3600000);
  RAISE NOTICE 'Created lesson asset';
  
  -- A4: Create a study session
  INSERT INTO study_sessions (user_id, lesson_id, mode, status)
  VALUES (v_user_id_1, v_lesson_id, 'live_transcribe', 'active')
  RETURNING id INTO v_session_id;
  RAISE NOTICE 'Created study session: %', v_session_id;
  
  -- A5: Insert transcript segments (seq 1, 2, 3)
  INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language, start_ms, end_ms, confidence)
  VALUES 
    (v_user_id_1, v_session_id, 1, 'Hello everyone, welcome to the lecture.', 'en', 0, 3000, 0.95),
    (v_user_id_1, v_session_id, 2, 'Today we will discuss variables and data types.', 'en', 3000, 7000, 0.92),
    (v_user_id_1, v_session_id, 3, 'Let''s start with integers and strings.', 'en', 7000, 11000, 0.94);
  RAISE NOTICE 'Created 3 transcript segments';
  
  -- A6: Insert translation for seq 1 (target_lang='fr')
  INSERT INTO live_translation_segments (user_id, study_session_id, source_seq, source_lang, target_lang, translated_text, provider)
  VALUES (v_user_id_1, v_session_id, 1, 'en', 'fr', 'Bonjour tout le monde, bienvenue à la conférence.', 'google');
  RAISE NOTICE 'Created 1 translation segment';
  
  -- A7: Insert TTS chunk for seq 1 (status='ready')
  INSERT INTO live_tts_chunks (user_id, study_session_id, target_lang, source_seq, audio_bucket, audio_path, duration_ms, provider, status)
  VALUES (v_user_id_1, v_session_id, 'fr', 1, 'tts-audio', 'user1/session1/seg1.mp3', 3200, 'elevenlabs', 'ready');
  RAISE NOTICE 'Created TTS chunk';
  
  -- A8: Upsert lesson progress
  INSERT INTO lesson_progress (user_id, lesson_id, last_position_ms, completed)
  VALUES (v_user_id_1, v_lesson_id, 11000, false)
  ON CONFLICT (user_id, lesson_id) 
  DO UPDATE SET last_position_ms = EXCLUDED.last_position_ms, updated_at = now();
  RAISE NOTICE 'Created/updated lesson progress';
  
  -- A9: Create user settings
  INSERT INTO user_settings (user_id, default_source_lang, default_target_lang, live_listen_enabled)
  VALUES (v_user_id_1, 'en', 'fr', true)
  ON CONFLICT (user_id) DO NOTHING;
  RAISE NOTICE 'Created user settings';
  
  RAISE NOTICE '=== User 1 data created successfully ===';
END $$;

-- =============================================================================
-- SECTION A - VERIFICATION: Check User 1's data is visible
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
  v_courses_count int;
  v_lessons_count int;
  v_sessions_count int;
  v_transcript_count int;
  v_translation_count int;
  v_tts_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Verifying User 1 can see their data ===';
  
  -- Still as user 1 from previous block
  PERFORM set_config('request.jwt.claim.sub', v_user_id_1::text, true);
  
  SELECT COUNT(*) INTO v_courses_count FROM courses WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 1 courses: % (expected: 1)', v_courses_count;
  
  SELECT COUNT(*) INTO v_lessons_count FROM lessons WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 1 lessons: % (expected: 1)', v_lessons_count;
  
  SELECT COUNT(*) INTO v_sessions_count FROM study_sessions WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 1 sessions: % (expected: 1)', v_sessions_count;
  
  SELECT COUNT(*) INTO v_transcript_count FROM live_transcript_segments WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 1 transcripts: % (expected: 3)', v_transcript_count;
  
  SELECT COUNT(*) INTO v_translation_count FROM live_translation_segments WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 1 translations: % (expected: 1)', v_translation_count;
  
  SELECT COUNT(*) INTO v_tts_count FROM live_tts_chunks WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 1 TTS chunks: % (expected: 1)', v_tts_count;
  
  IF v_courses_count = 1 AND v_lessons_count = 1 AND v_sessions_count = 1 
     AND v_transcript_count = 3 AND v_translation_count = 1 AND v_tts_count = 1 THEN
    RAISE NOTICE '✓ PASS: User 1 can see all their data';
  ELSE
    RAISE EXCEPTION '✗ FAIL: User 1 data counts incorrect';
  END IF;
END $$;

-- =============================================================================
-- SECTION B: USER 2 ATTEMPTS TO ACCESS USER 1 DATA
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
  v_user_id_2 uuid := '22222222-2222-2222-2222-222222222222'; -- REPLACE WITH ACTUAL UUID
  v_lesson_id uuid;
  v_session_id uuid;
  v_courses_count int;
  v_lessons_count int;
  v_sessions_count int;
  v_transcripts_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SECTION B: User 2 attempts to access User 1 data ===';
  
  -- Get IDs from User 1's data (we need these for later tests)
  PERFORM set_config('request.jwt.claim.sub', v_user_id_1::text, true);
  SELECT id INTO v_lesson_id FROM lessons WHERE user_id = v_user_id_1 LIMIT 1;
  SELECT id INTO v_session_id FROM study_sessions WHERE user_id = v_user_id_1 LIMIT 1;
  
  -- Switch to user 2
  PERFORM set_config('request.jwt.claim.sub', v_user_id_2::text, true);
  
  -- B1-B4: User 2 tries to SELECT user 1's data (should all return 0)
  SELECT COUNT(*) INTO v_courses_count FROM courses WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 2 sees User 1 courses: % (expected: 0)', v_courses_count;
  
  SELECT COUNT(*) INTO v_lessons_count FROM lessons WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 2 sees User 1 lessons: % (expected: 0)', v_lessons_count;
  
  SELECT COUNT(*) INTO v_sessions_count FROM study_sessions WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 2 sees User 1 sessions: % (expected: 0)', v_sessions_count;
  
  SELECT COUNT(*) INTO v_transcripts_count FROM live_transcript_segments WHERE user_id = v_user_id_1;
  RAISE NOTICE 'User 2 sees User 1 transcripts: % (expected: 0)', v_transcripts_count;
  
  IF v_courses_count = 0 AND v_lessons_count = 0 AND v_sessions_count = 0 AND v_transcripts_count = 0 THEN
    RAISE NOTICE '✓ PASS: User 2 cannot see User 1 data (RLS working)';
  ELSE
    RAISE EXCEPTION '✗ FAIL: User 2 can see User 1 data (RLS broken!)';
  END IF;
  
  -- B5: User 2 tries to INSERT into user 1's lesson (should fail)
  BEGIN
    INSERT INTO study_sessions (user_id, lesson_id, mode, status)
    VALUES (v_user_id_2, v_lesson_id, 'listen', 'active');
    RAISE EXCEPTION '✗ FAIL: User 2 should NOT be able to insert into User 1 lesson!';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✓ PASS: User 2 correctly blocked from inserting session into User 1 lesson';
  END;
  
  -- B6: User 2 tries to INSERT lesson asset for user 1's lesson (should fail)
  BEGIN
    INSERT INTO lesson_assets (lesson_id, user_id, kind, storage_bucket, storage_path, mime_type)
    VALUES (v_lesson_id, v_user_id_2, 'pdf', 'lesson-docs', 'user2/hack.pdf', 'application/pdf');
    RAISE EXCEPTION '✗ FAIL: User 2 should NOT be able to insert assets into User 1 lesson!';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✓ PASS: User 2 correctly blocked from inserting asset into User 1 lesson';
  END;
  
  -- B7: User 2 tries to INSERT transcript into user 1's session (should fail)
  BEGIN
    INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language)
    VALUES (v_user_id_2, v_session_id, 99, 'Hacked message', 'en');
    RAISE EXCEPTION '✗ FAIL: User 2 should NOT be able to insert into User 1 session!';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '✓ PASS: User 2 correctly blocked from inserting transcript into User 1 session';
  END;
  
  RAISE NOTICE '=== User 2 isolation verified ===';
END $$;

-- =============================================================================
-- SECTION C: SWITCH BACK TO USER 1 AND VERIFY DATA STILL VISIBLE
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
  v_courses_count int;
  v_lessons_count int;
  v_sessions_count int;
  v_transcript_count int;
  v_translation_count int;
  v_tts_count int;
  v_progress_count int;
  v_settings_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SECTION C: User 1 verifies data is still intact ===';
  
  -- Set session back to user 1
  PERFORM set_config('request.jwt.claim.sub', v_user_id_1::text, true);
  
  -- Verify all data is still visible
  SELECT COUNT(*) INTO v_courses_count FROM courses WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_lessons_count FROM lessons WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_sessions_count FROM study_sessions WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_transcript_count FROM live_transcript_segments WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_translation_count FROM live_translation_segments WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_tts_count FROM live_tts_chunks WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_progress_count FROM lesson_progress WHERE user_id = v_user_id_1;
  SELECT COUNT(*) INTO v_settings_count FROM user_settings WHERE user_id = v_user_id_1;
  
  RAISE NOTICE 'Courses: % | Lessons: % | Sessions: % | Transcripts: %', 
    v_courses_count, v_lessons_count, v_sessions_count, v_transcript_count;
  RAISE NOTICE 'Translations: % | TTS: % | Progress: % | Settings: %',
    v_translation_count, v_tts_count, v_progress_count, v_settings_count;
  
  IF v_courses_count = 1 AND v_lessons_count = 1 AND v_sessions_count = 1 
     AND v_transcript_count = 3 AND v_translation_count = 1 AND v_tts_count = 1
     AND v_progress_count = 1 AND v_settings_count = 1 THEN
    RAISE NOTICE '✓ PASS: User 1 data still intact after User 2 access attempts';
  ELSE
    RAISE EXCEPTION '✗ FAIL: User 1 data was modified!';
  END IF;
END $$;

-- =============================================================================
-- SECTION D: TEST UNIQUE CONSTRAINTS
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
  v_session_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SECTION D: Test unique constraints ===';
  
  -- Set session as user 1
  PERFORM set_config('request.jwt.claim.sub', v_user_id_1::text, true);
  
  -- Get session ID
  SELECT id INTO v_session_id FROM study_sessions WHERE user_id = v_user_id_1 LIMIT 1;
  
  -- D1: Try to insert duplicate transcript segment (same study_session_id, seq) - should fail
  BEGIN
    INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text, language)
    VALUES (v_user_id_1, v_session_id, 1, 'Duplicate segment', 'en');
    RAISE EXCEPTION '✗ FAIL: Should not allow duplicate (study_session_id, seq)!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ PASS: Unique constraint on (study_session_id, seq) works correctly';
  END;
  
  -- D2: Try to insert duplicate translation (same study_session_id, source_seq, target_lang) - should fail
  BEGIN
    INSERT INTO live_translation_segments (user_id, study_session_id, source_seq, source_lang, target_lang, translated_text, provider)
    VALUES (v_user_id_1, v_session_id, 1, 'en', 'fr', 'Duplicate translation', 'google');
    RAISE EXCEPTION '✗ FAIL: Should not allow duplicate (study_session_id, source_seq, target_lang)!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ PASS: Unique constraint on (study_session_id, source_seq, target_lang) works correctly';
  END;
  
  RAISE NOTICE '=== Unique constraints verified ===';
END $$;

-- =============================================================================
-- SECTION E: TEST CASCADE DELETES
-- =============================================================================
DO $$
DECLARE
  v_user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
  v_course_id uuid;
  v_lesson_id uuid;
  v_session_id uuid;
  v_lessons_before int;
  v_assets_before int;
  v_sessions_before int;
  v_transcripts_before int;
  v_translations_before int;
  v_tts_before int;
  v_courses_after int;
  v_lessons_after int;
  v_assets_after int;
  v_sessions_after int;
  v_transcripts_after int;
  v_translations_after int;
  v_tts_after int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SECTION E: Test cascade deletes ===';
  
  -- Set session as user 1
  PERFORM set_config('request.jwt.claim.sub', v_user_id_1::text, true);
  
  -- Get IDs
  SELECT id INTO v_course_id FROM courses WHERE user_id = v_user_id_1 LIMIT 1;
  SELECT id INTO v_lesson_id FROM lessons WHERE user_id = v_user_id_1 LIMIT 1;
  SELECT id INTO v_session_id FROM study_sessions WHERE user_id = v_user_id_1 LIMIT 1;
  
  -- E1: Count related records before delete
  SELECT COUNT(*) INTO v_lessons_before FROM lessons WHERE lessons.course_id = v_course_id;
  SELECT COUNT(*) INTO v_assets_before FROM lesson_assets WHERE lesson_assets.lesson_id = v_lesson_id;
  SELECT COUNT(*) INTO v_sessions_before FROM study_sessions WHERE study_sessions.lesson_id = v_lesson_id;
  SELECT COUNT(*) INTO v_transcripts_before FROM live_transcript_segments WHERE study_session_id = v_session_id;
  SELECT COUNT(*) INTO v_translations_before FROM live_translation_segments WHERE study_session_id = v_session_id;
  SELECT COUNT(*) INTO v_tts_before FROM live_tts_chunks WHERE study_session_id = v_session_id;
  
  RAISE NOTICE 'Before delete - Lessons: % | Assets: % | Sessions: % | Transcripts: % | Translations: % | TTS: %',
    v_lessons_before, v_assets_before, v_sessions_before, 
    v_transcripts_before, v_translations_before, v_tts_before;
  
  IF v_lessons_before <> 1 OR v_assets_before <> 1 OR v_sessions_before <> 1 
     OR v_transcripts_before <> 3 OR v_translations_before <> 1 OR v_tts_before <> 1 THEN
    RAISE EXCEPTION '✗ FAIL: Unexpected counts before cascade delete';
  END IF;
  
  -- E2: Delete the course (should cascade to lessons, assets, sessions, and all related data)
  DELETE FROM courses WHERE id = v_course_id;
  RAISE NOTICE 'Course deleted (should cascade to all related records)';
  
  -- E3: Verify cascade deletes worked
  SELECT COUNT(*) INTO v_courses_after FROM courses WHERE id = v_course_id;
  SELECT COUNT(*) INTO v_lessons_after FROM lessons WHERE id = v_lesson_id;
  SELECT COUNT(*) INTO v_assets_after FROM lesson_assets WHERE lesson_assets.lesson_id = v_lesson_id;
  SELECT COUNT(*) INTO v_sessions_after FROM study_sessions WHERE id = v_session_id;
  SELECT COUNT(*) INTO v_transcripts_after FROM live_transcript_segments WHERE study_session_id = v_session_id;
  SELECT COUNT(*) INTO v_translations_after FROM live_translation_segments WHERE study_session_id = v_session_id;
  SELECT COUNT(*) INTO v_tts_after FROM live_tts_chunks WHERE study_session_id = v_session_id;
  
  RAISE NOTICE 'After delete - Courses: % | Lessons: % | Assets: % | Sessions: % | Transcripts: % | Translations: % | TTS: %',
    v_courses_after, v_lessons_after, v_assets_after, 
    v_sessions_after, v_transcripts_after, v_translations_after, v_tts_after;
  
  IF v_courses_after = 0 AND v_lessons_after = 0 AND v_assets_after = 0 
     AND v_sessions_after = 0 AND v_transcripts_after = 0 
     AND v_translations_after = 0 AND v_tts_after = 0 THEN
    RAISE NOTICE '✓ PASS: Cascade deletes working correctly (all related records deleted)';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Cascade deletes did not remove all related records';
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
  RAISE NOTICE '    DATABASE SMOKE TEST COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✓ User isolation: PASS (User 2 cannot see or modify User 1 data)';
  RAISE NOTICE '  ✓ Unique constraints: PASS (Duplicate seq/source_seq blocked)';
  RAISE NOTICE '  ✓ Cascade deletes: PASS (Related records deleted)';
  RAISE NOTICE '';
  RAISE NOTICE 'All RLS policies and constraints working correctly!';
  RAISE NOTICE '';
END $$;
