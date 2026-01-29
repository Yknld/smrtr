#!/bin/bash
set -e

echo "📤 Uploading join-in acknowledgment to Supabase..."
echo ""

SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
SUPABASE_SERVICE_KEY=$(grep 'SUPABASE_SERVICE_ROLE_KEY=' .env 2>/dev/null | cut -d '=' -f2 || echo "")

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env"
  echo "Please set it manually:"
  echo "  export SUPABASE_SERVICE_KEY=your-service-role-key"
  exit 1
fi

if [ ! -f "join_in_acknowledgment.mp3" ]; then
  echo "❌ join_in_acknowledgment.mp3 not found"
  echo "Run ./generate_join_in_ack.sh first"
  exit 1
fi

echo "Uploading to: ${SUPABASE_URL}/storage/v1/object/tts_audio/system/join_in_acknowledgment.mp3"

curl -X POST \
  "${SUPABASE_URL}/storage/v1/object/tts_audio/system/join_in_acknowledgment.mp3" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: audio/mpeg" \
  --data-binary "@join_in_acknowledgment.mp3"

echo ""
echo ""
echo "✅ Upload complete!"
echo ""
echo "Test it by asking a join-in question in the app."
