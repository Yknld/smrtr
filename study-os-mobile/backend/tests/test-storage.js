#!/usr/bin/env node

/**
 * Storage Verification Test Script
 * 
 * Run this locally with your Supabase credentials:
 * node test-storage.js
 * 
 * Requires:
 * - npm install @supabase/supabase-js
 * - Set environment variables: SUPABASE_URL, SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Configuration (set via environment variables or update here)
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Test user credentials
const USER1_EMAIL = process.env.USER1_EMAIL || 'user1@test.com';
const USER1_PASSWORD = process.env.USER1_PASSWORD || 'password123';
const USER2_EMAIL = process.env.USER2_EMAIL || 'user2@test.com';
const USER2_PASSWORD = process.env.USER2_PASSWORD || 'password456';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function logTest(name, passed, message = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${icon} ${name}${colors.reset}`);
  if (message) {
    console.log(`  ${message}`);
  }
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

async function runTests() {
  console.log(`${colors.yellow}🧪 Storage Verification Tests${colors.reset}\n`);
  
  // Validate configuration
  if (SUPABASE_URL === 'YOUR_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
    console.error(`${colors.red}❌ Error: Please set SUPABASE_URL and SUPABASE_ANON_KEY${colors.reset}`);
    console.log('\nSet environment variables:');
    console.log('  export SUPABASE_URL=https://yourproject.supabase.co');
    console.log('  export SUPABASE_ANON_KEY=your-anon-key\n');
    process.exit(1);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Create test file
  const testAudioData = Buffer.from([255, 251, 144, 0, 0, 0]);
  const testFile = new Blob([testAudioData], { type: 'audio/mp4' });
  
  try {
    // ========== SETUP ==========
    logSection('SETUP: Getting User IDs');
    
    // Sign in as user1
    const { data: auth1, error: authError1 } = await supabase.auth.signInWithPassword({
      email: USER1_EMAIL,
      password: USER1_PASSWORD
    });
    
    if (authError1) {
      console.error(`${colors.red}❌ Failed to authenticate as User 1: ${authError1.message}${colors.reset}`);
      console.log('\nMake sure test users exist. Create them with:');
      console.log('  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, confirmed_at)');
      console.log('  VALUES (\'user1@test.com\', crypt(\'password123\', gen_salt(\'bf\')), now(), now());\n');
      process.exit(1);
    }
    
    const user1Id = auth1.user.id;
    console.log(`User 1: ${USER1_EMAIL} (${user1Id})`);
    
    // Sign in as user2 to get ID
    const { data: auth2, error: authError2 } = await supabase.auth.signInWithPassword({
      email: USER2_EMAIL,
      password: USER2_PASSWORD
    });
    
    if (authError2) {
      console.error(`${colors.red}❌ Failed to authenticate as User 2: ${authError2.message}${colors.reset}`);
      process.exit(1);
    }
    
    const user2Id = auth2.user.id;
    console.log(`User 2: ${USER2_EMAIL} (${user2Id})`);
    
    // Back to user1 for tests
    await supabase.auth.signInWithPassword({
      email: USER1_EMAIL,
      password: USER1_PASSWORD
    });
    
    // ========== TEST 1 ==========
    logSection('TEST 1: User Can Upload to Own Directory');
    
    const path1 = `transcription/${user1Id}/test-session-1/chunk_0.m4a`;
    console.log(`Path: ${path1}`);
    
    const { error: uploadError1 } = await supabase.storage
      .from('raw_audio_chunks')
      .upload(path1, testFile, { upsert: true });
    
    logTest(
      'User 1 uploads to own directory',
      !uploadError1,
      uploadError1 ? `Error: ${uploadError1.message}` : 'Upload successful'
    );
    
    // ========== TEST 2 ==========
    logSection('TEST 2: User CANNOT Upload to Other User\'s Directory');
    
    const path2 = `transcription/${user2Id}/test-session-2/chunk_0.m4a`;
    console.log(`Path: ${path2} (User 2's directory)`);
    console.log('Expected: Should fail with permission error\n');
    
    const { error: uploadError2 } = await supabase.storage
      .from('raw_audio_chunks')
      .upload(path2, testFile);
    
    logTest(
      'User 1 CANNOT upload to User 2\'s directory',
      !!uploadError2,
      uploadError2 
        ? `✓ Correctly denied: ${uploadError2.message}` 
        : '⚠️  WARNING: Upload succeeded when it should have failed!'
    );
    
    // ========== TEST 3 ==========
    logSection('TEST 3: User Can Read Own Files');
    
    const { data: download1, error: downloadError1 } = await supabase.storage
      .from('raw_audio_chunks')
      .download(path1);
    
    logTest(
      'User 1 downloads own file',
      !downloadError1 && download1,
      downloadError1 
        ? `Error: ${downloadError1.message}` 
        : `Downloaded ${download1?.size || 0} bytes`
    );
    
    // ========== TEST 4 ==========
    logSection('TEST 4: User CANNOT Read Other User\'s Files');
    
    // First upload as user2
    console.log('Setting up: User 2 uploads a file...');
    await supabase.auth.signInWithPassword({
      email: USER2_EMAIL,
      password: USER2_PASSWORD
    });
    
    await supabase.storage
      .from('raw_audio_chunks')
      .upload(path2, testFile, { upsert: true });
    
    console.log('✓ User 2 uploaded file\n');
    
    // Switch back to user1 and try to download user2's file
    await supabase.auth.signInWithPassword({
      email: USER1_EMAIL,
      password: USER1_PASSWORD
    });
    
    console.log('Attempting to download User 2\'s file as User 1...');
    console.log('Expected: Should fail with permission error\n');
    
    const { error: downloadError2 } = await supabase.storage
      .from('raw_audio_chunks')
      .download(path2);
    
    logTest(
      'User 1 CANNOT download User 2\'s file',
      !!downloadError2,
      downloadError2 
        ? `✓ Correctly denied: ${downloadError2.message}` 
        : '⚠️  WARNING: Download succeeded when it should have failed!'
    );
    
    // ========== TEST 5 ==========
    logSection('TEST 5: User Can Delete Own Files');
    
    const { error: deleteError1 } = await supabase.storage
      .from('raw_audio_chunks')
      .remove([path1]);
    
    logTest(
      'User 1 deletes own file',
      !deleteError1,
      deleteError1 ? `Error: ${deleteError1.message}` : 'File deleted successfully'
    );
    
    // Verify file is gone
    const { error: verifyError } = await supabase.storage
      .from('raw_audio_chunks')
      .download(path1);
    
    if (verifyError) {
      console.log(`  ✓ Verified: File no longer exists (${verifyError.message})`);
    } else {
      console.log(`  ${colors.red}⚠️  WARNING: File still exists after deletion${colors.reset}`);
    }
    
    // ========== TEST 6 ==========
    logSection('TEST 6: User CANNOT Delete Other User\'s Files');
    
    console.log('Attempting to delete User 2\'s file as User 1...');
    console.log('Expected: Should fail with permission error\n');
    
    const { error: deleteError2 } = await supabase.storage
      .from('raw_audio_chunks')
      .remove([path2]);
    
    logTest(
      'User 1 CANNOT delete User 2\'s file',
      !!deleteError2,
      deleteError2 
        ? `✓ Correctly denied: ${deleteError2.message}` 
        : '⚠️  WARNING: Delete succeeded when it should have failed!'
    );
    
    // Verify user2's file still exists
    await supabase.auth.signInWithPassword({
      email: USER2_EMAIL,
      password: USER2_PASSWORD
    });
    
    const { data: verify2 } = await supabase.storage
      .from('raw_audio_chunks')
      .download(path2);
    
    if (verify2) {
      console.log(`  ✓ Verified: User 2's file still intact`);
    }
    
    // ========== TEST 7 ==========
    logSection('TEST 7: Unauthenticated Requests Fail');
    
    await supabase.auth.signOut();
    console.log('Signed out (no authentication)\n');
    
    // Try upload
    const { error: noAuthUpload } = await supabase.storage
      .from('raw_audio_chunks')
      .upload(path1, testFile);
    
    logTest(
      'Upload denied without auth',
      !!noAuthUpload,
      noAuthUpload 
        ? `✓ Correctly denied: ${noAuthUpload.message}` 
        : '⚠️  WARNING: Upload succeeded without auth!'
    );
    
    // Try download
    const { error: noAuthDownload } = await supabase.storage
      .from('raw_audio_chunks')
      .download(path2);
    
    logTest(
      'Download denied without auth',
      !!noAuthDownload,
      noAuthDownload 
        ? `✓ Correctly denied: ${noAuthDownload.message}` 
        : '⚠️  WARNING: Download succeeded without auth!'
    );
    
    // Try delete
    const { error: noAuthDelete } = await supabase.storage
      .from('raw_audio_chunks')
      .remove([path2]);
    
    logTest(
      'Delete denied without auth',
      !!noAuthDelete,
      noAuthDelete 
        ? `✓ Correctly denied: ${noAuthDelete.message}` 
        : '⚠️  WARNING: Delete succeeded without auth!'
    );
    
    // ========== CLEANUP ==========
    console.log(`\n${colors.blue}Cleaning up test files...${colors.reset}`);
    
    // Sign back in as user2 and delete test file
    await supabase.auth.signInWithPassword({
      email: USER2_EMAIL,
      password: USER2_PASSWORD
    });
    
    await supabase.storage.from('raw_audio_chunks').remove([path2]);
    console.log('✓ Cleanup complete\n');
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Unexpected error: ${error.message}${colors.reset}\n`);
    console.error(error);
    process.exit(1);
  }
  
  // ========== SUMMARY ==========
  logSection('TEST SUMMARY');
  
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}\n`);
  
  if (results.failed === 0) {
    console.log(`${colors.green}🎉 ALL TESTS PASSED!${colors.reset}`);
    console.log('Storage policies are correctly configured.\n');
    process.exit(0);
  } else {
    console.log(`${colors.red}⚠️  SOME TESTS FAILED${colors.reset}\n`);
    console.log('Failed tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  ${colors.red}❌ ${t.name}${colors.reset}`));
    console.log();
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}\n`);
  process.exit(1);
});
