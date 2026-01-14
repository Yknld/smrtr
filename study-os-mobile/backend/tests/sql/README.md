# Database SQL Tests

## Overview

This directory contains SQL smoke tests for verifying database schema, RLS policies, constraints, and data integrity.

**Available Tests:**
- `db_smoke_test.sql` - Core tables (courses, lessons, study_sessions, etc.)
- `schedule_smoke_test.sql` - Scheduling tables (study_plans, notifications, push tokens)
- `db_smoke_test_simple.sql` - Simplified test without RLS validation
- `check_rls_setup.sql` - Verify RLS configuration

---

## Running the Core Smoke Test

The `db_smoke_test.sql` file tests RLS policies, unique constraints, and cascade deletes.

### Prerequisites
1. Apply all migrations in order:
   - **000_setup_auth_helpers.sql** (REQUIRED - creates auth.uid() function)
   - 001_create_core_tables.sql
   - 002_create_live_tables.sql
   - 003_create_outputs_and_progress.sql
   - 004_rls_policies.sql
   - 005_indexes.sql
2. Have two test user UUIDs ready
3. **(Recommended)** Run `check_rls_setup.sql` first to verify RLS is configured correctly

### Step 0: Verify RLS Setup (Recommended)

Before running the smoke test, verify RLS is properly configured:

```sql
-- Run this first in Supabase SQL Editor:
-- study-os-mobile/backend/tests/sql/check_rls_setup.sql
```

Expected output:
- All 10 tables should have `rls_enabled = true`
- Should see 40 policies total (4 per table)
- Should see `✓ auth.uid() function exists`

If `auth.uid()` doesn't exist, you need to run migration `000_setup_auth_helpers.sql` first.

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `db_smoke_test.sql`
4. **Replace the test UUIDs** on lines where you see:
   ```sql
   user_id_1 uuid := '11111111-1111-1111-1111-111111111111'; -- REPLACE WITH ACTUAL UUID
   user_id_2 uuid := '22222222-2222-2222-2222-222222222222'; -- REPLACE WITH ACTUAL UUID
   ```
   
   You can generate UUIDs or use existing auth.users IDs:
   ```sql
   -- Generate two random UUIDs
   SELECT gen_random_uuid(), gen_random_uuid();
   ```

5. **Run the entire script** (not line by line)
6. Check the **Results** tab for output showing:
   - `NOTICE: ✓ PASS: ...` messages indicate successful tests
   - `ERROR: ✗ FAIL: ...` indicates a problem

### Method 2: Using psql CLI

```bash
# Connect to your database
psql "postgresql://[CONNECTION_STRING]"

# Run the test
\i backend/tests/sql/db_smoke_test.sql
```

**Note:** You still need to replace the UUID placeholders in the file.

### Method 3: Using Supabase CLI

```bash
cd study-os-mobile

# Edit the test file to replace UUIDs
# Then run:
supabase db execute -f backend/tests/sql/db_smoke_test.sql
```

## Expected Output

If all tests pass, you should see:

```
NOTICE:  === SECTION A: User 1 creates data ===
NOTICE:  Created course: [uuid]
NOTICE:  Created lesson: [uuid]
NOTICE:  Created study session: [uuid]
...
NOTICE:  ✓ PASS: User 1 can see all their data
NOTICE:  === SECTION B: User 2 attempts to access User 1 data ===
NOTICE:  User 2 sees User 1 courses: 0 (expected: 0)
...
NOTICE:  ✓ PASS: User 2 cannot see User 1 data (RLS working)
NOTICE:  ✓ PASS: User 2 correctly blocked from inserting session into User 1 lesson
...
NOTICE:  ✓ PASS: Unique constraint on (study_session_id, seq) works correctly
...
NOTICE:  ✓ PASS: Cascade deletes working correctly
...
NOTICE:  ==========================================
NOTICE:      DATABASE SMOKE TEST COMPLETE
NOTICE:  ==========================================
NOTICE:  
NOTICE:  Summary:
NOTICE:    ✓ User isolation: PASS (User 2 cannot see or modify User 1 data)
NOTICE:    ✓ Unique constraints: PASS (Duplicate seq/source_seq blocked)
NOTICE:    ✓ Cascade deletes: PASS (Related records deleted)
```

