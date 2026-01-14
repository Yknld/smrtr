-- Migration 002: Create Live Tables
-- live_transcript_segments, live_translation_segments, live_tts_chunks

-- =============================================================================
-- LIVE_TRANSCRIPT_SEGMENTS
-- =============================================================================
CREATE TABLE live_transcript_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  study_session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  seq int NOT NULL,
  text text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  start_ms int NULL,
  end_ms int NULL,
  confidence real NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(study_session_id, seq)
);

COMMENT ON TABLE live_transcript_segments IS 'Real-time transcript segments from live sessions';
COMMENT ON COLUMN live_transcript_segments.seq IS 'Sequence number within session for ordering and alignment';
COMMENT ON COLUMN live_transcript_segments.language IS 'Detected or configured source language (ISO 639-1)';
COMMENT ON COLUMN live_transcript_segments.start_ms IS 'Start time in milliseconds from session start';
COMMENT ON COLUMN live_transcript_segments.end_ms IS 'End time in milliseconds from session start';
COMMENT ON COLUMN live_transcript_segments.confidence IS 'STT confidence score (0.0-1.0)';

-- =============================================================================
-- LIVE_TRANSLATION_SEGMENTS
-- =============================================================================
CREATE TABLE live_translation_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  study_session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  source_seq int NOT NULL,
  source_lang text NOT NULL,
  target_lang text NOT NULL,
  translated_text text NOT NULL,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(study_session_id, source_seq, target_lang)
);

COMMENT ON TABLE live_translation_segments IS 'Translated versions of transcript segments';
COMMENT ON COLUMN live_translation_segments.source_seq IS 'Links to live_transcript_segments.seq';
COMMENT ON COLUMN live_translation_segments.source_lang IS 'Original language (ISO 639-1)';
COMMENT ON COLUMN live_translation_segments.target_lang IS 'Translation target language (ISO 639-1)';
COMMENT ON COLUMN live_translation_segments.provider IS 'Translation service used (e.g., google, deepl, azure)';

-- =============================================================================
-- LIVE_TTS_CHUNKS
-- =============================================================================
CREATE TABLE live_tts_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  study_session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  source_seq int NULL,
  audio_bucket text NOT NULL,
  audio_path text NOT NULL,
  duration_ms int NULL,
  voice_id text NULL,
  provider text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'ready', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE live_tts_chunks IS 'Text-to-speech audio chunks for translated segments';
COMMENT ON COLUMN live_tts_chunks.target_lang IS 'Language of synthesized speech';
COMMENT ON COLUMN live_tts_chunks.source_seq IS 'Links to live_transcript_segments.seq (NULL for batch TTS)';
COMMENT ON COLUMN live_tts_chunks.audio_bucket IS 'Supabase storage bucket for audio file';
COMMENT ON COLUMN live_tts_chunks.audio_path IS 'Path within storage bucket';
COMMENT ON COLUMN live_tts_chunks.voice_id IS 'Voice identifier for the TTS provider';
COMMENT ON COLUMN live_tts_chunks.provider IS 'TTS service used (e.g., elevenlabs, google, azure)';
COMMENT ON COLUMN live_tts_chunks.status IS 'Processing status of TTS generation';
