-- ============================================================================
-- Migration 012: Add Notes Support to Lesson Outputs (Safe Version)
-- ============================================================================
-- 
-- This version safely adds columns/constraints even if partially applied
-- 
-- ============================================================================

DO $$ 
BEGIN
  -- =============================================================================
  -- 1. Add 'notes' to valid output types
  -- =============================================================================
  
  -- Drop existing constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lesson_outputs_type_check'
  ) THEN
    ALTER TABLE lesson_outputs DROP CONSTRAINT lesson_outputs_type_check;
  END IF;
  
  -- Recreate constraint with 'notes' included
  ALTER TABLE lesson_outputs 
    ADD CONSTRAINT lesson_outputs_type_check 
    CHECK (type IN ('summary', 'key_concepts', 'flashcards', 'quiz', 'mindmap', 'notes'));
  
  RAISE NOTICE '✓ Updated type constraint to include notes';
  
  -- =============================================================================
  -- 2. Add notes-specific columns (only if they don't exist)
  -- =============================================================================
  
  -- Add notes_raw_text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'notes_raw_text'
  ) THEN
    ALTER TABLE lesson_outputs ADD COLUMN notes_raw_text text NULL;
    RAISE NOTICE '✓ Added notes_raw_text column';
  ELSE
    RAISE NOTICE '⊙ notes_raw_text column already exists';
  END IF;
  
  -- Add notes_final_text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'notes_final_text'
  ) THEN
    ALTER TABLE lesson_outputs ADD COLUMN notes_final_text text NULL;
    RAISE NOTICE '✓ Added notes_final_text column';
  ELSE
    RAISE NOTICE '⊙ notes_final_text column already exists';
  END IF;
  
  -- Add last_committed_seq
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_outputs' AND column_name = 'last_committed_seq'
  ) THEN
    ALTER TABLE lesson_outputs ADD COLUMN last_committed_seq int NOT NULL DEFAULT 0;
    RAISE NOTICE '✓ Added last_committed_seq column';
  ELSE
    RAISE NOTICE '⊙ last_committed_seq column already exists';
  END IF;
  
  -- =============================================================================
  -- 3. Add indexes for efficient queries (only if they don't exist)
  -- =============================================================================
  
  -- Index on (lesson_id, type)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lesson_outputs_lesson_type'
  ) THEN
    CREATE INDEX idx_lesson_outputs_lesson_type ON lesson_outputs(lesson_id, type);
    RAISE NOTICE '✓ Created index idx_lesson_outputs_lesson_type';
  ELSE
    RAISE NOTICE '⊙ Index idx_lesson_outputs_lesson_type already exists';
  END IF;
  
  -- Index on (user_id, type, updated_at)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lesson_outputs_user_type'
  ) THEN
    CREATE INDEX idx_lesson_outputs_user_type ON lesson_outputs(user_id, type, updated_at DESC);
    RAISE NOTICE '✓ Created index idx_lesson_outputs_user_type';
  ELSE
    RAISE NOTICE '⊙ Index idx_lesson_outputs_user_type already exists';
  END IF;
  
  -- =============================================================================
  -- 4. Add comments for documentation
  -- =============================================================================
  
  COMMENT ON COLUMN lesson_outputs.notes_raw_text IS 
    'Raw notes text accumulated from transcript segments (for notes type only)';
  
  COMMENT ON COLUMN lesson_outputs.notes_final_text IS 
    'Final formatted/polished notes text (for notes type only, NULL until finalized)';
  
  COMMENT ON COLUMN lesson_outputs.last_committed_seq IS 
    'Last transcript segment sequence number processed into notes (for incremental updates)';
  
  COMMENT ON TABLE lesson_outputs IS 
    'AI-generated study materials for lessons (summary, flashcards, quiz, mindmap, notes)';
  
  RAISE NOTICE '✓ Added documentation comments';
  
  -- =============================================================================
  -- Summary
  -- =============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✓ Migration 012 complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Notes feature is ready:';
  RAISE NOTICE '  - Type constraint includes "notes"';
  RAISE NOTICE '  - All required columns present';
  RAISE NOTICE '  - Indexes created';
  RAISE NOTICE '  - Ready for use';
  RAISE NOTICE '================================================';
  
END $$;
