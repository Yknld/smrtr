-- ============================================================================
-- Migration 012: Add Notes Support to Lesson Outputs
-- ============================================================================
-- 
-- Purpose: Enable canonical notes documents per lesson that can be updated
--          incrementally from live transcript segments
-- 
-- Features:
-- - Add 'notes' as a valid output type
-- - Add fields to track incremental note updates from transcripts
-- - Maintain backward compatibility with existing lesson_outputs
-- 
-- ============================================================================

-- =============================================================================
-- 1. Add 'notes' to valid output types
-- =============================================================================

-- Drop existing constraint
ALTER TABLE lesson_outputs 
  DROP CONSTRAINT IF EXISTS lesson_outputs_type_check;

-- Recreate constraint with 'notes' included
ALTER TABLE lesson_outputs 
  ADD CONSTRAINT lesson_outputs_type_check 
  CHECK (type IN ('summary', 'key_concepts', 'flashcards', 'quiz', 'mindmap', 'notes'));

-- =============================================================================
-- 2. Add notes-specific columns
-- =============================================================================

-- Raw accumulated notes text (continuously updated)
ALTER TABLE lesson_outputs 
  ADD COLUMN notes_raw_text text NULL;

-- Final polished/formatted notes (nullable, set when finalized)
ALTER TABLE lesson_outputs 
  ADD COLUMN notes_final_text text NULL;

-- Track which transcript segment was last processed
-- This allows incremental updates without reprocessing entire transcript
ALTER TABLE lesson_outputs 
  ADD COLUMN last_committed_seq int NOT NULL DEFAULT 0;

-- =============================================================================
-- 3. Add indexes for efficient queries
-- =============================================================================

-- Query notes for a specific lesson
CREATE INDEX IF NOT EXISTS idx_lesson_outputs_lesson_type 
  ON lesson_outputs(lesson_id, type);

-- Query all notes for a user (for search/aggregation)
CREATE INDEX IF NOT EXISTS idx_lesson_outputs_user_type 
  ON lesson_outputs(user_id, type, updated_at DESC);

-- =============================================================================
-- 4. Add comments for documentation
-- =============================================================================

COMMENT ON COLUMN lesson_outputs.notes_raw_text IS 
  'Raw notes text accumulated from transcript segments (for notes type only)';

COMMENT ON COLUMN lesson_outputs.notes_final_text IS 
  'Final formatted/polished notes text (for notes type only, NULL until finalized)';

COMMENT ON COLUMN lesson_outputs.last_committed_seq IS 
  'Last transcript segment sequence number processed into notes (for incremental updates)';

-- Update table comment to include notes
COMMENT ON TABLE lesson_outputs IS 
  'AI-generated study materials for lessons (summary, flashcards, quiz, mindmap, notes)';

-- =============================================================================
-- End of Migration
-- ============================================================================
