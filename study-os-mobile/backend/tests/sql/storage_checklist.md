# Storage Access Control Test Checklist

This checklist verifies that Supabase Storage buckets (`lesson_assets` and `tts_audio`) enforce proper access control policies.

## Prerequisites

Before running these tests:

1. ✅ Migrations have been applied (including `009_storage_setup.sql`)
2. ✅ Two test users exist in the database:
   - User1: `test_user_1@example.com` (UUID: `user1_id`)
   - User2: `test_user_2@example.com` (UUID: `user2_id`)
3. ✅ Supabase project is running (local or remote)
4. ✅ You have access to the Supabase dashboard or SQL editor

## Test Setup

### Create Test Users (if not already created)

Run this in the Supabase SQL editor:

```sql
-- Create test user 1
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test_user_1@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create test user 2
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'test_user_2@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
```

## Test Cases

### 1. Bucket Configuration Tests

#### 1.1 Verify Buckets Exist
- [ ] Confirm `lesson_assets` bucket exists
- [ ] Confirm `tts_audio` bucket exists
- [ ] Verify both buckets are **not public** (`public = false`)

**How to Test:**
```sql
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('lesson_assets', 'tts_audio');
```

**Expected Result:**
- Both buckets exist
- `public` column is `false` for both

---

#### 1.2 Verify File Size Limits
- [ ] `lesson_assets` has 50MB limit (52428800 bytes)
- [ ] `tts_audio` has 10MB limit (10485760 bytes)

**Expected Result:**
- `lesson_assets.file_size_limit = 52428800`
- `tts_audio.file_size_limit = 10485760`

---

### 2. Storage Policies Tests

#### 2.1 Verify Policies Exist
- [ ] 4 policies exist for `lesson_assets` (SELECT, INSERT, UPDATE, DELETE)
- [ ] 4 policies exist for `tts_audio` (SELECT, INSERT, UPDATE, DELETE)

**How to Test:**
```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%lesson%'
  OR policyname LIKE '%tts%';
```

**Expected Result:**
- 8 total policies (4 per bucket)
- Each bucket has policies for SELECT, INSERT, UPDATE, DELETE

---

### 3. Access Control Tests (lesson_assets)

#### 3.1 User1 Uploads to Own Folder
- [ ] User1 can upload file to `lesson_assets/{user1_id}/lesson_123/test.pdf`

**How to Test:**
1. Authenticate as User1 (`test_user_1@example.com`)
2. Use Supabase client to upload:
   ```typescript
   const { data, error } = await supabase.storage
     .from('lesson_assets')
     .upload('11111111-1111-1111-1111-111111111111/lesson_123/test.pdf', fileBlob);
   ```

**Expected Result:**
- ✅ Upload succeeds
- File appears in bucket at specified path

---

#### 3.2 User1 Reads Own File
- [ ] User1 can read their own file from `lesson_assets/{user1_id}/lesson_123/test.pdf`

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('lesson_assets')
  .download('11111111-1111-1111-1111-111111111111/lesson_123/test.pdf');
```

**Expected Result:**
- ✅ Download succeeds
- File content is returned

---

#### 3.3 User2 Cannot Read User1's File
- [ ] User2 **cannot** read User1's file from `lesson_assets/{user1_id}/lesson_123/test.pdf`

**How to Test:**
1. Authenticate as User2 (`test_user_2@example.com`)
2. Attempt to download User1's file:
   ```typescript
   const { data, error } = await supabase.storage
     .from('lesson_assets')
     .download('11111111-1111-1111-1111-111111111111/lesson_123/test.pdf');
   ```

**Expected Result:**
- ❌ Download fails with error
- Error message: "Policy not satisfied" or similar

---

#### 3.4 User2 Cannot Upload to User1's Folder
- [ ] User2 **cannot** upload to `lesson_assets/{user1_id}/lesson_456/malicious.pdf`

**How to Test:**
1. Authenticate as User2
2. Attempt to upload to User1's folder:
   ```typescript
   const { data, error } = await supabase.storage
     .from('lesson_assets')
     .upload('11111111-1111-1111-1111-111111111111/lesson_456/malicious.pdf', fileBlob);
   ```

**Expected Result:**
- ❌ Upload fails with error
- Error message: "Policy not satisfied" or similar

---

#### 3.5 User2 Can Upload to Own Folder
- [ ] User2 can upload to `lesson_assets/{user2_id}/lesson_789/user2_file.pdf`

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('lesson_assets')
  .upload('22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf', fileBlob);
```

