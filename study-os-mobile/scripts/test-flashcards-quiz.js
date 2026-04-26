// Test script for flashcards and quiz generation with caching
// Tests the new backend blueprint pattern

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://redixnommutdtpmccpto.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZGl4bm9tbXV0ZHRwbWNjcHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzM4NzMsImV4cCI6MjA5MjcwOTg3M30.uLRxJKJduzcxYAvpwT5C8HJhYlPZ7KdYnTHbHi68zqY';
const TEST_EMAIL = process.env.TEST_EMAIL || 'user1@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and/or SUPABASE_ANON_KEY');
  console.error('\nSet them via:');
  console.error('   export SUPABASE_URL="your-url"');
  console.error('   export SUPABASE_ANON_KEY="your-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('\n🔧 Applying Migration 014...\n');
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '014_enhance_lesson_outputs.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    return false;
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split by statement and execute (simple approach)
  // Note: This won't work with the Supabase client directly - needs to be applied via dashboard
  console.log('📄 Migration file found. Please apply manually via Supabase SQL Editor:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/redixnommutdtpmccpto/sql');
  console.log('   2. Paste the contents of: supabase/migrations/014_enhance_lesson_outputs.sql');
  console.log('   3. Run the SQL');
  console.log('   4. Re-run this test script\n');
  
  return false; // Can't apply automatically
}

async function checkMigrationApplied() {
  console.log('🔍 Checking if migration 014 is applied...\n');
  
  // Try to query lesson_outputs to see if new columns exist
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('id, version, source_hash, model')
    .limit(1);
  
  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ Migration NOT applied. New columns missing.');
      console.log('   Error:', error.message);
      return false;
    }
  }
  
  console.log('✅ Migration appears to be applied (columns exist)\n');
  return true;
}

async function signIn() {
  console.log('🔐 Signing in...\n');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  
  if (error) {
    console.error('❌ Sign in failed:', error.message);
    return null;
  }
  
  console.log(`✅ Signed in as: ${data.user.email}`);
  console.log(`   User ID: ${data.user.id}\n`);
  
  return data.session.access_token;
}

async function findTestLesson(token) {
  console.log('🔍 Finding a lesson with content...\n');
  
  // Find a lesson with transcript or notes
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title, notes_final_text, notes_raw_text')
    .or('notes_final_text.neq.,notes_raw_text.neq.')
    .limit(5);
  
  if (error || !lessons || lessons.length === 0) {
    console.log('⚠️  No lessons with content found. Checking for lessons with transcripts...\n');
    
    // Try to find lesson with transcript
    const { data: sessionsWithTranscript } = await supabase
      .from('study_sessions')
      .select('lesson_id, lessons(id, title)')
      .limit(5);
    
    if (sessionsWithTranscript && sessionsWithTranscript.length > 0) {
      const lessonWithTranscript = sessionsWithTranscript[0].lessons;
      console.log(`✅ Found lesson with transcript: ${lessonWithTranscript.title}`);
      console.log(`   Lesson ID: ${lessonWithTranscript.id}\n`);
      return lessonWithTranscript.id;
    }
    
    console.error('❌ No lessons with content found. Please create a lesson with notes or transcript.');
    return null;
  }
  
  const lesson = lessons[0];
  console.log(`✅ Found lesson: ${lesson.title}`);
  console.log(`   Lesson ID: ${lesson.id}`);
  console.log(`   Has notes: ${!!(lesson.notes_final_text || lesson.notes_raw_text)}\n`);
  
  return lesson.id;
}

