#!/bin/bash
# Test RunPod TTS endpoint with a single sentence

ENDPOINT_ID="70sq2akye030kh"
RUNPOD_API_KEY="${RUNPOD_API_KEY:-your-api-key-here}"

# Test sentence
TEXT="Hello, this is a test of the Chatterbox TTS system."

echo "Testing RunPod TTS Endpoint..."
echo "Endpoint: https://api.runpod.ai/v2/${ENDPOINT_ID}"
echo "Text: ${TEXT}"
echo ""
echo "Submitting job..."

START_TIME=$(date +%s%3N)

# Submit the job
RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"format\": \"mp3\",
      \"speed\": 1.0,
      \"voice\": \"/app/runpod/female_en.flac\"
    }
  }")

echo "Submit response:"
echo "$RESPONSE" | jq '.'

# Extract job ID
JOB_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
  echo "Error: Failed to get job ID"
  echo "Response: $RESPONSE"
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
    echo "Full response:"
    echo "$STATUS_RESPONSE" | jq '.'
    
    # Get audio and save to file
    AUDIO_BASE64=$(echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64')
    if [ "$AUDIO_BASE64" != "null" ] && [ -n "$AUDIO_BASE64" ]; then
      AUDIO_SIZE=$(echo -n "$AUDIO_BASE64" | wc -c)
      echo ""
      echo "Audio base64 length: $AUDIO_SIZE chars"
      echo "Estimated audio size: $(echo "scale=2; $AUDIO_SIZE * 0.75 / 1024" | bc) KB"
      
      # Save audio to file
      OUTPUT_FILE="runpod_test_$(date +%Y%m%d_%H%M%S).mp3"
      echo "$AUDIO_BASE64" | base64 -d > "$OUTPUT_FILE"
      
      echo ""
      echo "✅ Audio saved to: $OUTPUT_FILE"
      echo "Play with: open $OUTPUT_FILE"
      
      # Try to play it automatically on macOS
      if command -v open &> /dev/null; then
        echo "Opening audio file..."
        open "$OUTPUT_FILE"
      fi
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
  echo "❌ Timeout after ${MAX_POLLS} polls ($(($MAX_POLLS * 2))s)"
  exit 1
fi