**Expected Result:**
- ✅ Upload succeeds
- File appears in User2's folder

---

#### 3.6 User1 Cannot Delete User2's File
- [ ] User1 **cannot** delete User2's file

**How to Test:**
1. Authenticate as User1
2. Attempt to delete User2's file:
   ```typescript
   const { error } = await supabase.storage
     .from('lesson_assets')
     .remove(['22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf']);
   ```

**Expected Result:**
- ❌ Delete fails with error
- File still exists in User2's folder

---

#### 3.7 User2 Can Delete Own File
- [ ] User2 can delete their own file

**How to Test:**
```typescript
const { error } = await supabase.storage
  .from('lesson_assets')
  .remove(['22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf']);
```

**Expected Result:**
- ✅ Delete succeeds
- File no longer exists

---

### 4. Access Control Tests (tts_audio)

#### 4.1 User1 Uploads TTS Audio to Own Folder
- [ ] User1 can upload to `tts/{user1_id}/session_100/es/chunk_0.mp3`

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('tts_audio')
  .upload('11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3', audioBlob);
```

**Expected Result:**
- ✅ Upload succeeds

---

#### 4.2 User1 Reads Own TTS Audio
- [ ] User1 can read their TTS audio

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('tts_audio')
  .download('11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3');
```

**Expected Result:**
- ✅ Download succeeds

---

#### 4.3 User2 Cannot Read User1's TTS Audio
- [ ] User2 **cannot** read User1's TTS audio

**How to Test:**
1. Authenticate as User2
2. Attempt to download User1's TTS audio:
   ```typescript
   const { data, error } = await supabase.storage
     .from('tts_audio')
     .download('11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3');
   ```

**Expected Result:**
- ❌ Download fails with error

---

#### 4.4 User2 Cannot Upload to User1's TTS Folder
- [ ] User2 **cannot** upload to User1's TTS folder

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('tts_audio')
  .upload('11111111-1111-1111-1111-111111111111/session_200/fr/chunk_0.mp3', audioBlob);
```

**Expected Result:**
- ❌ Upload fails with error

---

#### 4.5 User2 Can Upload to Own TTS Folder
- [ ] User2 can upload to `tts/{user2_id}/session_300/de/chunk_0.mp3`

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('tts_audio')
  .upload('22222222-2222-2222-2222-222222222222/session_300/de/chunk_0.mp3', audioBlob);
```

**Expected Result:**
- ✅ Upload succeeds

---

### 5. Path Convention Tests

#### 5.1 Invalid Path Structure (lesson_assets)
- [ ] User cannot upload to root of bucket
- [ ] User cannot upload without user_id prefix

**How to Test:**
```typescript
// Test 1: Root upload
const { error: error1 } = await supabase.storage
  .from('lesson_assets')
  .upload('test.pdf', fileBlob);

// Test 2: No user_id
const { error: error2 } = await supabase.storage
  .from('lesson_assets')
  .upload('lesson_123/test.pdf', fileBlob);
```

**Expected Result:**
- ❌ Both uploads fail
- Errors indicate policy violation

---

#### 5.2 Invalid Path Structure (tts_audio)
- [ ] User cannot upload to root or without user_id prefix

**How to Test:**
```typescript
// Test 1: Root upload
const { error: error1 } = await supabase.storage
  .from('tts_audio')
  .upload('chunk_0.mp3', audioBlob);

// Test 2: No user_id
const { error: error2 } = await supabase.storage
  .from('tts_audio')
  .upload('session_100/es/chunk_0.mp3', audioBlob);
```

**Expected Result:**
- ❌ Both uploads fail

---

### 6. Signed URLs Tests

#### 6.1 User1 Can Generate Signed URL for Own File
- [ ] User1 can generate signed URL for their own file

**How to Test:**
```typescript
const { data, error } = await supabase.storage
  .from('lesson_assets')
  .createSignedUrl('11111111-1111-1111-1111-111111111111/lesson_123/test.pdf', 3600);
```

