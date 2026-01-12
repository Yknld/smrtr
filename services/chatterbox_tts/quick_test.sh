#!/bin/bash
# Quick one-command test for RunPod TTS

RUNPOD_API_KEY="${1:-$RUNPOD_API_KEY}"

if [ -z "$RUNPOD_API_KEY" ]; then
  echo "Usage: ./quick_test.sh YOUR_RUNPOD_API_KEY"
  echo "Or: RUNPOD_API_KEY=your-key ./quick_test.sh"
  exit 1
fi

echo "🎙️ Testing RunPod TTS..."
echo ""

# Submit job and get job ID
RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/70sq2akye030kh/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Hello! This is a test of the Chatterbox TTS system. How does it sound?", "format": "mp3", "speed": 1.0, "voice": null}}')

JOB_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
  echo "❌ Failed to submit job"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Job submitted: $JOB_ID"
echo "⏳ Waiting for completion (this may take 30-60s on cold start)..."
echo ""

# Poll every 3 seconds
for i in {1..40}; do
  sleep 3
  
  STATUS=$(curl -s "https://api.runpod.ai/v2/70sq2akye030kh/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATE=$(echo "$STATUS" | jq -r '.status')
  
  echo "[$((i*3))s] Status: $STATE"
  
  if [ "$STATE" = "COMPLETED" ]; then
    echo ""
    echo "✅ COMPLETED!"
    
    # Save audio
    OUTPUT="test_output_$(date +%H%M%S).mp3"
    echo "$STATUS" | jq -r '.output.audio_base64' | base64 -d > "$OUTPUT"
    
    # Get stats
    GEN_TIME=$(echo "$STATUS" | jq -r '.output.generation_time_ms')
    CACHE_HIT=$(echo "$STATUS" | jq -r '.output.cache_hit')
    SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
    
    echo ""
    echo "📊 Stats:"
    echo "  - Generation time: ${GEN_TIME}ms"
    echo "  - Cache hit: $CACHE_HIT"
    echo "  - File size: $SIZE"
    echo "  - Saved to: $OUTPUT"
    echo ""
    echo "🔊 Playing audio..."
    open "$OUTPUT"
    exit 0
    
  elif [ "$STATE" = "FAILED" ]; then
    echo ""
    echo "❌ FAILED"
    echo "$STATUS" | jq '.'
    exit 1
  fi
done

echo ""
echo "❌ Timeout after 120s"
