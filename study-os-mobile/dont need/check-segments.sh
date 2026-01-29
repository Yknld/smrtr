#!/bin/bash
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')
TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo "Checking transcript segments for session 8b169130-c749-42de-ac9e-608cbebedb09..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/live_transcript_segments?study_session_id=eq.8b169130-c749-42de-ac9e-608cbebedb09&select=text&limit=3" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "apikey: ${ANON_KEY}" | python3 -m json.tool 2>/dev/null
