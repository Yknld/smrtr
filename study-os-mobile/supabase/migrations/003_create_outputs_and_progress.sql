-- Migration 003: Create Outputs and Progress Tables
-- lesson_outputs, lesson_progress, user_settings

-- =============================================================================
-- LESSON_OUTPUTS
-- =============================================================================
CREATE TABLE lesson_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('summary', 'key_concepts', 'flashcards', 'quiz', 'mindmap')),
  status text NOT NULL CHECK (status IN ('queued', 'ready', 'failed')),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lesson_outputs IS 'AI-generated study materials for lessons';
COMMENT ON COLUMN lesson_outputs.type IS 'Type of study output generated';
COMMENT ON COLUMN lesson_outputs.status IS 'Generation status: queued (pending), ready (complete), failed (error)';
COMMENT ON COLUMN lesson_outputs.content_json IS 'Structured content (format depends on type)';

-- =============================================================================
-- LESSON_PROGRESS
-- =============================================================================
CREATE TABLE lesson_progress (
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  last_position_ms int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, lesson_id)
);

COMMENT ON TABLE lesson_progress IS 'User progress tracking for lessons';
COMMENT ON COLUMN lesson_progress.last_position_ms IS 'Last playback position in milliseconds (for audio/video)';
COMMENT ON COLUMN lesson_progress.completed IS 'Whether user has marked lesson as complete';

-- =============================================================================
-- USER_SETTINGS
-- =============================================================================
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY,
  default_source_lang text NOT NULL DEFAULT 'en',
  default_target_lang text NULL,
  live_listen_enabled boolean NOT NULL DEFAULT false,
  tts_voice_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_settings IS 'Per-user preferences and configuration';
COMMENT ON COLUMN user_settings.default_source_lang IS 'Default language for transcription (ISO 639-1)';
COMMENT ON COLUMN user_settings.default_target_lang IS 'Default translation target language (ISO 639-1, NULL = no translation)';
COMMENT ON COLUMN user_settings.live_listen_enabled IS 'Whether to enable real-time TTS during live sessions';
COMMENT ON COLUMN user_settings.tts_voice_id IS 'Preferred TTS voice identifier';
