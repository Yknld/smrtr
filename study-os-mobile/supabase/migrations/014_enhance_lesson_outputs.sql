-- Migration 014: Enhance lesson_outputs with versioning and caching
-- Adds version, source_hash, and model columns for consistency across devices

-- =============================================================================
-- ALTER lesson_outputs TABLE
-- =============================================================================

-- Add version column for tracking regenerations
ALTER TABLE lesson_outputs 
ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- Add source_hash for cache consistency across devices
ALTER TABLE lesson_outputs 
ADD COLUMN IF NOT EXISTS source_hash text NULL;

-- Add model to track which AI model generated the output
ALTER TABLE lesson_outputs 
ADD COLUMN IF NOT EXISTS model text NULL;

-- Update the type constraint to include new types
ALTER TABLE lesson_outputs 
DROP CONSTRAINT IF EXISTS lesson_outputs_type_check;

ALTER TABLE lesson_outputs 
ADD CONSTRAINT lesson_outputs_type_check 
CHECK (type IN (
  'summary', 
  'key_concepts', 
  'flashcards', 
  'quiz', 
  'mindmap',
  'tutor_state',
  'podcast_script',
  'podcast_audio',
  'podcast_outline',
  'youtube_recs'
));

-- Update status constraint to include 'processing'
ALTER TABLE lesson_outputs 
DROP CONSTRAINT IF EXISTS lesson_outputs_status_check;

ALTER TABLE lesson_outputs 
ADD CONSTRAINT lesson_outputs_status_check 
CHECK (status IN ('queued', 'processing', 'ready', 'failed'));

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for cache lookup: find by lesson + type + source_hash
CREATE INDEX IF NOT EXISTS idx_lesson_outputs_cache_lookup 
ON lesson_outputs(lesson_id, type, source_hash, status) 
WHERE source_hash IS NOT NULL AND status = 'ready';

-- Index for version tracking
CREATE INDEX IF NOT EXISTS idx_lesson_outputs_version 
ON lesson_outputs(lesson_id, type, version DESC);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN lesson_outputs.version IS 'Version number, increments on regeneration';
COMMENT ON COLUMN lesson_outputs.source_hash IS 'Hash of source content (notes/transcript/assets) for cache consistency';
COMMENT ON COLUMN lesson_outputs.model IS 'AI model used to generate output (e.g., gemini-2.0-flash)';

-- =============================================================================
-- FUNCTION: Auto-increment version on regeneration
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_output_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a regeneration (same lesson_id + type), increment version
  IF EXISTS (
    SELECT 1 FROM lesson_outputs 
    WHERE lesson_id = NEW.lesson_id 
    AND type = NEW.type 
    AND id != NEW.id
  ) THEN
    NEW.version := COALESCE(
      (SELECT MAX(version) FROM lesson_outputs 
       WHERE lesson_id = NEW.lesson_id AND type = NEW.type), 
      0
    ) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for version auto-increment
DROP TRIGGER IF EXISTS trigger_increment_output_version ON lesson_outputs;
CREATE TRIGGER trigger_increment_output_version
BEFORE INSERT ON lesson_outputs
FOR EACH ROW
EXECUTE FUNCTION increment_output_version();

COMMENT ON FUNCTION increment_output_version IS 'Auto-increment version when regenerating same output type for a lesson';
