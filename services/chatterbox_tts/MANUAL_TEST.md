# Manual RunPod TTS Test

## 🚀 Easiest Way (Automated Script)

```bash
cd /Users/danielntumba/smrtr/services/chatterbox_tts
./quick_test.sh YOUR_RUNPOD_API_KEY
```

This will:
- Submit a test sentence
- Wait for completion
- Save the audio as MP3
- Automatically play it
- Show generation time stats

## Manual Test Command

```bash
# Replace YOUR_API_KEY with your actual RunPod API key
curl -X POST "https://api.runpod.ai/v2/70sq2akye030kh/run" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello, this is a test of the Chatterbox TTS system.",
      "format": "mp3",
      "speed": 1.0,
      "voice": "/app/runpod/female_en.flac"
    }
  }'
```

## Get Your API Key

1. Go to https://www.runpod.io/console/serverless
2. Click on your endpoint
3. Copy the API key from the dashboard

## Check Status

After submitting, you'll get a job ID. Check its status:

```bash
curl "https://api.runpod.ai/v2/70sq2akye030kh/status/JOB_ID_HERE" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Expected Timeline

- **Cold start** (first request): 30-60 seconds
- **Warm start** (subsequent requests): 2-5 seconds
- **Generation time**: ~1-2 seconds per sentence once model is loaded

## Example Response

```json
{
  "id": "job-id-here",
  "status": "COMPLETED",
  "output": {
    "audio_base64": "base64-encoded-mp3...",
    "mimetype": "audio/mpeg",
    "size_bytes": 15234,
    "cache_hit": false,
    "device": "cuda",
    "chunks_processed": 1,
    "generation_time_ms": 1523
  }
}
```
