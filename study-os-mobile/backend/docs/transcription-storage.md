# Transcription Storage Setup

This document describes the Supabase Storage configuration for the overlapping-chunk pseudo-live transcription system.

---

## Storage Bucket

### Bucket Name
```
raw_audio_chunks
```

### Bucket Configuration

**Settings:**
- **Public**: No (private bucket)
- **File size limit**: 10 MB per file (recommended)
- **Allowed MIME types**: 
  - `audio/mp4` (M4A)
  - `audio/mpeg` (MP3)
  - `audio/webm` (WebM)
  - `audio/wav` (WAV)
  - `audio/ogg` (OGG)

**Purpose:**
- Store raw audio chunks uploaded by clients during live recording
- Provide backend/edge functions access to audio for transcription
- Enable cleanup of old audio files based on retention policies

---

## Path Format

### Standard Path Structure

```
transcription/{user_id}/{session_id}/chunk_{chunk_index}.m4a
```

### Path Components

| Component | Description | Example |
|-----------|-------------|---------|
| `transcription/` | Fixed prefix for all transcription files | `transcription/` |
| `{user_id}` | User's UUID from auth.uid() | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `{session_id}` | Session UUID from transcription_sessions.id | `12345678-abcd-ef01-2345-67890abcdef0` |
| `chunk_{chunk_index}` | Sequential chunk identifier (0, 1, 2, ...) | `chunk_0`, `chunk_1`, `chunk_2` |
| `.m4a` | File extension (M4A recommended) | `.m4a` |

### Example Paths

```
transcription/a1b2c3d4-e5f6-7890-abcd-ef1234567890/12345678-abcd-ef01-2345-67890abcdef0/chunk_0.m4a
transcription/a1b2c3d4-e5f6-7890-abcd-ef1234567890/12345678-abcd-ef01-2345-67890abcdef0/chunk_1.m4a
transcription/a1b2c3d4-e5f6-7890-abcd-ef1234567890/12345678-abcd-ef01-2345-67890abcdef0/chunk_2.m4a
```

### Path Benefits

**Organization:**
- Clear hierarchy: user → session → chunks
- Easy to identify ownership
- Simple to list all chunks for a session

**Security:**
- User ID in path enables RLS-style storage policies
- Session ID prevents cross-session access
- Chunk index prevents naming conflicts

**Cleanup:**
- Easy to delete entire session by prefix
- Can implement retention policies per user or session
- Storage policies can enforce quotas by user

---

## Recommended Chunk Configuration

### Optimal Settings

```typescript
const CHUNK_CONFIG = {
  chunk_duration_ms: 3000,    // 3 seconds per chunk
  overlap_ms: 800,             // 800ms overlap with previous chunk
  sample_rate: 16000,          // 16kHz (good for speech)
  bit_rate: 64000,             // 64 kbps (sufficient for speech)
  channels: 1,                 // Mono (stereo not needed for speech)
  format: 'm4a'                // M4A/AAC (best compression + quality)
};
```

### Configuration Rationale

#### Chunk Duration: 3000ms (3 seconds)

**Why 3 seconds?**
- Short enough for near-real-time transcription (low latency)
- Long enough to avoid excessive API calls
- Provides sufficient context for accurate transcription
- Typical sentence/phrase duration

**Trade-offs:**
- Shorter (1-2s): Lower latency, more API calls, higher costs
- Longer (5-10s): Higher latency, fewer API calls, may split sentences

#### Overlap: 800ms

**Why 800ms?**
- Captures typical word/syllable duration (~200-500ms)
- Provides context for word boundary detection
- Allows backend to merge cleanly without cutting words
- Balances accuracy vs. redundant data

**How overlap works:**
```
Chunk 0: [0.0s ──────────── 3.0s]
Chunk 1:            [2.2s ──────────── 5.2s]
                     ↑ 800ms overlap

Overlap region: [2.2s - 3.0s] appears in both chunks
Backend compares transcribed text and trims duplicates
```

**Trade-offs:**
- Less overlap (<500ms): Risk cutting words, harder to merge
- More overlap (>1000ms): More redundant transcription, higher costs

#### Sample Rate: 16kHz

**Why 16kHz?**
- Standard for speech recognition (8kHz too low, 48kHz overkill)
- Most transcription services optimize for 16kHz
- Good balance of quality and file size
- Captures human speech frequencies well (80Hz - 8kHz)

#### Format: M4A/AAC

