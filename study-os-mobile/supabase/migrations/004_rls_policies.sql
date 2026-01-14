-- Migration 004: Row Level Security Policies
-- Enable RLS and create user isolation policies for all tables

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_translation_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_tts_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COURSES POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own courses"
  ON courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own courses"
  ON courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
  ON courses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
  ON courses FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LESSONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own lessons"
  ON lessons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lessons"
  ON lessons FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own lessons"
  ON lessons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lessons"
  ON lessons FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LESSON_ASSETS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own lesson assets"
  ON lesson_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson assets"
  ON lesson_assets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_id AND lessons.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own lesson assets"
  ON lesson_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson assets"
  ON lesson_assets FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- STUDY_SESSIONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_id AND lessons.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LIVE_TRANSCRIPT_SEGMENTS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own transcript segments"
  ON live_transcript_segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transcript segments"
  ON live_transcript_segments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM study_sessions WHERE study_sessions.id = study_session_id AND study_sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own transcript segments"
  ON live_transcript_segments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcript segments"
  ON live_transcript_segments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LIVE_TRANSLATION_SEGMENTS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own translation segments"
  ON live_translation_segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own translation segments"
  ON live_translation_segments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM study_sessions WHERE study_sessions.id = study_session_id AND study_sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own translation segments"
  ON live_translation_segments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own translation segments"
  ON live_translation_segments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LIVE_TTS_CHUNKS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own TTS chunks"
  ON live_tts_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TTS chunks"
  ON live_tts_chunks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM study_sessions WHERE study_sessions.id = study_session_id AND study_sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own TTS chunks"
  ON live_tts_chunks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TTS chunks"
  ON live_tts_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LESSON_OUTPUTS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own lesson outputs"
  ON lesson_outputs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson outputs"
  ON lesson_outputs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_id AND lessons.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own lesson outputs"
  ON lesson_outputs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson outputs"
  ON lesson_outputs FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LESSON_PROGRESS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own lesson progress"
  ON lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson progress"
  ON lesson_progress FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_id AND lessons.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own lesson progress"
  ON lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson progress"
  ON lesson_progress FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- USER_SETTINGS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);
