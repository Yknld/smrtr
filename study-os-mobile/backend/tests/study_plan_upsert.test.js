#!/usr/bin/env node

/**
 * Test study_plan_upsert Edge Function
 * 
 * Tests:
 * 1. Create new plan with rules
 * 2. Update existing plan
 * 3. Replace rules
 * 4. Create plan without rules
 * 5. Error handling
 * 
 * Usage: node study_plan_upsert.test.js
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

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/study_plan_upsert`;

let testsPassed = 0;
let testsFailed = 0;
let createdPlanIds = [];

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

async function testStudyPlanUpsert() {
  console.log('🧪 Testing study_plan_upsert Edge Function');
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
  console.log('');

  // ========================================================================
  // Test 1: Create new plan with rules
  // ========================================================================
  console.log('🧪 Test 1: Create new study plan with rules');
  
  const createRequest = {
    plan: {
      title: 'Test Morning Study',
      timezone: 'America/Toronto',
      is_enabled: true,
    },
    rules: [
      {
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        start_time_local: '19:00',
        duration_min: 60,
        remind_before_min: 15,
      },
      {
        rrule: 'FREQ=WEEKLY;BYDAY=TU,TH',
        start_time_local: '14:30',
        duration_min: 45,
        remind_before_min: 10,
      }
    ],
  };

  const response1 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createRequest),
  });

  const data1 = await response1.json();

  logTest(
    'Create returns 200',
    response1.ok,
    `Status: ${response1.status}`
  );

  logTest(
    'Response has plan',
    data1.plan && typeof data1.plan === 'object',
    `plan: ${JSON.stringify(data1.plan)}`
  );

  logTest(
    'Plan has correct title',
    data1.plan?.title === 'Test Morning Study',
    `title: ${data1.plan?.title}`
  );

  logTest(
    'Plan has correct user_id',
    data1.plan?.user_id === userId,
    `user_id: ${data1.plan?.user_id}`
  );

  logTest(
    'Plan has correct timezone',
    data1.plan?.timezone === 'America/Toronto',
    `timezone: ${data1.plan?.timezone}`
  );

  logTest(
    'Response has rules array',
    Array.isArray(data1.rules),
    `rules: ${JSON.stringify(data1.rules)}`
  );

  logTest(
    'Correct number of rules',
    data1.rules?.length === 2,
    `Expected 2, got ${data1.rules?.length}`
  );

  if (data1.rules?.length === 2) {
    logTest(
      'Rule 1 has correct rrule',
      data1.rules[0].rrule === 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      `rrule: ${data1.rules[0].rrule}`
    );

    logTest(
      'Rule 1 has correct time (normalized)',
      data1.rules[0].start_time_local === '19:00:00',
      `time: ${data1.rules[0].start_time_local}`
    );

    logTest(
      'Rule 2 has correct time',
      data1.rules[1].start_time_local === '14:30:00',
      `time: ${data1.rules[1].start_time_local}`
    );
  }

  const createdPlanId = data1.plan?.id;
  if (createdPlanId) {
    createdPlanIds.push(createdPlanId);
  }

  console.log('');

  // ========================================================================
  // Test 2: Read plan back via Supabase client
  // ========================================================================
  console.log('🧪 Test 2: Read plan back via Supabase client');

  const { data: readPlan, error: readError } = await supabase
    .from('study_plans')
    .select(`
      *,
      rules:study_plan_rules(*)
    `)
    .eq('id', createdPlanId)
    .single();

  logTest(
    'Plan can be read back',
    !readError && readPlan !== null,
    readError?.message || ''
  );

  logTest(
    'Plan has correct title',
    readPlan?.title === 'Test Morning Study',
    `title: ${readPlan?.title}`
  );

  logTest(
    'Plan has 2 rules',
    readPlan?.rules?.length === 2,
    `rules: ${readPlan?.rules?.length}`
  );

  console.log('');

  // ========================================================================
  // Test 3: Update existing plan (change title, replace rules)
  // ========================================================================
  console.log('🧪 Test 3: Update existing plan and replace rules');

  const updateRequest = {
    plan: {
      id: createdPlanId,
      title: 'Updated Study Plan',
      is_enabled: false,
    },
    rules: [
      {
        rrule: 'FREQ=DAILY',
        start_time_local: '08:00:00',
        duration_min: 30,
        remind_before_min: 5,
      }
    ],
  };

  const response2 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateRequest),
  });

  const data2 = await response2.json();

  logTest(
    'Update returns 200',
    response2.ok,
    `Status: ${response2.status}`
  );

  logTest(
    'Same plan ID returned',
    data2.plan?.id === createdPlanId,
    `Expected: ${createdPlanId}, Got: ${data2.plan?.id}`
  );

  logTest(
    'Title updated',
    data2.plan?.title === 'Updated Study Plan',
    `title: ${data2.plan?.title}`
  );

  logTest(
    'is_enabled updated',
    data2.plan?.is_enabled === false,
    `is_enabled: ${data2.plan?.is_enabled}`
  );

  logTest(
    'Rules replaced (now 1 rule)',
    data2.rules?.length === 1,
    `Expected 1, got ${data2.rules?.length}`
  );

  if (data2.rules?.length === 1) {
    logTest(
      'New rule has correct rrule',
      data2.rules[0].rrule === 'FREQ=DAILY',
      `rrule: ${data2.rules[0].rrule}`
    );
  }

  console.log('');

  // ========================================================================
  // Test 4: Create plan without rules
  // ========================================================================
  console.log('🧪 Test 4: Create plan without rules');

  const response3 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan: {
        title: 'Flexible Plan',
        timezone: 'America/New_York',
      },
      rules: [],
    }),
  });

  const data3 = await response3.json();

  logTest(
    'Create without rules returns 200',
    response3.ok,
    `Status: ${response3.status}`
  );

  logTest(
    'Plan created',
    data3.plan && data3.plan.id,
    `id: ${data3.plan?.id}`
  );

  logTest(
    'Rules array is empty',
    Array.isArray(data3.rules) && data3.rules.length === 0,
    `rules length: ${data3.rules?.length}`
  );

  if (data3.plan?.id) {
    createdPlanIds.push(data3.plan.id);
  }

  console.log('');

  // ========================================================================
  // Test 5: Error Handling - Missing Authorization
  // ========================================================================
  console.log('🧪 Test 5: Error Handling - Missing Authorization');

  const response4 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan: { title: 'Test' },
      rules: [],
    }),
  });

  logTest(
    'Returns 401 for missing auth',
    response4.status === 401,
    `Status: ${response4.status}`
  );

  const data4 = await response4.json();
  logTest(
    'Error response has error.code',
    data4.error && data4.error.code === 'UNAUTHORIZED',
    `code: ${data4.error?.code}`
  );

  console.log('');

  // ========================================================================
  // Test 6: Error Handling - Missing Title
  // ========================================================================
  console.log('🧪 Test 6: Error Handling - Missing Title');

  const response5 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan: { timezone: 'America/Toronto' },
      rules: [],
    }),
  });

  logTest(
    'Returns 400 for missing title',
    response5.status === 400,
    `Status: ${response5.status}`
  );

  const data5 = await response5.json();
  logTest(
    'Error response has INVALID_TITLE code',
    data5.error && data5.error.code === 'INVALID_TITLE',
    `code: ${data5.error?.code}`
  );

  console.log('');

  // ========================================================================
  // Test 7: Error Handling - Invalid Time Format
  // ========================================================================
  console.log('🧪 Test 7: Error Handling - Invalid Time Format');

  const response6 = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan: { title: 'Test' },
      rules: [
        {
          rrule: 'FREQ=DAILY',
          start_time_local: '25:00', // Invalid hour
        }
      ],
    }),
  });

  logTest(
    'Returns 400 for invalid time',
    response6.status === 400,
    `Status: ${response6.status}`
  );

  const data6 = await response6.json();
  logTest(
    'Error response has INVALID_TIME_FORMAT code',
    data6.error && data6.error.code === 'INVALID_TIME_FORMAT',
    `code: ${data6.error?.code}`
  );

  console.log('');

  // ========================================================================
  // Cleanup: Delete test plans
  // ========================================================================
  console.log('🧹 Cleanup: Deleting test plans...');
  
  for (const planId of createdPlanIds) {
    const { error: deleteError } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId);

    if (deleteError) {
      console.error(`❌ Failed to cleanup plan ${planId}:`, deleteError.message);
    } else {
      console.log(`✅ Deleted plan: ${planId}`);
    }
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

testStudyPlanUpsert();
