# Chatterbox TTS Headless Service

A production-ready FastAPI service for deploying [Chatterbox-Turbo](https://github.com/resemble-ai/chatterbox) TTS on RunPod.

## Features

✅ **FastAPI REST API** - `/health` and `/tts` endpoints  
✅ **GPU + CPU Support** - Automatic device detection  
✅ **Caching** - File + memory cache for repeated requests  
✅ **Text Chunking** - Handles long text by splitting at sentence boundaries  
✅ **Multiple Formats** - MP3 (default) or WAV output  
✅ **RunPod Ready** - Optimized for Pods and Serverless  
✅ **Docker Images** - GPU (CUDA 12.1) and CPU variants  
✅ **Voice Cloning** - Optional reference audio for custom voices  
✅ **Paralinguistic Tags** - `[laugh]`, `[chuckle]`, `[cough]` support  

---

## Quick Start

### 1. Initialize Submodule

The Chatterbox library is included as a git submodule. Initialize it first:

```bash
# From repo root
cd /Users/danielntumba/smrtr

# Initialize submodules
git submodule update --init --recursive
```

### 2. Local Testing (CPU)

For testing without a GPU:

```bash
# Build CPU image
docker build -f services/chatterbox_tts/Dockerfile.cpu -t chatterbox-tts:cpu .

# Run locally
docker run -p 8000:8000 chatterbox-tts:cpu

# Test
curl http://localhost:8000/health
```

### 3. Local Testing (GPU)

Requires NVIDIA Docker runtime:

```bash
# Build GPU image
docker build -f services/chatterbox_tts/Dockerfile -t chatterbox-tts:gpu .

# Run with GPU
docker run --gpus all -p 8000:8000 chatterbox-tts:gpu

# Test
curl http://localhost:8000/health
```

---

## API Documentation

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "model_loaded": true,
  "device": "cuda",
  "cache_size": 12,
  "cuda_available": true
}
```

### POST `/tts`

Generate speech from text.

**Request:**
```json
{
  "text": "Hi there, Sarah here [chuckle], have you got one minute to chat?",
  "voice": null,
  "language": "en",
  "format": "mp3",
  "speed": 1.0,
  "seed": null
}
```

**Parameters:**
- `text` (string, required): Text to synthesize (1-5000 chars)
- `voice` (string, optional): Path to reference audio file for voice cloning
- `language` (string, default: "en"): Language code (Turbo only supports English)
- `format` (string, default: "mp3"): Output format (`mp3` or `wav`)
- `speed` (float, default: 1.0): Speed multiplier (0.5 - 2.0)
- `seed` (int, optional): Random seed for reproducibility

**Response:**
Returns audio bytes with headers:
- `Content-Type`: `audio/mpeg` or `audio/wav`
- `X-Duration-Ms`: Generation time in milliseconds
- `X-Model`: `chatterbox-turbo`
- `X-Voice`: Voice used (default or custom)
- `X-Cache-Hit`: `true` if served from cache
- `X-Device`: `cuda` or `cpu`

**Example:**
```bash
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of Chatterbox TTS.",
    "format": "mp3"
  }' \
  --output test.mp3
```

---

## RunPod Deployment

### Option 1: RunPod Pods (Persistent GPU)

**Best for:** High-volume, always-on TTS service

#### Step 1: Build and Push Image

```bash
# From repo root
cd /Users/danielntumba/smrtr

# Build GPU image
docker build -f services/chatterbox_tts/Dockerfile -t your-dockerhub-user/chatterbox-tts:latest .

# Push to Docker Hub
docker push your-dockerhub-user/chatterbox-tts:latest
```

#### Step 2: Deploy on RunPod

1. Go to [RunPod Console](https://www.runpod.io/)
2. Click **Deploy** → **Pods**
3. Select GPU:
   - **Recommended**: RTX 3060 (12GB), RTX 3090 (24GB), RTX 4090 (24GB)
   - **Minimum**: RTX 3060 or A4000 (12GB VRAM)
4. Configure:
   - **Docker Image**: `your-dockerhub-user/chatterbox-tts:latest`
   - **Exposed Port**: `8000` → HTTP
   - **Volume**: Optional, 20GB for caching
5. Click **Deploy**

#### Step 3: Test Your Deployment

```bash
# Get your Pod URL from RunPod dashboard (e.g., https://xyz-8000.proxy.runpod.net)

# Health check
curl https://xyz-8000.proxy.runpod.net/health

# Generate audio
curl -X POST https://xyz-8000.proxy.runpod.net/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Testing RunPod deployment"}' \
  --output test.mp3
