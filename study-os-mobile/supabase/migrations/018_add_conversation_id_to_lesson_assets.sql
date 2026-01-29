-- ============================================================================
-- Migration: Add conversation_id to lesson_assets
-- ============================================================================
-- 
-- Purpose: Store OpenHand conversation ID for video generation tracking
--          and make storage_path nullable to support pending uploads
-- 
-- ============================================================================

-- Make storage_path nullable (it's null while video is generating)
ALTER TABLE lesson_assets 
ALTER COLUMN storage_path DROP NOT NULL;

-- Add conversation_id column to track OpenHand conversations
ALTER TABLE lesson_assets
ADD COLUMN IF NOT EXISTS conversation_id text NULL;

-- Add metadata column for storing additional generation info
ALTER TABLE lesson_assets
ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

COMMENT ON COLUMN lesson_assets.conversation_id IS 'OpenHand conversation ID for tracking video generation';
COMMENT ON COLUMN lesson_assets.metadata IS 'Additional metadata (e.g., github_path, generation params)';
