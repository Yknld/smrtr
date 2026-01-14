# 🔍 Endpoint Troubleshooting

## Your Endpoint Info:
- **Endpoint ID:** `zeo55yjgjq5b9m`
- **Name:** `wild_peach_pony`
- **Status:** Ready (but not responding)

## ⚠️ Issue: Endpoint Not Responding

The endpoint is deployed but requests are failing silently.

---

## 🔧 Required Configuration Check

Go to your RunPod endpoint and verify these settings:

### 1. Container Configuration

```bash
Container Image: yknld/chatterbox-tts:serverless  ✅ (you have this)
```

### 2. **CRITICAL:** Container Start Command

Did you set this?
```bash
python3 -u /app/runpod/handler.py
```

**If this is missing, the handler won't start!**

---

### 3. **CRITICAL:** Environment Variables

Did you add these?

```
DEVICE=cuda
CACHE_DIR=/runpod-volume/tts_cache
MODEL_CACHE_DIR=/runpod-volume/models
MAX_CHARS_PER_CHUNK=500
```

---

### 4. GPU Configuration

```
GPU: RTX 3060 (12GB)
```

---

### 5. Worker Settings

```
Min Workers: 0
Max Workers: 3
Idle Timeout: 30
Execution Timeout: 600
GPUs per Worker: 1
```

---

## 🔍 How to Check Configuration

1. Go to: https://www.runpod.io/console/serverless
2. Click on **wild_peach_pony** endpoint
3. Click the **⚙️ Edit** or **Settings** button
4. Verify all the settings above

---

## 📋 Most Common Issues:

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Missing start command** | Endpoint ready, no response | Add `python3 -u /app/runpod/handler.py` |
| **Wrong start command** | Endpoint ready, no response | Use handler.py not main.py |
| **Missing env vars** | Worker crashes | Add DEVICE=cuda, etc. |
| **Wrong image** | Worker crashes | Use `yknld/chatterbox-tts:serverless` |

---

## 🔎 Check the Logs

1. In your endpoint page, click **"Logs"** tab
2. Look for:
   - ✅ **Good:** `"Starting handler..."` or `"Loading model..."`
   - ❌ **Bad:** No logs = start command not set
   - ❌ **Bad:** Python errors = missing dependencies or env vars

---

## ✅ After Fixing Configuration:

The endpoint should show logs like:
```
INFO: Starting handler...
INFO: Loading Chatterbox-Turbo model on cuda...
INFO: Model loaded successfully
INFO: Ready to process requests
```

Then test again with:

```bash
export RUNPOD_API_KEY="rpa_AABK9E5QUCBDOT1PA924SI8O5QPP18C49Q74M1HUrvevfm"
export ENDPOINT_ID="zeo55yjgjq5b9m"

curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is a test.",
      "format": "mp3"
    }
  }' | jq '.'
```

Note: Using `/run` (async) instead of `/runsync` for first test to see if a job is created.

---

## 🆘 Next Steps:

1. **Check your endpoint configuration** (especially start command!)
2. **Check the Logs tab** for any errors
3. **Update** any missing configuration
4. **Wait 1-2 minutes** for changes to apply
5. **Test again** with the curl command above

---

Let me know what you see in the **Logs** tab!
