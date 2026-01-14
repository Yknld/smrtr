# Storage Verification Test Script

This script guides you through manually testing the Storage setup for the transcription system.

---

## Prerequisites

Before starting tests:
- [ ] Supabase project URL and anon key ready
- [ ] Two test user accounts created (user1@test.com, user2@test.com)
- [ ] Test audio file ready (test-chunk.m4a - can be any small audio file)
- [ ] Supabase CLI installed OR using Supabase JS client in browser console

---

## Setup: Create Test Users

### Option 1: Via Supabase Dashboard
1. Go to Authentication → Users → Add User
2. Create user1@test.com with password
3. Create user2@test.com with password

### Option 2: Via SQL
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES 
  ('user1@test.com', crypt('password123', gen_salt('bf')), now()),
  ('user2@test.com', crypt('password456', gen_salt('bf')), now());
```

---

## Test Environment Setup

### Using Browser Console (Easiest)

1. Open your app or any webpage
2. Open browser DevTools console (F12)
3. Load Supabase client:

```javascript
// Load Supabase client (if not already loaded)
const { createClient } = supabase;

const SUPABASE_URL = 'YOUR_PROJECT_URL'; // e.g., https://xxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## Test 1: User Can Upload to Own Directory

### Step 1: Authenticate as User 1

```javascript
// Sign in as user1
const { data: auth1, error: authError1 } = await supabaseClient.auth.signInWithPassword({
  email: 'user1@test.com',
  password: 'password123'
});

console.log('User 1 ID:', auth1.user.id);
const user1Id = auth1.user.id;
```

### Step 2: Create Test File

```javascript
// Create a small test audio file blob
const testAudioContent = new Uint8Array([255, 251, 144, 0, 0, 0]); // Fake audio data
const testFile = new Blob([testAudioContent], { type: 'audio/mp4' });
```

### Step 3: Upload to Own Directory

```javascript
// Upload to user1's directory
const path1 = `transcription/${user1Id}/test-session-1/chunk_0.m4a`;

const { data: upload1, error: uploadError1 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .upload(path1, testFile);

if (uploadError1) {
  console.error('❌ FAIL: Upload error:', uploadError1);
} else {
  console.log('✅ PASS: User 1 uploaded to own directory:', upload1);
}
```

**Expected Result:** ✅ SUCCESS (no error)

---

## Test 2: User CANNOT Upload to Other User's Directory

### Step 1: Get User 2's ID First

```javascript
// Sign in as user2 temporarily to get ID
const { data: auth2temp } = await supabaseClient.auth.signInWithPassword({
  email: 'user2@test.com',
  password: 'password456'
});

const user2Id = auth2temp.user.id;
console.log('User 2 ID:', user2Id);

// Sign back in as user1
await supabaseClient.auth.signInWithPassword({
  email: 'user1@test.com',
  password: 'password123'
});
```

### Step 2: Attempt Upload to User 2's Directory

```javascript
// Try to upload to user2's directory while authenticated as user1
const path2 = `transcription/${user2Id}/test-session-2/chunk_0.m4a`;

const { data: upload2, error: uploadError2 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .upload(path2, testFile);

if (uploadError2) {
  console.log('✅ PASS: Upload correctly denied:', uploadError2.message);
} else {
  console.error('❌ FAIL: User 1 should NOT be able to upload to User 2\'s directory');
}
```

**Expected Result:** ✅ FAIL with error (403 or policy violation)

---

## Test 3: User Can Read Own Files

### Step 1: Still as User 1, Download Own File

```javascript
// Download file from user1's directory
const { data: download1, error: downloadError1 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .download(`transcription/${user1Id}/test-session-1/chunk_0.m4a`);

if (downloadError1) {
  console.error('❌ FAIL: Download error:', downloadError1);
} else {
  console.log('✅ PASS: User 1 downloaded own file. Size:', download1.size, 'bytes');
}
```

**Expected Result:** ✅ SUCCESS (file blob returned)

---

## Test 4: User CANNOT Read Other User's Files

### Step 1: Upload File as User 2 First

