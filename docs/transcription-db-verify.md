# Transcription Database Verification Checklist

Quick SQL verification tests for transcription RLS policies.

---

## Prerequisites

- Migrations applied: `001_transcription_tables.sql`
- RLS enabled: `001_transcription_rls.sql`
- Two test users exist: `user1@test.com`, `user2@test.com`

---

## Test 1: Create Session as Authenticated User

**As User 1:**

```sql
-- Set context to User 1
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '{{user1_id}}';

-- Create session (should succeed)
INSERT INTO transcription_sessions (user_id, source_type, language)
VALUES ('{{user1_id}}', 'live_recording', 'en-US')
RETURNING id, user_id, status, created_at;
```

**Expected:** ✅ 1 row returned with `user_id = user1_id`, `status = 'recording'`

---

## Test 2: Cross-User SELECT (Should Fail)

**As User 1, attempt to read User 2's session:**

```sql
-- Still as User 1
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '{{user1_id}}';

-- Try to SELECT User 2's session
SELECT id, user_id, status 
FROM transcription_sessions 
WHERE user_id = '{{user2_id}}';
```

**Expected:** ✅ 0 rows returned (empty result)

---

**As User 1, attempt to INSERT for User 2:**

```sql
-- Still as User 1
INSERT INTO transcription_sessions (user_id, source_type)
VALUES ('{{user2_id}}', 'live_recording');
```

**Expected:** ✅ Error: `new row violates row-level security policy`

---

## Test 3: Insert Chunk + Segment Under Owned Session

**As User 1, create chunk and segment:**

```sql
-- Set context to User 1
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '{{user1_id}}';

-- Use session ID from Test 1
\set session_id {{session_id_from_test1}}

-- Insert chunk (should succeed)
INSERT INTO transcription_chunks (
  session_id, chunk_index, storage_path, duration_ms, overlap_ms
)
VALUES (
  '{{session_id_from_test1}}', 0, 'transcription/{{user1_id}}/{{session_id_from_test1}}/chunk_0.m4a', 5000, 0
)
RETURNING id, chunk_index, status;

-- Insert segment (should succeed)
INSERT INTO transcript_segments (
  session_id, chunk_index, text, start_ms, end_ms, confidence
)
VALUES (
  '{{session_id_from_test1}}', 0, 'Hello world this is a test', 0, 5000, 0.95
)
RETURNING id, chunk_index, text;
```

**Expected:** ✅ Both inserts succeed, return 1 row each

---

## Test 4: Cross-User Chunk Access (Should Fail)

**As User 2, attempt to read User 1's chunks:**

```sql
-- Switch to User 2
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '{{user2_id}}';

-- Try to SELECT User 1's chunks
SELECT chunk_index, storage_path 
FROM transcription_chunks 
WHERE session_id = '{{session_id_from_test1}}';
```

**Expected:** ✅ 0 rows returned (RLS blocks access)

---

**As User 2, attempt to INSERT chunk into User 1's session:**

```sql
-- Still as User 2
INSERT INTO transcription_chunks (
  session_id, chunk_index, storage_path, duration_ms
)
VALUES (
  '{{session_id_from_test1}}', 1, 'transcription/{{user2_id}}/chunk_1.m4a', 5000
);
```

**Expected:** ✅ Error: `new row violates row-level security policy`

---

## Test 5: Full Transcript Isolation

**As User 1, create transcript:**

```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '{{user1_id}}';

INSERT INTO transcripts (session_id, full_text)
VALUES ('{{session_id_from_test1}}', 'Hello world this is a test')
RETURNING session_id, full_text;
```

**Expected:** ✅ 1 row returned

---

**As User 2, attempt to read User 1's transcript:**

```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '{{user2_id}}';

SELECT full_text 
FROM transcripts 
WHERE session_id = '{{session_id_from_test1}}';
```

**Expected:** ✅ 0 rows returned

---

## Cleanup

```sql
-- Reset role
RESET role;

-- Delete test data
DELETE FROM transcription_sessions WHERE user_id IN ('{{user1_id}}', '{{user2_id}}');
```

---

## Summary Checklist

- ✅ User can create sessions with their own `user_id`
- ✅ User CANNOT create sessions with other user's `user_id`
- ✅ User CANNOT SELECT other user's sessions
- ✅ User can insert chunks/segments for own sessions
- ✅ User CANNOT insert chunks/segments for other user's sessions
- ✅ User CANNOT read other user's chunks/segments/transcripts
- ✅ Cascade deletion works (delete session → deletes chunks/segments/transcript)

---

## Notes

- Replace `{{user1_id}}`, `{{user2_id}}`, `{{session_id_from_test1}}` with actual UUIDs
- Run each test in a transaction for safety: `BEGIN; ... ROLLBACK;`
- For CI/CD, wrap these in a test script that uses Supabase client auth
