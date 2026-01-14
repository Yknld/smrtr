#!/bin/bash

export RUNPOD_API_KEY="rpa_R5L7B0G1R6OEL9YWPK318IKDI2I9OPB28D3UWAJE19ya20"
ENDPOINT_ID="70sq2akye030kh"

# Test both languages
for LANG in "en" "ru"; do
  if [ "$LANG" = "en" ]; then
    TEXT="Hello, how are you today?"
    LANG_NAME="English"
    FLAG="🇺🇸"
  else
    TEXT="Привет, как твои дела сегодня?"
    LANG_NAME="Russian"
    FLAG="🇷🇺"
  fi

  echo ""
  echo "$FLAG Testing $LANG_NAME TTS..."
  echo "📝 Text: $TEXT"
  
  # Submit job
  START=$(date +%s.%N)
  JOB=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"input\": {\"text\": \"${TEXT}\", \"format\": \"mp3\", \"speed\": 1.0, \"language\": \"${LANG}\", \"exaggeration\": 0.7}}")
  
  JOB_ID=$(echo "$JOB" | jq -r '.id')
  echo "📋 Job ID: $JOB_ID"
  
  # Poll for completion
  for i in {1..90}; do
    sleep 1
    STATUS=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
      -H "Authorization: Bearer ${RUNPOD_API_KEY}")
    
    STATE=$(echo "$STATUS" | jq -r '.status')
    
    if [ "$STATE" = "COMPLETED" ]; then
      END=$(date +%s.%N)
      TOTAL=$(echo "$END - $START" | bc)
      
      EXEC_MS=$(echo "$STATUS" | jq -r '.executionTime')
      EXEC_S=$(echo "scale=2; $EXEC_MS / 1000" | bc)
      
      GEN_MS=$(echo "$STATUS" | jq -r '.output.generation_time_ms')
      GEN_S=$(echo "scale=2; $GEN_MS / 1000" | bc)
      
      SIZE=$(echo "$STATUS" | jq -r '.output.size_bytes')
      SIZE_KB=$(echo "scale=1; $SIZE / 1024" | bc)
      
      echo "✅ SUCCESS!"
      echo "⏱️  Total time: ${TOTAL}s"
      echo "🔧 RunPod execution: ${EXEC_S}s"
      echo "🎵 Generation time: ${GEN_S}s"
      echo "📦 Audio size: ${SIZE_KB} KB"
      break
    elif [ "$STATE" = "FAILED" ]; then
      echo "❌ FAILED"
      echo "$STATUS" | jq '.error'
      break
    fi
    
    echo -n "."
  done
done
