#!/bin/bash

export RUNPOD_API_KEY="rpa_R5L7B0G1R6OEL9YWPK318IKDI2I9OPB28D3UWAJE19ya20"
ENDPOINT_ID="70sq2akye030kh"
TEXT="Привет, как твои дела сегодня?"

echo "🇷🇺 Testing Russian TTS performance..."
echo "📝 Text: $TEXT"
echo ""

# Start timer
START_TIME=$(date +%s.%N)

# Submit job
echo "⏱️  Submitting job..."
JOB_RESPONSE=$(curl -s -X POST \
  "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"format\": \"mp3\",
      \"speed\": 1.0,
      \"voice\": \"/app/runpod/russian_voice.flac\",
      \"language\": \"ru\",
      \"exaggeration\": 0.7
    }
  }")

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.id')
echo "📋 Job ID: $JOB_ID"

# Poll for completion
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  sleep 1
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  
  if [ "$STATUS" = "COMPLETED" ]; then
    END_TIME=$(date +%s.%N)
    DURATION=$(echo "$END_TIME - $START_TIME" | bc)
    
    echo ""
    echo "✅ SUCCESS!"
    echo "⏱️  Total time: ${DURATION} seconds"
    echo ""
    
    # Get execution time from RunPod
    EXEC_TIME=$(echo "$STATUS_RESPONSE" | jq -r '.executionTime // 0')
    EXEC_SECONDS=$(echo "scale=3; $EXEC_TIME / 1000" | bc)
    echo "🔧 RunPod execution time: ${EXEC_SECONDS}s"
    
    # Get audio info
    SIZE=$(echo "$STATUS_RESPONSE" | jq -r '.output.size_bytes // 0')
    SIZE_KB=$(echo "scale=1; $SIZE / 1024" | bc)
    GEN_TIME=$(echo "$STATUS_RESPONSE" | jq -r '.output.generation_time_ms // 0')
    GEN_SECONDS=$(echo "scale=3; $GEN_TIME / 1000" | bc)
    
    echo "📦 Audio size: ${SIZE_KB} KB"
    echo "🎵 Generation time: ${GEN_SECONDS}s"
    
    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ Job failed"
    echo "$STATUS_RESPONSE" | jq '.'
    exit 1
  fi
  
  echo -n "."
done

echo ""
echo "❌ Timeout after ${MAX_ATTEMPTS} seconds"
exit 1
