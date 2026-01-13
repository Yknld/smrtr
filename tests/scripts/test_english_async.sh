#!/bin/bash
set -e

RUNPOD_API_KEY="rpa_R5L7B0G1R6OEL9YWPK318IKDI2I9OPB28D3UWAJE19ya20"
ENDPOINT_ID="70sq2akye030kh"

echo "🚀 Testing English TTS (async to get logs)..."
echo ""

# Test text
TEXT="Welcome back to Study Smart."

# Submit async job
echo "📤 Submitting async job..."
RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"voice\": null
    }
  }")

JOB_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "📋 Job ID: $JOB_ID"

# Poll for result
echo ""
echo "⏳ Waiting for result..."
for i in {1..60}; do
    sleep 2
    STATUS=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
      -H "Authorization: Bearer ${RUNPOD_API_KEY}")
    
    JOB_STATUS=$(echo "$STATUS" | jq -r '.status')
    echo "  [$i] Status: $JOB_STATUS"
    
    if [ "$JOB_STATUS" = "COMPLETED" ] || [ "$JOB_STATUS" = "FAILED" ]; then
        echo ""
        echo "📊 Full response:"
        echo "$STATUS" | jq '.'
        break
    fi
done