**Why M4A?**
- Excellent compression (smaller files = faster uploads)
- Native support on iOS and Android
- Good audio quality at low bitrates
- Compatible with most transcription services

**Alternatives:**
- **WebM/Opus**: Great for web, smaller than M4A
- **WAV**: Lossless but large files (10x larger)
- **MP3**: Widely supported but larger than M4A

---

## Client Upload Flow

### Method 1: Direct Upload (Recommended)

Client uses Supabase client library to upload directly to Storage.

**Flow:**
1. Client starts recording
2. Client splits audio into 3-second chunks with 800ms overlap
3. For each chunk, client uploads to Storage:
   ```typescript
   // Example (no real code, just flow)
   const storagePath = `transcription/${userId}/${sessionId}/chunk_${chunkIndex}.m4a`;
   const { data, error } = await supabase.storage
     .from('raw_audio_chunks')
     .upload(storagePath, audioBlob);
   ```
4. Client calls backend API with `storage_path`
5. Backend/edge function downloads audio and transcribes

**Benefits:**
- No audio data passes through API (reduces bandwidth)
- Direct upload is faster
- Supabase handles auth and permissions
- No size limits in API payload

**Security:**
- Storage policies enforce user can only upload to their own paths
- RLS prevents access to other users' files

---

### Method 2: Signed URLs (Alternative)

Client requests signed URL from backend, then uploads to Storage.

**Flow:**
1. Client calls API to get signed upload URL
2. Backend generates signed URL for specific path
3. Client uploads audio directly to Storage via signed URL
4. Client calls backend to confirm upload and start transcription

**Benefits:**
- More control over upload permissions
- Can add custom validation before generating URL
- Can implement rate limiting per user

**Downsides:**
- Extra API call to get URL
- More complex client code

---

## Backend/Edge Function Access

### Reading from Storage

Backend or edge functions read audio chunks from Storage using the `storage_path` provided by client.

**Flow:**
1. Client calls `POST /api/transcribe/chunk` with `storage_path`
2. Edge function validates session ownership
3. Edge function downloads audio from Storage:
   ```typescript
   // Pseudocode (not real implementation)
   const { data, error } = await supabase.storage
     .from('raw_audio_chunks')
     .download(storagePath);
   ```
4. Edge function sends audio to transcription service (e.g., OpenAI Whisper)
5. Edge function saves transcript segments to database
6. Edge function returns transcribed text to client

**Security:**
- Edge function uses service_role key (bypasses RLS)
- Edge function validates user owns the session before downloading
- Storage path is never exposed to unauthorized users

**Error Handling:**
- If file not found: Return error to client
- If download fails: Retry up to 3 times
- If transcription fails: Mark chunk as 'failed' in database

---

## MVP Storage Setup (Supabase Client SDK)

### Quick Setup Guide

For MVP, use direct client uploads via Supabase client SDK. This is the simplest and recommended approach.

**Client Upload Flow:**
1. Client authenticates with Supabase (gets JWT token)
2. Client calls `/transcribe_start` to create session
3. Client uses Supabase Storage SDK to upload audio chunks
4. Client calls `/transcribe_chunk` with storage_path
5. Backend downloads audio and transcribes

**No signed URLs needed** - Storage policies enforce authentication and path-based authorization.

---

## Storage Policies (Production-Ready SQL)

### Required Policies for MVP

These policies ensure authenticated users can only upload, read, and delete their own audio files.

#### Policy 1: Authenticated Users Can Upload to Own Directories

```sql
-- Allow authenticated users to upload files to their own transcription directory
CREATE POLICY "Users can upload own transcription chunks"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'raw_audio_chunks'
  AND (storage.foldername(name))[1] = 'transcription'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

**What this does:**
- Only authenticated users can upload
- Must upload to `raw_audio_chunks` bucket
- Path must start with `transcription/{user_id}/`
- User ID in path must match authenticated user (`auth.uid()`)

**Example paths that PASS:**
- `transcription/a1b2c3d4-user-uuid/session-123/chunk_0.m4a` (if auth.uid() = a1b2c3d4-user-uuid)

**Example paths that FAIL:**
- `transcription/different-user-uuid/session-123/chunk_0.m4a` (wrong user_id)
- `other-bucket/transcription/user-uuid/chunk_0.m4a` (wrong bucket)
- `transcription/chunk_0.m4a` (missing user_id)

---

#### Policy 2: Authenticated Users Can Read Own Files

```sql
-- Allow authenticated users to download their own transcription files
CREATE POLICY "Users can read own transcription chunks"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'raw_audio_chunks'
  AND (storage.foldername(name))[1] = 'transcription'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

