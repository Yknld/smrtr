#!/usr/bin/env node

/**
 * Test script for lesson_create_from_youtube Edge Function
 * 
 * Usage:
 *   node test-youtube-import.js
 * 
 * Prerequisites:
 *   - Set SUPABASE_URL and SUPABASE_ANON_KEY in .env or environment
 *   - Have a valid test user and course
 */

const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

// Test videos
const TEST_VIDEOS = [
  {
    name: 'Standard YouTube URL',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up',
  },
  {
    name: 'Short URL',
    url: 'https://youtu.be/dQw4w9WgXcQ',
    title: 'Short URL Test',
  },
  {
    name: 'Video ID only',
    url: 'dQw4w9WgXcQ',
    title: 'Video ID Test',
  },
];

// Color codes for terminal output
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

async function getAuthToken() {
  log('\n🔐 Authenticating...', 'cyan');
  
  try {
    const response = await makeRequest(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
      },
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }
    );

    if (response.status !== 200) {
      throw new Error(`Auth failed: ${JSON.stringify(response.body)}`);
    }

    log('✓ Authentication successful', 'green');
    return response.body.access_token;
  } catch (error) {
    log(`✗ Authentication failed: ${error.message}`, 'red');
    throw error;
  }
}

async function createTestCourse(token) {
  log('\n📚 Creating test course...', 'cyan');
  
  try {
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
        title: `YouTube Import Test - ${new Date().toISOString()}`,
        term: 'Test Term',
        color: '#4CAF50',
      }
    );

    if (response.status !== 201) {
      throw new Error(`Course creation failed: ${JSON.stringify(response.body)}`);
    }

    const courseId = Array.isArray(response.body) ? response.body[0].id : response.body.id;
    log(`✓ Test course created: ${courseId}`, 'green');
    return courseId;
  } catch (error) {
    log(`✗ Course creation failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testYouTubeImport(token, courseId, video) {
  log(`\n📹 Testing: ${video.name}`, 'cyan');
  log(`   URL: ${video.url}`, 'blue');
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(
      `${SUPABASE_URL}/functions/v1/lesson_create_from_youtube`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      },
      {
        course_id: courseId,
        youtube_url: video.url,
        lesson_title: video.title,
      }
    );

    const duration = Date.now() - startTime;

    if (response.status === 200) {
      log(`✓ Success (${duration}ms)`, 'green');
      log(`   Lesson ID: ${response.body.lesson_id}`, 'blue');
      log(`   Status: ${response.body.status}`, 'blue');
      log(`   Message: ${response.body.message}`, 'blue');
      return { success: true, lessonId: response.body.lesson_id, duration };
    } else {
      log(`✗ Failed (${response.status})`, 'red');
      log(`   Error: ${JSON.stringify(response.body)}`, 'red');
      return { success: false, error: response.body, duration };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`✗ Exception (${duration}ms)`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return { success: false, error: error.message, duration };
  }
}

async function testErrorCases(token, courseId) {
  log('\n🔍 Testing error cases...', 'cyan');

  const errorTests = [
    {
      name: 'Missing course_id',
      body: { youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      expectedStatus: 400,
      expectedCode: 'INVALID_COURSE_ID',
    },
    {
      name: 'Missing youtube_url',
      body: { course_id: courseId },
      expectedStatus: 400,
      expectedCode: 'INVALID_URL',
    },
    {
      name: 'Invalid YouTube URL',
      body: { course_id: courseId, youtube_url: 'https://vimeo.com/123456' },
      expectedStatus: 400,
      expectedCode: 'INVALID_YOUTUBE_URL',
    },
    {
      name: 'Invalid course_id',
      body: { course_id: '00000000-0000-0000-0000-000000000000', youtube_url: 'dQw4w9WgXcQ' },
      expectedStatus: 404,
      expectedCode: 'COURSE_NOT_FOUND',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of errorTests) {
    try {
      const response = await makeRequest(
        `${SUPABASE_URL}/functions/v1/lesson_create_from_youtube`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        },
        test.body
      );

      const statusMatch = response.status === test.expectedStatus;
      const codeMatch = response.body?.error?.code === test.expectedCode;

      if (statusMatch && codeMatch) {
        log(`  ✓ ${test.name}`, 'green');
        passed++;
      } else {
        log(`  ✗ ${test.name}`, 'red');
        log(`    Expected: ${test.expectedStatus}/${test.expectedCode}`, 'yellow');
        log(`    Got: ${response.status}/${response.body?.error?.code}`, 'yellow');
        failed++;
      }
    } catch (error) {
      log(`  ✗ ${test.name} - Exception: ${error.message}`, 'red');
      failed++;
    }
  }

  log(`\n  Error tests: ${passed} passed, ${failed} failed`, passed === errorTests.length ? 'green' : 'yellow');
}

async function verifyLesson(token, lessonId) {
  log(`\n🔍 Verifying lesson ${lessonId}...`, 'cyan');
  
  try {
    // Check lesson
    const lessonRes = await makeRequest(
      `${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (lessonRes.body && lessonRes.body.length > 0) {
      const lesson = lessonRes.body[0];
      log(`  ✓ Lesson found`, 'green');
      log(`    Title: ${lesson.title}`, 'blue');
      log(`    Source Type: ${lesson.source_type}`, 'blue');
      log(`    Status: ${lesson.status}`, 'blue');
    }

    // Check assets
    const assetRes = await makeRequest(
      `${SUPABASE_URL}/rest/v1/lesson_assets?lesson_id=eq.${lessonId}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (assetRes.body && assetRes.body.length > 0) {
      log(`  ✓ Asset found (${assetRes.body.length})`, 'green');
      log(`    Storage Path: ${assetRes.body[0].storage_path}`, 'blue');
    }

    // Check outputs
    const outputRes = await makeRequest(
      `${SUPABASE_URL}/rest/v1/lesson_outputs?lesson_id=eq.${lessonId}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (outputRes.body && outputRes.body.length > 0) {
      log(`  ✓ Output found (${outputRes.body.length})`, 'green');
      const output = outputRes.body[0];
      log(`    Type: ${output.type}`, 'blue');
      log(`    Status: ${output.status}`, 'blue');
      if (output.content_json?.summary) {
        log(`    Summary length: ${output.content_json.summary.length} chars`, 'blue');
      }
      if (output.content_json?.transcript) {
        log(`    Transcript length: ${output.content_json.transcript.length} chars`, 'blue');
      }
    }
  } catch (error) {
    log(`  ✗ Verification failed: ${error.message}`, 'red');
  }
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
    log(`✗ Cleanup failed: ${error.message}`, 'yellow');
  }
}

async function main() {
  log('═══════════════════════════════════════════════', 'bright');
  log('  YouTube Lesson Import Test Suite', 'bright');
  log('═══════════════════════════════════════════════', 'bright');

  let token, courseId;
  const results = [];

  try {
    // Authenticate
    token = await getAuthToken();

    // Create test course
    courseId = await createTestCourse(token);

    // Test each video
    for (const video of TEST_VIDEOS) {
      const result = await testYouTubeImport(token, courseId, video);
      results.push(result);
      
      // Verify first successful import
      if (result.success && results.filter(r => r.success).length === 1) {
        await verifyLesson(token, result.lessonId);
      }
    }

    // Test error cases
    await testErrorCases(token, courseId);

    // Summary
    log('\n═══════════════════════════════════════════════', 'bright');
    log('  Test Summary', 'bright');
    log('═══════════════════════════════════════════════', 'bright');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    log(`\nImport tests: ${successful} passed, ${failed} failed`, successful === results.length ? 'green' : 'yellow');
    log(`Average duration: ${Math.round(avgDuration)}ms`, 'blue');

    if (successful === results.length) {
      log('\n✅ All tests passed!', 'green');
    } else {
      log('\n⚠️  Some tests failed', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    if (token && courseId) {
      await cleanup(token, courseId);
    }
  }

  log('\n═══════════════════════════════════════════════\n', 'bright');
}

// Run tests
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
