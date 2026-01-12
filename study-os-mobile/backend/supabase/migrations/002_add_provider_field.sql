-- ============================================================================
-- Migration: Add provider field to transcription_sessions
-- ============================================================================
-- 
-- Purpose: Track which STT provider was used (assemblyai, whisper, etc.)
-- This allows for multi-provider support and debugging
-- 
-- ============================================================================

-- Add provider column to transcription_sessions
ALTER TABLE transcription_sessions 
ADD COLUMN provider text DEFAULT 'whisper';

-- Add comment
COMMENT ON COLUMN transcription_sessions.provider IS 
  'STT provider used for this session (whisper, assemblyai, etc.)';

-- Create index for provider queries
CREATE INDEX idx_transcription_sessions_provider 
  ON transcription_sessions(provider, created_at DESC);

-- ============================================================================
-- End of Migration
-- ============================================================================
