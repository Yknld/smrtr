#!/bin/bash
# Test RunPod Serverless Endpoint

# SETUP: Set your credentials
export RUNPOD_API_KEY="your_runpod_api_key_here"
export ENDPOINT_ID="your_endpoint_id_here"

# Test 1: Synchronous request (waits for result)
echo "=== Test 1: Synchronous TTS Request ==="
curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is a test of the Chatterbox TTS service running on RunPod serverless.",
      "voice": "default",
      "format": "mp3",
      "speed": 1.0
    }
  }' | jq '.'

echo ""
echo "=== Test 2: Check if cached (should be instant) ==="
curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is a test of the Chatterbox TTS service running on RunPod serverless.",
      "voice": "default",
      "format": "mp3",
      "speed": 1.0
    }
  }' | jq '.output.cache_hit'

echo ""
echo "=== Test 3: Async request (get job ID, poll for status) ==="
JOB_ID=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "This is an asynchronous test.",
      "format": "wav"
    }
  }' | jq -r '.id')

echo "Job ID: ${JOB_ID}"
echo "Polling for result..."

# Poll for result
for i in {1..30}; do
  RESULT=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$RESULT" | jq -r '.status')
  echo "Attempt $i: Status = $STATUS"
  
  if [ "$STATUS" == "COMPLETED" ]; then
    echo "✅ Job completed!"
    echo "$RESULT" | jq '.output'
    break
  elif [ "$STATUS" == "FAILED" ]; then
    echo "❌ Job failed!"
    echo "$RESULT" | jq '.'
    break
  fi
  
  sleep 2
done

echo ""
echo "=== Test 4: Save audio to file ==="
curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Saving this audio to a file.",
      "format": "mp3"
    }
  }' | jq -r '.output.audio_base64' | base64 -d > test_output.mp3

if [ -f test_output.mp3 ]; then
  SIZE=$(ls -lh test_output.mp3 | awk '{print $5}')
  echo "✅ Audio saved to test_output.mp3 (${SIZE})"
else
  echo "❌ Failed to save audio"
fi

echo ""
echo "=== All tests complete! ==="
