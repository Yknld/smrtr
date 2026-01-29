-- Apply migration: Add conversation_id and metadata to lesson_assets

-- Make storage_path nullable
ALTER TABLE lesson_assets 
ALTER COLUMN storage_path DROP NOT NULL;

-- Add conversation_id column
ALTER TABLE lesson_assets
ADD COLUMN IF NOT EXISTS conversation_id text NULL;

-- Add metadata column
ALTER TABLE lesson_assets
ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

-- Add comments
COMMENT ON COLUMN lesson_assets.conversation_id IS 'OpenHand conversation ID for tracking video generation';
COMMENT ON COLUMN lesson_assets.metadata IS 'Additional metadata (e.g., github_path, generation params)';

-- Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lesson_assets'
  AND column_name IN ('conversation_id', 'metadata', 'storage_path')
ORDER BY column_name;
