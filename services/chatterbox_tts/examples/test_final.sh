#!/bin/bash
# Test your LIVE RunPod Serverless Endpoint

export RUNPOD_API_KEY="rpa_AABK9E5QUCBDOT1PA924SI8O5QPP18C49Q74M1HUrvevfm"
export ENDPOINT_ID="oih0lyyiyr356j"

echo "🚀 Testing Chatterbox TTS Serverless Endpoint"
echo "Endpoint: dirty_green_sole (${ENDPOINT_ID})"
echo ""
echo "⏳ First request will take 60-120 seconds (cold start)"
echo "   - Downloading model (~2GB)"
echo "   - Loading into GPU"
echo "   - Generating audio"
echo ""

# Submit job
echo "📤 Submitting TTS job..."
echo "Started at: $(date '+%H:%M:%S')"
echo ""

JOB_RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is my first successful test of the Chatterbox TTS service running on RunPod serverless. It is working perfectly!",
      "format": "mp3",
      "speed": 1.0
    }
  }')

echo "Response:"
echo "$JOB_RESPONSE" | jq '.'

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.id')

if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
  echo ""
  echo "❌ Failed to create job"
  echo "Check if endpoint is 'Ready' and API key is correct"
  exit 1
fi

echo ""
echo "✅ Job created successfully!"
echo "Job ID: ${JOB_ID}"
echo ""
echo "📊 Polling for result (checking every 5 seconds)..."
echo "   Go to RunPod Logs tab to watch real-time progress!"
echo ""

# Poll for result
POLL_COUNT=0
MAX_POLLS=60  # 5 minutes max

while [ $POLL_COUNT -lt $MAX_POLLS ]; do
  sleep 5
  POLL_COUNT=$((POLL_COUNT + 1))
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  ELAPSED=$((POLL_COUNT * 5))
  echo "[${ELAPSED}s] Poll #${POLL_COUNT}: Status = ${STATUS}"
  
  if [ "$STATUS" == "COMPLETED" ]; then
    echo ""
    echo "🎉🎉🎉 SUCCESS! Job completed! 🎉🎉🎉"
    echo ""
    echo "Completed at: $(date '+%H:%M:%S')"
    echo "Total time: ${ELAPSED} seconds"
    echo ""
    
    # Show full response
    echo "📋 Full Response:"
    echo "$STATUS_RESPONSE" | jq '.'
    echo ""
    
    # Extract metrics
    echo "📊 Metrics:"
    echo "$STATUS_RESPONSE" | jq '{
      audio_duration_ms: .output.duration_ms,
      cache_hit: .output.cache_hit,
      chunks_processed: .output.chunks_processed,
      generation_time_ms: .output.generation_time_ms,
      cache_key: .output.cache_key
    }'
    echo ""
    
    # Save audio
    echo "💾 Saving audio to success_test.mp3..."
    echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64' | base64 -d > success_test.mp3
    
    if [ -f success_test.mp3 ]; then
      SIZE=$(ls -lh success_test.mp3 | awk '{print $5}')
      echo "✅ Audio saved: success_test.mp3 (${SIZE})"
      echo ""
      echo "🎵 Play with: open success_test.mp3"
    else
      echo "⚠️  Failed to save audio file"
    fi
    
    echo ""
    echo "════════════════════════════════════════"
    echo "🎉 YOUR CHATTERBOX TTS SERVICE IS LIVE! 🎉"
    echo "════════════════════════════════════════"
    echo ""
    echo "Next: Try a second request (should be 2-5s, not 60-120s!)"
    
    exit 0
    
  elif [ "$STATUS" == "FAILED" ]; then
    echo ""
    echo "❌ Job failed!"
    echo ""
    echo "Error details:"
    echo "$STATUS_RESPONSE" | jq '.'
    echo ""
    echo "💡 Check the RunPod Logs tab for detailed error messages"
    exit 1
    
  elif [ "$STATUS" == "IN_QUEUE" ]; then
    echo "   → Waiting in queue for worker to spawn..."
    
  elif [ "$STATUS" == "IN_PROGRESS" ]; then
    echo "   → Worker is processing (downloading model or generating audio)..."
    
  else
    echo "   → Status: $STATUS"
  fi
done

echo ""
echo "⏱️  Timeout after ${MAX_POLLS} polls (5 minutes)"
echo "   The job might still be running - check RunPod console"
echo ""
echo "Last status: $STATUS"
