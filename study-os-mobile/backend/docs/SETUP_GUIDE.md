# Database Setup Guide

## Quick Start

### Step 1: Apply Migrations

Apply migrations in order:

```bash
cd study-os-mobile

# Apply all migrations
supabase db push
```

Or manually in Supabase SQL Editor:
1. `000_setup_auth_helpers.sql` - Verifies auth.uid() exists
2. `001_create_core_tables.sql` - Core tables
3. `002_create_live_tables.sql` - Live session tables
4. `003_create_outputs_and_progress.sql` - Study materials
5. `004_rls_policies.sql` - Security policies
6. `005_indexes.sql` - Performance indexes

### Step 2: Run Tests

```bash
# In Supabase SQL Editor, run:
backend/tests/sql/db_smoke_test_simple.sql
```

Expected output:
```
✓ Schema structure: PASS
✓ Unique constraints: PASS
✓ Cascade deletes: PASS
```

### Step 3: Test with Real Users

RLS policies work with real authenticated users. Test via:
1. Sign up users in your app
2. Try to access other users' data
3. Verify isolation works

---

## Migration Files

### 000_setup_auth_helpers.sql
**Purpose:** Verifies that `auth.uid()` exists (provided by Supabase).

**What it does:**
- Checks auth schema exists
- Verifies auth.uid() function is available
- Displays confirmation messages

**Note:** In Supabase, the `auth` schema and `auth.uid()` are built-in. This migration just verifies they're there.

### 001-003: Table Creation
Creates all database tables with proper relationships and constraints.

### 004_rls_policies.sql
**Purpose:** Enables Row Level Security on all tables.

**Security Model:**
- Users can only access their own data (`auth.uid() = user_id`)
- Child tables verify parent ownership on insert
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

**How it works:**
- `auth.uid()` reads user ID from JWT token
- RLS policies compare this to the `user_id` column
- If they don't match, access is denied

### 005_indexes.sql
Creates performance indexes for common queries.

---

## Testing

### Schema Testing (Without RLS)

Use `db_smoke_test_simple.sql` to test:
- ✅ All tables created correctly
- ✅ Unique constraints work
- ✅ Cascade deletes work
- ✅ Foreign key relationships
- ❌ Does NOT test RLS (requires real auth)

**Run this test immediately after applying migrations.**

### RLS Testing (With Real Auth)

RLS can only be properly tested with **real authenticated users** because:
- `auth.uid()` reads from JWT tokens
- Test helpers like `set_config()` don't work with Supabase auth
- You need actual sign-up/sign-in flow

**How to test RLS:**

1. **Create test users** in Supabase Dashboard:
   - Go to Authentication → Users
   - Add 2 test users

2. **Use your mobile app** to:
   - Sign in as User A
   - Create some courses/lessons
   - Sign out
   - Sign in as User B
   - Try to access User A's data (should fail)
   - Try to create data in User A's lesson (should fail)

3. **Or use Supabase REST API**:
   ```bash
   # Sign in as user 1
   TOKEN1=$(curl -X POST https://your-project.supabase.co/auth/v1/token \
     -H "apikey: YOUR_ANON_KEY" \
     -d '{"email":"user1@test.com","password":"password"}' | jq -r .access_token)
   
   # Create a course as user 1
   curl -X POST https://your-project.supabase.co/rest/v1/courses \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer $TOKEN1" \
     -d '{"title":"My Course","user_id":"USER1_UUID"}'
   
   # Sign in as user 2
   TOKEN2=$(curl -X POST https://your-project.supabase.co/auth/v1/token \
     -H "apikey: YOUR_ANON_KEY" \
     -d '{"email":"user2@test.com","password":"password"}' | jq -r .access_token)
   
   # Try to access user 1's courses (should return empty)
   curl https://your-project.supabase.co/rest/v1/courses \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer $TOKEN2"
   ```

---

## Verification Checklist

After setup, verify everything works:

### ✅ Migrations Applied
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
Expected: 10 tables (courses, lessons, lesson_assets, etc.)

### ✅ RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
Expected: All tables have `rowsecurity = true`

### ✅ Policies Created
```sql
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
```
Expected: 40 policies (4 per table × 10 tables)

### ✅ auth.uid() Exists
```sql
SELECT auth.uid();
```
Expected: NULL (if not authenticated) or a UUID (if authenticated)

### ✅ Indexes Created
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;
```
Expected: Multiple indexes per table

---

## Common Issues

### Issue: "auth schema does not exist"
**Cause:** Running on non-Supabase PostgreSQL.
**Solution:** Supabase projects have this by default. If using plain PostgreSQL, you need to set up JWT auth manually.

### Issue: "RLS test fails"
**Cause:** Can't test RLS with `set_config()` in Supabase.
**Solution:** Use `db_smoke_test_simple.sql` for schema testing, test RLS via mobile app or REST API.

### Issue: "Cascade delete not working"
**Cause:** Foreign keys not created or ON DELETE CASCADE missing.
**Solution:** Re-run migrations 001-003.

### Issue: "Performance is slow"
**Cause:** Indexes not created.
**Solution:** Run migration 005_indexes.sql.

---

## Next Steps

1. ✅ Apply all migrations
2. ✅ Run `db_smoke_test_simple.sql`
3. ✅ Create test users in Supabase Dashboard
4. ✅ Test RLS via mobile app
5. 🚀 Build your application!

---

## Production Checklist

Before going to production:

- [ ] All migrations applied successfully
- [ ] RLS enabled on all tables
- [ ] RLS tested with real users
- [ ] Indexes created
- [ ] Backup strategy in place
- [ ] Monitor query performance
- [ ] Set up alerts for errors
- [ ] Document any custom policies