```javascript
// Switch to user2
await supabaseClient.auth.signInWithPassword({
  email: 'user2@test.com',
  password: 'password456'
});

// Upload file as user2
const path2Upload = `transcription/${user2Id}/test-session-2/chunk_0.m4a`;
await supabaseClient.storage
  .from('raw_audio_chunks')
  .upload(path2Upload, testFile);

console.log('User 2 uploaded file to:', path2Upload);
```

### Step 2: Switch Back to User 1 and Try to Download User 2's File

```javascript
// Switch back to user1
await supabaseClient.auth.signInWithPassword({
  email: 'user1@test.com',
  password: 'password123'
});

// Try to download user2's file
const { data: download2, error: downloadError2 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .download(`transcription/${user2Id}/test-session-2/chunk_0.m4a`);

if (downloadError2) {
  console.log('✅ PASS: Download correctly denied:', downloadError2.message);
} else {
  console.error('❌ FAIL: User 1 should NOT be able to download User 2\'s files');
}
```

**Expected Result:** ✅ FAIL with error (403 or 404)

---

## Test 5: User Can Delete Own Files

### Step 1: Delete Own File

```javascript
// Still as user1, delete own file
const { data: delete1, error: deleteError1 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .remove([`transcription/${user1Id}/test-session-1/chunk_0.m4a`]);

if (deleteError1) {
  console.error('❌ FAIL: Delete error:', deleteError1);
} else {
  console.log('✅ PASS: User 1 deleted own file:', delete1);
}
```

### Step 2: Verify File No Longer Exists

```javascript
// Try to download the deleted file
const { data: verify, error: verifyError } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .download(`transcription/${user1Id}/test-session-1/chunk_0.m4a`);

if (verifyError) {
  console.log('✅ PASS: File confirmed deleted (404 expected)');
} else {
  console.error('❌ FAIL: File still exists after deletion');
}
```

**Expected Result:** ✅ SUCCESS (file deleted, subsequent download fails)

---

## Test 6: User CANNOT Delete Other User's Files

### Step 1: Attempt to Delete User 2's File

```javascript
// Still as user1, try to delete user2's file
const { data: delete2, error: deleteError2 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .remove([`transcription/${user2Id}/test-session-2/chunk_0.m4a`]);

if (deleteError2) {
  console.log('✅ PASS: Delete correctly denied:', deleteError2.message);
} else {
  console.error('❌ FAIL: User 1 should NOT be able to delete User 2\'s files');
}
```

### Step 2: Verify User 2's File Still Exists

```javascript
// Switch to user2 and verify file still exists
await supabaseClient.auth.signInWithPassword({
  email: 'user2@test.com',
  password: 'password456'
});

const { data: verify2, error: verifyError2 } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .download(`transcription/${user2Id}/test-session-2/chunk_0.m4a`);

if (!verifyError2) {
  console.log('✅ PASS: User 2\'s file still intact');
} else {
  console.error('❌ FAIL: User 2\'s file was deleted');
}
```

**Expected Result:** ✅ DELETE FAILS, file remains intact

---

## Test 7: Unauthenticated Requests Fail

### Step 1: Sign Out

```javascript
// Sign out
await supabaseClient.auth.signOut();
console.log('Signed out');
```

### Step 2: Attempt Upload Without Auth

```javascript
// Try to upload without authentication
const { data: noAuthUpload, error: noAuthUploadError } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .upload(`transcription/${user1Id}/test-session-1/chunk_1.m4a`, testFile);

if (noAuthUploadError) {
  console.log('✅ PASS: Upload denied without auth:', noAuthUploadError.message);
} else {
  console.error('❌ FAIL: Upload should require authentication');
}
```

### Step 3: Attempt Download Without Auth

```javascript
// Try to download without authentication
const { data: noAuthDownload, error: noAuthDownloadError } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .download(`transcription/${user2Id}/test-session-2/chunk_0.m4a`);

if (noAuthDownloadError) {
  console.log('✅ PASS: Download denied without auth:', noAuthDownloadError.message);
} else {
  console.error('❌ FAIL: Download should require authentication');
}
```

