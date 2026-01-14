# Transcription System Smoke Tests

**Purpose:** Minimal end-to-end verification of the pseudo-live transcription MVP.

**Duration:** ~10 minutes

**Prerequisites:**
- Two test users created in Supabase Auth (e.g., `user1@test.com`, `user2@test.com`)
- All Edge Functions deployed (`transcribe_start`, `transcribe_chunk`, `transcribe_poll`)
- Database migrations applied (`001_transcription_tables.sql`, `001_transcription_rls.sql`)
- Storage bucket `raw_audio_chunks` created with RLS policies
- `GEMINI_API_KEY` secret configured in Supabase

---

## 🧪 **Smoke Test Checklist**

### **Setup: Get User Tokens**

**Action:**
1. Use `get-token.js` script to obtain JWT tokens for both test users
2. Store tokens as `TOKEN_USER1` and `TOKEN_USER2`

**Expected:**
- Both tokens obtained successfully
- Tokens are valid JWT format (3 base64 parts separated by dots)

---

### **Test 1: Create Session (User 1)**

**Action:**
1. Call `POST /transcribe_start` with User 1's token
2. Body: `{ "language": "en-US" }`
3. Store returned `session_id` as `SESSION_USER1`

**Expected:**
- HTTP 200 response
- Response contains `session_id` (UUID)
- Response contains `status: "recording"`
- Response contains `language: "en-US"`

**Verify in Database:**
```sql
SELECT id, user_id, status, language, created_at
FROM transcription_sessions
WHERE id = 'SESSION_USER1';
```
- Row exists with correct `user_id` for User 1

---

### **Test 2: Upload 3 Audio Chunks to Storage**

**Action:**
1. Prepare 3 small audio files (e.g., `.m4a` or `.wav`, 3-5 seconds each)
2. Upload to Supabase Storage bucket `raw_audio_chunks` using Supabase client SDK
3. Use correct path format for each:
   - Chunk 0: `transcription/{user1_id}/{SESSION_USER1}/chunk_0.m4a`
   - Chunk 1: `transcription/{user1_id}/{SESSION_USER1}/chunk_1.m4a`
   - Chunk 2: `transcription/{user1_id}/{SESSION_USER1}/chunk_2.m4a`

**Expected:**
- All 3 files uploaded successfully
- Files visible in Supabase Dashboard under Storage → `raw_audio_chunks`

**Verify in Storage:**
- Navigate to Storage bucket in Supabase Dashboard
- Confirm all 3 files exist under correct folder structure

---

### **Test 3: Transcribe Chunk 0**

**Action:**
1. Call `POST /transcribe_chunk` with User 1's token
2. Body:
   ```json
   {
     "session_id": "SESSION_USER1",
     "chunk_index": 0,
     "storage_path": "transcription/{user1_id}/{SESSION_USER1}/chunk_0.m4a",
     "duration_ms": 5000,
     "overlap_ms": 500
   }
   ```

**Expected:**
- HTTP 200 response
- Response contains `chunk_id`, `chunk_index: 0`, `status: "done"`
- Response contains `tail_text` (transcription of chunk 0)

**Verify in Database:**
```sql
-- Check chunk status
SELECT chunk_index, status, error
FROM transcription_chunks
WHERE session_id = 'SESSION_USER1' AND chunk_index = 0;

-- Check segment inserted
SELECT chunk_index, text, confidence
FROM transcript_segments
WHERE session_id = 'SESSION_USER1' AND chunk_index = 0;

-- Check transcripts.full_text
SELECT full_text, updated_at
FROM transcripts
WHERE session_id = 'SESSION_USER1';
```

**Expected:**
- Chunk status = `"done"`
- Segment row exists with transcribed text
- `transcripts.full_text` contains chunk 0's text

---

### **Test 4: Transcribe Chunk 1**

**Action:**
1. Call `POST /transcribe_chunk` with User 1's token
2. Body:
   ```json
   {
     "session_id": "SESSION_USER1",
     "chunk_index": 1,
     "storage_path": "transcription/{user1_id}/{SESSION_USER1}/chunk_1.m4a",
     "duration_ms": 5000,
     "overlap_ms": 500
   }
   ```

**Expected:**
- HTTP 200 response
- Response contains `status: "done"`
- Response contains `tail_text` (merged text of chunk 0 + chunk 1)

