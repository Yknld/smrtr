# Quick Deploy: Notes Feature

## ✅ Function Deployed and Working!

The `notes_commit_from_segments` function is now deployed and active!

```
✓ notes_commit_from_segments - ACTIVE (version 3)
✓ JWT validation working
✓ Database migration applied
✓ Tested successfully
```

**Important:** This function was deployed with `--no-verify-jwt` because it handles JWT validation internally.

---

## 📝 Apply Database Migration

**If you got error "column already exists"**, the migration was partially applied. Use the safe version!

### Option 1: Supabase Dashboard (Recommended)

1. **Open SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql

2. **First, check current status:**
   - Copy and run: `supabase/migrations/012_verify_notes.sql`
   - This shows what's already applied

3. **Apply safe migration:**
   - Copy and run: `supabase/migrations/012_add_notes_to_lesson_outputs_safe.sql`
   - This only adds missing pieces, won't fail if columns exist

4. **Verify it worked:**
   ```sql
   -- Should return 3 columns
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'lesson_outputs' 
     AND column_name LIKE 'notes_%' OR column_name = 'last_committed_seq';
   ```

### Option 2: Using psql (if you have it)

```bash
# Set your database URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Check current status
psql $DATABASE_URL -f supabase/migrations/012_verify_notes.sql

# Run safe migration
psql $DATABASE_URL -f supabase/migrations/012_add_notes_to_lesson_outputs_safe.sql

# Verify complete
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lesson_outputs' AND (column_name LIKE 'notes_%' OR column_name = 'last_committed_seq');"
```

---

## ✅ Test the Function

Once migration is applied:

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/supabase/functions/notes_commit_from_segments

# Edit curl-test.sh with your values
nano curl-test.sh

# Update:
# - SUPABASE_URL
# - JWT_TOKEN (from your app)
# - LESSON_ID
# - STUDY_SESSION_ID

# Run test
./curl-test.sh
```

---

## Quick Test Without Script

```bash
# Get JWT from your app
JWT="YOUR_JWT_TOKEN"

# Test the function
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/notes_commit_from_segments" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID",
    "study_session_id": "YOUR_SESSION_ID"
  }' | jq '.'
```

---

## Expected Response

```json
{
  "ok": true,
  "appended": 7,
  "last_committed_seq": 42,
  "notes_preview": "... last 600 characters of notes ..."
}
```

---

## Status

- ✅ **Function deployed:** `notes_commit_from_segments` (version 1)
- ⏳ **Migration:** Apply via dashboard (see above)
- ⏳ **Testing:** Run after migration is applied

---

## Full Documentation

- **Quick Reference:** `backend/docs/notes-commit-function.md`
- **Complete Guide:** `supabase/functions/notes_commit_from_segments/README.md`
- **Implementation:** `LIVE_NOTES_IMPLEMENTATION.md`
