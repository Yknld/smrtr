#!/usr/bin/env node

/**
 * Test Gemini Live API WebSocket Connection
 * Usage: node test-gemini-live.js <audio-file-path>
 */

import WebSocket from 'ws';
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

if (!audioFilePath) {
  console.error('❌ Usage: node test-gemini-live.js <audio-file-path>');
  console.error('');
  console.error('Example:');
  console.error('  node test-gemini-live.js ~/Downloads/test-audio.m4a');
  process.exit(1);
}

async function testGeminiLive() {
  try {
    console.log('🔐 Step 1: Authenticating...');
    
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
    
    const token = authData.session.access_token;
    console.log(`✅ Authenticated as: ${USER_EMAIL}`);
    
    console.log('\n🎫 Step 2: Getting ephemeral token...');
    
    // Get ephemeral token
    const tokenResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/gemini_live_token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Failed to get ephemeral token:', errorText);
      process.exit(1);
    }
    
    const ephemeralData = await tokenResponse.json();
    console.log('✅ Ephemeral token received:');
    console.log(`   Token: ${ephemeralData.token.substring(0, 50)}...`);
    console.log(`   Expires: ${ephemeralData.expire_time}`);
    console.log(`   New session expires: ${ephemeralData.new_session_expire_time}`);
    console.log(`   Model: ${ephemeralData.model}`);
    
    console.log('\n🔌 Step 3: Connecting to Gemini Live API WebSocket...');
    
    // Connect to Gemini Live API
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${ephemeralData.token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected!');
      console.log('\n📁 Step 4: Reading audio file...');
      
      // Read audio file
      if (!fs.existsSync(audioFilePath)) {
        console.error(`❌ Audio file not found: ${audioFilePath}`);
        ws.close();
        process.exit(1);
      }
      
      const audioBuffer = fs.readFileSync(audioFilePath);
      console.log(`✅ Audio file loaded: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
      
      console.log('\n⚠️  Note: Audio must be PCM16 format for Gemini Live API');
      console.log('   This script will attempt to send the file as-is, but it may fail');
      console.log('   if the file is not in the correct format (raw PCM16, 16kHz, mono).');
      console.log('');
      console.log('📤 Step 5: Streaming audio to Gemini...');
      
      // Convert to base64
      const base64Audio = audioBuffer.toString('base64');
      
      // Send audio chunk
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
          }]
        }
      };
      
      ws.send(JSON.stringify(message));
      console.log('✅ Audio sent, waiting for transcription...');
      
      // Set timeout to close connection after 10 seconds
      setTimeout(() => {
        console.log('\n⏱️  10 seconds elapsed, closing connection...');
        ws.close();
      }, 10000);
    });
    
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // Check for transcription text
        if (response.serverContent?.modelTurn?.parts) {
          const parts = response.serverContent.modelTurn.parts;
          
          for (const part of parts) {
            if (part.text) {
              console.log('\n🎤 Transcription received:');
              console.log('─────────────────────────────────────────────────────');
              console.log(part.text);
              console.log('─────────────────────────────────────────────────────');
            }
            
            if (part.inlineData) {
              console.log('\n🔊 Audio response received (Gemini reply)');
            }
          }
        }
        
        // Log other events
        if (response.setupComplete) {
          console.log('✅ Session setup complete');
        }
        
        if (response.serverContent?.turnComplete) {
          console.log('✅ Turn complete');
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('\n❌ WebSocket error:', error.message);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`\n🔌 WebSocket closed (code: ${code})`);
      if (reason) {
        console.log(`   Reason: ${reason.toString()}`);
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testGeminiLive();
