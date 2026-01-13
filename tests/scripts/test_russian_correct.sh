#!/bin/bash

API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"
ENDPOINT="70sq2akye030kh"

# Russian test sentence: "Hello, how are you today?"
TEXT="Привет, как твои дела сегодня?"

echo "🇷🇺 Testing Russian TTS Performance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Text: $TEXT"
echo "📏 Length: ${#TEXT} characters"
echo ""

START=$(date +%s.%N)

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  -X POST "https://api.runpod.ai/v2/${ENDPOINT}/runsync" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"input\":{\"text\":\"${TEXT}\",\"format\":\"mp3\",\"speed\":1.0,\"voice\":null}}")

END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
JSON=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

echo "⏱️  Total API time: ${DURATION}s"
echo "📡 HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success! Extracting audio..."
  
  # Parse and save audio
  AUDIO_B64=$(echo "$JSON" | jq -r '.output.audio_base64 // empty')
  
  if [ -n "$AUDIO_B64" ]; then
    echo "$AUDIO_B64" | base64 -d > russian_test.mp3
    FILE_SIZE=$(ls -lh russian_test.mp3 | awk '{print $5}')
    DURATION_MS=$(echo "$JSON" | jq -r '.output.duration_ms // "N/A"')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Results:"
    echo "   • Total API latency: ${DURATION}s"
    echo "   • Audio duration: ${DURATION_MS}ms ($(echo "scale=2; ${DURATION_MS}/1000" | bc)s)"
    echo "   • File size: $FILE_SIZE"
    echo "   • Saved to: russian_test.mp3"
    echo ""
    echo "🎧 Play with: afplay russian_test.mp3"
  else
    echo "❌ No audio in response"
    echo "$JSON" | jq '.'
  fi
else
  echo "❌ Request failed"
  echo "$JSON" | jq '.' 2>/dev/null || echo "$JSON"
fi
