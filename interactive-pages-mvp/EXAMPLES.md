# Example Usage

## cURL Commands

### 1. Generate Interactive Page

```bash
curl -X POST http://localhost:5002/interactive/generate \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "lesson_1",
    "mode": "new"
  }'
```

**Response:**
```json
{
  "generation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 2. Poll for Status

```bash
curl http://localhost:5002/interactive/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response (while processing):**
```json
{
  "status": "building"
}
```

**Response (when done):**
```json
{
  "status": "done",
  "preview_url": "https://your-org.github.io/pages-repo/pages/a1b2c3d4-e5f6-7890-abcd-ef1234567890/",
  "source_url": "https://github.com/your-org/pages-repo/blob/main/pages/a1b2c3d4-e5f6-7890-abcd-ef1234567890/index.html"
}
```

**Response (if failed):**
```json
{
  "status": "failed",
  "error": "Validation failed: HTML size (2.1 MB) exceeds 1.5 MB limit"
}
```

### 3. Health Check

```bash
curl http://localhost:5002/health
```

**Response:**
```json
{
  "status": "ok",
  "services": {
    "gemini": true,
    "runpod": true,
    "github": true
  }
}
```

## Python Example

```python
import requests
import time

# Generate
response = requests.post("http://localhost:5002/interactive/generate", json={
    "lesson_id": "lesson_1",
    "mode": "new"
})
generation_id = response.json()["generation_id"]
print(f"Generation started: {generation_id}")

# Poll until done
while True:
    status_response = requests.get(f"http://localhost:5002/interactive/status/{generation_id}")
    status = status_response.json()
    
    print(f"Status: {status['status']}")
    
    if status["status"] == "done":
        print(f"✅ Preview: {status['preview_url']}")
        break
    elif status["status"] == "failed":
        print(f"❌ Error: {status.get('error')}")
        break
    
    time.sleep(2)
```

## Status Values

- `queued` - Job created, waiting to start
- `spec` - Generating JSON spec with Gemini
- `building` - Generating HTML with OpenHands
- `publishing` - Publishing to GitHub
- `done` - Complete, URLs available
- `failed` - Error occurred, check `error` field