## What the Test Validates

### Section A: Data Creation
- User 1 creates a complete data hierarchy:
  - Course → Lesson → Assets
  - Study Session → Transcripts → Translations → TTS chunks
  - Lesson progress and user settings

### Section B: User Isolation (RLS)
- User 2 cannot see User 1's data
- User 2 cannot insert into User 1's resources
- All attempts blocked by RLS policies

### Section C: Data Integrity
- User 1's data remains intact after User 2 access attempts

### Section D: Unique Constraints
- Cannot insert duplicate transcript segments (same session_id, seq)
- Cannot insert duplicate translations (same session_id, source_seq, target_lang)

### Section E: Cascade Deletes
- Deleting a course cascades to:
  - All lessons in the course
  - All lesson assets
  - All study sessions
  - All transcript/translation/TTS data
  - All lesson outputs and progress

## Troubleshooting

### Error: "✗ FAIL: User 2 can see User 1 data (RLS broken!)"

**Cause:** The `auth.uid()` function doesn't exist, so RLS policies can't identify users.

**Solution:**
1. Run the RLS setup verification:
   ```sql
   -- Run check_rls_setup.sql
   ```
2. If `auth.uid()` is missing, apply migration 000:
   ```bash
   supabase db push
   # Or manually run 000_setup_auth_helpers.sql
   ```
3. Verify the function exists:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname = 'uid' 
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');
   -- Should return: uid
   ```

### Error: "syntax error at or near \\"
You're trying to run in a client that doesn't support psql meta-commands. Use the Supabase SQL Editor instead.

### Error: "relation does not exist"
Migrations haven't been applied. Run:
```bash
supabase db push
```

### Error: "permission denied for table"
RLS is enabled but you haven't set the session user. The test handles this automatically via `set_config`.

### All tests fail with RLS violations
Check that migration 004_rls_policies.sql was applied:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'lessons', 'study_sessions');
-- All should show rowsecurity = true
```

## Cleanup

The test automatically cleans up by cascade deleting the test course at the end. No manual cleanup needed.

If you want to inspect the test data before deletion, comment out Section E (cascade delete test).

---

## Running the Schedule Smoke Test

The schedule tests validate the scheduling and notification system (migrations 006-008).

### Prerequisites
1. Apply core migrations (000-005) first
2. Apply schedule migrations (006-008):
   - `006_create_schedule_tables.sql`
   - `007_schedule_rls_policies.sql`
   - `008_schedule_indexes.sql`

### Which Test to Run?

**Use `schedule_smoke_test_simple.sql` (RECOMMENDED)**
- ✅ Works in Supabase SQL Editor (service_role)
- ✅ Tests schema, constraints, cascades, indexes
- ✅ Verifies RLS policies exist
- ❌ Does NOT enforce RLS (service_role bypasses it)

**Use `schedule_smoke_test.sql` (Advanced)**
- ❌ Requires non-superuser PostgreSQL connection
- ✅ Full RLS enforcement testing
- ⚠️ Does NOT work in Supabase SQL Editor

### Running the Simplified Test (Recommended)

**Method 1: Supabase SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Paste contents of `schedule_smoke_test_simple.sql`
3. Click **Run** (executes entire script)
4. Check for `NOTICE` messages indicating test results

**Method 2: CLI**
```bash
supabase db execute -f backend/tests/sql/schedule_smoke_test_simple.sql
```

**Note:** This test generates its own UUIDs automatically—no need to edit the file!

### Testing RLS Enforcement

RLS policies can only be tested with **non-superuser connections**:
- **Best approach:** Test through mobile app with real authenticated users
- **Alternative:** Connect with `anon` or `authenticated` role (requires custom connection string)

**Why SQL Editor doesn't work for RLS:**
- Supabase SQL Editor uses `service_role` (superuser)
- Superusers bypass ALL RLS policies by design
- `SET row_security = on` doesn't override this in Supabase

### What the Test Validates

#### Section A: User 1 Creates Schedule Data
- Creates course, study_plan, study_plan_rule
- Registers device push token
- Schedules a notification

