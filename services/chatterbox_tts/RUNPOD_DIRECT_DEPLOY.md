# RunPod Direct Deployment Guide

## ✅ Image Successfully Built and Pushed!

**Docker Hub Images:**
- `yknld/chatterbox-tts:latest` (for Pods)
- `yknld/chatterbox-tts:serverless` (for Serverless)

Both tags point to the same image, just use the appropriate one for your deployment type.

---

## 🚀 Option 1: RunPod Serverless (Recommended)

**Best for:** Pay-per-second pricing, automatic scaling, zero cost when idle

### Step-by-Step Setup:

1. **Go to RunPod Serverless Console:**
   ```
   https://www.runpod.io/console/serverless
   ```

2. **Click "New Endpoint"**

3. **Configure Endpoint:**

   | Setting | Value |
   |---------|-------|
   | **Name** | `chatterbox-tts` |
   | **Select GPU** | RTX 3060 (12GB, cheapest option) |
   | **Container Image** | `yknld/chatterbox-tts:serverless` |
   | **Container Start Command** | `python3 -u /app/runpod/handler.py` |

4. **Worker Configuration:**

   | Setting | Value | Reason |
   |---------|-------|--------|
   | **Min Workers** | `0` | Scale to zero when idle |
   | **Max Workers** | `3` | Handle burst traffic |
   | **Idle Timeout** | `30` seconds | Keep warm for 30s after last request |
   | **Execution Timeout** | `600` seconds | Max 10 min per request |
   | **GPUs per Worker** | `1` | One GPU per instance |

5. **Environment Variables:**

   ```env
   DEVICE=cuda
   CACHE_DIR=/runpod-volume/tts_cache
   MODEL_CACHE_DIR=/runpod-volume/models
   MAX_CHARS_PER_CHUNK=500
   ```

6. **Advanced Options:**

   | Setting | Value |
   |---------|-------|
   | **Container Disk** | `10 GB` |
   | **Volume Size** | `10 GB` (optional, for persistent cache) |

7. **Click "Deploy"**

8. **Wait 2-3 minutes** for deployment to complete

9. **Copy your Endpoint ID** (looks like: `abc123def456`)

---

## 📝 Testing Your Serverless Endpoint

### Get Your API Key:

1. Go to: https://www.runpod.io/console/user/settings
2. Copy your API Key

### Test with curl:

```bash
export RUNPOD_API_KEY="your_api_key_here"
export ENDPOINT_ID="your_endpoint_id_here"

# Synchronous request (waits for result)
curl -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is a test of the Chatterbox TTS service.",
      "voice": "default",
      "format": "mp3",
      "speed": 1.0
    }
  }'
```

### Test with Python:

```bash
cd services/chatterbox_tts/examples
export RUNPOD_API_KEY="your_api_key"
export ENDPOINT_ID="your_endpoint_id"
python3 test_runpod_serverless.py
```

### Test with Bash:

```bash
cd services/chatterbox_tts/examples
export RUNPOD_API_KEY="your_api_key"
export ENDPOINT_ID="your_endpoint_id"
bash test_runpod_serverless.sh
```

---

## 🖥️ Option 2: RunPod Pods (Always-On)

**Best for:** Consistent low-latency, high-volume usage, development

### Step-by-Step Setup:

1. **Go to RunPod Pods Console:**
   ```
   https://www.runpod.io/console/pods
   ```

2. **Click "Deploy"** or "GPU Pods"

3. **Select GPU:**
   - RTX 3060 (12GB) - cheapest, works great
   - RTX 3090 (24GB) - faster, overkill for TTS
   - RTX 4090 (24GB) - fastest, expensive

4. **Configure Pod:**

   | Setting | Value |
   |---------|-------|
   | **Template** | Custom (or create new template) |
   | **Container Image** | `yknld/chatterbox-tts:latest` |
   | **Container Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
   | **Expose HTTP Ports** | `8000` |
   | **Volume Size** | `10 GB` (optional) |

5. **Environment Variables:**

   ```env
   DEVICE=cuda
   CACHE_DIR=/workspace/tts_cache
   MODEL_CACHE_DIR=/workspace/models
   MAX_CHARS_PER_CHUNK=500
   DEFAULT_FORMAT=mp3
   ```

6. **Click "Deploy"**

7. **Wait 3-5 minutes** for pod to start and model to load

8. **Copy your Pod URL** (looks like: `https://abc123-8000.proxy.runpod.net`)

---

## 📝 Testing Your Pod

### Health Check:

```bash
export POD_URL="https://your-pod-id-8000.proxy.runpod.net"

curl "${POD_URL}/health"
```

**Expected Response:**
```json
{
  "ok": true,
  "model_loaded": true,
  "device": "cuda"
}
```

### Generate Audio:

