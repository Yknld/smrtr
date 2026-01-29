# Check and Fix Migration 014

## Good News
✅ `lesson_outputs` table EXISTS on remote database!

## Next: Check what columns it has

Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lesson_outputs'
ORDER BY ordinal_position;
```

## Expected Current Columns:
- id
- user_id
- lesson_id
- type
- status
- content_json
- created_at
- updated_at

## Migration 014 Wants to Add:
- version (int)
- source_hash (text)
- model (text)

## If columns DON'T exist yet:

Apply migration 014:
```sql
-- Copy entire contents of:
-- study-os-mobile/supabase/migrations/014_enhance_lesson_outputs.sql
-- Paste and run
```

## If columns ALREADY exist:

Migration was already applied! You're good to go.

Test immediately:
```bash
cd study-os-mobile
node scripts/test-flashcards-quiz.js
```

## If you get constraint errors:

The migration might be trying to add constraints that conflict. Let me know the exact error and I'll create a fixed version.
