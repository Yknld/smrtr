#!/bin/bash
# Re-enable authentication for video generation edge function

echo "========================================="
echo "Enable Video Generation Authentication"
echo "========================================="
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "→ Setting Supabase secrets..."
supabase secrets set REQUIRE_AUTH=true

if [ $? -ne 0 ]; then
  echo "❌ Failed to set REQUIRE_AUTH"
  exit 1
fi

echo ""
echo "========================================="
echo "✅ Authentication Enabled Successfully"
echo "========================================="
echo ""
echo "Configuration:"
echo "  REQUIRE_AUTH = true"
echo ""
echo "The function now requires a valid JWT token:"
echo ""
echo "  curl -X POST 'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video' \\"
echo "    -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"lesson_id\": \"your-lesson-id\"}'"
echo ""
