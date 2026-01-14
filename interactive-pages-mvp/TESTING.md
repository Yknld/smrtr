# Testing Guide

## Quick Start (No API Keys Required)

Enable test mode to use mock services that simulate the full pipeline without calling real APIs.

### 1. Set Environment Variable

```bash
export TEST_MODE=true
```

Or add to your `.env` file:
```
TEST_MODE=true
```

### 2. Start the Server

```bash
./start.sh
# Or: python api/server.py
```

### 3. Test the API

**Generate an interactive page:**
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
  "generation_id": "abc123..."
}
```

**Check status:**
```bash
curl http://localhost:5002/interactive/status/{generation_id}
```

**When done, you'll get:**
```json
{
  "status": "done",
  "preview_url": "file:///path/to/generated/{generation_id}.html",
  "source_url": "file:///path/to/generated/{generation_id}.html"
}
```

### 4. View Generated HTML

The HTML file is saved in the `generated/` directory. Open it in your browser:

```bash
open generated/{generation_id}.html
# Or on Linux:
xdg-open generated/{generation_id}.html
```

## What Mock Services Do

- **MockGeminiService**: Returns a realistic sample JSON spec matching your schema
- **MockRunPodService**: Generates a complete HTML file with all required features
- **MockGitHubService**: Saves HTML locally instead of publishing to GitHub

## Full Test Script

```bash
#!/bin/bash
export TEST_MODE=true

# Start server in background
python api/server.py &
SERVER_PID=$!
sleep 2

# Generate
RESPONSE=$(curl -s -X POST http://localhost:5002/interactive/generate \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "lesson_1", "mode": "new"}')

GENERATION_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['generation_id'])")

echo "Generation ID: $GENERATION_ID"

# Poll until done
while true; do
  STATUS=$(curl -s http://localhost:5002/interactive/status/$GENERATION_ID)
  STATUS_VAL=$(echo $STATUS | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
  
  echo "Status: $STATUS_VAL"
  
  if [ "$STATUS_VAL" == "done" ]; then
    PREVIEW_URL=$(echo $STATUS | python3 -c "import sys, json; print(json.load(sys.stdin)['preview_url'])")
    echo "✅ Done! Preview: $PREVIEW_URL"
    break
  elif [ "$STATUS_VAL" == "failed" ]; then
    echo "❌ Failed!"
    break
  fi
  
  sleep 1
done

# Cleanup
kill $SERVER_PID
```

## Testing Features

With `TEST_MODE=true`, you can test:
- ✅ Full generation pipeline
- ✅ Status polling
- ✅ HTML validation
- ✅ Error handling
- ✅ All API endpoints

**Note:** Mock services are simplified but functional. For production testing, use real API keys.
