#!/bin/bash

API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"
ENDPOINT="70sq2akye030kh"

TEXT="Привет, как дела?"

echo "🇷🇺 Testing Russian TTS (Async)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Text: $TEXT"
echo ""

# Submit job
echo "📤 Submitting job..."
START=$(date +%s.%N)

SUBMIT=$(curl -s --max-time 10 \
  -X POST "https://api.runpod.ai/v2/${ENDPOINT}/run" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"input\":{\"text\":\"${TEXT}\",\"format\":\"mp3\",\"speed\":1.0,\"voice\":null}}")

echo "Response: $SUBMIT"

JOB_ID=$(echo "$SUBMIT" | jq -r '.id // empty')

if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
  echo "❌ Failed to submit job"
  echo "$SUBMIT" | jq '.'
  exit 1
fi

echo "✅ Job ID: $JOB_ID"
echo "⏳ Polling..."

# Poll
for i in {1..60}; do
  sleep 2
  
  RESULT=$(curl -s --max-time 5 \
    "https://api.runpod.ai/v2/${ENDPOINT}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${API_KEY}")
  
  STATUS=$(echo "$RESULT" | jq -r '.status // empty')
  echo -n "."
  
  if [ "$STATUS" = "COMPLETED" ]; then
    END=$(date +%s.%N)
    DURATION=$(echo "$END - $START" | bc)
    
    echo ""
    echo "✅ Completed in ${DURATION}s"
    
    AUDIO=$(echo "$RESULT" | jq -r '.output.audio_base64 // empty')
    if [ -n "$AUDIO" ] && [ "$AUDIO" != "null" ]; then
      echo "$AUDIO" | base64 -d > russian_output.mp3
      SIZE=$(ls -lh russian_output.mp3 | awk '{print $5}')
      echo "💾 Saved: russian_output.mp3 ($SIZE)"
      echo "🎧 Play: afplay russian_output.mp3"
    fi
    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ Failed:"
    echo "$RESULT" | jq '.error'
    exit 1
  fi
done

echo ""
echo "⏰ Timeout"
