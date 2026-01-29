#!/bin/bash
set -e

echo "🎙️ Generating pre-recorded join-in acknowledgment audio..."
echo ""

RUNPOD_API_KEY="${RUNPOD_API_KEY:-rpa_R5L7B0G1R6OEL9YWPK318IKDI2I9OPB28D3UWAJE19ya20}"
ENDPOINT_ID="f1hyps48e61yf7"

TEXT="Oh, we just got a call from a listener! Interesting question. Let me think about this for a moment..."

echo "📤 Submitting TTS job..."
echo "   Text: ${TEXT}"
echo ""

RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"text\": \"${TEXT}\",
      \"voice\": \"/app/runpod/male_en.flac\",
      \"language\": \"en\"
    }
  }")

JOB_ID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to submit job"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Job submitted: $JOB_ID"
echo "🔄 Waiting for completion..."

for i in {1..40}; do
  sleep 2
  
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // "UNKNOWN"')
  
  echo "   [$i] Status: $STATUS"
  
  if [ "$STATUS" = "COMPLETED" ]; then
    echo ""
    echo "✅ Generation complete!"
    
    AUDIO_B64=$(echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64 // empty')
    if [ -n "$AUDIO_B64" ]; then
      echo "$AUDIO_B64" | base64 -d > join_in_acknowledgment.mp3
      echo "💾 Saved to join_in_acknowledgment.mp3"
      
      SIZE=$(ls -lh join_in_acknowledgment.mp3 | awk '{print $5}')
      echo "📦 Size: $SIZE"
      
      echo ""
      echo "🎵 Testing playback..."
      if command -v afplay &> /dev/null; then
        afplay join_in_acknowledgment.mp3
      fi
      
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✅ NEXT STEPS:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "1. Go to Supabase Dashboard → Storage → tts_audio bucket"
      echo "2. Create a folder named: system"
      echo "3. Upload join_in_acknowledgment.mp3 to: tts_audio/system/"
      echo ""
      echo "Final path should be:"
      echo "   tts_audio/system/join_in_acknowledgment.mp3"
      echo ""
      echo "Then the join-in feature will work instantly!"
      echo ""
      
      exit 0
    fi
  elif [ "$STATUS" = "FAILED" ]; then
    echo "❌ Job failed"
    echo "$STATUS_RESPONSE" | jq '.'
    exit 1
  fi
done

echo "⏱️  Timeout after 80s"
