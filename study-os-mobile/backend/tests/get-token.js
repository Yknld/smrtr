#!/usr/bin/env node

// ============================================================================
// Get User Token for Testing
// ============================================================================
//
// Usage:
//   node get-token.js user1@test.com password123
//
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://redixnommutdtpmccpto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZGl4bm9tbXV0ZHRwbWNjcHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzM4NzMsImV4cCI6MjA5MjcwOTg3M30.uLRxJKJduzcxYAvpwT5C8HJhYlPZ7KdYnTHbHi68zqY';

async function getToken(email, password) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔐 Signing in as:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Success!\n');
  console.log('📋 User ID:', data.user.id);
  console.log('📧 Email:', data.user.email);
  console.log('\n🎫 Access Token:');
  console.log(data.session.access_token);
  console.log('\n💾 Copy this for curl:');
  console.log(`export USER_TOKEN="${data.session.access_token}"`);
  console.log('\n🧪 Test command:');
  console.log(`curl -X POST https://redixnommutdtpmccpto.supabase.co/functions/v1/transcribe_start \\
  -H "Authorization: Bearer ${data.session.access_token}" \\
  -H "Content-Type: application/json" \\
  -d '{"language":"en-US"}'`);
}

const email = process.argv[2] || 'user1@test.com';
const password = process.argv[3] || 'password123';

getToken(email, password);
