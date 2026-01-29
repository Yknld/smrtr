#!/bin/bash

ENDPOINT_ID="f1hyps48e61yf7"
RUNPOD_API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"

echo "⏱️  Testing Russian TTS Performance"
echo "======================================"
echo ""

SENTENCES=(
  "Московский университет считается одним из лучших в стране."
  "Вчера я встретил старого друга в центре города."
  "Летом мы планируем поехать на море всей семьёй."
)

TOTAL=0
COUNT=0

for sentence in "${SENTENCES[@]}"; do
  COUNT=$((COUNT + 1))
  echo "Test $COUNT/3: ${sentence:0:40}..."
  
  START=$(python3 -c "import time; print(int(time.time()*1000))")
  
  RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/$ENDPOINT_ID/runsync" \
    -H "Authorization: Bearer $RUNPOD_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"input\":{\"text\":\"$sentence\",\"language\":\"ru\",\"voice\":\"/app/runpod/russian_voice.flac\"}}")
  
  END=$(python3 -c "import time; print(int(time.time()*1000))")
  WALL_TIME=$((END - START))
  
  EXEC_TIME=$(echo "$RESPONSE" | jq -r '.executionTime')
  
  echo "  ⏱️  Generation time: ${EXEC_TIME}ms"
  TOTAL=$((TOTAL + EXEC_TIME))
  echo ""
done

AVG=$((TOTAL / COUNT))
echo "======================================"
echo "📊 Average generation time: ${AVG}ms"
echo "   (~${AVG}ms per sentence)"
