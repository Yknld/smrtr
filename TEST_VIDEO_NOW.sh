#!/bin/bash
# Quick test script - run from anywhere

echo "🚀 Testing video generation and polling..."
echo ""

# Change to the correct directory
cd /Users/danielntumba/smrtr

# Generate video
echo "1️⃣ Starting video generation..."
curl -s -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'

echo ""
echo "2️⃣ Polling for status (will check OpenHand)..."
./poll_videos.sh

echo ""
echo "✅ Video generation started!"
echo ""
echo "Now run this to watch progress:"
echo "  cd /Users/danielntumba/smrtr && while true; do ./poll_videos.sh; echo '---'; sleep 30; done"
