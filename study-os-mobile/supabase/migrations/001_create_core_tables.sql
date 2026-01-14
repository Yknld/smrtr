-- Migration 001: Create Core Tables
-- courses, lessons, lesson_assets, study_sessions

-- =============================================================================
-- COURSES
-- =============================================================================
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  term text NULL,
  color text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE courses IS 'User-created courses for organizing lessons';
COMMENT ON COLUMN courses.user_id IS 'References auth.users(id) - owner of the course';
COMMENT ON COLUMN courses.term IS 'Academic term (e.g., Fall 2024, Spring 2025)';
COMMENT ON COLUMN courses.color IS 'UI color code for course display';

-- =============================================================================
-- LESSONS
-- =============================================================================
CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('upload', 'live_session', 'import')),
  status text NOT NULL CHECK (status IN ('draft', 'ready', 'processing', 'failed')),
  last_opened_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lessons IS 'Individual lessons within courses';
COMMENT ON COLUMN lessons.source_type IS 'How the lesson was created: upload (file), live_session (recorded), import (external)';
COMMENT ON COLUMN lessons.status IS 'Processing status of lesson content';
COMMENT ON COLUMN lessons.last_opened_at IS 'For sorting recently accessed lessons';

-- =============================================================================
-- LESSON_ASSETS
-- =============================================================================
CREATE TABLE lesson_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pdf', 'slides', 'notes', 'audio', 'image', 'other')),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  duration_ms int NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lesson_assets IS 'Files and media associated with lessons';
COMMENT ON COLUMN lesson_assets.kind IS 'Type of asset for UI display and processing';
COMMENT ON COLUMN lesson_assets.storage_bucket IS 'Supabase storage bucket name';
COMMENT ON COLUMN lesson_assets.storage_path IS 'Path within the storage bucket';
COMMENT ON COLUMN lesson_assets.duration_ms IS 'Duration for audio/video assets in milliseconds';

-- =============================================================================
-- STUDY_SESSIONS
-- =============================================================================
CREATE TABLE study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('listen', 'read', 'live_transcribe', 'live_translate')),
  status text NOT NULL CHECK (status IN ('active', 'ended', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL
);

COMMENT ON TABLE study_sessions IS 'Active or past study sessions for lessons';
COMMENT ON COLUMN study_sessions.mode IS 'Study mode: listen (audio playback), read (text), live_transcribe (realtime STT), live_translate (STT+translation)';
COMMENT ON COLUMN study_sessions.status IS 'Session state for cleanup and analytics';
COMMENT ON COLUMN study_sessions.ended_at IS 'NULL while session is active';
