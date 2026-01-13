#!/bin/bash
# Test your LIVE RunPod endpoint

export RUNPOD_API_KEY="rpa_AABK9E5QUCBDOT1PA924SI8O5QPP18C49Q74M1HUrvevfm"
export ENDPOINT_ID="zeo55yjgjq5b9m"

echo "🚀 Testing Chatterbox TTS Endpoint"
echo "Endpoint: ${ENDPOINT_ID}"
echo ""
echo "⏳ First request will take 60-120 seconds (cold start - downloading model)"
echo "   Subsequent requests will be 2-5 seconds"
echo ""
echo "Starting test at: $(date '+%H:%M:%S')"
echo ""

# Use async endpoint first (better for cold starts)
echo "Submitting job..."
JOB_RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is my first test of the Chatterbox TTS service. It is working perfectly!",
      "format": "mp3",
      "speed": 1.0
    }
  }')

echo "$JOB_RESPONSE" | jq '.'

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.id')

if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
  echo ""
  echo "❌ Failed to create job. Check your API key and endpoint ID."
  echo "Response: $JOB_RESPONSE"
  exit 1
fi

echo ""
echo "✅ Job created: ${JOB_ID}"
echo ""
echo "Polling for result (checking every 5 seconds)..."
echo ""

# Poll for result
for i in {1..60}; do
  sleep 5
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  echo "[$(date '+%H:%M:%S')] Attempt $i: Status = $STATUS"
  
  if [ "$STATUS" == "COMPLETED" ]; then
    echo ""
    echo "🎉 SUCCESS! Job completed!"
    echo ""
    echo "Full response:"
    echo "$STATUS_RESPONSE" | jq '.'
    echo ""
    
    # Extract and save audio
    echo "Saving audio to test_output.mp3..."
    echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64' | base64 -d > test_output.mp3
    
    if [ -f test_output.mp3 ]; then
      SIZE=$(ls -lh test_output.mp3 | awk '{print $5}')
      echo "✅ Audio saved: test_output.mp3 (${SIZE})"
      echo ""
      echo "Play with: open test_output.mp3"
      echo ""
      
      # Show metrics
      echo "📊 Metrics:"
      echo "$STATUS_RESPONSE" | jq '{
        duration_ms: .output.duration_ms,
        cache_hit: .output.cache_hit,
        chunks_processed: .output.chunks_processed,
        generation_time_ms: .output.generation_time_ms
      }'
    fi
    
    exit 0
    
  elif [ "$STATUS" == "FAILED" ]; then
    echo ""
    echo "❌ Job failed!"
    echo ""
    echo "Error details:"
    echo "$STATUS_RESPONSE" | jq '.'
    exit 1
    
  elif [ "$STATUS" == "IN_QUEUE" ] || [ "$STATUS" == "IN_PROGRESS" ]; then
    # Continue polling
    continue
  else
    echo "   Unknown status: $STATUS"
  fi
done

echo ""
echo "⏱️  Timeout: Job did not complete within 5 minutes"
echo "   This might be normal for the first cold start"
echo "   Check the RunPod logs for details"
