#!/bin/bash

API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"
ENDPOINT="70sq2akye030kh"

# Russian test sentence
TEXT="Привет, как твои дела сегодня?"

echo "🇷🇺 Testing Russian TTS with Multilingual Model"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Text: $TEXT"
echo ""

START=$(date +%s%3N)

# Submit job with language parameter
RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT}/run" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"format\": \"mp3\",
      \"speed\": 1.0,
      \"language\": \"ru\",
      \"exaggeration\": 0.7,
      \"voice\": null
    }
  }")

JOB_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "✅ Job ID: $JOB_ID"
echo "⏳ Waiting for completion..."

# Poll for completion
for i in {1..60}; do
  sleep 2
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  if [ "$STATUS" = "COMPLETED" ]; then
    END=$(date +%s%3N)
    DURATION=$((END - START))
    
    echo ""
    echo "✅ Completed in ${DURATION}ms ($(echo "scale=2; $DURATION/1000" | bc)s)"
    
    AUDIO_B64=$(echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64')
    echo "$AUDIO_B64" | base64 -d > russian_multilingual.mp3
    
    SIZE=$(ls -lh russian_multilingual.mp3 | awk '{print $5}')
    echo "💾 Saved: russian_multilingual.mp3 ($SIZE)"
    echo "🎧 Play: afplay russian_multilingual.mp3"
    exit 0
    
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ Failed!"
    echo "$STATUS_RESPONSE" | jq '.error'
    exit 1
  fi
  
  if [ $((i % 5)) -eq 0 ]; then
    echo "  Poll $i: $STATUS"
  fi
done

echo ""
echo "⏰ Timeout"
