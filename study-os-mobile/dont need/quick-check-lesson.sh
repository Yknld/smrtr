#!/bin/bash
# Check what content this lesson actually has
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')
TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo "Checking lesson 34b9a0c7-62d7-4002-a642-00488b2c7f7c..."
echo ""
echo "Study sessions for this lesson:"
curl -s -X GET "${SUPABASE_URL}/rest/v1/study_sessions?lesson_id=eq.34b9a0c7-62d7-4002-a642-00488b2c7f7c&select=id" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "apikey: ${ANON_KEY}" | python3 -m json.tool 2>/dev/null | head -10
