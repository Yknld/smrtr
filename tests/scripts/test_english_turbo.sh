#!/bin/bash
set -e

RUNPOD_API_KEY="rpa_R5L7B0G1R6OEL9YWPK318IKDI2I9OPB28D3UWAJE19ya20"
ENDPOINT_ID="70sq2akye030kh"

echo "🚀 Testing English TTS with Turbo model..."
echo ""

# Test text
TEXT="Welcome back to Study Smart, where we break down complex topics into bite-sized insights."

# Submit job
echo "📤 Submitting job..."
RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"voice\": null
    }
  }")

echo "📊 Response:"
echo "$RESPONSE" | jq '.'

# Check for audio
AUDIO_B64=$(echo "$RESPONSE" | jq -r '.output.audio // empty')
if [ -n "$AUDIO_B64" ]; then
    echo ""
    echo "✅ Audio generated successfully!"
    echo "$AUDIO_B64" | base64 -d > test_english_turbo.mp3
    echo "💾 Saved to test_english_turbo.mp3"
    
    # Get file size
    SIZE=$(ls -lh test_english_turbo.mp3 | awk '{print $5}')
    echo "📦 Size: $SIZE"
    
    # Check execution time
    EXEC_TIME=$(echo "$RESPONSE" | jq -r '.executionTime // 0')
    echo "⏱️  Execution time: ${EXEC_TIME}ms"
else
    echo ""
    echo "❌ No audio in response"
    ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
    echo "Error: $ERROR"
fi
