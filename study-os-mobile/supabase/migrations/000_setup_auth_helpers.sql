-- Migration 000: Verify Auth Setup
-- Supabase automatically provides the auth schema and auth.uid() function
-- This migration just verifies they exist and are accessible

-- =============================================================================
-- VERIFY AUTH SCHEMA EXISTS
-- =============================================================================
-- The auth schema should already exist in Supabase
-- We're just checking it's there

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    RAISE EXCEPTION 'auth schema does not exist! This should be created by Supabase automatically.';
  END IF;
  
  RAISE NOTICE '✓ auth schema exists';
END $$;

-- =============================================================================
-- VERIFY auth.uid() FUNCTION EXISTS
-- =============================================================================
-- Supabase provides this function by default
-- It reads the user ID from JWT tokens

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'uid' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  ) THEN
    RAISE EXCEPTION 'auth.uid() function does not exist! This should be provided by Supabase.';
  END IF;
  
  RAISE NOTICE '✓ auth.uid() function exists';
END $$;

-- =============================================================================
-- TEST HELPER FOR LOCAL DEVELOPMENT (OPTIONAL)
-- =============================================================================
-- For testing RLS policies in local/test environments where JWT is not available,
-- you can temporarily use this function. DO NOT use in production!

-- Uncomment this block ONLY for local testing:
/*
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    -- Try to get from actual JWT first (production)
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid,
    -- Fallback to test setting (local testing only)
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
$$;
*/

-- =============================================================================
-- VERIFICATION COMPLETE
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Auth setup verification complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'The auth.uid() function is ready for RLS policies.';
END $$;