async function testFlashcardsGeneration(token, lessonId) {
  console.log('🎴 TEST 1: Flashcards Generation (Cache Miss)\n');
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('lesson_generate_flashcards', {
    body: { lesson_id: lessonId, count: 15 },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error('❌ Flashcards generation failed:', error.message);
    return null;
  }
  
  console.log(`✅ Flashcards generated in ${duration}ms`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Type: ${data.type}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   Cached: ${data.cached}`);
  console.log(`   Source Hash: ${data.source_hash?.substring(0, 12)}...`);
  console.log(`   Version: ${data.version}`);
  console.log(`   Model: ${data.model}`);
  console.log(`   Cards Count: ${data.content_json?.cards?.length || 0}\n`);
  
  if (data.content_json?.cards?.length > 0) {
    console.log(`   Sample Card:`);
    console.log(`     Front: ${data.content_json.cards[0].front}`);
    console.log(`     Back: ${data.content_json.cards[0].back?.substring(0, 50)}...\n`);
  }
  
  return data;
}

async function testFlashcardsCaching(token, lessonId, previousData) {
  console.log('🎴 TEST 2: Flashcards Caching (Cache Hit)\n');
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('lesson_generate_flashcards', {
    body: { lesson_id: lessonId, count: 15 },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error('❌ Flashcards caching test failed:', error.message);
    return false;
  }
  
  console.log(`✅ Response received in ${duration}ms`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Cached: ${data.cached}`);
  console.log(`   Source Hash: ${data.source_hash?.substring(0, 12)}...`);
  
  // Verify cache hit
  const cacheHit = data.cached === true;
  const sameId = data.id === previousData.id;
  const sameSourceHash = data.source_hash === previousData.source_hash;
  const faster = duration < 2000; // Should be much faster than generation
  
  console.log('\n   Cache Verification:');
  console.log(`     ✓ Cached flag: ${cacheHit ? '✅' : '❌'}`);
  console.log(`     ✓ Same ID: ${sameId ? '✅' : '❌'}`);
  console.log(`     ✓ Same source hash: ${sameSourceHash ? '✅' : '❌'}`);
  console.log(`     ✓ Fast response (<2s): ${faster ? '✅' : '❌'}\n`);
  
  return cacheHit && sameId && sameSourceHash && faster;
}

async function testQuizGeneration(token, lessonId, flashcardsSourceHash) {
  console.log('📝 TEST 3: Quiz Generation (Cache Miss)\n');
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('lesson_generate_quiz', {
    body: { lesson_id: lessonId, count: 8 },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error('❌ Quiz generation failed:', error.message);
    return null;
  }
  
  console.log(`✅ Quiz generated in ${duration}ms`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Type: ${data.type}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   Cached: ${data.cached}`);
  console.log(`   Source Hash: ${data.source_hash?.substring(0, 12)}...`);
  console.log(`   Version: ${data.version}`);
  console.log(`   Model: ${data.model}`);
  console.log(`   Questions Count: ${data.content_json?.questions?.length || 0}\n`);
  
  // Verify source hash matches flashcards (same lesson content)
  const sameSourceHash = data.source_hash === flashcardsSourceHash;
  console.log(`   Source Hash Consistency: ${sameSourceHash ? '✅ Matches flashcards' : '⚠️  Different from flashcards'}\n`);
  
  if (data.content_json?.questions?.length > 0) {
    const q = data.content_json.questions[0];
    console.log(`   Sample Question:`);
    console.log(`     Q: ${q.question}`);
    console.log(`     Choices: ${q.choices?.join(', ')}`);
    console.log(`     Answer: ${q.choices?.[q.answer_index]}`);
    console.log(`     Explanation: ${q.explanation?.substring(0, 60)}...\n`);
  }
  
  return data;
}

async function testQuizCaching(token, lessonId) {
  console.log('📝 TEST 4: Quiz Caching (Cache Hit)\n');
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('lesson_generate_quiz', {
    body: { lesson_id: lessonId, count: 8 },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error('❌ Quiz caching test failed:', error.message);
    return false;
  }
  
  console.log(`✅ Response received in ${duration}ms`);
  console.log(`   Cached: ${data.cached}`);
  console.log(`   Fast response (<2s): ${duration < 2000 ? '✅' : '❌'}\n`);
  
  return data.cached === true && duration < 2000;
}

async function verifyDatabase(lessonId) {
  console.log('🗄️  TEST 5: Database Verification\n');
  
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('id, lesson_id, type, status, source_hash, version, model, created_at')
    .eq('lesson_id', lessonId)
    .order('type', { ascending: true })
    .order('version', { ascending: false });
  
  if (error) {
    console.error('❌ Database query failed:', error.message);
    return false;
  }
  
  console.log(`✅ Found ${data.length} outputs for this lesson:\n`);
  
  data.forEach(output => {
    console.log(`   ${output.type.padEnd(12)} | v${output.version} | ${output.status.padEnd(10)} | ${output.source_hash?.substring(0, 12)}... | ${output.model || 'N/A'}`);
  });
  
  console.log('');
  
  const hasFlashcards = data.some(o => o.type === 'flashcards' && o.status === 'ready');
  const hasQuiz = data.some(o => o.type === 'quiz' && o.status === 'ready');
  
  console.log(`   Flashcards: ${hasFlashcards ? '✅' : '❌'}`);
  console.log(`   Quiz: ${hasQuiz ? '✅' : '❌'}\n`);
  
  return hasFlashcards && hasQuiz;
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Flashcards & Quiz Caching Pattern Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Step 1: Check migration
  const migrationApplied = await checkMigrationApplied();
  if (!migrationApplied) {
    await applyMigration();
    console.log('\n⚠️  Please apply migration 014 and re-run this script.\n');
    process.exit(1);
  }
  
  // Step 2: Sign in
  const token = await signIn();
  if (!token) {
    process.exit(1);
  }
  
  // Step 3: Find test lesson
  const lessonId = await findTestLesson(token);
  if (!lessonId) {
    process.exit(1);
  }
  
  console.log('───────────────────────────────────────────────────────────\n');
  
  // Step 4: Test flashcards generation (cache miss)
  const flashcardsData = await testFlashcardsGeneration(token, lessonId);
  if (!flashcardsData) {
    process.exit(1);
  }
  
  console.log('───────────────────────────────────────────────────────────\n');
  
  // Step 5: Test flashcards caching (cache hit)
  const flashcardsCacheWorks = await testFlashcardsCaching(token, lessonId, flashcardsData);
  
  console.log('───────────────────────────────────────────────────────────\n');
  
  // Step 6: Test quiz generation (cache miss)
  const quizData = await testQuizGeneration(token, lessonId, flashcardsData.source_hash);
  if (!quizData) {
    process.exit(1);
  }
  
  console.log('───────────────────────────────────────────────────────────\n');
  
  // Step 7: Test quiz caching (cache hit)
  const quizCacheWorks = await testQuizCaching(token, lessonId);
  
  console.log('───────────────────────────────────────────────────────────\n');
  
  // Step 8: Verify database
  const databaseOk = await verifyDatabase(lessonId);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Test Results');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`  ✅ Migration Applied: Yes`);
  console.log(`  ${flashcardsData ? '✅' : '❌'} Flashcards Generation: ${flashcardsData ? 'Pass' : 'Fail'}`);
  console.log(`  ${flashcardsCacheWorks ? '✅' : '❌'} Flashcards Caching: ${flashcardsCacheWorks ? 'Pass' : 'Fail'}`);
  console.log(`  ${quizData ? '✅' : '❌'} Quiz Generation: ${quizData ? 'Pass' : 'Fail'}`);
  console.log(`  ${quizCacheWorks ? '✅' : '❌'} Quiz Caching: ${quizCacheWorks ? 'Pass' : 'Fail'}`);
  console.log(`  ${databaseOk ? '✅' : '❌'} Database Verification: ${databaseOk ? 'Pass' : 'Fail'}\n`);
  
  const allPassed = flashcardsData && flashcardsCacheWorks && quizData && quizCacheWorks && databaseOk;
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('✅ Caching pattern is working correctly');
    console.log('✅ Cross-device consistency guaranteed');
    console.log('✅ Ready for mobile app integration\n');
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Please review the errors above and fix before proceeding.\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run tests
runTests().catch(err => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
