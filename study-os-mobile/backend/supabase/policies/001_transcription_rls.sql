-- ============================================================================
-- Transcription System - Row Level Security (RLS) Policies
-- ============================================================================
-- 
-- Security Model:
-- - Users can only access their own transcription sessions
-- - Users can only access chunks/segments/transcripts for sessions they own
-- - All operations validated against auth.uid()
-- 
-- ============================================================================

-- ============================================================================
-- Enable RLS on all transcription tables
-- ============================================================================

ALTER TABLE transcription_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies: transcription_sessions
-- ============================================================================
-- 
-- Users have full control over their own sessions.
-- 

-- SELECT: Users can view their own sessions
CREATE POLICY "Users can view own transcription sessions"
  ON transcription_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can create their own sessions
CREATE POLICY "Users can create own transcription sessions"
  ON transcription_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own sessions
CREATE POLICY "Users can update own transcription sessions"
  ON transcription_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own sessions
CREATE POLICY "Users can delete own transcription sessions"
  ON transcription_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Policies: transcription_chunks
-- ============================================================================
-- 
-- Users can access chunks only if they own the parent session.
-- Uses subquery to check session ownership.
-- 

-- SELECT: Users can view chunks from their own sessions
CREATE POLICY "Users can view own transcription chunks"
  ON transcription_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcription_chunks.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- INSERT: Users can create chunks for their own sessions
CREATE POLICY "Users can create chunks for own sessions"
  ON transcription_chunks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcription_chunks.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update chunks from their own sessions
CREATE POLICY "Users can update own transcription chunks"
  ON transcription_chunks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcription_chunks.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcription_chunks.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete chunks from their own sessions
CREATE POLICY "Users can delete own transcription chunks"
  ON transcription_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcription_chunks.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Policies: transcript_segments
-- ============================================================================
-- 
-- Users can access segments only if they own the parent session.
-- 

-- SELECT: Users can view segments from their own sessions
CREATE POLICY "Users can view own transcript segments"
  ON transcript_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcript_segments.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- INSERT: Users can create segments for their own sessions
-- (Backend typically creates segments, but user must own session)
CREATE POLICY "Users can create segments for own sessions"
  ON transcript_segments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcript_segments.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update segments from their own sessions
CREATE POLICY "Users can update own transcript segments"
  ON transcript_segments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcript_segments.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcript_segments.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete segments from their own sessions
CREATE POLICY "Users can delete own transcript segments"
  ON transcript_segments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcript_segments.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Policies: transcripts
-- ============================================================================
-- 
-- Users can access full transcripts only if they own the parent session.
-- 

-- SELECT: Users can view transcripts from their own sessions
CREATE POLICY "Users can view own transcripts"
  ON transcripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcripts.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- INSERT: Users can create transcripts for their own sessions
CREATE POLICY "Users can create transcripts for own sessions"
  ON transcripts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcripts.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update transcripts from their own sessions
CREATE POLICY "Users can update own transcripts"
  ON transcripts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcripts.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcripts.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete transcripts from their own sessions
CREATE POLICY "Users can delete own transcripts"
  ON transcripts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transcription_sessions
      WHERE transcription_sessions.id = transcripts.session_id
        AND transcription_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 
-- The EXISTS subqueries in policies are efficient because:
-- 1. Indexes exist on transcription_sessions(id) (primary key)
-- 2. Indexes exist on transcription_sessions(user_id)
-- 3. Foreign key constraints ensure referential integrity
-- 4. Postgres optimizer can use index-only scans
-- 
-- For high-volume workloads, consider:
-- - Adding indexes on (session_id, user_id) if query plans show sequential scans
-- - Using materialized views for dashboard queries
-- - Implementing connection pooling (PgBouncer)
-- 
-- ============================================================================

-- ============================================================================
-- Security Notes
-- ============================================================================
-- 
-- Additional security considerations:
-- 
-- 1. Storage Policies:
--    Create corresponding Supabase Storage policies to ensure users can only
--    upload/download audio files in their own session directories.
-- 
--    Example Storage policy:
--    - Bucket: transcriptions
--    - Path pattern: {session_id}/*
--    - Check: session.user_id = auth.uid()
-- 
-- 2. Service Role:
--    Backend services may need to bypass RLS for batch processing.
--    Use service_role key with caution and validate user ownership in code.
-- 
-- 3. Rate Limiting:
--    Implement application-level rate limiting to prevent abuse:
--    - Max sessions per user per day
--    - Max chunks per session
--    - Max chunk size
-- 
-- 4. Audit Logging:
--    Consider adding audit triggers for:
--    - Session creation/deletion
--    - Failed transcription attempts
--    - Unusual chunk patterns
-- 
-- ============================================================================

-- ============================================================================
-- Testing RLS Policies
-- ============================================================================
-- 
-- To test these policies:
-- 
-- 1. Create test users:
--    INSERT INTO auth.users (id, email) VALUES 
--      ('user1-uuid', 'user1@test.com'),
--      ('user2-uuid', 'user2@test.com');
-- 
-- 2. Set user context:
--    SET LOCAL request.jwt.claims.sub = 'user1-uuid';
-- 
-- 3. Test SELECT:
--    SELECT * FROM transcription_sessions;  -- Should only see user1's sessions
-- 
-- 4. Test INSERT:
--    INSERT INTO transcription_sessions (user_id) VALUES ('user1-uuid');  -- Success
--    INSERT INTO transcription_sessions (user_id) VALUES ('user2-uuid');  -- Fails
-- 
-- 5. Test cross-user access:
--    -- As user1, try to access user2's chunks
--    SET LOCAL request.jwt.claims.sub = 'user2-uuid';
--    SELECT * FROM transcription_chunks WHERE session_id = 'user1-session-id';  -- Empty
-- 
-- ============================================================================

-- ============================================================================
-- End of RLS Policies
-- ============================================================================
