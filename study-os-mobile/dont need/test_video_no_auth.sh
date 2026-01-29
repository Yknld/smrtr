#!/bin/bash
# Test video generation without authentication

echo "Testing video generation without JWT..."
echo ""

curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }' | jq '.'

echo ""
echo "If you see a video_id, it worked!"
