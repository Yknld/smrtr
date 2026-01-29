#!/bin/bash
# Disable authentication for video generation edge function (testing only)

echo "========================================="
echo "Disable Video Generation Authentication"
echo "========================================="
echo ""
echo "⚠️  WARNING: This disables authentication checks!"
echo "   Only use for development and testing."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get user ID from database
echo "→ Getting user ID from database..."
USER_ID=$(cd "$SCRIPT_DIR" && supabase db query "SELECT id FROM auth.users LIMIT 1" --csv 2>/dev/null | tail -n 1)

if [ -z "$USER_ID" ] || [ "$USER_ID" = "id" ]; then
  echo "❌ Could not get user ID from database"
  echo ""
  echo "Please provide a user ID manually:"
  read -p "User ID (UUID): " USER_ID
  
  if [ -z "$USER_ID" ]; then
    echo "❌ User ID is required"
    exit 1
  fi
fi

echo "✓ Using user ID: $USER_ID"
echo ""

# Set secrets
echo "→ Setting Supabase secrets..."
cd "$SCRIPT_DIR"

# Set secrets one at a time
supabase secrets set REQUIRE_AUTH=false
if [ $? -ne 0 ]; then
  echo "❌ Failed to set REQUIRE_AUTH"
  exit 1
fi

supabase secrets set DEFAULT_USER_ID="$USER_ID"
if [ $? -ne 0 ]; then
  echo "❌ Failed to set DEFAULT_USER_ID"
  exit 1
fi

echo ""
echo "========================================="
echo "✅ Authentication Disabled Successfully"
echo "========================================="
echo ""
echo "Configuration:"
echo "  REQUIRE_AUTH = false"
echo "  DEFAULT_USER_ID = $USER_ID"
echo ""
echo "You can now call the video generation function without a JWT token:"
echo ""
echo "  curl -X POST 'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"lesson_id\": \"your-lesson-id\"}'"
echo ""
echo "⚠️  Remember to re-enable authentication for production:"
echo "  ./enable_video_auth.sh"
echo ""
