#!/bin/bash
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type": "application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')
TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo "Finding lesson with notes in lesson_outputs..."
LESSON_ID=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/lesson_outputs?select=lesson_id&type=eq.notes&status=eq.ready&notes_final_text=not.is.null&limit=1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "apikey: ${ANON_KEY}" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d[0]['lesson_id'] if d else '')" 2>/dev/null)

if [ -z "$LESSON_ID" ]; then
  echo "❌ No lessons with notes found"
  exit 1
fi

echo "✅ Found lesson: $LESSON_ID"
echo ""
echo "Testing flashcards generation..."
sleep 10

curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"count\":10}" | python3 -m json.tool 2>/dev/null | head -50

