#!/bin/bash
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')
TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo "Finding lessons with notes..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/lessons?select=id,title&notes_final_text=not.is.null&limit=1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "apikey: ${ANON_KEY}" | python3 -m json.tool 2>/dev/null

echo ""
echo "Testing flashcards with first lesson..."
LESSON_ID=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/lessons?select=id&notes_final_text=not.is.null&limit=1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "apikey: ${ANON_KEY}" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)

echo "Lesson ID: $LESSON_ID"
echo ""

curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"count\":10}" | python3 -m json.tool 2>/dev/null | head -30