#### Section B: User 1 Verification
- Confirms user 1 can see their own data (RLS allows)

#### Section C: Constraint Tests
- ✅ Duplicate notification blocked (unique constraint)
- ✅ Invalid `duration_min` (<5 or >600) rejected
- ✅ Invalid `remind_before_min` (>120) rejected
- ✅ Invalid `platform` rejected (must be ios/android)
- ✅ Invalid notification `type` rejected
- ✅ Invalid notification `status` rejected

#### Section D: User 2 RLS Isolation
- User 2 sees 0 rows in all schedule tables (RLS working)

#### Section E: Cross-User Reference Prevention
- ✅ User 2 cannot insert `study_plan_rules` for User 1's plan
- ✅ User 2 cannot insert `scheduled_notifications` for User 1's plan
- RLS policies block foreign key references across users

#### Section F: User 1 Final Verification
- User 1's data remains intact after User 2 attempts

#### Section G: Cleanup
- Automatically deletes all test data (cascading deletes)

### Expected Output

```
NOTICE:  === SECTION A: User 1 creates schedule data ===
NOTICE:  Test User 1: [uuid]
NOTICE:  Test User 2: [uuid]
NOTICE:  Created course: [uuid]
NOTICE:  Created study_plan: [uuid]
NOTICE:  Created study_plan_rule: [uuid]
NOTICE:  Created device_push_token: [uuid]
NOTICE:  Created scheduled_notification: [uuid]
NOTICE:  === User 1 data created successfully ===
...
NOTICE:  ✓ Duplicate notification correctly rejected (unique constraint)
NOTICE:  ✓ Invalid duration_min correctly rejected (check constraint)
...
NOTICE:  User 2 sees 0 study_plans -- expect 0
NOTICE:  === User 2 RLS isolation verified ===
...
NOTICE:  ✓ User 2 correctly blocked from linking to User 1's plan (RLS)
...
NOTICE:  === SMOKE TEST COMPLETE ===
NOTICE:  
NOTICE:  All tests passed! ✓
NOTICE:  - User isolation (RLS) working correctly
NOTICE:  - Constraints enforcing data validity
NOTICE:  - Cross-user references blocked
NOTICE:  - Unique notification constraint working
```

### Troubleshooting

#### Error: "relation does not exist"
Schedule migrations not applied. Run:
```bash
supabase db push
# Or manually apply 006, 007, 008
```

#### Test fails with RLS violations
Check that migration 007 (schedule_rls_policies.sql) was applied:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('study_plans', 'study_plan_rules', 'device_push_tokens', 'scheduled_notifications');
-- All should show rowsecurity = true
```

#### Constraints not enforcing
Verify migration 006 applied correctly:
```sql
-- Check duration_min constraint exists
SELECT conname FROM pg_constraint 
WHERE conrelid = 'study_plan_rules'::regclass 
AND conname = 'duration_min_valid';
-- Should return: duration_min_valid
```

---

## Test Coverage Summary

| Test File | Tables Covered | Key Features |
|-----------|----------------|--------------|
| `db_smoke_test.sql` | courses, lessons, study_sessions, transcripts, translations, TTS, outputs, progress, settings | RLS, cascades, unique constraints |
| `schedule_smoke_test_simple.sql` ⭐ | study_plans, study_plan_rules, device_push_tokens, scheduled_notifications | Check constraints, unique notifications, cascades, indexes |
| `schedule_smoke_test.sql` | study_plans, study_plan_rules, device_push_tokens, scheduled_notifications | Full RLS testing (requires non-superuser connection) |
| `db_smoke_test_simple.sql` | All core tables | Schema structure (no RLS) |
| `check_rls_setup.sql` | All tables | RLS enabled, policy count, auth.uid() |
| `check_schedule_rls.sql` | Schedule tables | RLS diagnostics and configuration check |

---

## Best Practices

1. **Always run `check_rls_setup.sql` first** to verify auth.uid() and RLS are configured
2. **Run smoke tests after applying migrations** to catch issues early
3. **Run tests in a development/staging environment** before production
4. **Keep test UUIDs isolated** (auto-generated in schedule test, manual in core test)
5. **Review NOTICE messages** for detailed validation results
