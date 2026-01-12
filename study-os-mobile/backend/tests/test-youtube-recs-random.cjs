#!/usr/bin/env node

/**
 * Test YouTube Recommendations with Random Topic
 */

const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://euxfugfzmpsemkjpcpuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI';

// Random topics to test
const TOPICS = [
  'Binary Search Trees',
  'Photosynthesis in Plants',
  'French Revolution',
  'Quantum Mechanics Basics',
  'React Hooks Tutorial',
  'Machine Learning Fundamentals',
  'Spanish Grammar Subjunctive',
  'Cell Division Mitosis',
  'World War II History',
  'Python Data Structures'
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function signUp(email, password) {
  const response = await makeRequest(
    `${SUPABASE_URL}/auth/v1/signup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    },
    { email, password }
  );
  
  return response.body?.access_token;
}

async function signIn(email, password) {
  const response = await makeRequest(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    },
    { email, password }
  );
  
  return response.body?.access_token;
}

async function getOrCreateUser() {
  const email = 'user1@test.com';
  const password = 'password123';
  
  log('\n🔐 Authenticating...', 'cyan');
  
  // Try to sign in
  let token = await signIn(email, password);
  
  // If sign in fails, try to sign up
  if (!token) {
    log('   Creating new test user...', 'yellow');
    token = await signUp(email, password);
  }
  
  if (!token) {
    throw new Error('Failed to authenticate');
  }
  
  log('✓ Authenticated successfully', 'green');
  return token;
}

async function createTestCourse(token, topic) {
  log('\n📚 Creating test course...', 'cyan');
  
  const response = await makeRequest(
    `${SUPABASE_URL}/rest/v1/courses`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=representation',
      },
    },
    {
      title: `Test Course: ${topic}`,
      term: 'Test Term',
      color: '#4CAF50',
    }
  );

  if (response.status !== 201) {
    throw new Error(`Course creation failed: ${JSON.stringify(response.body)}`);
  }

  const courseId = Array.isArray(response.body) ? response.body[0].id : response.body.id;
  log(`✓ Course created: ${courseId}`, 'green');
  return courseId;
}

async function createTestLesson(token, courseId, topic) {
  log('\n📝 Creating test lesson...', 'cyan');
  log(`   Topic: "${topic}"`, 'blue');
  
  const response = await makeRequest(
    `${SUPABASE_URL}/rest/v1/lessons`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=representation',
      },
    },
    {
      course_id: courseId,
      title: topic,
      source_type: 'import',
      status: 'ready',
    }
  );

  if (response.status !== 201) {
    throw new Error(`Lesson creation failed: ${JSON.stringify(response.body)}`);
  }

  const lessonId = Array.isArray(response.body) ? response.body[0].id : response.body.id;
  log(`✓ Lesson created: ${lessonId}`, 'green');
  return lessonId;
}

async function getYouTubeRecommendations(token, lessonId, count = 3) {
  log('\n🎥 Getting YouTube recommendations...', 'cyan');
  log('   (This may take 5-10 seconds)', 'yellow');
  
  const startTime = Date.now();
  
  const response = await makeRequest(
    `${SUPABASE_URL}/functions/v1/lesson_youtube_recs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    },
    {
      lesson_id: lessonId,
      count: count,
      force: true, // Always get fresh results for testing
    }
  );

  const duration = Date.now() - startTime;

  if (response.status !== 200) {
    throw new Error(`Recommendations failed: ${JSON.stringify(response.body)}`);
  }

  log(`✓ Got recommendations in ${(duration / 1000).toFixed(1)}s`, 'green');
  return response.body;
}

async function cleanup(token, courseId) {
  log('\n🧹 Cleaning up...', 'cyan');
  
  try {
    await makeRequest(
      `${SUPABASE_URL}/rest/v1/courses?id=eq.${courseId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    log('✓ Test course deleted', 'green');
  } catch (error) {
    log('⚠️  Cleanup failed (not critical)', 'yellow');
  }
}

async function main() {
  log('═══════════════════════════════════════════════', 'bright');
  log('  YouTube Recommendations Test - Random Topic', 'bright');
  log('═══════════════════════════════════════════════', 'bright');

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  
  log(`\n🎲 Random topic selected: "${topic}"`, 'bright');

  let token, courseId;

  try {
    // Authenticate
    token = await getOrCreateUser();

    // Create test course
    courseId = await createTestCourse(token, topic);

    // Create test lesson
    const lessonId = await createTestLesson(token, courseId, topic);

    // Get YouTube recommendations
    const results = await getYouTubeRecommendations(token, lessonId, 3);

    // Display results
    log('\n═══════════════════════════════════════════════', 'bright');
    log('  📺 RECOMMENDED VIDEOS', 'bright');
    log('═══════════════════════════════════════════════', 'bright');

    if (results.cached) {
      log('\n⚡ Results from cache (< 24h old)', 'yellow');
    } else {
      log('\n✨ Fresh results generated', 'green');
    }

    results.results.forEach((video, index) => {
      const durationMin = Math.floor(video.duration_seconds / 60);
      const durationSec = video.duration_seconds % 60;
      const views = video.view_count ? (video.view_count / 1000000).toFixed(1) + 'M' : 'N/A';

      log(`\n${index + 1}. ${video.title}`, 'cyan');
      log(`   Channel: ${video.channel}`, 'blue');
      log(`   Duration: ${durationMin}:${String(durationSec).padStart(2, '0')}`, 'blue');
      log(`   Views: ${views}`, 'blue');
      log(`   Why: ${video.reason}`, 'green');
      log(`   URL: ${video.url}`, 'blue');
    });

    log('\n═══════════════════════════════════════════════', 'bright');
    log('  ✅ TEST PASSED!', 'green');
    log('═══════════════════════════════════════════════', 'bright');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (token && courseId) {
      await cleanup(token, courseId);
    }
  }

  log('');
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
