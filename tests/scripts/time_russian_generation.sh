#!/bin/bash

ENDPOINT_ID="f1hyps48e61yf7"
RUNPOD_API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"

echo "⏱️  Testing Russian TTS generation time..."
echo ""

# Test sentence
TEXT="Сегодня прекрасная погода для прогулки в парке."
echo "📝 Text: $TEXT"
echo ""

# Make request and measure total time
START=$(date +%s%3N)

RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/$ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"input\":{\"text\":\"$TEXT\",\"language\":\"ru\",\"voice\":\"/app/runpod/russian_voice.flac\"}}" \
  --max-time 60)

END=$(date +%s%3N)
TOTAL_TIME=$((END - START))

# Extract execution time from response
EXEC_TIME=$(echo "$RESPONSE" | jq -r '.executionTime // 0')
STATUS=$(echo "$RESPONSE" | jq -r '.status')

echo "✅ Status: $STATUS"
echo "⏱️  Total request time: ${TOTAL_TIME}ms"
echo "🎙️  Model execution time: ${EXEC_TIME}ms"
echo ""
echo "📊 Breakdown:"
echo "   - Network overhead: $((TOTAL_TIME - EXEC_TIME))ms"
echo "   - TTS generation: ${EXEC_TIME}ms"
