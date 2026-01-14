# Quick Test Guide

## Step 1: Start the Server

Run the test script (easiest way):

```bash
cd interactive-pages-mvp
./test_local.sh
```

Or manually:

```bash
cd interactive-pages-mvp
export TEST_MODE=true
python api/server.py
```

You should see:
```
🧪 TEST MODE ENABLED - Using mock services
✅ Mock services initialized (TEST_MODE)
Starting Interactive Pages API server on port 5002
```

## Step 2: Test in Another Terminal

Open a new terminal and run:

```bash
# Generate an interactive page
curl -X POST http://localhost:5002/interactive/generate \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "lesson_1", "mode": "new"}'
```

You'll get back a `generation_id` like:
```json
{"generation_id": "abc123-def456-..."}
```

## Step 3: Check Status

Use the generation_id from above:

```bash
curl http://localhost:5002/interactive/status/{generation_id}
```

Keep checking until status is `"done"` (takes a few seconds in test mode).

## Step 4: View the HTML

When status is `"done"`, the HTML file is saved in:
```
interactive-pages-mvp/generated/{generation_id}.html
```

Open it in your browser:
```bash
open generated/{generation_id}.html
```

## All-in-One Test Script

```bash
# Start server in background
cd interactive-pages-mvp
export TEST_MODE=true
python api/server.py &
sleep 2

# Generate
RESPONSE=$(curl -s -X POST http://localhost:5002/interactive/generate \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "lesson_1"}')

GEN_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['generation_id'])")
echo "Generation ID: $GEN_ID"

# Poll status
sleep 3
curl http://localhost:5002/interactive/status/$GEN_ID
```
