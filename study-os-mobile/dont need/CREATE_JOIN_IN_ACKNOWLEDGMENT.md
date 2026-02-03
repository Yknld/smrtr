# Create Pre-Recorded Join-In Acknowledgment Audio

## What You Need

A **pre-recorded audio file** (~7 seconds) that plays instantly when a user asks a join-in question.

## Script

```
Oh, we just got a call from a listener! Interesting question. Let me think about this for a moment...
```

## Steps to Create

### Option 1: Use RunPod TTS (Quick)

```bash
#!/bin/bash
# Set in env: export RUNPOD_API_KEY=your_key
RUNPOD_API_KEY="${RUNPOD_API_KEY:?Set RUNPOD_API_KEY}"
ENDPOINT_ID="f1hyps48e61yf7"

TEXT="Oh, we just got a call from a listener! Interesting question. Let me think about this for a moment..."

# Submit TTS job
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

JOB_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Job ID: $JOB_ID"

# Wait and poll
echo "Waiting for completion..."
for i in {1..30}; do
  sleep 2
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  echo "[$i] Status: $STATUS"
  
  if [ "$STATUS" = "COMPLETED" ]; then
    AUDIO_B64=$(echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64')
    echo "$AUDIO_B64" | base64 -d > join_in_acknowledgment.mp3
    echo "✅ Saved to join_in_acknowledgment.mp3"
    exit 0
  fi
done
```

### Option 2: Use ElevenLabs or Other TTS

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Use the text above
3. Choose a conversational voice
4. Download as MP3
5. Save as `join_in_acknowledgment.mp3`

## Upload to Supabase

1. Go to Supabase Dashboard → Storage → `tts_audio` bucket
2. Create folder: `system`
3. Upload `join_in_acknowledgment.mp3` to `tts_audio/system/`

**Final path:** `tts_audio/system/join_in_acknowledgment.mp3`

## How It Works

1. User asks question
2. **Pre-recorded audio plays instantly** (no generation delay!)
3. While playing, AI generates real response (15-20s)
4. Real response plays after acknowledgment
5. Seamless experience!
