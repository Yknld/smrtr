#!/bin/bash

# Get the episode ID from the database first
# Replace with your actual episode_id

EPISODE_ID="REPLACE_WITH_EPISODE_ID"
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
# Get this from your .env or Supabase dashboard
ANON_KEY="YOUR_ANON_KEY_HERE"

echo "🎙️ Triggering audio generation for episode: $EPISODE_ID"

curl -X POST "${SUPABASE_URL}/functions/v1/podcast_generate_audio" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"episode_id\": \"${EPISODE_ID}\"}" \
  --verbose

echo ""
echo "✅ Request sent!"