**What this does:**
- Only authenticated users can read
- Can only read from `raw_audio_chunks` bucket
- Can only read files in their own directory

**Use cases:**
- Client re-downloading chunks if needed
- User accessing their own recordings
- Playback functionality (future feature)

---

#### Policy 3: Authenticated Users Can Delete Own Files

```sql
-- Allow authenticated users to delete their own transcription files
CREATE POLICY "Users can delete own transcription chunks"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'raw_audio_chunks'
  AND (storage.foldername(name))[1] = 'transcription'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

**What this does:**
- Only authenticated users can delete
- Can only delete files in their own directory
- Enables manual cleanup by users

**Use cases:**
- User deleting old recordings to free quota
- Cleanup after reviewing transcript
- Cancel recording (delete partial uploads)

---

#### Policy 4: Service Role Can Access All Files (Backend)

Backend/edge functions use service_role key which bypasses RLS, so no additional policy needed.

**Backend access:**
- Edge functions use service_role key
- Can read any file (needed to transcribe any user's audio)
- Should validate session ownership in application code
- Never expose service_role key to client

---

### Policy Implementation Steps

**Step 1: Create bucket**
```sql
-- Run in Supabase SQL Editor or Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('raw_audio_chunks', 'raw_audio_chunks', false);
```

**Step 2: Apply policies**
```sql
-- Copy all 3 policies above and run in Supabase SQL Editor
-- Or use Supabase Dashboard → Storage → raw_audio_chunks → Policies
```

**Step 3: Verify policies enabled**
```sql
-- Check policies exist
SELECT * FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%transcription%';

