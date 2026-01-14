# Database Migrations

## Migration Order

Migrations must be applied in the following order:

### 0. **000_setup_auth_helpers.sql** ⚠️ CRITICAL
**Purpose:** Creates the `auth` schema and `auth.uid()` function required for RLS policies.

**Why first:** All RLS policies in migration 004 depend on `auth.uid()` to identify the current user.

**What it does:**
- Creates `auth` schema
- Creates `auth.uid()` function that reads from `request.jwt.claim.sub`
- Creates `auth.role()` function for future use
- Grants public access to these functions

### 1. **001_create_core_tables.sql**
Creates the foundational tables:
- `courses` - User courses
- `lessons` - Lessons within courses
- `lesson_assets` - Files/media for lessons
- `study_sessions` - Active/past study sessions

### 2. **002_create_live_tables.sql**
Creates tables for real-time features:
- `live_transcript_segments` - Real-time STT segments
- `live_translation_segments` - Translated segments
- `live_tts_chunks` - Text-to-speech audio

### 3. **003_create_outputs_and_progress.sql**
Creates tables for study materials and tracking:
- `lesson_outputs` - AI-generated study materials
- `lesson_progress` - User progress tracking
- `user_settings` - User preferences

### 4. **004_rls_policies.sql**
Enables Row Level Security and creates policies for all tables.
- Enables RLS on all 10 tables
- Creates 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- Enforces user isolation via `auth.uid()`

**Depends on:** Migration 000 (auth.uid() must exist)

### 5. **005_indexes.sql**
Creates performance indexes for common queries.
- User data access patterns
- Session playback queries
- Background processing queues (partial indexes)

### 6. **006_create_schedule_tables.sql**
Creates tables for scheduling and notifications:
- `study_plans` - User-defined study schedules
- `study_plan_rules` - Time-based scheduling rules
- `device_push_tokens` - Push notification tokens
- `scheduled_notifications` - Queued notifications

### 7. **007_schedule_rls_policies.sql**
Enables RLS and creates policies for schedule tables.
- Enforces user isolation for plans, rules, tokens, and notifications
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

### 8. **008_schedule_indexes.sql**
Creates performance indexes for scheduling queries.
- Plan and rule lookups
- Notification queue scanning
- Device token queries

### 9. **009_storage_setup.sql**
Creates Supabase Storage buckets and access policies:
- `lesson_assets` - User lesson files (PDFs, audio, images)
- `tts_audio` - Generated TTS audio chunks
- Storage RLS policies for user isolation

**Path conventions:**
- lesson_assets: `{user_id}/{lesson_id}/{filename}`
- tts_audio: `{user_id}/{study_session_id}/{target_lang}/chunk_{seq}.mp3`

## Applying Migrations

### Using Supabase CLI (Recommended)

```bash
cd study-os-mobile

# Apply all migrations in order
supabase db push

# Or apply individually
supabase db execute -f supabase/migrations/000_setup_auth_helpers.sql
supabase db execute -f supabase/migrations/001_create_core_tables.sql
supabase db execute -f supabase/migrations/002_create_live_tables.sql
supabase db execute -f supabase/migrations/003_create_outputs_and_progress.sql
supabase db execute -f supabase/migrations/004_rls_policies.sql
supabase db execute -f supabase/migrations/005_indexes.sql
supabase db execute -f supabase/migrations/006_create_schedule_tables.sql
supabase db execute -f supabase/migrations/007_schedule_rls_policies.sql
supabase db execute -f supabase/migrations/008_schedule_indexes.sql
supabase db execute -f supabase/migrations/009_storage_setup.sql
```

### Using Supabase Dashboard

1. Go to **SQL Editor** in your Supabase project
2. Copy and paste each migration file **in order**
3. Run each one
4. Verify no errors in the output

### Verify Migrations

After applying all migrations, verify the setup:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Should see: courses, device_push_tokens, lesson_assets, lesson_outputs, 
--             lesson_progress, lessons, live_transcript_segments, 
--             live_translation_segments, live_tts_chunks, scheduled_notifications,
--             study_plan_rules, study_plans, study_sessions, user_settings

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
-- All should show rowsecurity = true

-- Check auth.uid() exists
SELECT auth.uid();
-- Should return NULL (no user session set) or a UUID

-- Check policies exist
SELECT COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public';
-- Should return: 56 (4 policies × 14 tables)

-- Check storage buckets exist
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('lesson_assets', 'tts_audio');
-- Should return 2 buckets, both with public = false

-- Check storage policies exist
SELECT COUNT(*) AS storage_policy_count
FROM pg_policies
WHERE tablename = 'objects'
  AND (policyname LIKE '%lesson%' OR policyname LIKE '%tts%');
-- Should return: 8 (4 policies × 2 buckets)
```

## Rolling Back Migrations

To roll back, drop tables and schemas in reverse order:

```sql
-- WARNING: This will delete ALL data!

-- Drop tables (reverse order of creation)
DROP TABLE IF EXISTS scheduled_notifications CASCADE;
DROP TABLE IF EXISTS device_push_tokens CASCADE;
DROP TABLE IF EXISTS study_plan_rules CASCADE;
DROP TABLE IF EXISTS study_plans CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lesson_outputs CASCADE;
DROP TABLE IF EXISTS live_tts_chunks CASCADE;
DROP TABLE IF EXISTS live_translation_segments CASCADE;
DROP TABLE IF EXISTS live_transcript_segments CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS lesson_assets CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Drop storage buckets and policies
DELETE FROM storage.buckets WHERE id IN ('lesson_assets', 'tts_audio');

-- Drop auth helpers
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP SCHEMA IF EXISTS auth CASCADE;
```

## Common Issues

### Issue: RLS policies fail with "function auth.uid() does not exist"
**Solution:** Run migration 000_setup_auth_helpers.sql first

### Issue: Foreign key constraint errors
**Solution:** You skipped a migration. Apply them in order starting from 000

### Issue: "relation already exists"
**Solution:** Migration was already applied. Skip to the next one or use `CREATE TABLE IF NOT EXISTS`

### Issue: Policies don't seem to work
**Solution:** 
1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Verify auth.uid() exists: `SELECT auth.uid();`
3. Run the test suite: `backend/tests/sql/db_smoke_test.sql`

## Testing

After applying all migrations, run the smoke test to verify everything works:

```bash
# See backend/tests/sql/README.md for detailed instructions
# 1. Run check_rls_setup.sql to verify setup
# 2. Run db_smoke_test.sql to test RLS and constraints
```

## Migration Naming Convention

- **000-099:** Infrastructure and auth setup
- **100-199:** Core tables
- **200-299:** Feature tables
- **300-399:** RLS policies and security
- **400-499:** Indexes and performance
- **500+:** Data migrations and updates

Current migrations follow a simplified convention since this is MVP.
