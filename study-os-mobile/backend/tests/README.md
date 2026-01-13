# Storage Verification Tests

Automated tests to verify Supabase Storage policies are correctly configured.

## Quick Start

### 1. Install Dependencies

```bash
cd backend/tests
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 3. Run Tests

```bash
npm test
```

## Expected Output

If everything is configured correctly:

```
🧪 Storage Verification Tests

============================================================
SETUP: Getting User IDs
============================================================

User 1: user1@test.com (abc-123...)
User 2: user2@test.com (def-456...)

============================================================
TEST 1: User Can Upload to Own Directory
============================================================

Path: transcription/abc-123.../test-session-1/chunk_0.m4a
✅ User 1 uploads to own directory
  Upload successful

============================================================
TEST 2: User CANNOT Upload to Other User's Directory
============================================================

Path: transcription/def-456.../test-session-2/chunk_0.m4a (User 2's directory)
Expected: Should fail with permission error

✅ User 1 CANNOT upload to User 2's directory
  ✓ Correctly denied: new row violates row-level security policy

... (more tests)

============================================================
TEST SUMMARY
============================================================

Total Tests: 9
✅ Passed: 9
❌ Failed: 0

🎉 ALL TESTS PASSED!
Storage policies are correctly configured.
```

## Prerequisites

### Create Test Users

Before running tests, create two test user accounts in Supabase:

```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'user1@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'user2@test.com',
    crypt('password456', gen_salt('bf')),
    now(),
    now(),
    now(),
    now()
  );
```

Or create them via Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add User"
3. Create user1@test.com and user2@test.com

## What Gets Tested

1. ✅ **User can upload to own directory**
   - User 1 uploads to their transcription folder
   
2. ✅ **User CANNOT upload to other's directory**
   - User 1 tries to upload to User 2's folder (should fail)
   
3. ✅ **User can read own files**
   - User 1 downloads their own file
   
4. ✅ **User CANNOT read other's files**
   - User 1 tries to download User 2's file (should fail)
   
5. ✅ **User can delete own files**
   - User 1 deletes their own file
   
6. ✅ **User CANNOT delete other's files**
   - User 1 tries to delete User 2's file (should fail)
   
7. ✅ **Unauthenticated requests fail**
   - Upload without auth (should fail)
   - Download without auth (should fail)
   - Delete without auth (should fail)

## Troubleshooting

### Authentication Errors

If you see:
```
❌ Failed to authenticate as User 1: Invalid login credentials
```

**Fix:**
- Verify test users exist in Supabase
- Check email/password in `.env` file
- Make sure users are confirmed (email_confirmed_at is set)

### Storage Policy Errors

If Test 2, 4, or 6 PASS but should FAIL (no error when there should be):
```
⚠️  WARNING: Upload succeeded when it should have failed!
```

**This means your storage policies are NOT working!**

**Fix:**
1. Verify policies are applied:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%transcription%';
```

2. Re-apply policies from `backend/docs/transcription-storage.md`

### Bucket Not Found

If you see:
```
Bucket not found
```

**Fix:**
- Create the bucket: `raw_audio_chunks`
- Make sure it's set to private (not public)

## Running Individual Tests

You can also run tests manually in Node REPL:

```bash
node
```

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_URL', 'YOUR_KEY');

// Test authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user1@test.com',
  password: 'password123'
});

console.log('User ID:', data.user.id);

// Test upload
const testFile = new Blob([Buffer.from([1,2,3])], { type: 'audio/mp4' });
const { error: uploadError } = await supabase.storage
  .from('raw_audio_chunks')
  .upload(`transcription/${data.user.id}/test/chunk.m4a`, testFile);

console.log('Upload error:', uploadError);
```

## CI/CD Integration

To run in CI/CD pipelines:

```yaml
# .github/workflows/test-storage.yml
name: Storage Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend/tests && npm install
      - run: npm test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          USER1_EMAIL: user1@test.com
          USER1_PASSWORD: ${{ secrets.TEST_USER1_PASSWORD }}
          USER2_EMAIL: user2@test.com
          USER2_PASSWORD: ${{ secrets.TEST_USER2_PASSWORD }}
```

## Related Documentation

- [Storage Setup Guide](../docs/transcription-storage.md)
- [Manual Test Guide](./storage-verification.test.md)
- [Database Migrations](../supabase/migrations/001_transcription_tables.sql)
- [RLS Policies](../supabase/policies/001_transcription_rls.sql)
