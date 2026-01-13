#!/bin/bash
set -e

echo "🧪 Testing Multilingual TTS Endpoint"
echo "====================================="

ENDPOINT_ID="thgva5m4pkcq77"
RUNPOD_API_KEY="${RUNPOD_API_KEY}"

if [ -z "$RUNPOD_API_KEY" ]; then
  echo "❌ Error: RUNPOD_API_KEY environment variable not set"
  exit 1
fi

echo ""
echo "📝 Test 1: English with custom voice"
curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is a test of the multilingual model with voice cloning.",
      "language": "en",
      "voice": "/app/runpod/host_voice.flac",
      "exaggeration": 0.5,
      "temperature": 0.8,
      "cfg_weight": 0.5,
      "format": "mp3"
    }
  }' | jq '.'

echo ""
echo ""
echo "📝 Test 2: Russian with custom voice"
curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Привет, как дела? Это тест многоязычной модели.",
      "language": "ru",
      "voice": "/app/runpod/russian_voice.flac",
      "exaggeration": 0.5,
      "temperature": 0.8,
      "cfg_weight": 0.5,
      "format": "mp3"
    }
  }' | jq '.'

echo ""
echo "✅ Tests complete!"