```

---

### Option 2: RunPod Serverless (True Scale-to-Zero)

**Best for:** Intermittent usage, pay-per-second, true scale-to-zero

**Key Features:**
- ✅ Model weights baked into image (fast cold start ~2-3s)
- ✅ Scales to zero workers when idle (no cost)
- ✅ Persistent cache on /runpod-volume
- ✅ Supports both sync (runsync) and async (run) endpoints

#### Step 1: Build Serverless Image

```bash
# Build serverless image (includes model download at build time)
docker build -f services/chatterbox_tts/Dockerfile.serverless -t your-dockerhub-user/chatterbox-tts:serverless .

# Push to Docker Hub
docker push your-dockerhub-user/chatterbox-tts:serverless
```

**Note:** Build takes ~10 minutes as it downloads model weights (~2GB) and bakes them into the image. This reduces cold start time from ~15s to ~2-3s.

#### Step 2: Create Serverless Endpoint

1. Go to [RunPod Serverless](https://www.runpod.io/console/serverless)
2. Click **New Endpoint**
3. **Exact Settings:**

| Setting | Value | Notes |
|---------|-------|-------|
| **Name** | `chatterbox-tts` | Your choice |
| **Docker Image** | `your-dockerhub-user/chatterbox-tts:serverless` | Your pushed image |
| **GPU Type** | **RTX 3060** (12GB) | ⭐ Recommended minimum |
| **Min Workers** | **0** | ⚠️ Critical for scale-to-zero |
| **Max Workers** | **3** | Adjust based on load |
| **Idle Timeout** | **10-30 seconds** | Balance cost vs warm starts |
| **Execution Timeout** | **600 seconds** | Max time per request (10 min) |
| **Active Workers** | **0** | Initial state |

4. Click **Deploy**

**Cost:** ~$0.00012/second = ~$0.20-0.40 per request (1-3s typical)

#### Step 3: Test Serverless (Synchronous)

Use `runsync` for requests that need immediate response (max 90s):

```bash
# Set your credentials
export RUNPOD_ENDPOINT_ID=your-endpoint-id
export RUNPOD_API_KEY=your-api-key

# Synchronous request
curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Testing serverless deployment",
      "format": "mp3",
      "speed": 1.0,
      "seed": null
    }
  }'
```

**Response (Success):**
```json
{
  "id": "sync-abc123",
  "status": "COMPLETED",
  "output": {
    "audio_base64": "//uQxAA...",
    "mimetype": "audio/mpeg",
    "size_bytes": 123456,
    "cache_hit": false,
    "cache_key": "a3f7c2d...",
    "device": "cuda",
    "chunks_processed": 1,
    "generation_time_ms": 1234
  }
}
```

**Decode audio:**
```bash
# Extract and decode audio_base64 from response
echo "AUDIO_BASE64_STRING" | base64 -d > output.mp3
```

#### Step 4: Test Serverless (Asynchronous)

Use `run` for longer requests or batch processing:

```bash
# Submit async request
RESPONSE=$(curl -s -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "This is a longer async request that demonstrates polling...",
      "format": "mp3"
    }
  }')

# Extract job ID
JOB_ID=$(echo $RESPONSE | jq -r '.id')
echo "Job ID: $JOB_ID"

# Poll for status
curl https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/status/$JOB_ID \
  -H "Authorization: Bearer $RUNPOD_API_KEY"
```

**Status Response:**
```json
{
  "id": "job-xyz",
  "status": "COMPLETED",  // or "IN_QUEUE", "IN_PROGRESS", "FAILED"
  "output": {
    "audio_base64": "...",
    "cache_hit": true,
    "generation_time_ms": 1234
  }
}
```

#### Step 5: Use Example Scripts

We provide complete test scripts:

```bash
cd services/chatterbox_tts/examples

# Bash script (runsync + run with polling)
export RUNPOD_ENDPOINT_ID=your-endpoint-id
export RUNPOD_API_KEY=your-api-key
./runpod_serverless.sh

# Python script (full client)
./runpod_serverless.py
```

**Example Python usage:**
```python
from examples.runpod_serverless import RunPodServerlessClient

client = RunPodServerlessClient(
    endpoint_id="your-endpoint-id",
    api_key="your-api-key"
)

# Synchronous (immediate response)
response = client.runsync(
    text="Hello world",
    format="mp3"
)
client.save_audio(response, "output.mp3")

# Asynchronous (with polling)
run_response = client.run(text="Longer text...")
job_id = run_response["id"]
final_response = client.poll_until_complete(job_id)
client.save_audio(final_response, "output.mp3")
```

---

## Environment Variables

Configure via Docker `-e` flags or in Dockerfile:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEVICE` | `auto` | Device to use (`auto`, `cuda`, `cpu`) |
| `CACHE_DIR` | `/tmp/tts_cache` | Directory for caching generated audio |
| `MODEL_CACHE_DIR` | `/models` | Directory for model weights cache |
| `MAX_CHARS_PER_CHUNK` | `500` | Max characters per chunk (for long text) |
| `DEFAULT_FORMAT` | `mp3` | Default output format |
| `DEFAULT_VOICE_PATH` | `null` | Path to default reference voice file |

