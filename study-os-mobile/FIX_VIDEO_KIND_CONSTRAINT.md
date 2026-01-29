# Fix Video Kind Constraint

## Problem
The `lesson_assets` table has a check constraint that doesn't allow `'video'` as a valid `kind` value. This causes errors when trying to create video records.

## Solution

Run this SQL in your Supabase Dashboard SQL Editor:

```sql
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
```

## Steps

1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Click "Run"
4. Try generating a video again in the app

## Alternative: Use Supabase CLI (if linked)

If you have Supabase CLI linked to your project:

```bash
cd /Users/danielntumba/smrtr/study-os-mobile
supabase db push
```

This will apply all pending migrations including the new one.