**Verify in Database:**
```sql
-- Check transcripts.full_text for merge
SELECT full_text FROM transcripts WHERE session_id = 'SESSION_USER1';

-- Compare length to previous
-- full_text should be longer than after chunk 0
-- Should NOT contain obvious duplicates from overlap
```

**Expected:**
- `full_text` is longer than after chunk 0
- No obvious repeated phrases at chunk boundary
- Overlap dedupe algorithm trimmed redundant text

---

### **Test 5: Transcribe Chunk 2**

**Action:**
1. Call `POST /transcribe_chunk` with User 1's token
2. Body:
   ```json
   {
     "session_id": "SESSION_USER1",
     "chunk_index": 2,
     "storage_path": "transcription/{user1_id}/{SESSION_USER1}/chunk_2.m4a",
     "duration_ms": 5000,
     "overlap_ms": 500
   }
   ```

**Expected:**
- HTTP 200 response
- Response contains `status: "done"`
- Response contains `tail_text` (merged text of all 3 chunks)

**Verify in Database:**
```sql
-- Check all chunks are done
SELECT chunk_index, status FROM transcription_chunks
WHERE session_id = 'SESSION_USER1'
ORDER BY chunk_index;

-- Check all segments exist
SELECT chunk_index, text FROM transcript_segments
WHERE session_id = 'SESSION_USER1'
ORDER BY chunk_index;

-- Check final transcript
SELECT full_text FROM transcripts WHERE session_id = 'SESSION_USER1';
```

**Expected:**
- All 3 chunks have `status = "done"`
- All 3 segments exist with text
- `full_text` contains merged text without duplicates

---

### **Test 6: Verify Idempotency (Re-call Chunk 1)**

**Action:**
1. Call `POST /transcribe_chunk` again for chunk 1 (exact same request as Test 4)
2. Measure response time

**Expected:**
- HTTP 200 response (same as first call)
- Response contains same `chunk_id` as first call
- Response contains same `tail_text`
- Response is **faster** than first call (no transcription performed)
- No Gemini API call made (check function logs)

**Verify in Database:**
```sql
-- Check chunk still shows as done (not re-created)
SELECT id, chunk_index, status, created_at, updated_at
FROM transcription_chunks
WHERE session_id = 'SESSION_USER1' AND chunk_index = 1;

-- Check segment count unchanged
SELECT COUNT(*) FROM transcript_segments
WHERE session_id = 'SESSION_USER1' AND chunk_index = 1;
```

**Expected:**
- Same `chunk_id` as first call
- `created_at` and `updated_at` unchanged (or `updated_at` minimally updated)
- Only 1 segment exists for chunk 1 (not duplicated)

---

### **Test 7: Verify Cross-User Access Blocked**

**Action:**
1. User 2 attempts to poll User 1's session
2. Call `GET /transcribe_poll?session_id=SESSION_USER1` with User 2's token (`TOKEN_USER2`)

**Expected:**
- HTTP 403 response
- Error message: `"Forbidden: session does not belong to user"`

**Action:**
1. User 2 attempts to transcribe a chunk for User 1's session
2. Call `POST /transcribe_chunk` with User 2's token
3. Body references User 1's `SESSION_USER1`

**Expected:**
- HTTP 404 or 403 response
- Error indicates session not found or access denied
- RLS blocks User 2 from seeing User 1's session

---

### **Test 8: Poll for Incremental Updates**

**Action:**
1. Call `GET /transcribe_poll?session_id=SESSION_USER1` with User 1's token (no `after_chunk_index`)
2. Store returned `latest_chunk_index` (should be 2)
3. Call `GET /transcribe_poll?session_id=SESSION_USER1&after_chunk_index=2` with User 1's token

**Expected (First Call):**
- HTTP 200 response
- `segments` array contains all 3 segments (chunk 0, 1, 2)
- `latest_chunk_index = 2`
- `status = "recording"`
- `tail_text` contains last 600 chars of full transcript

**Expected (Second Call - Incremental):**
- HTTP 200 response
- `segments` array is **empty** (no chunks after index 2)
- `latest_chunk_index = 2` (unchanged)
- `tail_text` still present

---

### **Test 9: Verify Full Text Integrity**