**Example:**
```bash
docker run -p 8000:8000 \
  -e DEVICE=cuda \
  -e MAX_CHARS_PER_CHUNK=1000 \
  -e DEFAULT_FORMAT=wav \
  chatterbox-tts:gpu
```

---

## Performance & Optimization

### GPU Recommendations

| GPU | VRAM | Performance | Cost/hr |
|-----|------|-------------|---------|
| RTX 3060 | 12GB | ~2s per request | $0.24 |
| RTX 3090 | 24GB | ~1.5s per request | $0.46 |
| RTX 4090 | 24GB | ~1s per request | $0.69 |
| A4000 | 16GB | ~2s per request | $0.41 |

### Caching

The service implements two-tier caching:

1. **File Cache** (`CACHE_DIR`): Persistent across restarts
2. **Memory Cache**: 100 most recent requests, 1-hour TTL

Cache key includes: `text + voice + language + format + speed + seed`

### Text Chunking

Long text (>500 chars default) is automatically:
1. Split at sentence boundaries
2. Generated per chunk
3. Concatenated seamlessly

Adjust `MAX_CHARS_PER_CHUNK` if needed.

---

## Voice Cloning

To use custom voices, provide a reference audio file (10-30 seconds recommended):

```json
{
  "text": "This will sound like the reference voice.",
  "voice": "/path/to/reference.wav"
}
```

**For RunPod Pods:**
- Mount a volume with voice files
- Use absolute paths in requests

**For RunPod Serverless:**
- Not easily supported (use default voice or pre-bake voices into image)

---

## Paralinguistic Tags

Chatterbox-Turbo natively supports expressive tags:

```json
{
  "text": "Hi there [chuckle], I was wondering [pause] if you have a moment?"
}
```

**Supported tags:**
- `[laugh]`
- `[chuckle]`
- `[cough]`
- `[pause]`

---

## Example Requests

See [`examples/`](./examples/) directory for complete test suites:

### For RunPod Pods (Always-On)
- `request.json` - Sample API payloads for FastAPI endpoints
- `curl.sh` - Bash test suite (8 tests) for `/health` and `/tts`
- `test.py` - Python client with caching tests

### For RunPod Serverless (Scale-to-Zero)
- `runpod_serverless.sh` - Bash test suite for `runsync` and `run` endpoints
- `runpod_serverless.py` - Python client with async polling

**Quick test (Serverless):**
```bash
export RUNPOD_ENDPOINT_ID=your-endpoint-id
export RUNPOD_API_KEY=your-api-key

cd services/chatterbox_tts/examples
./runpod_serverless.sh    # Full test suite
./runpod_serverless.py     # Python client
```

---

## Troubleshooting

### Model fails to load

**Symptom:** `/health` returns `model_loaded: false`

**Solutions:**
- Check Docker logs: `docker logs <container_id>`
- Verify submodule initialized: `ls external/chatterbox/src`
- Ensure GPU available: `docker run --gpus all ...`

### Out of memory (CUDA OOM)

**Symptom:** CUDA out of memory error

**Solutions:**
- Use smaller GPU or reduce text length
- Lower `MAX_CHARS_PER_CHUNK` to 300-400
- Ensure no other processes using GPU

### Slow generation

**Symptom:** Takes >5s per request

**Solutions:**
- Verify GPU is being used: check `X-Device` header
- Check GPU utilization: `nvidia-smi` in container
- Use caching for repeated text

### Audio quality issues

**Symptom:** Distorted, robotic, or unnatural audio

**Solutions:**
- Provide a high-quality reference voice (if using voice cloning)
- Adjust `speed` parameter (0.9-1.1 is safest)
- Check input text for formatting issues

---

## Development

### Project Structure

```
services/chatterbox_tts/
├── app/
│   └── main.py                    # FastAPI server (for Pods)
├── runpod/
│   └── handler.py                 # RunPod serverless handler (scale-to-zero)
├── examples/
│   ├── request.json               # Sample payloads (Pods)
│   ├── curl.sh                    # Bash tests (Pods)
│   ├── test.py                    # Python client (Pods)
│   ├── runpod_serverless.sh       # Bash tests (Serverless)
│   └── runpod_serverless.py       # Python client (Serverless)
├── Dockerfile                     # GPU (CUDA 12.1) for Pods
├── Dockerfile.cpu                 # CPU only for testing
├── Dockerfile.serverless          # Serverless with baked-in weights
├── docker-compose.yml             # Local testing
├── requirements.txt               # Python dependencies
├── .gitignore                     # Ignore patterns
├── README.md                      # This file
├── DEPLOYMENT_GUIDE.md            # Quick start guide
└── IMPLEMENTATION_SUMMARY.md      # Technical details
```