### Step 4: Attempt Delete Without Auth

```javascript
// Try to delete without authentication
const { data: noAuthDelete, error: noAuthDeleteError } = await supabaseClient.storage
  .from('raw_audio_chunks')
  .remove([`transcription/${user2Id}/test-session-2/chunk_0.m4a`]);

if (noAuthDeleteError) {
  console.log('✅ PASS: Delete denied without auth:', noAuthDeleteError.message);
} else {
  console.error('❌ FAIL: Delete should require authentication');
}
```

**Expected Result:** ✅ ALL operations fail with 401 Unauthorized

---

## Complete Test Run (All Tests in One Script)

Copy and paste this complete script into your browser console:

```javascript
// ============================================================================
// COMPLETE STORAGE VERIFICATION TEST SUITE
// ============================================================================

const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  const result = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${result}: ${name}`);
  if (message) console.log(`  ${message}`);
  
  testResults.tests.push({ name, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function runAllTests() {
  console.log('🧪 Starting Storage Verification Tests...\n');
  
  // Create test file
  const testFile = new Blob([new Uint8Array([255, 251, 144, 0])], { type: 'audio/mp4' });
  
  // ========== TEST SETUP ==========
  console.log('📋 Setting up test users...');
  
  // Get user IDs
  const { data: auth1 } = await supabaseClient.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'password123'
  });
  const user1Id = auth1.user.id;
  
  const { data: auth2 } = await supabaseClient.auth.signInWithPassword({
    email: 'user2@test.com',
    password: 'password456'
  });
  const user2Id = auth2.user.id;
  
  console.log(`User 1 ID: ${user1Id}`);
  console.log(`User 2 ID: ${user2Id}\n`);
  
  // ========== TEST 1 ==========
  console.log('Running Test 1: User can upload to own directory');
  await supabaseClient.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'password123'
  });
  
  const path1 = `transcription/${user1Id}/test-session-1/chunk_0.m4a`;
  const { error: err1 } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .upload(path1, testFile, { upsert: true });
  
  logTest('Test 1: User uploads to own directory', !err1, err1?.message);
  
  // ========== TEST 2 ==========
  console.log('\nRunning Test 2: User CANNOT upload to other user\'s directory');
  
  const path2 = `transcription/${user2Id}/test-session-2/chunk_0.m4a`;
  const { error: err2 } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .upload(path2, testFile);
  
  logTest('Test 2: User CANNOT upload to other\'s directory', !!err2, err2?.message);
  
  // ========== TEST 3 ==========
  console.log('\nRunning Test 3: User can read own files');
  
  const { error: err3 } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .download(path1);
  
  logTest('Test 3: User downloads own file', !err3, err3?.message);
  
  // ========== TEST 4 ==========
  console.log('\nRunning Test 4: User CANNOT read other user\'s files');
  
  // First upload as user2
  await supabaseClient.auth.signInWithPassword({
    email: 'user2@test.com',
    password: 'password456'
  });
  await supabaseClient.storage
    .from('raw_audio_chunks')
    .upload(path2, testFile, { upsert: true });
  
  // Switch back to user1 and try to download
  await supabaseClient.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'password123'
  });
  const { error: err4 } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .download(path2);
  
  logTest('Test 4: User CANNOT read other\'s files', !!err4, err4?.message);
  
  // ========== TEST 5 ==========
  console.log('\nRunning Test 5: User can delete own files');
  
  const { error: err5 } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .remove([path1]);
  
  logTest('Test 5: User deletes own file', !err5, err5?.message);
  
  // ========== TEST 6 ==========
  console.log('\nRunning Test 6: User CANNOT delete other user\'s files');
  
  const { error: err6 } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .remove([path2]);
  
  logTest('Test 6: User CANNOT delete other\'s files', !!err6, err6?.message);
  
  // ========== TEST 7 ==========
  console.log('\nRunning Test 7: Unauthenticated requests fail');
  
  await supabaseClient.auth.signOut();
  
  const { error: err7a } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .upload(path1, testFile);
  
  const { error: err7b } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .download(path2);
  
  const { error: err7c } = await supabaseClient.storage
    .from('raw_audio_chunks')
    .remove([path2]);
  
  logTest('Test 7: Upload denied without auth', !!err7a, err7a?.message);
  logTest('Test 7: Download denied without auth', !!err7b, err7b?.message);
  logTest('Test 7: Delete denied without auth', !!err7c, err7c?.message);
  
  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.tests.length}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Storage setup is correct.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review storage policies.');
    console.log('\nFailed tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }
  
  return testResults;
}

