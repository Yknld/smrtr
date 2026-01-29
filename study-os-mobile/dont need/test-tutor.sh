#!/bin/bash

SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"

# Get token
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo "Testing tutor_chat (should work)..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/tutor_chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d '{"message":"test"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Works!' if 'conversationId' in d else f'❌ Error: {d}')" 2>/dev/null || echo "❌ Failed"

echo ""
echo "Testing flashcards (currently broken)..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d '{"lesson_id":"34b9a0c7-62d7-4002-a642-00488b2c7f7c","count":15}' | python3 -m json.tool 2>/dev/null | head -5

