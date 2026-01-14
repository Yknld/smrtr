#!/bin/bash

ENDPOINT_ID="70sq2akye030kh"
RUNPOD_API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"

# Russian test sentence
TEXT="Привет, как твои дела сегодня?"

echo "🇷🇺 Testing Russian TTS with RunPod"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Text: ${TEXT}"
echo ""
echo "Submitting job..."

START_TIME=$(date +%s%3N)

# Submit the job (using null voice to test without reference audio first)
RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
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

echo "Submit response:"
echo "$RESPONSE" | jq '.'

# Extract job ID
JOB_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
  echo "Error: Failed to get job ID"
  exit 1
fi

echo ""
echo "Job ID: $JOB_ID"
echo "Polling for completion..."

# Poll for completion
COMPLETED=false
POLL_COUNT=0
MAX_POLLS=60

while [ "$COMPLETED" = false ] && [ $POLL_COUNT -lt $MAX_POLLS ]; do
  sleep 2
  POLL_COUNT=$((POLL_COUNT + 1))
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  if [ $((POLL_COUNT % 5)) -eq 0 ]; then
    echo "Poll $POLL_COUNT: Status = $STATUS"
  fi
  
  if [ "$STATUS" = "COMPLETED" ]; then
    COMPLETED=true
    END_TIME=$(date +%s%3N)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo "✅ Job completed!"
    echo "Total time: ${DURATION}ms ($(echo "scale=2; $DURATION/1000" | bc)s)"
    echo ""
    
    # Get audio and save to file
    AUDIO_BASE64=$(echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64')
    if [ "$AUDIO_BASE64" != "null" ] && [ -n "$AUDIO_BASE64" ]; then
      OUTPUT_FILE="russian_test.mp3"
      echo "$AUDIO_BASE64" | base64 -d > "$OUTPUT_FILE"
      
      FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
      echo "✅ Audio saved to: $OUTPUT_FILE ($FILE_SIZE)"
      echo "🎧 Play with: afplay $OUTPUT_FILE"
    fi
    
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ Job failed!"
    echo "$STATUS_RESPONSE" | jq '.'
    exit 1
  fi
done

if [ "$COMPLETED" = false ]; then
  echo ""
  echo "❌ Timeout after ${MAX_POLLS} polls"
  exit 1
fi
