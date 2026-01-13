# Apply Pending Migrations - FIXED

## Issue
Migrations 003-014 exist locally but haven't been applied to the remote database.
The `lesson_outputs` table doesn't exist yet because migration 003 wasn't applied.

## Solution: Apply All Pending Migrations

### Option 1: Via Supabase Dashboard (Recommended)

**Go to:** https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql

**Apply these migrations IN ORDER:**

#### 1. Migration 003: lesson_outputs table
```sql
-- Copy contents of:
study-os-mobile/supabase/migrations/003_create_outputs_and_progress.sql
-- Paste and run
```

#### 2. Migration 004: RLS policies
```sql
-- Copy contents of:
study-os-mobile/supabase/migrations/004_rls_policies.sql
-- Paste and run
```

#### 3. Migration 005: Indexes
```sql
-- Copy contents of:
study-os-mobile/supabase/migrations/005_indexes.sql
-- Paste and run
```

#### 4-13. Other migrations (if needed)
Continue with migrations 006-013 if they're required for your features.

#### 14. Migration 014: Enhanced lesson_outputs
```sql
-- Copy contents of:
study-os-mobile/supabase/migrations/014_enhance_lesson_outputs.sql
-- Paste and run
```

---

### Option 2: Via CLI (Faster but needs confirmation)

```bash
cd study-os-mobile

# Apply all pending migrations
supabase db push

# If it asks for confirmation, review the changes and confirm
```

---

## Verify After Applying

```sql
-- Check that lesson_outputs table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lesson_outputs';

-- Should show:
-- id, user_id, lesson_id, type, status, content_json, 
-- created_at, updated_at, version, source_hash, model
```

---

## Why This Happened

Looking at the migration list:
- Local migrations: 003-014 exist ✅
- Remote migrations: Only 000, 002 applied ❌

The remote database is missing all migrations from 003 onwards.

---

## After Migrations Are Applied

Then you can:
1. Run the test suite: `node scripts/test-flashcards-quiz.js`
2. Deploy podcast outline: `supabase functions deploy podcast_generate_outline`
3. Test the APIs

---

## Quick Check

Before applying migrations, check what's on remote:

```sql
-- See what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

If `lesson_outputs` is NOT in the list, you need to apply migration 003 first.
