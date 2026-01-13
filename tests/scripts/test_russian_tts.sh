#!/bin/bash

# Test Russian TTS on RunPod
ENDPOINT_ID="70sq2akye030kh"
RUNPOD_API_KEY="${RUNPOD_API_KEY:-$(grep RUNPOD_API_KEY ~/.bashrc 2>/dev/null | cut -d'=' -f2)}"

if [ -z "$RUNPOD_API_KEY" ]; then
  echo "❌ RUNPOD_API_KEY not set. Please export it first."
  exit 1
fi

# Russian test sentence: "Hello, how are you today?"
TEXT="Привет, как твои дела сегодня?"
echo "🇷🇺 Testing Russian TTS..."
echo "📝 Text: $TEXT"
echo ""

# Start timer
START_TIME=$(date +%s.%N)

# Submit job
echo "⏱️  Submitting job..."
SUBMIT_RESPONSE=$(curl -s -X POST \
  "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"format\": \"mp3\",
      \"speed\": 1.0,
      \"voice\": null
    }
  }")

# End timer
END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)

echo "$SUBMIT_RESPONSE" | jq '.' 2>/dev/null || echo "$SUBMIT_RESPONSE"
echo ""
echo "⏱️  Total time: ${DURATION} seconds"

# Extract and save audio if successful
if echo "$SUBMIT_RESPONSE" | jq -e '.output.audio_base64' > /dev/null 2>&1; then
  echo ""
  echo "✅ Audio generated successfully!"
  AUDIO_B64=$(echo "$SUBMIT_RESPONSE" | jq -r '.output.audio_base64')
  echo "$AUDIO_B64" | base64 -d > russian_test.mp3
  echo "💾 Saved to: russian_test.mp3"
  echo "🔊 Duration: $(echo "$SUBMIT_RESPONSE" | jq -r '.output.duration_ms') ms"
  
  # Get file size
  FILE_SIZE=$(ls -lh russian_test.mp3 | awk '{print $5}')
  echo "📦 File size: $FILE_SIZE"
else
  echo "❌ Failed to generate audio"
  echo "$SUBMIT_RESPONSE" | jq '.error // .status' 2>/dev/null
fi
