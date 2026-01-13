#!/usr/bin/env node

/**
 * Upload test audio file to Supabase Storage
 * Usage: node upload-test-audio.js <audio-file-path> <session-id> <chunk-index>
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

// Parse arguments
const audioFilePath = process.argv[2];
const sessionId = process.argv[3];
const chunkIndex = parseInt(process.argv[4] || '0', 10);

if (!audioFilePath || !sessionId) {
  console.error('❌ Usage: node upload-test-audio.js <audio-file-path> <session-id> [chunk-index]');
  process.exit(1);
}

if (!fs.existsSync(audioFilePath)) {
  console.error(`❌ Audio file not found: ${audioFilePath}`);
  process.exit(1);
}

async function uploadAudio() {
  try {
    console.log('🔐 Authenticating...');
    
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      process.exit(1);
    }
    
    const userId = authData.user.id;
    console.log(`✅ Authenticated as: ${USER_EMAIL}`);
    console.log(`📋 User ID: ${userId}`);
    
    // Read audio file
    console.log(`\n📂 Reading audio file: ${audioFilePath}`);
    const audioBuffer = fs.readFileSync(audioFilePath);
    const fileSize = audioBuffer.length;
    console.log(`📊 File size: ${(fileSize / 1024).toFixed(2)} KB`);
    
    // Construct storage path
    const storagePath = `transcription/${userId}/${sessionId}/chunk_${chunkIndex}.m4a`;
    console.log(`\n📤 Uploading to: ${storagePath}`);
    
    // Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('raw_audio_chunks')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/m4a',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      process.exit(1);
    }
    
    console.log('✅ Upload successful!');
    console.log(`\n📋 Storage path: ${storagePath}`);
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📋 Chunk index: ${chunkIndex}`);
    
    // Get audio duration (approximate based on file size)
    // For m4a, roughly 1MB = 60 seconds at typical bitrate
    const estimatedDurationMs = Math.round((fileSize / 1024 / 1024) * 60 * 1000);
    console.log(`\n⏱️  Estimated duration: ${estimatedDurationMs}ms (~${(estimatedDurationMs / 1000).toFixed(1)}s)`);
    
    // Generate curl command for transcribe_chunk
    const token = authData.session.access_token;
    
    console.log('\n🧪 Test transcription with:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_chunk \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{`);
    console.log(`    "session_id": "${sessionId}",`);
    console.log(`    "chunk_index": ${chunkIndex},`);
    console.log(`    "storage_path": "${storagePath}",`);
    console.log(`    "duration_ms": ${estimatedDurationMs},`);
    console.log(`    "overlap_ms": 500`);
    console.log(`  }' | python3 -m json.tool`);
    console.log('─────────────────────────────────────────────────────────────');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

uploadAudio();
