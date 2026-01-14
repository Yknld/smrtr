#!/bin/bash
# Test GitHub-built RunPod Serverless Endpoint

export RUNPOD_API_KEY="rpa_AABK9E5QUCBDOT1PA924SI8O5QPP18C49Q74M1HUrvevfm"
export ENDPOINT_ID="70sq2akye030kh"

echo "🚀 Testing GitHub-Built Chatterbox TTS Endpoint"
echo "Endpoint ID: ${ENDPOINT_ID}"
echo ""
echo "⏳ First request: 60-120 seconds (cold start)"
echo "   - Spawning worker"
echo "   - Downloading model (~2GB)"
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
      "text": "Hello! This is a test of the Chatterbox TTS service deployed directly from GitHub to RunPod. The handler is working!",
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
  echo "Full response: $JOB_RESPONSE"
  exit 1
fi

echo ""
echo "✅ Job created: ${JOB_ID}"
echo ""
echo "📊 Polling for result..."
echo "   💡 Tip: Check the 'Logs' tab in RunPod to watch live progress!"
echo ""

# Poll for result
for i in {1..60}; do
  sleep 5
  ELAPSED=$((i * 5))
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  echo "[${ELAPSED}s] Poll #${i}: Status = ${STATUS}"
  
  if [ "$STATUS" == "COMPLETED" ]; then
    echo ""
    echo "════════════════════════════════════════"
    echo "🎉  SUCCESS! JOB COMPLETED!  🎉"
    echo "════════════════════════════════════════"
    echo ""
    echo "Completed at: $(date '+%H:%M:%S')"
    echo "Total time: ${ELAPSED} seconds"
    echo ""
    
    echo "📋 Full Response:"
    echo "$STATUS_RESPONSE" | jq '.'
    echo ""
    
    echo "📊 Metrics:"
    echo "$STATUS_RESPONSE" | jq '{
      audio_duration_ms: .output.duration_ms,
      cache_hit: .output.cache_hit,
      chunks_processed: .output.chunks_processed,
      generation_time_ms: .output.generation_time_ms
    }'
    echo ""
    
    # Save audio
    echo "💾 Saving audio to github_test_success.mp3..."
    echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64' | base64 -d > github_test_success.mp3
    
    if [ -f github_test_success.mp3 ]; then
      SIZE=$(ls -lh github_test_success.mp3 | awk '{print $5}')
      echo "✅ Audio saved: github_test_success.mp3 (${SIZE})"
      echo ""
      echo "🎵 Play with: open github_test_success.mp3"
    fi
    
    echo ""
    echo "════════════════════════════════════════"
    echo "🎉 CHATTERBOX TTS IS LIVE ON RUNPOD! 🎉"
    echo "════════════════════════════════════════"
    echo ""
    echo "✅ GitHub → RunPod deployment: SUCCESS"
    echo "✅ Handler.py: Working"
    echo "✅ Model loading: Working"
    echo "✅ Audio generation: Working"
    echo ""
    echo "Next: Try a second request (should be 2-5s!)"
    
    exit 0
    
  elif [ "$STATUS" == "FAILED" ]; then
    echo ""
    echo "❌ Job failed!"
    echo ""
    echo "Error details:"
    echo "$STATUS_RESPONSE" | jq '.'
    echo ""
    echo "Check RunPod Logs tab for details"
    exit 1
    
  elif [ "$STATUS" == "IN_QUEUE" ]; then
    echo "   → Waiting for worker to spawn..."
    
  elif [ "$STATUS" == "IN_PROGRESS" ]; then
    echo "   → Worker processing (downloading model or generating)..."
  fi
done

echo ""
echo "⏱️  Timeout after 5 minutes"
echo "   Job might still be running - check RunPod console"
