#!/bin/bash
# Quick test of your RunPod Chatterbox TTS endpoint

export RUNPOD_API_KEY="rpa_AABK9E5QUCBDOT1PA924SI8O5QPP18C49Q74M1HUrvevfm"
export ENDPOINT_ID="zeo55yjgjq5b9m"

echo "🧪 Testing Chatterbox TTS Endpoint: ${ENDPOINT_ID}"
echo ""

# Test 1: First request (cold start - will take 60-120 seconds)
echo "=== Test 1: First Request (Cold Start - expect 60-120s) ==="
echo "Starting at: $(date '+%H:%M:%S')"

curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is my first test of the Chatterbox TTS service running on RunPod.",
      "format": "mp3",
      "speed": 1.0
    }
  }' > test1_response.json

echo ""
echo "Completed at: $(date '+%H:%M:%S')"
echo ""

# Check if it worked
if cat test1_response.json | grep -q "COMPLETED"; then
  echo "✅ SUCCESS! First request completed!"
  echo ""
  
  # Parse and display key info
  echo "Response details:"
  cat test1_response.json | jq '{
    status: .status,
    duration_ms: .output.duration_ms,
    cache_hit: .output.cache_hit,
    chunks: .output.chunks_processed,
    generation_time: .output.generation_time_ms
  }'
  
  echo ""
  echo "Saving audio to test1.mp3..."
  cat test1_response.json | jq -r '.output.audio_base64' | base64 -d > test1.mp3
  
  if [ -f test1.mp3 ]; then
    SIZE=$(ls -lh test1.mp3 | awk '{print $5}')
    echo "✅ Audio saved: test1.mp3 (${SIZE})"
    echo "   Play with: open test1.mp3"
  fi
  
else
  echo "❌ Request failed or still in progress"
  echo "Response:"
  cat test1_response.json | jq '.'
  exit 1
fi

echo ""
echo "================================"
echo ""

# Test 2: Second request (should be cached or warm, ~2-5s)
echo "=== Test 2: Warm Request (Should be fast ~2-5s) ==="
echo "Starting at: $(date '+%H:%M:%S')"

curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "This is a second test with different text to verify warm start performance.",
      "format": "mp3"
    }
  }' > test2_response.json

echo ""
echo "Completed at: $(date '+%H:%M:%S')"
echo ""

if cat test2_response.json | grep -q "COMPLETED"; then
  echo "✅ SUCCESS! Warm request completed!"
  echo ""
  cat test2_response.json | jq '{
    status: .status,
    duration_ms: .output.duration_ms,
    cache_hit: .output.cache_hit,
    generation_time: .output.generation_time_ms
  }'
  
  echo ""
  cat test2_response.json | jq -r '.output.audio_base64' | base64 -d > test2.mp3
  echo "✅ Audio saved: test2.mp3"
else
  echo "❌ Request failed"
  cat test2_response.json | jq '.'
fi

echo ""
echo "================================"
echo ""

# Test 3: Cache test (exact same text as test 1, should be instant)
echo "=== Test 3: Cache Test (Same text as Test 1, should be <500ms) ==="
echo "Starting at: $(date '+%H:%M:%S')"

curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is my first test of the Chatterbox TTS service running on RunPod.",
      "format": "mp3",
      "speed": 1.0
    }
  }' > test3_response.json

echo ""
echo "Completed at: $(date '+%H:%M:%S')"
echo ""

if cat test3_response.json | grep -q "COMPLETED"; then
  CACHE_HIT=$(cat test3_response.json | jq -r '.output.cache_hit')
  
  if [ "$CACHE_HIT" == "true" ]; then
    echo "✅ SUCCESS! Cache hit confirmed!"
  else
    echo "⚠️  No cache hit (cache might have been cleared)"
  fi
  
  echo ""
  cat test3_response.json | jq '{
    status: .status,
    cache_hit: .output.cache_hit,
    generation_time: .output.generation_time_ms
  }'
else
  echo "❌ Request failed"
  cat test3_response.json | jq '.'
fi

echo ""
echo "================================"
echo ""
echo "🎉 All tests complete!"
echo ""
echo "Generated files:"
ls -lh test*.mp3 test*_response.json 2>/dev/null || echo "No files generated"
echo ""
echo "Listen to audio:"
echo "  open test1.mp3"
echo "  open test2.mp3"
