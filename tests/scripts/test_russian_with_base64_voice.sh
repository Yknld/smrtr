#!/bin/bash
set -e

echo "🧪 Testing Russian TTS with Base64 Voice Reference"
echo "===================================================="

ENDPOINT_ID="70sq2akye030kh"
RUNPOD_API_KEY="${RUNPOD_API_KEY}"

if [ -z "$RUNPOD_API_KEY" ]; then
  echo "❌ Error: RUNPOD_API_KEY environment variable not set"
  exit 1
fi

echo ""
echo "📝 Encoding Russian voice sample to base64..."
VOICE_BASE64=$(base64 -i russian_voice_sample.flac | tr -d '\n')
echo "✅ Voice encoded (${#VOICE_BASE64} chars)"

echo ""
echo "🎙️ Sending Russian TTS request with voice clone..."

curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"Привет! Как дела? Это тест русского языка с клонированием голоса.\",
      \"language\": \"ru\",
      \"voice\": \"${VOICE_BASE64}\",
      \"exaggeration\": 0.5,
      \"temperature\": 0.8,
      \"cfg_weight\": 0.5,
      \"format\": \"mp3\"
    }
  }" | jq -r '.output.audio_base64' | base64 -d > russian_tts_with_voice_clone.mp3

echo ""
if [ -f russian_tts_with_voice_clone.mp3 ] && [ -s russian_tts_with_voice_clone.mp3 ]; then
  SIZE=$(ls -lh russian_tts_with_voice_clone.mp3 | awk '{print $5}')
  echo "✅ Success! Generated: russian_tts_with_voice_clone.mp3 ($SIZE)"
else
  echo "❌ Failed to generate audio"
  exit 1
fi
