# Fix Migration Issue - lesson_outputs Doesn't Exist

## Problem
- Migration 014 tries to ALTER lesson_outputs table
- But lesson_outputs doesn't exist on remote database yet
- Some migrations were applied manually, bypassing migration tracking

## Quick Fix: Apply Just What's Missing

### Step 1: Check what exists

Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql

Run this:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Step 2: If lesson_outputs is MISSING, apply migration 003

Copy and paste the ENTIRE contents of:
`study-os-mobile/supabase/migrations/003_create_outputs_and_progress.sql`

Into the SQL Editor and run it.

### Step 3: Then apply migration 014

Copy and paste the ENTIRE contents of:
`study-os-mobile/supabase/migrations/014_enhance_lesson_outputs.sql`

Into the SQL Editor and run it.

### Step 4: Verify

```sql
-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lesson_outputs'
ORDER BY ordinal_position;

-- Should see:
-- id, user_id, lesson_id, type, status, content_json, 
-- created_at, updated_at, version, source_hash, model
```

## Then Run Tests

```bash
cd study-os-mobile
node scripts/test-flashcards-quiz.js
```

Should see all tests pass!

---

## Why This Happened

Your migration tracking got out of sync. Some tables were created manually or via another method, so the Supabase CLI thinks they need to be created, but they already exist.

The manual SQL approach bypasses this issue and just creates what's actually missing.
