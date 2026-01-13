-- Migration 005: Indexes for Performance
-- Create indexes on frequently queried columns

-- =============================================================================
-- COURSES INDEXES
-- =============================================================================
CREATE INDEX idx_courses_user_id_created_at 
  ON courses(user_id, created_at DESC);

COMMENT ON INDEX idx_courses_user_id_created_at IS 'For listing user courses sorted by creation date';

-- =============================================================================
-- LESSONS INDEXES
-- =============================================================================
CREATE INDEX idx_lessons_user_id_course_id 
  ON lessons(user_id, course_id);

CREATE INDEX idx_lessons_user_id_last_opened_at 
  ON lessons(user_id, last_opened_at DESC NULLS LAST);

COMMENT ON INDEX idx_lessons_user_id_course_id IS 'For fetching lessons within a course';
COMMENT ON INDEX idx_lessons_user_id_last_opened_at IS 'For "recently opened" lesson lists';

-- =============================================================================
-- LESSON_ASSETS INDEXES
-- =============================================================================
CREATE INDEX idx_lesson_assets_lesson_id 
  ON lesson_assets(lesson_id);

CREATE INDEX idx_lesson_assets_user_id 
  ON lesson_assets(user_id);

COMMENT ON INDEX idx_lesson_assets_lesson_id IS 'For loading all assets for a lesson';
COMMENT ON INDEX idx_lesson_assets_user_id IS 'For RLS policy checks';

-- =============================================================================
-- STUDY_SESSIONS INDEXES
-- =============================================================================
CREATE INDEX idx_study_sessions_user_id_lesson_id 
  ON study_sessions(user_id, lesson_id);

CREATE INDEX idx_study_sessions_user_id_started_at 
  ON study_sessions(user_id, started_at DESC);

CREATE INDEX idx_study_sessions_status 
  ON study_sessions(status) WHERE status = 'active';

COMMENT ON INDEX idx_study_sessions_user_id_lesson_id IS 'For fetching sessions for a specific lesson';
COMMENT ON INDEX idx_study_sessions_user_id_started_at IS 'For recent session history';
COMMENT ON INDEX idx_study_sessions_status IS 'Partial index for finding active sessions (cleanup jobs)';

-- =============================================================================
-- LIVE_TRANSCRIPT_SEGMENTS INDEXES
-- =============================================================================
CREATE INDEX idx_live_transcript_segments_study_session_id_seq 
  ON live_transcript_segments(study_session_id, seq);

CREATE INDEX idx_live_transcript_segments_user_id 
  ON live_transcript_segments(user_id);

COMMENT ON INDEX idx_live_transcript_segments_study_session_id_seq IS 'For fetching ordered segments (already unique, but useful for range queries)';
COMMENT ON INDEX idx_live_transcript_segments_user_id IS 'For RLS policy checks';

-- =============================================================================
-- LIVE_TRANSLATION_SEGMENTS INDEXES
-- =============================================================================
CREATE INDEX idx_live_translation_segments_study_session_id_target_lang 
  ON live_translation_segments(study_session_id, target_lang, source_seq);

CREATE INDEX idx_live_translation_segments_user_id 
  ON live_translation_segments(user_id);

COMMENT ON INDEX idx_live_translation_segments_study_session_id_target_lang IS 'For fetching translations for a specific language';
COMMENT ON INDEX idx_live_translation_segments_user_id IS 'For RLS policy checks';

-- =============================================================================
-- LIVE_TTS_CHUNKS INDEXES
-- =============================================================================
CREATE INDEX idx_live_tts_chunks_study_session_id_target_lang 
  ON live_tts_chunks(study_session_id, target_lang, created_at);

CREATE INDEX idx_live_tts_chunks_status 
  ON live_tts_chunks(status) WHERE status = 'queued';

CREATE INDEX idx_live_tts_chunks_user_id 
  ON live_tts_chunks(user_id);

COMMENT ON INDEX idx_live_tts_chunks_study_session_id_target_lang IS 'For fetching TTS audio chunks for playback';
COMMENT ON INDEX idx_live_tts_chunks_status IS 'Partial index for TTS processing queue';
COMMENT ON INDEX idx_live_tts_chunks_user_id IS 'For RLS policy checks';

-- =============================================================================
-- LESSON_OUTPUTS INDEXES
-- =============================================================================
CREATE INDEX idx_lesson_outputs_lesson_id_type 
  ON lesson_outputs(lesson_id, type);

CREATE INDEX idx_lesson_outputs_user_id 
  ON lesson_outputs(user_id);

CREATE INDEX idx_lesson_outputs_status 
  ON lesson_outputs(status) WHERE status = 'queued';

COMMENT ON INDEX idx_lesson_outputs_lesson_id_type IS 'For fetching specific output types for a lesson';
COMMENT ON INDEX idx_lesson_outputs_user_id IS 'For RLS policy checks';
COMMENT ON INDEX idx_lesson_outputs_status IS 'Partial index for AI generation queue';

-- =============================================================================
-- LESSON_PROGRESS INDEXES
-- =============================================================================
-- Primary key (user_id, lesson_id) already provides necessary indexing

CREATE INDEX idx_lesson_progress_lesson_id 
  ON lesson_progress(lesson_id);

COMMENT ON INDEX idx_lesson_progress_lesson_id IS 'For reverse lookups (e.g., finding all users who accessed a lesson)';

-- =============================================================================
-- USER_SETTINGS INDEXES
-- =============================================================================
-- Primary key (user_id) already provides necessary indexing
-- No additional indexes needed for this table