// Run the tests
runAllTests();
```

---

## Running the Complete Test

### Step 1: Prepare Your Environment

1. Open your browser
2. Navigate to any page (or your app)
3. Open DevTools Console (F12 → Console tab)

### Step 2: Load Supabase Client

If not already loaded in your app:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Or in console:
```javascript
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(script);
```

### Step 3: Update Config

Replace in the complete script:
- `YOUR_PROJECT_URL` → Your Supabase project URL
- `YOUR_ANON_KEY` → Your Supabase anon key

### Step 4: Run the Script

Copy the entire "Complete Test Run" script above, paste into console, and run.

### Step 5: Review Results

The script will output:
```
🧪 Starting Storage Verification Tests...

✅ PASS: Test 1: User uploads to own directory
✅ PASS: Test 2: User CANNOT upload to other's directory
✅ PASS: Test 3: User downloads own file
✅ PASS: Test 4: User CANNOT read other's files
✅ PASS: Test 5: User deletes own file
✅ PASS: Test 6: User CANNOT delete other's files
✅ PASS: Test 7: Upload denied without auth
✅ PASS: Test 7: Download denied without auth
✅ PASS: Test 7: Delete denied without auth

==================================================
TEST SUMMARY
==================================================
Total Tests: 9
✅ Passed: 9
❌ Failed: 0

🎉 ALL TESTS PASSED! Storage setup is correct.
```

---

## Troubleshooting

### If Test 1 Fails (Cannot Upload to Own Directory)

**Check:**
- [ ] Bucket `raw_audio_chunks` exists
- [ ] Upload policy is applied correctly
- [ ] User is authenticated (check `auth.user()`)
- [ ] Path format is correct: `transcription/{user_id}/...`

**Fix:**
```sql
-- Re-apply upload policy
CREATE POLICY "Users can upload own transcription chunks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'raw_audio_chunks'
  AND (storage.foldername(name))[1] = 'transcription'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

### If Test 2 Passes (User CAN Upload to Other's Directory)

**This is BAD** - policies are not working!

**Fix:**
- Check policy is enabled
- Check `auth.uid()` is being checked
- Verify path parsing in policy

### If Test 7 Fails (Unauthenticated Requests Succeed)

**This is CRITICAL** - anyone can access storage!

**Fix:**
```sql
-- Ensure policies target 'authenticated' role
-- Check policy syntax: TO authenticated
```

---

## Quick Health Check

Run this quick script to verify policies exist:

```javascript
// Quick health check
const healthCheck = async () => {
  const { data: buckets } = await supabaseClient.storage.listBuckets();
  console.log('Buckets:', buckets.map(b => b.name));
  
  const hasBucket = buckets.some(b => b.name === 'raw_audio_chunks');
  console.log(`✓ raw_audio_chunks bucket exists: ${hasBucket}`);
  
  // Try to list files (should work if authenticated)
  const { data: user } = await supabaseClient.auth.getUser();
  console.log(`✓ Authenticated as: ${user?.user?.email || 'Not authenticated'}`);
};

healthCheck();
```

---

## Success Criteria

**All tests must pass:**
- ✅ Test 1: User can upload to own directory
- ✅ Test 2: User CANNOT upload to other's directory
- ✅ Test 3: User can read own files
- ✅ Test 4: User CANNOT read other's files
- ✅ Test 5: User can delete own files
- ✅ Test 6: User CANNOT delete other's files
- ✅ Test 7: Unauthenticated requests fail (all 3 operations)

**If all pass: 🎉 Storage is properly secured and ready for MVP!**
