#!/bin/bash
# Quick test script for Whisper transcription
# Usage: ./test-whisper.sh <user_jwt_token>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./test-whisper.sh <user_jwt_token>"
  exit 1
fi

TOKEN="$1"
PROJECT_REF="euxfugfzmpsemkjpcpuz"
BASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🧪 Testing Whisper Transcription Flow"
echo "======================================="
echo ""

# Step 1: Create session
echo "1️⃣ Creating transcription session..."
SESSION_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/transcribe_start" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"language":"en"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.session_id')

if [ "$SESSION_ID" == "null" ] || [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create session:"
  echo "$SESSION_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Session created: $SESSION_ID"
echo ""

# Step 2: Instructions for audio upload
echo "2️⃣ Upload an audio chunk to Storage"
echo "   Path format: transcription/<user_id>/${SESSION_ID}/chunk_0.m4a"
echo "   You'll need to do this via:"
echo "   - Mobile app (recommended)"
echo "   - Supabase Dashboard"
echo "   - Supabase client SDK"
echo ""
echo "   Once uploaded, press Enter to continue..."
read -r

# Step 3: Get user ID from token
USER_ID=$(curl -s -X GET "${BASE_URL}/auth/v1/user" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.id')

if [ "$USER_ID" == "null" ] || [ -z "$USER_ID" ]; then
  echo "⚠️  Could not get user ID from token"
  echo "   Enter your user ID manually: "
  read -r USER_ID
fi

echo "User ID: $USER_ID"
STORAGE_PATH="transcription/${USER_ID}/${SESSION_ID}/chunk_0.m4a"
echo "Expected storage path: $STORAGE_PATH"
echo ""

# Step 4: Trigger transcription
echo "3️⃣ Triggering transcription..."
CHUNK_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/transcribe_chunk" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"${SESSION_ID}\",
    \"chunk_index\": 0,
    \"storage_path\": \"${STORAGE_PATH}\",
    \"duration_ms\": 5000,
    \"overlap_ms\": 500
  }")

echo "$CHUNK_RESPONSE" | jq '.'

# Check if successful
STATUS=$(echo "$CHUNK_RESPONSE" | jq -r '.status')
if [ "$STATUS" == "done" ]; then
  echo ""
  echo "✅ Transcription successful!"
  echo ""
  echo "Transcript preview:"
  echo "$CHUNK_RESPONSE" | jq -r '.tail_text'
  echo ""
  
  # Step 5: Poll for full result
  echo "4️⃣ Polling for full transcript..."
  POLL_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/transcribe_poll?session_id=${SESSION_ID}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo "$POLL_RESPONSE" | jq '.'
  
  echo ""
  echo "🎉 Test complete!"
else
  echo ""
  echo "❌ Transcription failed"
  echo "Check function logs:"
  echo "  supabase functions logs transcribe_chunk"
fi
