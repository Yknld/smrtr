#!/bin/bash
# Test script for Chatterbox TTS API
# Usage: ./curl.sh [BASE_URL]

set -e

BASE_URL="${1:-http://localhost:8000}"

echo "=================================================="
echo "Chatterbox TTS API Test Script"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "--------------------"
curl -s "$BASE_URL/health" | jq .
echo ""
echo ""

# Test 2: Basic TTS
echo "Test 2: Basic TTS (MP3)"
echo "-----------------------"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of Chatterbox TTS.",
    "format": "mp3"
  }' \
  --output test_basic.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Saved to: test_basic.mp3"
echo ""
echo ""

# Test 3: WAV format
echo "Test 3: WAV Format"
echo "------------------"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a WAV format test.",
    "format": "wav"
  }' \
  --output test_wav.wav \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Saved to: test_wav.wav"
echo ""
echo ""

# Test 4: Paralinguistic tags
echo "Test 4: Paralinguistic Tags"
echo "---------------------------"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hi there [chuckle], I was wondering if you have a moment?",
    "format": "mp3"
  }' \
  --output test_tags.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Saved to: test_tags.mp3"
echo ""
echo ""

# Test 5: Long text (chunking)
echo "Test 5: Long Text (Chunking)"
echo "----------------------------"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial intelligence is transforming the world in unprecedented ways. From natural language processing to computer vision, AI systems are becoming increasingly sophisticated. Machine learning models can now understand context, generate creative content, and even engage in meaningful conversations. The field continues to evolve rapidly with new breakthroughs happening every day.",
    "format": "mp3"
  }' \
  --output test_long.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Saved to: test_long.mp3"
echo ""
echo ""

# Test 6: Speed control
echo "Test 6: Speed Control (0.8x)"
echo "----------------------------"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This text will be spoken more slowly.",
    "speed": 0.8,
    "format": "mp3"
  }' \
  --output test_slow.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Saved to: test_slow.mp3"
echo ""
echo ""

# Test 7: Reproducible (with seed)
echo "Test 7: Reproducible Output (seed=42)"
echo "--------------------------------------"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This will always generate the same output.",
    "seed": 42,
    "format": "mp3"
  }' \
  --output test_seed.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Saved to: test_seed.mp3"
echo ""
echo ""

# Test 8: Cache test (repeat same request)
echo "Test 8: Cache Test (Repeat Request)"
echo "------------------------------------"
echo "First request (no cache):"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a cache test.",
    "format": "mp3"
  }' \
  --output test_cache1.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"

echo ""
echo "Second request (should hit cache):"
curl -X POST "$BASE_URL/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a cache test.",
    "format": "mp3"
  }' \
  --output test_cache2.mp3 \
  -w "\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "^(< X-|HTTP)"
echo "✓ Check X-Cache-Hit header (should be 'true' on second request)"
echo ""
echo ""

# Summary
echo "=================================================="
echo "✓ All tests complete!"
echo "=================================================="
echo ""
echo "Generated files:"
ls -lh test_*.mp3 test_*.wav 2>/dev/null || echo "No files generated"
echo ""
echo "To play audio on macOS:"
echo "  afplay test_basic.mp3"
echo ""
echo "To play audio on Linux:"
echo "  ffplay test_basic.mp3"
echo ""
