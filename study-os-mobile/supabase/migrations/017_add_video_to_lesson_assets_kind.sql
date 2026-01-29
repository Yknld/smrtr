-- ============================================================================
-- Migration: Add 'video' to lesson_assets kind check constraint
-- ============================================================================
-- 
-- Purpose: Allow 'video' as a valid kind value in lesson_assets table
--          to support generated educational videos
-- 
-- ============================================================================

-- Drop old constraint and add new one with 'video' included
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'lesson_assets' AND constraint_name = 'lesson_assets_kind_check'
  ) THEN
    ALTER TABLE lesson_assets DROP CONSTRAINT lesson_assets_kind_check;
  END IF;
  
  ALTER TABLE lesson_assets 
  ADD CONSTRAINT lesson_assets_kind_check 
  CHECK (kind IN ('pdf', 'slides', 'notes', 'audio', 'image', 'video', 'other'));
END $$;

COMMENT ON COLUMN lesson_assets.kind IS 'Type of asset: pdf, slides, notes, audio, image, video, or other';