### Local Development (Without Docker)

```bash
# From repo root
cd /Users/danielntumba/smrtr

# Create venv
python3.11 -m venv venv
source venv/bin/activate

# Install Chatterbox
pip install -e external/chatterbox

# Install requirements
pip install -r services/chatterbox_tts/requirements.txt

# Run server
cd services/chatterbox_tts
uvicorn app.main:app --reload --port 8000
```

---

## Limitations

1. **English Only**: Chatterbox-Turbo only supports English. For multilingual, use `ChatterboxMultilingualTTS` (requires code changes).
2. **Max Text Length**: 5000 characters per request (adjustable in code).
3. **Voice Cloning**: Requires reference audio file. No default built-in voices (uses model's generic voice).
4. **Watermarking**: All audio includes Resemble AI's Perth watermark (for responsible AI).
5. **Cold Start (Serverless)**: First request takes ~2-3s with baked-in weights (10-15s without). Subsequent requests ~1-2s.
6. **GPU Dependency**: CPU is very slow (RTX 3060 12GB or better recommended).
7. **RunPod Sync Timeout**: `runsync` endpoint has 90s max timeout. Use `run` (async) for longer requests.

---

## Cost Estimates (RunPod)

### Pods (Always-On)
- **RTX 3060**: $0.24/hr × 730 hrs/month = **$175/month**
- **RTX 3090**: $0.46/hr × 730 hrs/month = **$336/month**
- **Best for:** >1000 requests/day, consistent low latency

### Serverless (Pay-Per-Second, Scale-to-Zero)
- **Cold start**: ~2-3s (with baked-in weights)
- **Warm start**: ~1-2s
- **Cost**: ~$0.00012 per second (RTX 3060)
- **Example calculations:**
  - 100 requests/day × 2s each × 30 days = **$7.20/month**
  - 1000 requests/day × 2s each × 30 days = **$72/month**
- **Idle cost**: **$0** (true scale-to-zero with min workers = 0)
- **Best for:** 100-1000 requests/day, intermittent usage

### Comparison

| Volume/Day | Pods (24/7) | Serverless (2s avg) | Winner |
|------------|-------------|---------------------|--------|
| 10 | $175/mo | $0.72/mo | Serverless |
| 100 | $175/mo | $7.20/mo | Serverless |
| 500 | $175/mo | $36/mo | Serverless |
| 1000 | $175/mo | $72/mo | Serverless |
| 3000 | $175/mo | $216/mo | Pods |
| 5000 | $175/mo | $360/mo | Pods |

**Break-even:** ~2,400 requests/day

**Recommendation:** 
- **<2,400/day:** Use **Serverless** (scale-to-zero)
- **>2,400/day:** Use **Pods** (always-on)

---

## Comparison with Existing TTS

Your repo currently uses **Google Cloud TTS** for podcast generation:

| Feature | Google Cloud TTS | Chatterbox TTS |
|---------|------------------|----------------|
| Cost | $16 per 1M chars | $0.24/hr (Pod) or $0.00012/s (Serverless) |
| Voices | Neural2 presets | Voice cloning + custom |
| Latency | ~1-2s | ~1-2s (GPU) |
| Control | Limited | Paralinguistic tags, speed, seed |
| Hosting | Managed | Self-hosted (RunPod) |
| Limits | 1M free chars/month | No limits |

**When to use Chatterbox:**
- Need voice cloning or custom voices
- Want more control (tags, speed, reproducibility)
- High volume (>1M chars/month)
- Want to avoid vendor lock-in

**When to use Google Cloud TTS:**
- Low volume (<1M chars/month, free tier)
- Prefer managed service
- Don't need voice customization

---

## License

This service is a wrapper around [Chatterbox](https://github.com/resemble-ai/chatterbox), which is licensed under Apache 2.0.

---

## Support

- **Chatterbox Issues**: [GitHub Issues](https://github.com/resemble-ai/chatterbox/issues)
- **RunPod Support**: [Discord](https://discord.gg/runpod)
- **This Service**: Open an issue in your repo

---

## Next Steps

1. ✅ Submodule initialized
2. ✅ Docker images built
3. ⏳ Deploy to RunPod
4. ⏳ Integrate with existing podcast generation
5. ⏳ Add to CI/CD pipeline

Happy deploying! 🚀

