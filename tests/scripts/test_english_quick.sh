#!/bin/bash

API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"
ENDPOINT="70sq2akye030kh"

TEXT="Hello world, this is a test."

echo "Testing English TTS..."

RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT}/run" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"format\": \"mp3\",
      \"speed\": 1.0,
      \"language\": \"en\",
      \"exaggeration\": 0.7,
      \"voice\": \"/app/runpod/host_voice.flac\"
    }
  }")

JOB_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Job ID: $JOB_ID"

for i in {1..60}; do
  sleep 2
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT}/status/${JOB_ID}" -H "Authorization: Bearer ${API_KEY}")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  if [ "$STATUS" = "COMPLETED" ]; then
    echo "✅ SUCCESS!"
    echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64' | base64 -d > english_test.mp3
    ls -lh english_test.mp3
    echo "Play: afplay english_test.mp3"
    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    echo "❌ FAILED!"
    echo "$STATUS_RESPONSE" | jq '.'
    exit 1
  fi
  
  [ $((i % 5)) -eq 0 ] && echo "Poll $i: $STATUS"
done
