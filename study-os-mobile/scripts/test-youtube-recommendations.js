#!/usr/bin/env node

/**
 * Test script for YouTube recommendations generation
 * 
 * Usage:
 *   node scripts/test-youtube-recommendations.js
 * 
 * Environment variables (optional):
 *   SUPABASE_URL - defaults to production URL
 *   SUPABASE_ANON_KEY - defaults to production key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://redixnommutdtpmccpto.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZGl4bm9tbXV0ZHRwbWNjcHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzM4NzMsImV4cCI6MjA5MjcwOTg3M30.uLRxJKJduzcxYAvpwT5C8HJhYlPZ7KdYnTHbHi68zqY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('═══════════════════════════════════════════════════════════');
console.log('  YouTube Recommendations Test');
console.log('═══════════════════════════════════════════════════════════\n');

async function main() {
  // Sign in
  console.log('🔐 Signing in...\n');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'password123',
  });

  if (authError) {
    console.error('❌ Sign in failed:', authError.message);
    process.exit(1);
  }

  console.log(`✅ Signed in as: ${authData.user.email}`);
  console.log(`   User ID: ${authData.user.id}\n`);

  // Find a lesson with content
  console.log('🔍 Finding a lesson with content...\n');
  
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('user_id', authData.user.id)
    .limit(5);

  if (lessonsError || !lessons || lessons.length === 0) {
    console.error('❌ No lessons found');
    process.exit(1);
  }

  // Check which lesson has notes
  let selectedLesson = null;
  for (const lesson of lessons) {
    const { data: outputs } = await supabase
      .from('lesson_outputs')
      .select('type, status, notes_final_text')
      .eq('lesson_id', lesson.id)
      .eq('type', 'notes')
      .eq('status', 'ready')
      .maybeSingle();

    if (outputs && outputs.notes_final_text) {
      selectedLesson = lesson;
      break;
    }
  }

  if (!selectedLesson) {
    console.log('⚠️  No lessons with notes found. Using first lesson anyway...');
    selectedLesson = lessons[0];
  }

  console.log(`✅ Found lesson: "${selectedLesson.title}"`);
  console.log(`   Lesson ID: ${selectedLesson.id}\n`);

  // Generate YouTube recommendations
  console.log('───────────────────────────────────────────────────────────\n');
  console.log('🎥 Generating YouTube recommendations...\n');
  
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generate_youtube_recommendations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          lesson_id: selectedLesson.id,
        }),
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Generation failed (${duration}s):`, errorData.error?.message || 'Unknown error');
      process.exit(1);
    }

    const data = await response.json();

    console.log(`✅ Generated ${data.videos.length} videos in ${duration}s!\n`);

    console.log('📝 Search Queries Used:');
    data.search_queries.forEach((query, i) => {
      console.log(`   ${i + 1}. "${query}"`);
    });

    console.log('\n🎬 Recommended Videos:');
    data.videos.forEach((video, i) => {
      const minutes = Math.floor(video.duration_seconds / 60);
      const seconds = video.duration_seconds % 60;
      console.log(`   ${i + 1}. "${video.title}"`);
      console.log(`      by ${video.channel_name}`);
      console.log(`      Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
      console.log(`      URL: https://www.youtube.com/watch?v=${video.video_id}\n`);
    });

    console.log('───────────────────────────────────────────────────────────\n');
    console.log('✅ Test Complete!\n');

    // Verify videos are in database
    const { data: dbVideos, error: dbError } = await supabase
      .from('youtube_lesson_resources')
      .select(`
        video_id,
        is_primary,
        youtube_videos (
          title,
          channel_name
        )
      `)
      .eq('lesson_id', selectedLesson.id);

    if (dbError) {
      console.error('⚠️  Could not verify database storage:', dbError.message);
    } else {
      console.log(`📊 Database Check: ${dbVideos.length} videos stored`);
      dbVideos.forEach((v, i) => {
        const primary = v.is_primary ? ' (PRIMARY)' : '';
        console.log(`   ${i + 1}. ${v.youtube_videos.title}${primary}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main();
