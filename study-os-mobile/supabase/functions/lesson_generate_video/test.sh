#!/bin/bash

# ============================================================================
# Test script for lesson_generate_video Edge Function
# ============================================================================

set -e

SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"

# Get credentials from args or use defaults
EMAIL="${1:-user1@test.com}"
PASSWORD="${2:-password123}"
LESSON_ID="${3}"

echo "🧪 Testing lesson_generate_video Edge Function"
echo "=============================================="
echo ""

# Step 1: Authenticate and get JWT token
echo "🔐 Step 1: Authenticating as $EMAIL..."
echo ""

AUTH_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Check for auth errors
if echo "$AUTH_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ Authentication failed:"
  echo "$AUTH_RESPONSE" | jq -r '.error_description // .message // .error'
  echo ""
  echo "Usage: $0 [email] [password] [lesson_id]"
  exit 1
fi

JWT_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token // empty')
USER_ID=$(echo "$AUTH_RESPONSE" | jq -r '.user.id // empty')

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Failed to get JWT token"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authenticated successfully!"
echo "   User ID: $USER_ID"
echo ""

# Step 2: Get a lesson_id if not provided
if [ -z "$LESSON_ID" ]; then
  echo "📚 Step 2: Fetching user's lessons..."
  echo ""
  
  LESSONS_RESPONSE=$(curl -s -X GET "$SUPABASE_URL/rest/v1/lessons?user_id=eq.$USER_ID&select=id,title&limit=1" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json")
  
  LESSON_ID=$(echo "$LESSONS_RESPONSE" | jq -r '.[0].id // empty')
  LESSON_TITLE=$(echo "$LESSONS_RESPONSE" | jq -r '.[0].title // empty')
  
  if [ -z "$LESSON_ID" ] || [ "$LESSON_ID" = "null" ]; then
    echo "❌ No lessons found for this user"
    echo ""
    echo "Please create a lesson first, or provide a lesson_id:"
    echo "  $0 $EMAIL $PASSWORD <lesson-id>"
    exit 1
  fi
  
  echo "✅ Found lesson: $LESSON_TITLE"
  echo "   Lesson ID: $LESSON_ID"
  echo ""
else
  echo "📚 Step 2: Using provided lesson_id: $LESSON_ID"
  echo ""
fi

# Step 3: Call the video generation function
echo "🎬 Step 3: Calling lesson_generate_video..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$SUPABASE_URL/functions/v1/lesson_generate_video" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"aspect_ratios\": [\"16:9\"]
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response (HTTP $HTTP_STATUS):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check response
if [ "$HTTP_STATUS" = "200" ]; then
  VIDEO_ID=$(echo "$BODY" | jq -r '.video_id // empty')
  CONVERSATION_ID=$(echo "$BODY" | jq -r '.conversation_id // empty')
  
  echo "✅ Video generation started!"
  echo ""
  echo "📋 Details:"
  echo "   Video ID: $VIDEO_ID"
  echo "   Conversation ID: $CONVERSATION_ID"
  echo "   Status: generating"
  echo ""
  echo "⏳ Next steps:"
  echo "   1. Video generation is running in the background (5-20 minutes)"
  echo "   2. Poll the lesson_assets table to check status:"
  echo ""
  echo "      SELECT * FROM lesson_assets WHERE id = '$VIDEO_ID';"
  echo ""
  echo "   3. When storage_path is populated, the video is ready!"
  echo ""
  echo "🔍 Check logs in Supabase Dashboard:"
  echo "   https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/logs/edge-functions"
else
  echo "❌ Request failed with status $HTTP_STATUS"
  echo ""
  ERROR_MSG=$(echo "$BODY" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "$BODY")
  echo "Error: $ERROR_MSG"
  echo ""
  
  if [ "$HTTP_STATUS" = "500" ]; then
    echo "💡 Common issues:"
    echo "   - GEMINI_API_KEY not set: supabase secrets set GEMINI_API_KEY=..."
    echo "   - OPENHAND_API_KEY not set: supabase secrets set OPENHAND_API_KEY=..."
    echo "   - Check function logs in Supabase Dashboard"
  fi
fi