**Action:**
1. Query `transcripts.full_text` for User 1's session
2. Manually compare to individual segment texts

**Verify in Database:**
```sql
-- Get merged full_text
SELECT full_text FROM transcripts WHERE session_id = 'SESSION_USER1';

-- Get individual segments
SELECT chunk_index, text FROM transcript_segments
WHERE session_id = 'SESSION_USER1'
ORDER BY chunk_index;
```

**Expected:**
- `full_text` contains text from all 3 segments
- No obvious duplicated phrases at chunk boundaries
- Text flows naturally (overlap dedupe worked)
- Length is reasonable (not 3x individual segments due to overlap)

---

### **Test 10: Verify Chunk Status Transitions**

**Action:**
1. Upload a new chunk (chunk 3) to Storage
2. Call `/transcribe_chunk` for chunk 3
3. Immediately query database before response returns (if possible)

**Verify in Database (During Processing):**
```sql
SELECT chunk_index, status, created_at, updated_at
FROM transcription_chunks
WHERE session_id = 'SESSION_USER1' AND chunk_index = 3;
```

**Expected Status Flow:**
- Initially: `status = "uploaded"` (after INSERT)
- Then: `status = "transcribing"` (during Gemini call)
- Finally: `status = "done"` (after success)
- On error: `status = "failed"` with `error` text populated

---

## ✅ **Smoke Test Summary**

| Test | Description | Status |
|------|-------------|--------|
| 1 | Create session | ⬜ |
| 2 | Upload 3 chunks to Storage | ⬜ |
| 3 | Transcribe chunk 0 | ⬜ |
| 4 | Transcribe chunk 1 (merge) | ⬜ |
| 5 | Transcribe chunk 2 (merge) | ⬜ |
| 6 | Idempotency (re-call chunk 1) | ⬜ |
| 7 | Cross-user access blocked | ⬜ |
| 8 | Incremental polling | ⬜ |
| 9 | Full text integrity (no dupes) | ⬜ |
| 10 | Status transitions | ⬜ |

---

## 🚨 **Common Issues & Debugging**

### **Issue: "Invalid JWT" or "Unauthorized"**
- **Cause:** JWT token expired or malformed
- **Fix:** Re-run `get-token.js` to obtain fresh token

### **Issue: "Session not found"**
- **Cause:** Session ID copied incorrectly or RLS blocking access
- **Fix:** Verify `session_id` is correct UUID, check user owns session

### **Issue: "Failed to download audio file from storage"**
- **Cause:** Storage path incorrect or RLS policy blocking function
- **Fix:** Verify path format `transcription/{user_id}/{session_id}/chunk_{index}.m4a`
- **Fix:** Ensure service role key is set in Supabase secrets

### **Issue: Transcripts contain duplicated text**
- **Cause:** Overlap dedupe algorithm not working
- **Debug:** Check `transcripts.full_text` for repeated phrases
- **Debug:** Verify chunks have `overlap_ms > 0` specified

### **Issue: Idempotency test fails (re-transcribes)**
- **Cause:** Chunk status not set to "done" or unique constraint missing
- **Debug:** Check `transcription_chunks` table for existing row with `status="done"`

### **Issue: Cross-user access NOT blocked**
- **Cause:** RLS policies not applied or service role key used incorrectly
- **Debug:** Verify RLS is enabled on all tables
- **Debug:** Ensure edge function uses user's JWT for database queries

---

## 📊 **Success Criteria**

**All 10 tests pass with:**
- ✅ Sessions created successfully
- ✅ Chunks transcribed and merged without duplicates
- ✅ Idempotency prevents re-transcription
- ✅ Cross-user access completely blocked
- ✅ Incremental polling returns only new segments
- ✅ Status transitions work correctly
- ✅ No errors in Edge Function logs
- ✅ RLS enforced on all tables

**If all tests pass:** MVP is production-ready for mobile integration! 🚀

---

## 🔗 **Related Documents**

- **Database Verification:** `docs/transcription-db-verify.md`
- **Storage Verification:** `backend/docs/transcription-storage.md`
- **Edge Functions Spec:** `backend/docs/edge-functions-transcription.md`
- **MVP Plan:** `docs/transcription-mvp-plan.md`
- **Client Integration:** `backend/functions/CLIENT_INTEGRATION.md`
