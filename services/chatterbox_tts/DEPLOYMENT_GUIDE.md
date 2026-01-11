# Chatterbox TTS - Quick Deployment Guide

This is a streamlined guide to get you from zero to deployed in 15 minutes.

---

## Prerequisites

✅ Docker installed  
✅ Git submodules initialized  
✅ (For GPU) NVIDIA Docker runtime installed  
✅ (For RunPod) Docker Hub account  

---

## Step 1: Initialize Submodule (2 min)

```bash
cd /Users/danielntumba/smrtr

# Initialize the Chatterbox submodule
git submodule update --init --recursive

# Verify it worked
ls external/chatterbox/src
# Should see: chatterbox/
```

---

## Step 2: Local Testing - CPU (5 min)

Test the service locally without a GPU:

```bash
# Build CPU image
docker build -f services/chatterbox_tts/Dockerfile.cpu -t chatterbox-tts:cpu .

# Run container
docker run -p 8000:8000 chatterbox-tts:cpu

# In another terminal, test it
curl http://localhost:8000/health

# Generate test audio
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "format": "mp3"}' \
  --output test.mp3

# Play it (macOS)
afplay test.mp3
```

✅ **Success**: You should hear "Hello world"

---

## Step 3: Local Testing - GPU (Optional, 5 min)

If you have an NVIDIA GPU:

```bash
# Build GPU image
docker build -f services/chatterbox_tts/Dockerfile -t chatterbox-tts:gpu .

# Run with GPU
docker run --gpus all -p 8000:8000 chatterbox-tts:gpu

# Test (same as above)
curl http://localhost:8000/health
```

Check logs - should see:
```
Using device: cuda
GPU: NVIDIA GeForce RTX 3090
✓ Model loaded successfully
```

---

## Step 4: Deploy to RunPod (5 min)

### Option A: RunPod Pods (Always-On)

1. **Push image to Docker Hub:**
   ```bash
   docker tag chatterbox-tts:gpu YOUR_DOCKERHUB_USER/chatterbox-tts:latest
   docker push YOUR_DOCKERHUB_USER/chatterbox-tts:latest
   ```

2. **Deploy on RunPod:**
   - Go to https://www.runpod.io/console/pods
   - Click "Deploy"
   - Select GPU: **RTX 3060 (12GB)** or better
   - Docker Image: `YOUR_DOCKERHUB_USER/chatterbox-tts:latest`
   - Expose port: **8000** → HTTP
   - Click "Deploy"

3. **Test your deployment:**
   ```bash
   # Get Pod URL from RunPod dashboard (e.g., https://abc123-8000.proxy.runpod.net)
   
   curl https://abc123-8000.proxy.runpod.net/health
   
   curl -X POST https://abc123-8000.proxy.runpod.net/tts \
     -H "Content-Type: application/json" \
     -d '{"text": "RunPod deployment successful", "format": "mp3"}' \
     --output runpod_test.mp3
   ```

✅ **Success**: You have a live TTS API!

---

### Option B: RunPod Serverless (Scale-to-Zero)

**Key Features:**
- ✅ True scale-to-zero (min workers = 0, no idle cost)
- ✅ Model weights baked into image (fast ~2-3s cold start)
- ✅ Persistent cache on /runpod-volume
- ✅ Supports sync (runsync) and async (run) endpoints

1. **Build serverless image (includes model download):**
   ```bash
   # Build takes ~10 min (downloads 2GB model weights)
   docker build -f services/chatterbox_tts/Dockerfile.serverless \
     -t YOUR_DOCKERHUB_USER/chatterbox-tts:serverless .
   
   docker push YOUR_DOCKERHUB_USER/chatterbox-tts:serverless
   ```

2. **Create endpoint with exact settings:**
   - Go to https://www.runpod.io/console/serverless
   - Click "New Endpoint"
   
   **Critical Settings:**
   - Name: `chatterbox-tts`
   - Docker Image: `YOUR_DOCKERHUB_USER/chatterbox-tts:serverless`
   - GPU: **RTX 3060 (12GB)** ⭐ Minimum
   - **Min Workers: 0** ⚠️ Required for scale-to-zero
   - **Max Workers: 3** (adjust for load)
   - **Idle Timeout: 10-30 seconds** (balance cost vs warm starts)
   - **Execution Timeout: 600 seconds** (10 min max)
   
   - Click "Deploy"