-- Should return 3 policies
```

---

## How to Verify Storage Setup (2-User Test)

### Prerequisites
- [ ] Supabase project set up
- [ ] `raw_audio_chunks` bucket created
- [ ] 3 storage policies applied
- [ ] 2 test user accounts created (user1@test.com, user2@test.com)

---

### Test 1: User Can Upload to Own Directory

**As User 1:**
1. [ ] Authenticate as user1@test.com
2. [ ] Get user ID from `auth.uid()` (example: `user1-uuid`)
3. [ ] Upload test file to: `transcription/user1-uuid/test-session-1/chunk_0.m4a`
4. [ ] **Expected: SUCCESS** (200 OK)
5. [ ] Verify file exists in Supabase Storage dashboard

**As User 2:**
1. [ ] Authenticate as user2@test.com
2. [ ] Get user ID from `auth.uid()` (example: `user2-uuid`)
3. [ ] Upload test file to: `transcription/user2-uuid/test-session-2/chunk_0.m4a`
4. [ ] **Expected: SUCCESS** (200 OK)
5. [ ] Verify file exists in Storage dashboard

**Pass criteria:**
- Both users successfully upload to their own directories
- Files visible in Storage dashboard under correct paths

---

### Test 2: User CANNOT Upload to Other User's Directory

**As User 1:**
1. [ ] Still authenticated as user1@test.com
2. [ ] Attempt upload to User 2's directory: `transcription/user2-uuid/test-session-2/chunk_1.m4a`
3. [ ] **Expected: FAIL** (403 Forbidden or policy violation)
4. [ ] Error message should indicate access denied

**Pass criteria:**
- Upload fails with 403 or permission error
- File does NOT appear in User 2's directory
- Clear error message returned to client

---

### Test 3: User Can Read Own Files

**As User 1:**
1. [ ] Authenticate as user1@test.com
2. [ ] Download file from own directory: `transcription/user1-uuid/test-session-1/chunk_0.m4a`
3. [ ] **Expected: SUCCESS** (200 OK, file content returned)
4. [ ] Verify downloaded file matches uploaded file

**As User 2:**
1. [ ] Authenticate as user2@test.com
2. [ ] Download file from own directory: `transcription/user2-uuid/test-session-2/chunk_0.m4a`
3. [ ] **Expected: SUCCESS** (200 OK, file content returned)

**Pass criteria:**
- Both users successfully download their own files
- File content matches original upload

---

### Test 4: User CANNOT Read Other User's Files

**As User 1:**
1. [ ] Still authenticated as user1@test.com
2. [ ] Attempt download from User 2's directory: `transcription/user2-uuid/test-session-2/chunk_0.m4a`
3. [ ] **Expected: FAIL** (403 Forbidden or 404 Not Found)
4. [ ] No file content returned

**Pass criteria:**
- Download fails with 403 or 404
- User 1 cannot access User 2's files
- Error message indicates permission denied or file not found

---

### Test 5: User Can Delete Own Files

**As User 1:**
1. [ ] Authenticate as user1@test.com
2. [ ] Delete file from own directory: `transcription/user1-uuid/test-session-1/chunk_0.m4a`
3. [ ] **Expected: SUCCESS** (200 OK)
4. [ ] Verify file no longer exists in Storage dashboard

**Pass criteria:**
- File successfully deleted
- File no longer visible in Storage dashboard
- Subsequent download returns 404

---

### Test 6: User CANNOT Delete Other User's Files

**As User 1:**
1. [ ] Still authenticated as user1@test.com
2. [ ] Attempt delete of User 2's file: `transcription/user2-uuid/test-session-2/chunk_0.m4a`
3. [ ] **Expected: FAIL** (403 Forbidden)
4. [ ] File still exists in User 2's directory

**Pass criteria:**
- Delete operation fails
- User 2's file remains intact
- Error message indicates permission denied

---

### Test 7: Unauthenticated Requests Fail

**Without authentication:**
1. [ ] Attempt upload without JWT token
2. [ ] **Expected: FAIL** (401 Unauthorized)
3. [ ] Attempt download without JWT token
4. [ ] **Expected: FAIL** (401 Unauthorized)
5. [ ] Attempt delete without JWT token
6. [ ] **Expected: FAIL** (401 Unauthorized)

**Pass criteria:**
- All operations fail without authentication
- 401 Unauthorized responses
- No access to any files

---

### Verification Summary Checklist

**All tests must pass:**
- [ ] Test 1: Users can upload to own directories ✅
- [ ] Test 2: Users CANNOT upload to other users' directories ✅
- [ ] Test 3: Users can read own files ✅
- [ ] Test 4: Users CANNOT read other users' files ✅
- [ ] Test 5: Users can delete own files ✅
- [ ] Test 6: Users CANNOT delete other users' files ✅
- [ ] Test 7: Unauthenticated requests fail ✅

**If all tests pass:**
- ✅ Storage setup is complete and secure
- ✅ Ready for MVP deployment
- ✅ Users are properly isolated

**If any test fails:**
- ❌ Review storage policies (check SQL syntax)
- ❌ Verify bucket name is correct (`raw_audio_chunks`)
- ❌ Check authentication tokens are valid
- ❌ Ensure path format matches exactly: `transcription/{user_id}/{session_id}/chunk_{index}.m4a`

---

## Storage Policies (Legacy Reference)

### Conceptual Policy Overview

Storage policies ensure users can only access their own audio files.

#### Policy 1: Upload

Users can upload files to their own transcription directories.

**Validation:**
- User ID in path must match authenticated user
- Prevents users from uploading to other users' directories

#### Policy 2: Read

Users can read files from their own transcription directories.

**Use case:**
- Client can re-download chunks if needed
- User can access their own recordings

#### Policy 3: Delete

Users can delete files from their own transcription directories.

**Use case:**
- User can delete old recordings
- Cleanup scripts can remove expired chunks

---

## Retention Policies

### Raw Audio Chunks

**Retention Period**: 7-30 days (configurable)

**Rationale:**
- Raw audio is large and expensive to store
- Transcripts contain the valuable information
- Keep chunks temporarily for re-processing if needed
- Delete after confidence in transcript quality

**Cleanup Strategy:**

**Option 1: Automatic Deletion (Recommended)**
- Use Supabase Storage lifecycle policies (if available)
- Or run daily cron job to delete old chunks

**Option 2: Manual Deletion**
- User-triggered deletion after reviewing transcript
- Bulk delete when session marked as 'complete'

**Implementation:**
```sql
-- Example cleanup query (run daily)
DELETE FROM storage.objects
WHERE bucket_id = 'raw_audio_chunks'
  AND created_at < now() - interval '30 days';
