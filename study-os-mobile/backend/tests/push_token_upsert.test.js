#!/usr/bin/env node

/**
 * Test push_token_upsert Edge Function
 * 
 * Tests:
 * 1. Insert new token (first call)
 * 2. Update existing token (second call with same token)
 * 3. Verify only one row exists (no duplicates)
 * 4. Error handling (missing fields, invalid platform, unauthorized)
 * 
 * Usage: node push_token_upsert.test.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  console.error('   Create a .env file with:');
  console.error('   SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_ANON_KEY=your-anon-key');
  console.error('   USER1_EMAIL=user@example.com');
  console.error('   USER1_PASSWORD=password');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
const USER_EMAIL = env.USER1_EMAIL;
const USER_PASSWORD = env.USER1_PASSWORD;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !USER_EMAIL || !USER_PASSWORD) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_ANON_KEY, USER1_EMAIL, USER1_PASSWORD');
  process.exit(1);
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/push_token_upsert`;

// Generate unique test token to avoid conflicts with other tests
const TEST_TOKEN = `test-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

async function testPushTokenUpsert() {
  console.log('🧪 Testing push_token_upsert Edge Function');
  console.log('='.repeat(50));
  console.log('');

  // ========================================================================
  // Setup: Authenticate
  // ========================================================================
  console.log('🔐 Step 1: Authenticating...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  
  if (authError) {
    console.error('❌ Authentication failed:', authError.message);
    process.exit(1);
  }
  
  const accessToken = authData.session.access_token;
  const userId = authData.user.id;
  console.log(`✅ Authenticated as: ${USER_EMAIL} (${userId})`);
  console.log(`   Test token: ${TEST_TOKEN}`);
  console.log('');

  // ========================================================================
  // Test 1: Insert new token
  // ========================================================================
  console.log('🧪 Test 1: Insert new push token (first call)');
  
  const response1 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'ios',
      push_token: TEST_TOKEN,
    }),
  });

  const data1 = await response1.json();

  logTest(
    'First call returns 200',
    response1.ok,
    `Status: ${response1.status}`
  );

  logTest(
    'Response has ok=true',
    data1.ok === true,
    `ok: ${data1.ok}`
  );

  logTest(
    'Response has id',
    typeof data1.id === 'string' && data1.id.length > 0,
    `id: ${data1.id}`
  );

  logTest(
    'Response has correct user_id',
    data1.user_id === userId,
    `user_id: ${data1.user_id}`
  );

  const insertedId = data1.id;
  console.log('');

  // ========================================================================
  // Test 2: Update existing token (same token, second call)
  // ========================================================================
  console.log('🧪 Test 2: Update existing push token (second call, same token)');
  
  // Wait a bit to ensure different timestamp
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response2 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'android', // Different platform to test update
      push_token: TEST_TOKEN,
    }),
  });

  const data2 = await response2.json();

  logTest(
    'Second call returns 200',
    response2.ok,
    `Status: ${response2.status}`
  );

  logTest(
    'Second response has ok=true',
    data2.ok === true,
    `ok: ${data2.ok}`
  );

  logTest(
    'Same ID returned (updated, not inserted)',
    data2.id === insertedId,
    `Expected: ${insertedId}, Got: ${data2.id}`
  );

  console.log('');

  // ========================================================================
  // Test 3: Verify database state (no duplicates)
  // ========================================================================
  console.log('🧪 Test 3: Verify database state');

  const { data: tokens, error: selectError } = await supabase
    .from('device_push_tokens')
    .select('*')
    .eq('push_token', TEST_TOKEN);

  if (selectError) {
    logTest('Query database', false, selectError.message);
  } else {
    logTest(
      'Exactly one row exists',
      tokens.length === 1,
      `Found ${tokens.length} row(s)`
    );

    if (tokens.length === 1) {
      const token = tokens[0];
      
      logTest(
        'Token has correct user_id',
        token.user_id === userId,
        `user_id: ${token.user_id}`
      );

      logTest(
        'Token is active',
        token.is_active === true,
        `is_active: ${token.is_active}`
      );

      logTest(
        'Token platform updated to android',
        token.platform === 'android',
        `platform: ${token.platform}`
      );

      logTest(
        'Token has last_seen_at',
        token.last_seen_at !== null,
        `last_seen_at: ${token.last_seen_at}`
      );
    }
  }

  console.log('');

  // ========================================================================
  // Test 4: Error Handling - Missing Authorization
  // ========================================================================
  console.log('🧪 Test 4: Error Handling - Missing Authorization');

  const response3 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'ios',
      push_token: 'test-token-unauthorized',
    }),
  });

  logTest(
    'Returns 401 for missing auth',
    response3.status === 401,
    `Status: ${response3.status}`
  );

  const data3 = await response3.json();
  logTest(
    'Error response has error.code',
    data3.error && data3.error.code === 'UNAUTHORIZED',
    `code: ${data3.error?.code}`
  );

  console.log('');

  // ========================================================================
  // Test 5: Error Handling - Invalid Platform
  // ========================================================================
  console.log('🧪 Test 5: Error Handling - Invalid Platform');

  const response4 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'windows', // Invalid
      push_token: 'test-token-invalid-platform',
    }),
  });

  logTest(
    'Returns 400 for invalid platform',
    response4.status === 400,
    `Status: ${response4.status}`
  );

  const data4 = await response4.json();
  logTest(
    'Error response has INVALID_PLATFORM code',
    data4.error && data4.error.code === 'INVALID_PLATFORM',
    `code: ${data4.error?.code}`
  );

  console.log('');

  // ========================================================================
  // Test 6: Error Handling - Missing push_token
  // ========================================================================
  console.log('🧪 Test 6: Error Handling - Missing push_token');

  const response5 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'ios',
      // push_token missing
    }),
  });

  logTest(
    'Returns 400 for missing push_token',
    response5.status === 400,
    `Status: ${response5.status}`
  );

  const data5 = await response5.json();
  logTest(
    'Error response has INVALID_TOKEN code',
    data5.error && data5.error.code === 'INVALID_TOKEN',
    `code: ${data5.error?.code}`
  );

  console.log('');

  // ========================================================================
  // Cleanup: Delete test token
  // ========================================================================
  console.log('🧹 Cleanup: Deleting test token...');
  
  const { error: deleteError } = await supabase
    .from('device_push_tokens')
    .delete()
    .eq('push_token', TEST_TOKEN);

  if (deleteError) {
    console.error('❌ Failed to cleanup test token:', deleteError.message);
  } else {
    console.log('✅ Test token deleted');
  }

  console.log('');

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('='.repeat(50));
  console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(50));

  if (testsFailed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

testPushTokenUpsert();
