#!/bin/bash

API_KEY="rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68"
ENDPOINT="70sq2akye030kh"

# Read the Russian voice file
VOICE_B64=$(base64 -i services/chatterbox_tts/runpod/russian_voice.flac)

# Russian test sentence: "Hello, how are you today?"
TEXT="Привет, как твои дела сегодня?"

echo "🇷🇺 Testing Russian TTS with Custom Voice"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Text: $TEXT"
echo "🎤 Voice: russian_voice.flac (12.93s)"
echo ""
echo "⏳ Sending request (this may take 10-30s for first run)..."

START=$(date +%s.%N)

RESPONSE=$(curl -s --max-time 60 \
  -X POST "https://api.runpod.ai/v2/${ENDPOINT}/runsync" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"format\": \"mp3\",
      \"speed\": 1.0,
      \"voice_base64\": \"${VOICE_B64}\"
    }
  }")

END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)

echo ""
echo "⏱️  Total API time: ${DURATION}s"

# Check for errors
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ Error:"
  echo "$RESPONSE" | jq '.error'
  exit 1
fi

# Extract audio
AUDIO_B64=$(echo "$RESPONSE" | jq -r '.output.audio_base64 // empty')

if [ -n "$AUDIO_B64" ] && [ "$AUDIO_B64" != "null" ]; then
  echo "✅ Success! Extracting audio..."
  echo "$AUDIO_B64" | base64 -d > russian_output.mp3
  
  FILE_SIZE=$(ls -lh russian_output.mp3 | awk '{print $5}')
  DURATION_MS=$(echo "$RESPONSE" | jq -r '.output.duration_ms // "N/A"')
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Results:"
  echo "   • Total API latency: ${DURATION}s"
  echo "   • Audio duration: ${DURATION_MS}ms ($(echo "scale=2; ${DURATION_MS}/1000" | bc)s)"
  echo "   • File size: $FILE_SIZE"
  echo "   • Saved to: russian_output.mp3"
  echo ""
  echo "🎧 Play with: afplay russian_output.mp3"
else
  echo "❌ No audio in response"
  echo "$RESPONSE" | jq '.'
fi
