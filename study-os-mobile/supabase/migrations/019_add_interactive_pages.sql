-- Migration 019: Add interactive_pages to lesson_outputs and document storage MIME types
-- Purpose: Allow RunPod-pushed interactive homework modules to be stored and served via lesson_outputs + lesson_assets.

-- =============================================================================
-- LESSON_OUTPUTS: Add 'interactive_pages' type
-- =============================================================================

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
    'notes',
    'interactive_pages'
  ));
END $$;

COMMENT ON COLUMN lesson_outputs.type IS 'Type of study output: summary, key_concepts, flashcards, quiz, mindmap, tutor_state, podcast_*, youtube_recs, notes, interactive_pages';

-- =============================================================================
-- STORAGE: Document MIME types for interactive pages (manual if needed)
-- =============================================================================
-- For interactive_pages, lesson_assets must allow:
--   text/html, image/svg+xml, audio/wav (audio/wav already in 009).
-- If your bucket was created from 009 only, add via Dashboard or:
--
--   UPDATE storage.buckets
--   SET allowed_mime_types = array_cat(
--     COALESCE(allowed_mime_types, ARRAY[]::text[]),
--     ARRAY['text/html', 'image/svg+xml']::text[]
--   )
--   WHERE id = 'lesson_assets'
--   AND NOT (allowed_mime_types @> ARRAY['text/html', 'image/svg+xml']);
--
-- (audio/wav is already in migration 009.)