```bash
curl -X POST "${POD_URL}/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello! This is a test of the Chatterbox TTS service.",
    "format": "mp3",
    "speed": 1.0
  }' \
  --output test.mp3
```

### Test with Examples:

```bash
cd services/chatterbox_tts/examples

# Edit curl.sh and set POD_URL
export TTS_URL="${POD_URL}"
bash curl.sh

# Or use Python
python3 test.py
```

---

## 🔄 API Reference

### Serverless Input Payload:

```json
{
  "input": {
    "text": "string (required)",
    "voice": "default|string (optional)",
    "language": "en|string (optional)",
    "format": "mp3|wav (default: mp3)",
    "speed": "number (optional, 0.5-2.0)",
    "seed": "number (optional, for reproducibility)"
  }
}
```

### Serverless Output:

```json
{
  "id": "job-id",
  "status": "COMPLETED",
  "output": {
    "audio_base64": "base64-encoded-audio-bytes",
    "mimetype": "audio/mpeg",
    "duration_ms": 1234,
    "cache_hit": false,
    "cache_key": "sha256-hash",
    "chunks_processed": 1,
    "generation_time_ms": 1200
  }
}
```

### Pods Endpoint (FastAPI):

**GET** `/health`
- Returns: `{ ok: bool, model_loaded: bool, device: string }`

**POST** `/tts`
- Input: Same as serverless `input` object
- Output: Audio bytes (binary)
- Headers:
  - `Content-Type: audio/mpeg` or `audio/wav`
  - `X-Duration-Ms: 1234`
  - `X-Model: chatterbox-turbo`
  - `X-Voice: default`
  - `X-Cache-Hit: true|false`

---

## 💰 Cost Estimates

### Serverless (Pay per second):

| GPU | Cost/sec | 10sec request | 100 requests/day |
|-----|----------|---------------|------------------|
| RTX 3060 | $0.00025 | $0.0025 | $0.25/day |
| RTX 3090 | $0.00045 | $0.0045 | $0.45/day |

**+ Idle time:** 30sec timeout = ~30-60sec billed per cold start

### Pods (Always-on):

| GPU | Cost/hour | Cost/day | Cost/month |
|-----|-----------|----------|------------|
| RTX 3060 | ~$0.30 | ~$7.20 | ~$216 |
| RTX 3090 | ~$0.50 | ~$12.00 | ~$360 |

**Recommendation:**
- **Development:** Use Pods for instant response
- **Production (low/medium traffic):** Use Serverless for cost savings
- **Production (high traffic):** Use Pods if cost-per-request is lower

---

## 🐛 Troubleshooting

### Serverless Cold Start Times:

**First request:** 60-120 seconds (model download + load)
**After warm:** 2-5 seconds (model already loaded)
**Cache hits:** <500ms (audio already generated)

**To reduce cold starts:**
- Set idle timeout to 60-300 seconds (keeps warm longer)
- Set min workers to 1 (always have one ready, but costs money)
- Use RunPod's "Keep Warm" feature (beta)

### Pod Not Starting:

1. Check logs in RunPod console
2. Common issues:
   - Image not found: verify `yknld/chatterbox-tts:latest` is public
   - Out of memory: try smaller GPU or increase volume size
   - Model download failed: check network, try restarting pod

### Model Loading Errors:

```bash
# Check logs
# If you see "CUDA out of memory", try:
- Reducing MAX_CHARS_PER_CHUNK to 300
- Using a GPU with more VRAM (3090/4090)
```

### Audio Quality Issues:

- Default model is Chatterbox-Turbo (fast, good quality)
- For better quality, modify handler to use standard Chatterbox
- Adjust `speed` parameter (0.8-1.2 recommended range)

---

## 🔐 Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** for credentials
3. **Restrict API key permissions** in RunPod settings
4. **Monitor usage** to detect abuse
5. **Set execution timeout** to prevent runaway costs

---

## 📊 Performance Tips

1. **Enable caching:** Already implemented, no action needed
2. **Batch requests:** Send multiple TTS requests in parallel
3. **Use appropriate format:** MP3 is smaller than WAV (faster transfer)
4. **Chunk long text:** Already implemented (500 chars/chunk)
5. **Warm up serverless:** Send a dummy request before peak traffic

---

## 🎯 Next Steps

1. ✅ Deploy to RunPod Serverless or Pods
2. ✅ Test with provided examples
3. ✅ Integrate into your application
4. ✅ Monitor costs and performance
5. ✅ Scale as needed

---

## 📞 Support

- **RunPod Docs:** https://docs.runpod.io
- **Chatterbox GitHub:** https://github.com/resemble-ai/chatterbox
- **Issues:** Create an issue in your repo

---

**You're all set! 🚀 Your Chatterbox TTS service is ready to deploy!**
