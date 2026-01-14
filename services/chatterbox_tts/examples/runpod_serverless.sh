#!/bin/bash
# RunPod Serverless API Examples
# Test both synchronous (runsync) and asynchronous (run) endpoints

set -e

# Configuration (replace with your values)
ENDPOINT_ID="${RUNPOD_ENDPOINT_ID:-your-endpoint-id}"
API_KEY="${RUNPOD_API_KEY:-your-api-key}"
BASE_URL="https://api.runpod.ai/v2/${ENDPOINT_ID}"

echo "=================================================="
echo "RunPod Serverless - Chatterbox TTS API Tests"
echo "=================================================="
echo "Endpoint ID: $ENDPOINT_ID"
echo "Base URL: $BASE_URL"
echo ""

# Check if API key is set
if [ "$API_KEY" = "your-api-key" ]; then
    echo "❌ Error: Please set RUNPOD_API_KEY environment variable"
    echo ""
    echo "Usage:"
    echo "  export RUNPOD_ENDPOINT_ID=your-endpoint-id"
    echo "  export RUNPOD_API_KEY=your-api-key"
    echo "  ./runpod_serverless.sh"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 1: Synchronous (runsync)"
echo "=========================================="
echo "Best for: Quick requests with immediate response"
echo "Timeout: 90 seconds (RunPod limit)"
echo ""

PAYLOAD='{
  "input": {
    "text": "This is a synchronous test of RunPod serverless.",
    "format": "mp3"
  }
}'

echo "Sending request..."
RESPONSE=$(curl -s -X POST "$BASE_URL/runsync" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "$RESPONSE" | jq .

# Extract audio if successful
if echo "$RESPONSE" | jq -e '.status == "COMPLETED"' > /dev/null; then
    echo ""
    echo "✓ Success! Decoding audio..."
    echo "$RESPONSE" | jq -r '.output.audio_base64' | base64 -d > runpod_sync.mp3
    echo "✓ Saved to: runpod_sync.mp3"
    echo ""
    echo "Response details:"
    echo "  Cache hit: $(echo "$RESPONSE" | jq -r '.output.cache_hit')"
    echo "  Device: $(echo "$RESPONSE" | jq -r '.output.device')"
    echo "  Generation time: $(echo "$RESPONSE" | jq -r '.output.generation_time_ms')ms"
    echo "  Size: $(ls -lh runpod_sync.mp3 | awk '{print $5}')"
else
    echo ""
    echo "❌ Request failed"
    echo "$RESPONSE" | jq .
fi

echo ""
echo ""
echo "=========================================="
echo "Test 2: Asynchronous (run + polling)"
echo "=========================================="
echo "Best for: Long-running requests, batch processing"
echo "No timeout limit"
echo ""

PAYLOAD='{
  "input": {
    "text": "This is an asynchronous test with a longer text to demonstrate polling. The request is queued and processed asynchronously, which is useful for batch processing or when you need to handle many requests concurrently.",
    "format": "mp3",
    "seed": 42
  }
}'

echo "Step 1: Submit async request..."
RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/run" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "$RUN_RESPONSE" | jq .

JOB_ID=$(echo "$RUN_RESPONSE" | jq -r '.id')

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
    echo "❌ Failed to submit job"
    exit 1
fi

echo ""
echo "✓ Job submitted: $JOB_ID"
echo ""
echo "Step 2: Polling for status..."

MAX_POLLS=30
POLL_INTERVAL=2
POLL_COUNT=0

while [ $POLL_COUNT -lt $MAX_POLLS ]; do
    POLL_COUNT=$((POLL_COUNT + 1))
    
    STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/status/${JOB_ID}" \
      -H "Authorization: Bearer $API_KEY")
    
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    
    echo "  Poll $POLL_COUNT: Status = $STATUS"
    
    if [ "$STATUS" = "COMPLETED" ]; then
        echo ""
        echo "✓ Job completed!"
        echo ""
        echo "Full response:"
        echo "$STATUS_RESPONSE" | jq .
        
        # Extract audio
        echo ""
        echo "Decoding audio..."
        echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64' | base64 -d > runpod_async.mp3
        echo "✓ Saved to: runpod_async.mp3"
        echo ""
        echo "Response details:"
        echo "  Cache hit: $(echo "$STATUS_RESPONSE" | jq -r '.output.cache_hit')"
        echo "  Device: $(echo "$STATUS_RESPONSE" | jq -r '.output.device')"
        echo "  Chunks: $(echo "$STATUS_RESPONSE" | jq -r '.output.chunks_processed')"
        echo "  Generation time: $(echo "$STATUS_RESPONSE" | jq -r '.output.generation_time_ms')ms"
        echo "  Size: $(ls -lh runpod_async.mp3 | awk '{print $5}')"
        
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo ""
        echo "❌ Job failed"
        echo "$STATUS_RESPONSE" | jq .
        break
    elif [ "$STATUS" = "IN_QUEUE" ] || [ "$STATUS" = "IN_PROGRESS" ]; then
        sleep $POLL_INTERVAL
    else
        echo "  Unknown status: $STATUS"
        sleep $POLL_INTERVAL
    fi
done

if [ $POLL_COUNT -ge $MAX_POLLS ]; then
    echo ""
    echo "⚠️  Timeout after $MAX_POLLS polls"
fi

echo ""
echo ""
echo "=========================================="
echo "Test 3: Cache Test (should hit cache)"
echo "=========================================="
echo "Repeating the first request - should be instant"
echo ""

PAYLOAD='{
  "input": {
    "text": "This is a synchronous test of RunPod serverless.",
    "format": "mp3"
  }
}'

echo "Sending request..."
START_TIME=$(date +%s%3N)
RESPONSE=$(curl -s -X POST "$BASE_URL/runsync" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
END_TIME=$(date +%s%3N)
ELAPSED=$((END_TIME - START_TIME))

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.output.cache_hit == true' > /dev/null; then
    echo ""
    echo "✓ Cache hit confirmed!"
    echo "  Total time: ${ELAPSED}ms"
    echo "  Generation time: $(echo "$RESPONSE" | jq -r '.output.generation_time_ms')ms"
else
    echo ""
    echo "⚠️  Cache miss (unexpected)"
fi

echo ""
echo ""
echo "=========================================="
echo "Test 4: Paralinguistic Tags"
echo "=========================================="
echo ""

PAYLOAD='{
  "input": {
    "text": "Hi there [chuckle], this is pretty amazing [pause], dont you think?",
    "format": "mp3"
  }
}'

echo "Sending request..."
RESPONSE=$(curl -s -X POST "$BASE_URL/runsync" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | jq -e '.status == "COMPLETED"' > /dev/null; then
    echo "✓ Success!"
    echo "$RESPONSE" | jq -r '.output.audio_base64' | base64 -d > runpod_tags.mp3
    echo "✓ Saved to: runpod_tags.mp3"
else
    echo "❌ Failed"
    echo "$RESPONSE" | jq .
fi

echo ""
echo ""
echo "=================================================="
echo "✓ All tests complete!"
echo "=================================================="
echo ""
echo "Generated files:"
ls -lh runpod_*.mp3 2>/dev/null || echo "  No files generated"
echo ""
echo "To play audio (macOS):"
echo "  afplay runpod_sync.mp3"
echo ""
echo "To play audio (Linux):"
echo "  ffplay runpod_sync.mp3"
echo ""
