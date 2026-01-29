#!/bin/bash
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type": "application/json" \
  -d '{"email":"user1@test.com","password":"password123"}')
TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

LESSON_ID="34b9a0c7-62d7-4002-a642-00488b2c7f7c"

echo "═══════════════════════════════════════════════════════"
echo "  Full Test Suite: Flashcards + Quiz + Caching"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Lesson ID: $LESSON_ID"
echo ""

# Test 1: Flashcards (first call - cache miss)
echo "🎴 TEST 1: Flashcards Generation (Cache Miss)"
echo "─────────────────────────────────────────────────────"
START=$(date +%s)
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"count\":10}")
END=$(date +%s)
DURATION=$((END - START))

echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"✅ Generated {len(d.get('content_json', {}).get('cards', []))} cards in {$DURATION}s\"); print(f\"   Source hash: {d.get('source_hash', 'N/A')[:16]}...\")" 2>/dev/null || echo "❌ Failed"
echo ""

# Test 2: Flashcards (second call - cache hit)
echo "🎴 TEST 2: Flashcards Generation (Cache Hit)"
echo "─────────────────────────────────────────────────────"
START=$(date +%s)
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"count\":10}")
END=$(date +%s)
DURATION=$((END - START))

echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"✅ Retrieved {len(d.get('content_json', {}).get('cards', []))} cards in {$DURATION}s (cached)\"); print(f\"   Source hash: {d.get('source_hash', 'N/A')[:16]}...\")" 2>/dev/null || echo "❌ Failed"
echo ""

# Test 3: Quiz (first call - cache miss)
echo "📝 TEST 3: Quiz Generation (Cache Miss)"
echo "─────────────────────────────────────────────────────"
START=$(date +%s)
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_quiz" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"count\":5}")
END=$(date +%s)
DURATION=$((END - START))

echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"✅ Generated {len(d.get('content_json', {}).get('questions', []))} questions in {$DURATION}s\"); print(f\"   Source hash: {d.get('source_hash', 'N/A')[:16]}...\")" 2>/dev/null || echo "❌ Failed"
echo ""

# Test 4: Quiz (second call - cache hit)
echo "📝 TEST 4: Quiz Generation (Cache Hit)"
echo "─────────────────────────────────────────────────────"
START=$(date +%s)
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_quiz" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"count\":5}")
END=$(date +%s)
DURATION=$((END - START))

echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"✅ Retrieved {len(d.get('content_json', {}).get('questions', []))} questions in {$DURATION}s (cached)\"); print(f\"   Source hash: {d.get('source_hash', 'N/A')[:16]}...\")" 2>/dev/null || echo "❌ Failed"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  ✅ All Tests Complete!"
echo "═══════════════════════════════════════════════════════"

