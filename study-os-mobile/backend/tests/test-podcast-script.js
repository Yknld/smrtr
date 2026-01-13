#!/usr/bin/env node

/**
 * Automated test for podcast script generation
 * 
 * Usage:
 *   node test-podcast-script.js
 *   node test-podcast-script.js <lesson-id>
 * 
 * If no lesson-id provided, will use an existing lesson or create a test one
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://euxfugfzmpsemkjpcpuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI';

const TEST_EMAIL = 'user1@test.com';
const TEST_PASSWORD = 'password123';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function signIn() {
  log('\n🔐 Signing in...', 'cyan');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    log(`❌ Failed to sign in: ${error.message}`, 'red');
    throw error;
  }

  if (!data.session) {
    log(`❌ No session returned after sign in`, 'red');
    throw new Error('No session returned');
  }

  log(`✅ Signed in as: ${data.user.email}`, 'green');
  log(`   User ID: ${data.user.id}`, 'gray');
  log(`   Session expires: ${new Date(data.session.expires_at * 1000).toISOString()}`, 'gray');
  
  return data.session.access_token;
}

async function getLessonId(userId) {
  // Check if lesson ID was provided as argument
  const providedLessonId = process.argv[2];
  if (providedLessonId) {
    log(`\n📖 Using provided lesson ID: ${providedLessonId}`, 'cyan');
    return providedLessonId;
  }

  log('\n📖 Finding a lesson...', 'cyan');
  
  // Get an existing lesson
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('user_id', userId)
    .limit(5);

  if (error) {
    log(`❌ Failed to fetch lessons: ${error.message}`, 'red');
    throw error;
  }

  if (lessons && lessons.length > 0) {
    const lesson = lessons[0];
    log(`✅ Found lesson: "${lesson.title}"`, 'green');
    log(`   Lesson ID: ${lesson.id}`, 'gray');
    return lesson.id;
  }

  // No lessons found - create a test one
  log('   No lessons found, creating test lesson...', 'yellow');
  
  // First, get or create a course
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  let courseId;
  if (courses && courses.length > 0) {
    courseId = courses[0].id;
  } else {
    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: userId,
        title: 'Test Course',
        term: 'Test Term',
      })
      .select('id')
      .single();

    if (courseError) {
      log(`❌ Failed to create course: ${courseError.message}`, 'red');
      throw courseError;
    }
    courseId = newCourse.id;
  }

  // Create test lesson
  const { data: newLesson, error: lessonError } = await supabase
    .from('lessons')
    .insert({
      user_id: userId,
      course_id: courseId,
      title: 'Test Lesson: Introduction to Variables',
      source_type: 'upload',
      status: 'ready',
    })
    .select('id, title')
    .single();

  if (lessonError) {
    log(`❌ Failed to create lesson: ${lessonError.message}`, 'red');
    throw lessonError;
  }

  log(`✅ Created test lesson: "${newLesson.title}"`, 'green');
  log(`   Lesson ID: ${newLesson.id}`, 'gray');
  return newLesson.id;
}

async function createEpisode(token, lessonId) {
  log('\n🎙️  Creating podcast episode...', 'cyan');
  log(`   Lesson ID: ${lessonId}`, 'gray');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/podcast_create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lesson_id: lessonId }),
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    log(`❌ Failed to parse response: ${e.message}`, 'red');
    log(`   Response status: ${response.status}`, 'red');
    log(`   Response text: ${await response.text()}`, 'red');
    throw new Error('Failed to parse response');
  }

  if (!response.ok) {
    log(`❌ Failed to create episode: ${data.error || response.statusText}`, 'red');
    log(`   Response status: ${response.status}`, 'red');
    log(`   Full response:`, 'gray');
    log(JSON.stringify(data, null, 2), 'gray');
    throw new Error(data.error || 'Failed to create episode');
  }

  log(`✅ Episode created`, 'green');
  log(`   Episode ID: ${data.episode_id}`, 'gray');
  log(`   Status: ${data.status}`, 'gray');

  return data.episode_id;
}

async function generateScript(token, episodeId) {
  log('\n📝 Generating podcast script...', 'cyan');
  log('   This may take 10-20 seconds...', 'gray');

  const startTime = Date.now();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/podcast_generate_script`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      episode_id: episodeId,
      duration_min: 8,
      style: 'direct_review',
    }),
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const data = await response.json();

  if (!response.ok) {
    log(`❌ Failed to generate script: ${data.error || response.statusText}`, 'red');
    if (data.request_id) {
      log(`   Request ID: ${data.request_id}`, 'gray');
    }
    throw new Error(data.error || 'Failed to generate script');
  }

  log(`✅ Script generated in ${duration}s`, 'green');
  log(`   Title: "${data.title}"`, 'gray');
  log(`   Total segments: ${data.total_segments}`, 'gray');

  return data;
}

async function verifyInDatabase(episodeId) {
  log('\n🔍 Verifying in database...', 'cyan');

  // Check episode
  const { data: episode, error: episodeError } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('id', episodeId)
    .single();

  if (episodeError) {
    log(`❌ Failed to fetch episode: ${episodeError.message}`, 'red');
    throw episodeError;
  }

  log('✅ Episode verified:', 'green');
  log(`   Status: ${episode.status}`, 'gray');
  log(`   Title: ${episode.title}`, 'gray');
  log(`   Total segments: ${episode.total_segments}`, 'gray');

  // Check segments
  const { data: segments, error: segmentsError } = await supabase
    .from('podcast_segments')
    .select('seq, speaker, text, tts_status')
    .eq('episode_id', episodeId)
    .order('seq', { ascending: true });

  if (segmentsError) {
    log(`❌ Failed to fetch segments: ${segmentsError.message}`, 'red');
    throw segmentsError;
  }

  log(`✅ Segments verified: ${segments.length} total`, 'green');

  // Show first 3 and last 3 segments
  log('\n   First 3 segments:', 'gray');
  segments.slice(0, 3).forEach((seg) => {
    const preview = seg.text.substring(0, 60) + (seg.text.length > 60 ? '...' : '');
    log(`   ${seg.seq}. [${seg.speaker.toUpperCase()}] ${preview}`, 'gray');
  });

  log('\n   Last 3 segments:', 'gray');
  segments.slice(-3).forEach((seg) => {
    const preview = seg.text.substring(0, 60) + (seg.text.length > 60 ? '...' : '');
    log(`   ${seg.seq}. [${seg.speaker.toUpperCase()}] ${preview}`, 'gray');
  });

  // Verify sequence integrity
  const gaps = [];
  for (let i = 1; i <= segments.length; i++) {
    const segment = segments.find(s => s.seq === i);
    if (!segment) {
      gaps.push(i);
    }
  }

  if (gaps.length > 0) {
    log(`\n⚠️  WARNING: Sequence gaps found at: ${gaps.join(', ')}`, 'yellow');
  } else {
    log('\n✅ Sequence integrity verified (no gaps)', 'green');
  }

  // Check all TTS statuses
  const allQueued = segments.every(s => s.tts_status === 'queued');
  if (allQueued) {
    log('✅ All segments have tts_status="queued"', 'green');
  } else {
    log('⚠️  WARNING: Some segments have unexpected tts_status', 'yellow');
  }

  return { episode, segments };
}

async function main() {
  try {
    log('\n' + '='.repeat(60), 'bright');
    log('🎙️  PODCAST SCRIPT GENERATION TEST', 'bright');
    log('='.repeat(60), 'bright');

    // Step 1: Sign in
    const token = await signIn();

    // Get user info from the session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session after sign in');
    }
    
    const user = session.user;
    
    // Debug: Verify token
    log('\n🔍 Token info:', 'gray');
    log(`   Token length: ${token.length}`, 'gray');
    log(`   Token starts with: ${token.substring(0, 20)}...`, 'gray');
    
    // Verify JWT is valid by making a simple authenticated request
    const { data: testLesson, error: testError } = await supabase
      .from('lessons')
      .select('id')
      .limit(1);
    
    if (testError) {
      log('⚠️  Warning: Auth test query failed:', 'yellow');
      log(`   ${testError.message}`, 'yellow');
    } else {
      log('✅ JWT verified (can query with auth)', 'green');
    }

    // Step 2: Get or create lesson
    const lessonId = await getLessonId(user.id);

    // Step 3: Create episode
    const episodeId = await createEpisode(token, lessonId);

    // Step 4: Generate script
    const result = await generateScript(token, episodeId);

    // Step 5: Verify in database
    const verification = await verifyInDatabase(episodeId);

    // Success summary
    log('\n' + '='.repeat(60), 'bright');
    log('✅ TEST COMPLETED SUCCESSFULLY', 'green');
    log('='.repeat(60), 'bright');
    log('\nSummary:', 'cyan');
    log(`  Episode ID: ${episodeId}`, 'gray');
    log(`  Title: "${result.title}"`, 'gray');
    log(`  Segments: ${result.total_segments}`, 'gray');
    log(`  Status: ${verification.episode.status}`, 'gray');
    log('\nNext steps:', 'yellow');
    log('  1. Run podcast_generate_audio to create TTS audio', 'gray');
    log('  2. Check status updates every 3 seconds in app', 'gray');
    log('  3. Play podcast when status="ready"', 'gray');

    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'bright');
    log('❌ TEST FAILED', 'red');
    log('='.repeat(60), 'bright');
    log(`\nError: ${error.message}`, 'red');
    if (error.stack) {
      log('\nStack trace:', 'gray');
      log(error.stack, 'gray');
    }
    process.exit(1);
  }
}

main();