3. **Test synchronous (runsync):**
   ```bash
   export RUNPOD_ENDPOINT_ID=your-endpoint-id
   export RUNPOD_API_KEY=your-api-key
   
   # Quick test
   curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
     -H "Authorization: Bearer $RUNPOD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "input": {
         "text": "Serverless test successful",
         "format": "mp3"
       }
     }' | jq .
   ```

4. **Test asynchronous (run + polling):**
   ```bash
   # Submit async job
   RESPONSE=$(curl -s -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/run \
     -H "Authorization: Bearer $RUNPOD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"input": {"text": "Async test", "format": "mp3"}}')
   
   JOB_ID=$(echo $RESPONSE | jq -r '.id')
   echo "Job ID: $JOB_ID"
   
   # Poll for status
   curl https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/status/$JOB_ID \
     -H "Authorization: Bearer $RUNPOD_API_KEY" | jq .
   ```

5. **Use example scripts:**
   ```bash
   cd services/chatterbox_tts/examples
   
   # Full test suite (bash)
   ./runpod_serverless.sh
   
   # Python client
   ./runpod_serverless.py
   ```

---

## Step 5: Integration with Your App

### Example: Replace Google Cloud TTS

Currently, your podcast generation uses Google Cloud TTS. To switch to Chatterbox:

**Before (Google Cloud TTS):**
```typescript
// supabase/functions/podcast_generate_audio/index.ts
const ttsResponse = await fetch(
  "https://texttospeech.googleapis.com/v1/text:synthesize",
  { ... }
);
```

**After (Chatterbox TTS):**
```typescript
// Point to your RunPod endpoint
const ttsResponse = await fetch(
  "https://abc123-8000.proxy.runpod.net/tts",
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: segment.text,
      format: 'mp3'
    })
  }
);
const audioBlob = await ttsResponse.blob();
```

---

## Troubleshooting

### "No module named 'chatterbox'"

**Problem:** Submodule not initialized

**Solution:**
```bash
git submodule update --init --recursive
```

### Docker build fails on "COPY external/chatterbox"

**Problem:** Building from wrong directory

**Solution:**
```bash
# Build from repo root, not from services/chatterbox_tts/
cd /Users/danielntumba/smrtr
docker build -f services/chatterbox_tts/Dockerfile -t chatterbox-tts:gpu .
```

### "Model not loaded" in health check

**Problem:** CUDA/GPU not available, or model download failed

**Solution:**
- Check Docker logs: `docker logs <container_id>`
- Verify GPU: `docker run --gpus all nvidia/cuda:12.1.0-base nvidia-smi`
- Try CPU image first: `Dockerfile.cpu`

### Generation takes >10 seconds

**Problem:** Running on CPU (slow) or cold start

**Solution:**
- Use GPU: `docker run --gpus all ...`
- For RunPod Pods: Ensure GPU is attached
- For Serverless: First request is slow (cold start ~10s), subsequent requests ~1-2s

---

## Cost Analysis

### Google Cloud TTS (Current)
- **Cost**: $16 per 1M characters
- **Free Tier**: 1M chars/month
- **Your Usage**: ~8,000 chars per podcast = $0.13 each

### Chatterbox TTS on RunPod
- **Pods (RTX 3060)**: $0.24/hr = $175/month (24/7, always-on)
- **Serverless (RTX 3060)**: ~$0.00012/sec = ~$0.20-0.40 per request (1-3s)
  - 100 requests/month = **$20-40/month**
  - 1000 requests/month = **$200-400/month**
  - **Idle cost: $0** (true scale-to-zero)

**Break-even point:** ~2,400 requests/month

**Recommendation:**
- **<100/month**: Google Cloud TTS (free tier)
- **100-2,400/month**: RunPod Serverless (scale-to-zero)
- **>2,400/month**: RunPod Pods (always-on)

---

## Next Steps

✅ Service deployed  
⏳ Add voice cloning presets  
⏳ Integrate with podcast generation  
⏳ Set up monitoring/alerts  
⏳ Add CI/CD pipeline  

---

## Support

- **Chatterbox Issues**: https://github.com/resemble-ai/chatterbox/issues
- **RunPod Discord**: https://discord.gg/runpod
- **This Service**: Open an issue in your repo

---

**Questions?** Check the main [README.md](./README.md) for detailed docs.