```

### Transcripts

**Retention Period**: Indefinite (or 1-2 years)

**Rationale:**
- Transcripts are small (text only)
- Valuable for study review and note-taking
- No need to delete unless user requests

**Storage Cost:**
- Text is cheap (~1KB per minute of audio)
- 1 hour session = ~60KB of text
- 1000 sessions = ~60MB total

**User Control:**
- Allow users to delete transcripts manually
- Provide export option before deletion
- Respect user's data deletion requests (GDPR)

---

## Storage Quotas

### Per-User Limits (Recommended)

**Active Storage:**
- Max 500 MB of raw audio per user
- Max 10 active sessions per user
- Max 1000 chunks per session

**Rate Limits:**
- Max 10 uploads per minute
- Max 100 MB upload per minute
- Max 1 new session per minute

**Enforcement:**
- Check quotas in backend before allowing new sessions
- Return clear error messages when limits exceeded
- Allow users to delete old sessions to free space

### Bucket-Level Limits

**Total Bucket Size:**
- Depends on Supabase plan
- Monitor usage and scale as needed

**File Size Limits:**
- Max 10 MB per chunk (enforced by Storage policy)
- Typical 3-second M4A chunk: ~50-100 KB

---

## File Naming Conventions

### Chunk Naming

**Format**: `chunk_{chunk_index}.m4a`

**Rules:**
- Use zero-padded index if needed: `chunk_0000.m4a`, `chunk_0001.m4a`
- Include file extension matching actual format
- Keep names simple and parseable

**Examples:**
```
chunk_0.m4a
chunk_1.m4a
chunk_2.m4a
...
chunk_99.m4a
```

### Alternative Formats

If client records in different format, update extension:

```
chunk_0.webm   # WebM/Opus (web)
chunk_0.wav    # WAV (uncompressed)
chunk_0.mp3    # MP3 (widely supported)
chunk_0.ogg    # OGG/Vorbis (open source)
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Upload Fails

**Symptoms:**
- 403 Forbidden error
- "Access denied" message

**Solutions:**
- Check Storage policies are correctly configured
- Verify user is authenticated (auth.uid() not null)
- Ensure path includes correct user_id
- Check file size doesn't exceed limits

#### Issue 2: File Not Found

**Symptoms:**
- 404 error when backend tries to download
- "Object not found" message

**Solutions:**
- Verify client uploaded to correct path
- Check storage_path in database matches actual file
- Ensure file upload completed successfully
- Check file wasn't deleted by retention policy

#### Issue 3: Slow Uploads

**Symptoms:**
- Uploads take >5 seconds for 3-second chunks
- Timeout errors

**Solutions:**
- Reduce chunk size or bit rate
- Use M4A instead of WAV (10x smaller)
- Check network connection quality
- Consider uploading in background thread

#### Issue 4: Out of Storage Quota

**Symptoms:**
- 413 Payload Too Large
- "Quota exceeded" error

**Solutions:**
- Delete old sessions/chunks
- Implement retention policy cleanup
- Upgrade Supabase plan if needed
- Reduce chunk duration or quality

---

## Best Practices

### For Clients

1. **Validate before upload**
   - Check file size < 10 MB
   - Verify audio format is supported
   - Ensure session exists before uploading

2. **Handle upload failures**
   - Retry up to 3 times with exponential backoff
   - Show clear error message to user
   - Allow manual retry

3. **Upload in background**
   - Don't block UI during upload
   - Show progress indicator
   - Allow cancellation

4. **Clean up on cancel**
   - Delete uploaded chunks if user cancels recording
   - Mark session as 'failed' or delete entirely

### For Backend

1. **Validate storage paths**
   - Ensure path format is correct
   - Verify session ownership before downloading
   - Check file exists before processing

2. **Handle download failures**
   - Retry downloads with exponential backoff
   - Log errors for debugging
   - Return clear error to client

3. **Implement cleanup**
   - Run daily job to delete expired chunks
   - Delete chunks after successful transcription (optional)
   - Delete entire session folder when session deleted

4. **Monitor usage**
   - Track storage usage per user
   - Alert when approaching quotas
   - Monitor upload/download costs

---

## Future Enhancements

### Streaming Uploads

Instead of uploading complete chunks, stream audio as it's recorded:
- Lower latency (transcribe as recording happens)
- No need to buffer entire chunk
- More complex implementation

### Compression

Further reduce storage costs:
- Compress audio before upload (client-side)
- Use variable bit rate encoding
- Consider lossy compression for long-term storage

### CDN Integration

For faster global access:
- Use Supabase CDN for frequently accessed files
- Cache recent chunks for quick playback
- Reduce download latency for backend

### Analytics

Track storage usage:
- Storage used per user
- Upload/download bandwidth
- Average chunk size
- Most common audio formats

---

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Security Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Transcription API Contracts](../../contracts/README.md)
- [Database Schema](../supabase/migrations/001_transcription_tables.sql)
- [RLS Policies](../supabase/policies/001_transcription_rls.sql)
