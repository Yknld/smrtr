-- ============================================================================
-- Transcription System - Schema Migration
-- ============================================================================
-- 
-- Purpose: Pseudo-live transcription with overlapping audio chunks
-- 
-- Flow:
-- 1. Create transcription_session
-- 2. Upload audio chunks to Supabase Storage (with overlap)
-- 3. Insert transcription_chunk records
-- 4. Backend transcribes and inserts transcript_segments
-- 5. Backend updates transcripts.full_text with merged result
-- 
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: transcription_sessions
-- ============================================================================
-- 
-- Represents a single recording/transcription job.
-- Status flow: recording → processing → complete (or failed)
-- 
CREATE TABLE transcription_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User who owns this session
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Source type (currently only 'live_recording')
  source_type text NOT NULL DEFAULT 'live_recording',
  
  -- Current status of the session
  status text NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'processing', 'complete', 'failed')),
  
  -- Optional: Language code for transcription (e.g., 'en-US', 'es-ES')
  language text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient user queries
CREATE INDEX idx_transcription_sessions_user_id 
  ON transcription_sessions(user_id, created_at DESC);

-- Index for status queries
CREATE INDEX idx_transcription_sessions_status 
  ON transcription_sessions(status, created_at DESC);

-- ============================================================================
-- Table: transcription_chunks
-- ============================================================================
-- 
-- Individual audio chunks within a transcription session.
-- Chunks are uploaded sequentially with overlap (e.g., 0.5-1.0s).
-- Backend downloads from storage_path and transcribes.
-- 
CREATE TABLE transcription_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session this chunk belongs to
  session_id uuid NOT NULL REFERENCES transcription_sessions(id) ON DELETE CASCADE,
  
  -- Sequential chunk index (0, 1, 2, ...)
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  
  -- Supabase Storage path where audio file is stored
  storage_path text NOT NULL,
  
  -- Duration of this chunk in milliseconds
  duration_ms integer NOT NULL CHECK (duration_ms > 0),
  
  -- Overlap with previous chunk in milliseconds (0 for first chunk)
  overlap_ms integer NOT NULL DEFAULT 0 CHECK (overlap_ms >= 0),
  
  -- Current processing status
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'transcribing', 'done', 'failed')),
  
  -- Optional: Error message if status is 'failed'
  error text,
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure chunk indices are unique per session
  CONSTRAINT unique_session_chunk_index UNIQUE (session_id, chunk_index)
);

-- Index for efficient session queries ordered by chunk_index
CREATE INDEX idx_transcription_chunks_session_id 
  ON transcription_chunks(session_id, chunk_index);

-- Index for status queries
CREATE INDEX idx_transcription_chunks_status 
  ON transcription_chunks(session_id, status);

-- ============================================================================
-- Table: transcript_segments
-- ============================================================================
-- 
-- Transcribed text segments from audio chunks.
-- Backend inserts segments after transcribing each chunk.
-- Multiple segments may come from a single chunk.
-- 
CREATE TABLE transcript_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session this segment belongs to
  session_id uuid NOT NULL REFERENCES transcription_sessions(id) ON DELETE CASCADE,
  
  -- Chunk index this segment came from
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  
  -- Transcribed text content
  text text NOT NULL,
  
  -- Optional: Start time in milliseconds relative to session start
  start_ms integer CHECK (start_ms >= 0),
  
  -- Optional: End time in milliseconds relative to session start
  end_ms integer CHECK (end_ms >= 0),
  
  -- Optional: Confidence score from transcription service (0.0 - 1.0)
  confidence real CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Composite index for efficient querying by session and chunk
-- Ordered by created_at for chronological retrieval
CREATE INDEX idx_transcript_segments_session_chunk 
  ON transcript_segments(session_id, chunk_index, created_at);

-- Index for session-level queries
CREATE INDEX idx_transcript_segments_session_id 
  ON transcript_segments(session_id, created_at);

-- ============================================================================
-- Table: transcripts
-- ============================================================================
-- 
-- Merged full transcript text for each session.
-- Backend updates this as chunks are transcribed and merged.
-- Provides fast access to full transcript without reconstructing from segments.
-- 
CREATE TABLE transcripts (
  -- One transcript per session
  session_id uuid PRIMARY KEY REFERENCES transcription_sessions(id) ON DELETE CASCADE,
  
  -- Full merged transcript text
  -- Backend handles overlap trimming and text merging
  full_text text NOT NULL DEFAULT '',
  
  -- Timestamp of last update
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Trigger: Update updated_at timestamp on transcription_sessions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transcription_sessions
CREATE TRIGGER update_transcription_sessions_updated_at
  BEFORE UPDATE ON transcription_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for transcripts
CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE transcription_sessions IS 
  'Transcription sessions representing individual recording/transcription jobs';

COMMENT ON COLUMN transcription_sessions.source_type IS 
  'Source type of the audio (currently only live_recording supported)';

COMMENT ON COLUMN transcription_sessions.status IS 
  'Status: recording (active), processing (finalizing), complete (done), failed (error)';

COMMENT ON TABLE transcription_chunks IS 
  'Individual audio chunks with overlap for seamless transcription';

COMMENT ON COLUMN transcription_chunks.chunk_index IS 
  'Sequential chunk index (0, 1, 2, ...) - must be unique per session';

COMMENT ON COLUMN transcription_chunks.overlap_ms IS 
  'Overlap with previous chunk in milliseconds (typically 500-1000ms for smooth merging)';

COMMENT ON COLUMN transcription_chunks.storage_path IS 
  'Supabase Storage path where audio file is stored (e.g., transcriptions/{session_id}/chunk_{index}.webm)';

COMMENT ON TABLE transcript_segments IS 
  'Transcribed text segments from audio chunks';

COMMENT ON COLUMN transcript_segments.chunk_index IS 
  'Source chunk index - segments may span multiple chunks after overlap merging';

COMMENT ON COLUMN transcript_segments.confidence IS 
  'Optional confidence score from transcription service (0.0 = low, 1.0 = high)';

COMMENT ON TABLE transcripts IS 
  'Merged full transcript text for fast retrieval - backend maintains this as chunks are processed';

COMMENT ON COLUMN transcripts.full_text IS 
  'Full merged transcript with overlaps trimmed and duplicates removed';

-- ============================================================================
-- End of Migration
-- ============================================================================
