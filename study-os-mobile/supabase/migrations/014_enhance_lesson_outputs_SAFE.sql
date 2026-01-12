-- Migration 014: Enhance lesson_outputs with versioning and caching (SAFE VERSION)
-- Adds version, source_hash, and model columns with IF NOT EXISTS checks

-- =============================================================================
-- ALTER lesson_outputs TABLE (SAFE)
-- =============================================================================

-- Add version column (safe - only adds if doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'version'
  ) THEN
    ALTER TABLE lesson_outputs ADD COLUMN version int NOT NULL DEFAULT 1;
    COMMENT ON COLUMN lesson_outputs.version IS 'Version number, increments on regeneration';
  END IF;
END $$;

-- Add source_hash column (safe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'source_hash'
  ) THEN
    ALTER TABLE lesson_outputs ADD COLUMN source_hash text NULL;
    COMMENT ON COLUMN lesson_outputs.source_hash IS 'Hash of source content (notes/transcript/assets) for cache consistency';
  END IF;
END $$;

-- Add model column (safe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'model'
  ) THEN
    ALTER TABLE lesson_outputs ADD COLUMN model text NULL;
    COMMENT ON COLUMN lesson_outputs.model IS 'AI model used to generate output (e.g., gemini-2.0-flash)';
  END IF;
END $$;

-- =============================================================================
-- UPDATE TYPE CONSTRAINT (SAFE)
-- =============================================================================

-- Drop old constraint and add new one with additional types
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'lesson_outputs' AND constraint_name = 'lesson_outputs_type_check'
  ) THEN
    ALTER TABLE lesson_outputs DROP CONSTRAINT lesson_outputs_type_check;
  END IF;
  
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
    'youtube_recs',
    'notes'
  ));
END $$;

-- =============================================================================
-- UPDATE STATUS CONSTRAINT (SAFE)
-- =============================================================================

-- Drop old constraint and add new one with 'processing' status
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'lesson_outputs' AND constraint_name = 'lesson_outputs_status_check'
  ) THEN
    ALTER TABLE lesson_outputs DROP CONSTRAINT lesson_outputs_status_check;
  END IF;
  
  ALTER TABLE lesson_outputs 
  ADD CONSTRAINT lesson_outputs_status_check 
  CHECK (status IN ('queued', 'processing', 'ready', 'failed'));
END $$;

-- =============================================================================
-- INDEXES (SAFE)
-- =============================================================================

-- Index for cache lookup
CREATE INDEX IF NOT EXISTS idx_lesson_outputs_cache_lookup 
ON lesson_outputs(lesson_id, type, source_hash, status) 
WHERE source_hash IS NOT NULL AND status = 'ready';

-- Index for version tracking
CREATE INDEX IF NOT EXISTS idx_lesson_outputs_version 
ON lesson_outputs(lesson_id, type, version DESC);

-- =============================================================================
-- FUNCTION: Auto-increment version on regeneration (SAFE)
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

COMMENT ON FUNCTION increment_output_version IS 'Auto-increment version when regenerating same output type for a lesson';

-- =============================================================================
-- TRIGGER (SAFE - drop and recreate)
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_increment_output_version ON lesson_outputs;

CREATE TRIGGER trigger_increment_output_version
BEFORE INSERT ON lesson_outputs
FOR EACH ROW
EXECUTE FUNCTION increment_output_version();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that new columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: version column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'source_hash'
  ) THEN
    RAISE EXCEPTION 'Migration failed: source_hash column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'model'
  ) THEN
    RAISE EXCEPTION 'Migration failed: model column not created';
  END IF;
  
  RAISE NOTICE 'Migration 014 applied successfully! New columns: version, source_hash, model';
END $$;
