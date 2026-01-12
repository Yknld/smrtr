-- =============================================================================
-- ROLLBACK: Drop Podcast Tables
-- =============================================================================
-- Use this to clean up podcast tables before re-running the migration
-- =============================================================================

-- Drop tables in reverse order (segments first due to FK constraint)
DROP TABLE IF EXISTS podcast_segments CASCADE;
DROP TABLE IF EXISTS podcast_episodes CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_podcast_episodes_updated_at() CASCADE;

-- Done
DO $$
BEGIN
  RAISE NOTICE 'Podcast tables dropped successfully';
END $$;
