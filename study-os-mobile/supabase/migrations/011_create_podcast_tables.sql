-- =============================================================================
-- MIGRATION 011: Create Podcast System Tables
-- =============================================================================
-- Purpose: Enable AI-generated podcast-style audio dialogues for lessons
-- Tables: podcast_episodes, podcast_segments
-- =============================================================================

-- =============================================================================
-- TABLE: podcast_episodes
-- =============================================================================
CREATE TABLE podcast_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'scripting', 'voicing', 'ready', 'failed')) DEFAULT 'queued',
  title text,
  language text NOT NULL DEFAULT 'en',
  voice_a_id text NOT NULL DEFAULT 'gemini_voice_a',
  voice_b_id text NOT NULL DEFAULT 'gemini_voice_b',
  total_segments int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE podcast_episodes IS 'AI-generated podcast-style dialogues for lessons';
COMMENT ON COLUMN podcast_episodes.user_id IS 'References auth.users(id) - owner of the episode';
COMMENT ON COLUMN podcast_episodes.status IS 'queued=waiting, scripting=generating dialogue, voicing=synthesizing audio, ready=complete, failed=error';
COMMENT ON COLUMN podcast_episodes.voice_a_id IS 'Voice identifier for speaker A (typically host)';
COMMENT ON COLUMN podcast_episodes.voice_b_id IS 'Voice identifier for speaker B (typically co-host)';
COMMENT ON COLUMN podcast_episodes.total_segments IS 'Number of dialogue segments in episode';

-- =============================================================================
-- TABLE: podcast_segments
-- =============================================================================
CREATE TABLE podcast_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  episode_id uuid NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  seq int NOT NULL,
  speaker text NOT NULL CHECK (speaker IN ('a', 'b')),
  text text NOT NULL,
  tts_status text NOT NULL CHECK (tts_status IN ('queued', 'generating', 'ready', 'failed')) DEFAULT 'queued',
  audio_bucket text,
  audio_path text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint: each sequence number must be unique within an episode
  CONSTRAINT unique_episode_seq UNIQUE (episode_id, seq)
);

COMMENT ON TABLE podcast_segments IS 'Individual dialogue segments within podcast episodes';
COMMENT ON COLUMN podcast_segments.user_id IS 'References auth.users(id) - owner of the segment';
COMMENT ON COLUMN podcast_segments.seq IS 'Sequence number for playback order (unique within episode)';
COMMENT ON COLUMN podcast_segments.speaker IS 'Speaker identifier: a (host) or b (co-host)';
COMMENT ON COLUMN podcast_segments.tts_status IS 'Audio generation status: queued=waiting, generating=in progress, ready=audio available, failed=error';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Fetch episodes for a user's lessons
CREATE INDEX idx_podcast_episodes_user_lesson 
  ON podcast_episodes(user_id, lesson_id, created_at DESC);

-- Fetch segments for episode playback (in sequence order)
CREATE INDEX idx_podcast_segments_episode_seq 
  ON podcast_segments(episode_id, seq);

-- Find segments pending TTS generation
CREATE INDEX idx_podcast_segments_tts_queue 
  ON podcast_segments(episode_id, tts_status)
  WHERE tts_status IN ('queued', 'generating');

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_segments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: podcast_episodes
-- =============================================================================

CREATE POLICY "Users can view their own podcast episodes"
  ON podcast_episodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own podcast episodes"
  ON podcast_episodes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM lessons 
      WHERE lessons.id = lesson_id 
        AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own podcast episodes"
  ON podcast_episodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own podcast episodes"
  ON podcast_episodes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- RLS POLICIES: podcast_segments
-- =============================================================================

CREATE POLICY "Users can view their own podcast segments"
  ON podcast_segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own podcast segments"
  ON podcast_segments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM podcast_episodes 
      WHERE podcast_episodes.id = episode_id 
        AND podcast_episodes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own podcast segments"
  ON podcast_segments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own podcast segments"
  ON podcast_segments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at timestamp on podcast_episodes
CREATE OR REPLACE FUNCTION update_podcast_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_podcast_episodes_updated_at
  BEFORE UPDATE ON podcast_episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_episodes_updated_at();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
