#!/bin/bash
set -e

RUNPOD_API_KEY="rpa_R5L7B0G1R6OEL9YWPK318IKDI2I9OPB28D3UWAJE19ya20"
ENDPOINT_ID="70sq2akye030kh"

echo "🚀 Testing English TTS..."

# Test text
TEXT="Welcome back to Study Smart."

# Submit job
RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {\"text\": \"${TEXT}\"}}")

# Check status
STATUS=$(echo "$RESPONSE" | jq -r '.status')
echo "Status: $STATUS"

if [ "$STATUS" = "COMPLETED" ]; then
    # Try different paths for audio
    AUDIO=$(echo "$RESPONSE" | jq -r '.output.audio // .output // empty' | head -c 50)
    if [ -n "$AUDIO" ] && [ "$AUDIO" != "null" ]; then
        SIZE=$(echo "$RESPONSE" | jq -r '.output.size_bytes // 0')
        TIME=$(echo "$RESPONSE" | jq -r '.executionTime // 0')
        echo "✅ Success! Size: $SIZE bytes, Time: ${TIME}ms"
    else
        echo "❌ No audio found in output"
        echo "$RESPONSE" | jq '.output' 2>/dev/null || echo "$RESPONSE" | jq '.'
    fi
else
    echo "❌ Job failed"
    echo "$RESPONSE" | jq '.'
fi
