#!/bin/bash
set -e

echo "🧪 Testing Chatterbox Multilingual TTS - Russian"
echo "================================================"

RUNPOD_ENDPOINT="https://api.runpod.ai/v2/euxfugfzmpsemkjpcpuz/runsync"
RUNPOD_API_KEY="${RUNPOD_API_KEY}"

if [ -z "$RUNPOD_API_KEY" ]; then
  echo "❌ Error: RUNPOD_API_KEY environment variable not set"
  exit 1
fi

echo ""
echo "📝 Text: 'Привет, как дела?'"
echo "🌍 Language: Russian (ru)"
echo "🎤 Voice: russian_voice.flac"
echo "📊 Exaggeration: 0.7"
echo ""

START_TIME=$(date +%s)

curl -X POST "${RUNPOD_ENDPOINT}" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Привет, как дела?",
      "voice": "/app/runpod/russian_voice.flac",
      "language": "ru",
      "format": "mp3",
      "speed": 1.0,
      "exaggeration": 0.7
    }
  }' | jq '.'

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "⏱️  Total request time: ${DURATION}s"
echo "✅ Test complete!"
