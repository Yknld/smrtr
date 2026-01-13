#!/bin/bash

ENDPOINT_ID="70sq2akye030kh"
RUNPOD_API_KEY="628525c16746b2c7dc623775811097c2027b36c1fa99aa257feb9e01fd4bc08c"

# Russian test sentence
TEXT="Привет, как твои дела сегодня?"
echo "🇷🇺 Testing Russian TTS..."
echo "📝 Text: $TEXT"
echo ""

START_TIME=$(date +%s.%N)

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

END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)

echo "📥 Full Response:"
echo "$SUBMIT_RESPONSE" | jq '.' 2>/dev/null || echo "$SUBMIT_RESPONSE"
echo ""
echo "⏱️  Total time: ${DURATION} seconds"

# Try to extract audio
if echo "$SUBMIT_RESPONSE" | jq -e '.output.audio_base64' > /dev/null 2>&1; then
  echo "✅ Extracting audio..."
  AUDIO_B64=$(echo "$SUBMIT_RESPONSE" | jq -r '.output.audio_base64')
  echo "$AUDIO_B64" | base64 -d > russian_test.mp3
  echo "💾 Saved to: russian_test.mp3"
  
  # Play info
  FILE_SIZE=$(ls -lh russian_test.mp3 | awk '{print $5}')
  echo "📦 File size: $FILE_SIZE"
  echo "🎧 Play with: afplay russian_test.mp3"
fi
