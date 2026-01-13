#!/bin/bash
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')
TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo "Checking lesson content..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/lessons?id=eq.34b9a0c7-62d7-4002-a642-00488b2c7f7c&select=id,title,notes_final_text,notes_raw_text" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "apikey: ${ANON_KEY}" | python3 -c "import sys, json; d=json.load(sys.stdin)[0]; print(f\"Title: {d['title']}\"); print(f\"Notes final: {len(d.get('notes_final_text') or '')} chars\"); print(f\"Notes raw: {len(d.get('notes_raw_text') or '')} chars\")"
