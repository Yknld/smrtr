# Deploy to RunPod Without Local Docker

**Skip local testing, deploy directly using GitHub Actions + RunPod**

---

## Overview

This guide shows how to build your Docker image in the cloud (GitHub Actions) and deploy directly to RunPod, bypassing local Docker entirely.

**Timeline:** 30-40 minutes total

---

## Prerequisites

1. ✅ GitHub account
2. ✅ Docker Hub account (free)
3. ✅ RunPod account

---

## Step 1: Set Up Docker Hub (5 minutes)

### Create Docker Hub Account

1. Go to: https://hub.docker.com/signup
2. Sign up (free account is fine)
3. Verify your email
4. Note your username (e.g., `yourname`)

### Create Access Token

1. Go to: https://hub.docker.com/settings/security
2. Click **"New Access Token"**
3. Description: `GitHub Actions - Chatterbox TTS`
4. Access permissions: **Read, Write, Delete**
5. Click **"Generate"**
6. **Copy the token** (you won't see it again!)
7. Save it somewhere safe temporarily

---

## Step 2: Add Secrets to GitHub (2 minutes)

1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/YOUR_REPO`
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **"New repository secret"**

**Add these two secrets:**

**Secret 1:**
- Name: `DOCKERHUB_USERNAME`
- Value: Your Docker Hub username (e.g., `yourname`)
- Click **"Add secret"**

**Secret 2:**
- Name: `DOCKERHUB_TOKEN`
- Value: Paste the access token you copied
- Click **"Add secret"**

---

## Step 3: Push GitHub Actions Workflow (2 minutes)

```bash
cd /Users/danielntumba/smrtr

# Add the workflow file
git add .github/workflows/build-chatterbox-tts.yml

# Commit
git commit -m "Add GitHub Actions workflow for Docker builds"

# Push to GitHub
git push origin main
```

**This will automatically trigger a build!**

---

## Step 4: Monitor the Build (10-15 minutes)

### Watch Build Progress

1. Go to your GitHub repo
2. Click **"Actions"** tab (top)
3. You should see **"Build Chatterbox TTS Docker Images"** running
4. Click on it to see progress

**Expected timeline:**
- Checkout code: 10s
- Build serverless image: 8-12 minutes
- Build GPU image: 8-12 minutes
- **Total: 10-15 minutes** (both run in parallel)

### Verify Success

When complete, you should see:
- ✅ Green checkmarks on both jobs
- ✅ "Serverless image pushed successfully!"
- ✅ "GPU image pushed successfully!"

### Check Docker Hub

1. Go to: `https://hub.docker.com/r/YOUR_USERNAME/chatterbox-tts`
2. You should see two tags:
   - `serverless` (for RunPod Serverless)
   - `latest` or `gpu` (for RunPod Pods)

---

## Step 5: Deploy to RunPod Serverless (5 minutes)

### Create Serverless Endpoint

1. Go to: https://www.runpod.io/console/serverless
2. Click **"New Endpoint"**

**Settings:**

| Setting | Value |
|---------|-------|
| **Name** | `chatterbox-tts` |
| **Docker Image** | `YOUR_DOCKERHUB_USERNAME/chatterbox-tts:serverless` |
| **GPU Type** | **RTX 3060** (12GB) |
| **Min Workers** | **0** |
| **Max Workers** | **3** |
| **Idle Timeout** | **20 seconds** |
| **Execution Timeout** | **600 seconds** |

3. Click **"Deploy"**
4. Wait 2-3 minutes for deployment

### Get Credentials

After deployment, note:
- **Endpoint ID**: Shows in dashboard (e.g., `abc123xyz`)
- **API Key**: Go to **Settings** → **API Keys** → Copy

```bash
# Save these for testing
export RUNPOD_ENDPOINT_ID=your-endpoint-id
export RUNPOD_API_KEY=your-api-key
```

---

## Step 6: Test Your Deployment (2 minutes)

### Test Synchronous Endpoint

```bash
curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello from RunPod serverless!",
      "format": "mp3"
    }
  }' | jq .
```

**Expected response:**
```json
{
  "id": "sync-abc123",
  "status": "COMPLETED",
  "output": {
    "audio_base64": "//uQxAAA...",
    "mimetype": "audio/mpeg",
    "cache_hit": false,
    "device": "cuda",
    "generation_time_ms": 1234
  }
}
```

### Run Full Test Suite

```bash
cd /Users/danielntumba/smrtr/services/chatterbox_tts/examples

# Set credentials
export RUNPOD_ENDPOINT_ID=your-endpoint-id
export RUNPOD_API_KEY=your-api-key

# Run tests
./runpod_serverless.sh
```

**Expected:**
- ✅ Test 1: Synchronous request
- ✅ Test 2: Asynchronous with polling
- ✅ Test 3: Cache test
- ✅ Test 4: Paralinguistic tags

---

## Alternative: Deploy to RunPod Pods (Always-On)

If you prefer always-on deployment:

1. Go to: https://www.runpod.io/console/pods
2. Click **"Deploy"**
3. **Settings:**
   - GPU: **RTX 3060** or better
   - Container Image: `YOUR_DOCKERHUB_USERNAME/chatterbox-tts:latest`
   - Expose HTTP Ports: **8000**
   - Volume: 20GB (optional)
4. Click **"Deploy"**
5. Get Pod URL (e.g., `https://abc123-8000.proxy.runpod.net`)

**Test:**
```bash
# Health check
curl https://abc123-8000.proxy.runpod.net/health

# Generate audio
curl -X POST https://abc123-8000.proxy.runpod.net/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Testing Pods deployment", "format": "mp3"}' \
  --output test.mp3
```

---

## Troubleshooting

### GitHub Actions Build Fails

**Check logs:**
1. Go to GitHub → Actions → Click on failed workflow
2. Expand failed step
3. Look for error message

**Common issues:**

**"Submodule not initialized"**
```yaml
# Workflow already has this, but verify:
with:
  submodules: recursive
```

**"Docker Hub authentication failed"**
- Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets
- Regenerate token if needed

**"Build timeout"**
- Increase GitHub Actions timeout (default 6 hours is fine)
- Check if Chatterbox submodule is accessible

### RunPod Deployment Issues

**"Image not found"**
- Check image name matches: `YOUR_USERNAME/chatterbox-tts:serverless`
- Verify image is public on Docker Hub (Settings → Make Public)

**"Cold start timeout"**
- First request can take 2-3s (with baked-in weights)
- Subsequent requests ~1-2s
- This is normal!

**"GPU out of memory"**
- Use RTX 3060 (12GB) minimum
- Chatterbox-Turbo needs 4-6GB VRAM

---

## Cost Summary

### GitHub Actions
- **Free tier**: 2000 minutes/month
- **Build time**: ~15 minutes per push
- **Your usage**: ~100 minutes/month (6-7 pushes)
- **Cost**: **$0** (within free tier)

### Docker Hub
- **Free tier**: Unlimited public images
- **Your usage**: 2 images (~8GB each)
- **Cost**: **$0**

### RunPod Serverless
- **Compute**: ~$0.00012/second
- **Idle**: **$0** (min workers = 0)
- **100 requests/day**: ~$7/month
- **1000 requests/day**: ~$72/month

**Total cost to deploy and test:** **$0**

---

## Updating Your Service

When you make changes:

```bash
cd /Users/danielntumba/smrtr

# Make your changes to code
# e.g., edit services/chatterbox_tts/runpod/handler.py

# Commit and push
git add services/chatterbox_tts/
git commit -m "Update TTS handler"
git push origin main

# GitHub Actions automatically rebuilds and pushes new image
# Wait ~15 minutes for build
# RunPod will automatically use new image on next cold start
```

---

## Next Steps

1. ✅ **Service deployed** - Your TTS API is live!
2. ⏳ **Integrate with podcast generation** - Update Supabase Edge Function
3. ⏳ **Add monitoring** - Track usage in RunPod dashboard
4. ⏳ **Set up alerts** - RunPod webhook notifications

---

## Integration Example

Update your podcast generation function:

```typescript
// supabase/functions/podcast_generate_audio/index.ts

const RUNPOD_ENDPOINT_ID = Deno.env.get("RUNPOD_ENDPOINT_ID") ?? "";
const RUNPOD_API_KEY = Deno.env.get("RUNPOD_API_KEY") ?? "";

async function generateTTS(text: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text, format: 'mp3' }
      })
    }
  );
  
  const result = await response.json();
  const audioBase64 = result.output.audio_base64;
  return Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer;
}
```

**Set Supabase secrets:**
```bash
supabase secrets set RUNPOD_ENDPOINT_ID=your-endpoint-id
supabase secrets set RUNPOD_API_KEY=your-api-key
```

---

## Summary

✅ **No local Docker needed**  
✅ **Automated builds** via GitHub Actions  
✅ **Free to build and deploy** (within free tiers)  
✅ **Production-ready** serverless TTS  
✅ **Scale-to-zero** ($0 idle cost)  

**Total time:** 30-40 minutes from start to deployed API

**Questions?** Check the [README](./README.md) or [RUNPOD_SERVERLESS_GUIDE](./RUNPOD_SERVERLESS_GUIDE.md).