**Expected Result:**
- ✅ Signed URL is generated
- URL is accessible (when fetched in browser or via fetch)

---

#### 6.2 User2 Cannot Generate Signed URL for User1's File
- [ ] User2 **cannot** generate signed URL for User1's file

**How to Test:**
1. Authenticate as User2
2. Attempt to create signed URL:
   ```typescript
   const { data, error } = await supabase.storage
     .from('lesson_assets')
     .createSignedUrl('11111111-1111-1111-1111-111111111111/lesson_123/test.pdf', 3600);
   ```

**Expected Result:**
- ❌ Signed URL creation fails with error

---

### 7. File Type Validation Tests

#### 7.1 Upload Allowed File Types (lesson_assets)
- [ ] PDF upload succeeds
- [ ] Audio (m4a, mp3) upload succeeds
- [ ] Image (png, jpg) upload succeeds

---

#### 7.2 Upload Disallowed File Types (lesson_assets)
- [ ] Executable file (.exe) upload fails
- [ ] Script file (.sh) upload fails

**Note:** This test may require client-side validation or attempting upload via API and checking for rejection.

---

#### 7.3 Upload Allowed File Types (tts_audio)
- [ ] MP3 upload succeeds
- [ ] MPEG audio upload succeeds

---

#### 7.4 Upload Disallowed File Types (tts_audio)
- [ ] PDF upload fails
- [ ] Image upload fails

---

### 8. File Size Limit Tests

#### 8.1 Lesson Assets - Within Limit
- [ ] File < 50MB uploads successfully to `lesson_assets`

---

#### 8.2 Lesson Assets - Exceeds Limit
- [ ] File > 50MB fails to upload to `lesson_assets`

**How to Test:**
Create a 51MB file and attempt upload.

**Expected Result:**
- ❌ Upload fails with size limit error

---

#### 8.3 TTS Audio - Within Limit
- [ ] File < 10MB uploads successfully to `tts_audio`

---

#### 8.4 TTS Audio - Exceeds Limit
- [ ] File > 10MB fails to upload to `tts_audio`

---

## Test Summary

Record your results:

| Test Category | Total Tests | Passed | Failed | Notes |
|---------------|-------------|--------|--------|-------|
| Bucket Config | 3 | | | |
| Policies Exist | 2 | | | |
| lesson_assets Access | 7 | | | |
| tts_audio Access | 5 | | | |
| Path Conventions | 2 | | | |
| Signed URLs | 2 | | | |
| File Types | 6 | | | |
| File Size Limits | 4 | | | |
| **TOTAL** | **31** | | | |

---

## Troubleshooting

### If Tests Fail

1. **Check Migration Applied:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   WHERE version = '009';
   ```

2. **Verify Policies:**
   ```sql
   SELECT policyname, cmd FROM pg_policies
   WHERE tablename = 'objects';
   ```

3. **Check User Authentication:**
   Ensure you're properly authenticated before each test.

4. **Review Error Messages:**
   Look for specific policy names or constraints in error messages.

5. **Test Locally First:**
   Use Supabase local development before testing on production.

---

## Notes

- All tests should be run with **authenticated users**
- Tests assume you're using Supabase client libraries (JavaScript/TypeScript)
- Some tests can be adapted for direct SQL testing if needed
- Consider automating these tests with a test framework (e.g., Jest, Vitest)
- For production testing, use separate test users and clean up test data afterward

---

## Cleanup

After testing, remove test files:

```typescript
// Delete all test files for User1
await supabase.storage
  .from('lesson_assets')
  .remove(['11111111-1111-1111-1111-111111111111/lesson_123/test.pdf']);

await supabase.storage
  .from('tts_audio')
  .remove(['11111111-1111-1111-1111-111111111111/session_100/es/chunk_0.mp3']);

// Delete all test files for User2
await supabase.storage
  .from('lesson_assets')
  .remove(['22222222-2222-2222-2222-222222222222/lesson_789/user2_file.pdf']);

await supabase.storage
  .from('tts_audio')
  .remove(['22222222-2222-2222-2222-222222222222/session_300/de/chunk_0.mp3']);
```
