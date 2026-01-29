#!/bin/bash

# Get the episode ID from Supabase first
# Then replace EPISODE_ID_HERE with the actual UUID

EPISODE_ID="EPISODE_ID_HERE"

echo "🎙️ Triggering audio generation for episode: $EPISODE_ID"
echo ""

# Since verify_jwt is false, we can call without auth
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/podcast_generate_audio" \
  -H "Content-Type: application/json" \
  -d "{\"episode_id\": \"${EPISODE_ID}\"}"

echo ""
echo "✅ Request sent!"
