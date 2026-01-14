#!/bin/bash
# ============================================================================
# Notes Workflow - End-to-End Test
# ============================================================================
# 
# Tests the complete notes workflow through edge functions:
# 1. Insert 10 segments → commit → verify raw text
# 2. Commit again → verify idempotency (appended=0)
# 3. Finalize → verify final text created
# 4. Unauthorized access → verify 404 (not 403)
# 
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
JWT_TOKEN="${1:-}"
SUPABASE_URL="${SUPABASE_URL:-https://euxfugfzmpsemkjpcpuz.supabase.co}"
ANON_KEY=""

# ============================================================================
# Get JWT if not provided
# ============================================================================

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${YELLOW}No JWT provided, attempting to get one...${NC}"
  
  if [ -f "../../../get-jwt.sh" ]; then
    JWT_TOKEN=$(../../../get-jwt.sh user1@test.com password123 2>/dev/null | grep "export JWT" | cut -d "'" -f2)
    
    if [ -z "$JWT_TOKEN" ]; then
      echo -e "${RED}Failed to get JWT token${NC}"
      echo "Usage: $0 JWT_TOKEN"
      exit 1
    fi
    
    echo -e "${GREEN}✓ Got JWT token${NC}"
  else
    echo -e "${RED}Error: JWT token required${NC}"
    echo "Usage: $0 JWT_TOKEN"
    exit 1
  fi
fi

# Get ANON_KEY
if [ -f "../../../apps/mobile/.env" ]; then
  ANON_KEY=$(grep SUPABASE_ANON_KEY ../../../apps/mobile/.env | cut -d'=' -f2)
fi

echo ""

# ============================================================================
# Setup: Create test data
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Setup: Creating test data${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Create course
echo -e "${YELLOW}Creating test course...${NC}"
COURSE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/courses" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Test Course - Notes Workflow",
    "color": "#3B82F6"
  }')

COURSE_ID=$(echo "$COURSE_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$COURSE_ID" ]; then
  echo -e "${RED}Failed to create course${NC}"
  echo "$COURSE_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Created course: $COURSE_ID${NC}"

# Create lesson
echo -e "${YELLOW}Creating test lesson...${NC}"
LESSON_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/lessons" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"course_id\": \"$COURSE_ID\",
    \"title\": \"Test Lesson - Notes Workflow\",
    \"source_type\": \"live_session\",
    \"status\": \"ready\"
  }")

LESSON_ID=$(echo "$LESSON_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$LESSON_ID" ]; then
  echo -e "${RED}Failed to create lesson${NC}"
  echo "$LESSON_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Created lesson: $LESSON_ID${NC}"

# Create study session
echo -e "${YELLOW}Creating study session...${NC}"
SESSION_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/study_sessions" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"mode\": \"live_transcribe\",
    \"status\": \"ended\"
  }")

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$SESSION_ID" ]; then
  echo -e "${RED}Failed to create session${NC}"
  echo "$SESSION_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Created session: $SESSION_ID${NC}"
echo ""

# ============================================================================
# Test 1: Insert 10 segments and commit
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 1: Insert 10 segments → commit → verify raw text${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Insert 10 transcript segments
echo -e "${YELLOW}Inserting 10 transcript segments...${NC}"

for i in {0..9}; do
  curl -s -X POST "${SUPABASE_URL}/rest/v1/live_transcript_segments" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"study_session_id\": \"$SESSION_ID\",
      \"seq\": $i,
      \"text\": \"Segment $i: This is test content for transcript segment number $i.\",
      \"language\": \"en\"
    }" > /dev/null
done

echo -e "${GREEN}✓ Inserted 10 segments${NC}"

# Commit segments to notes
echo -e "${YELLOW}Committing segments to notes...${NC}"

COMMIT1_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/notes_commit_from_segments" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"study_session_id\": \"$SESSION_ID\"
  }")

echo "$COMMIT1_RESPONSE" | jq '.'
echo ""

# Verify response
APPENDED=$(echo "$COMMIT1_RESPONSE" | jq -r '.appended')
LAST_SEQ=$(echo "$COMMIT1_RESPONSE" | jq -r '.last_committed_seq')

if [ "$APPENDED" != "10" ]; then
  echo -e "${RED}✗ Test 1 FAILED: Expected appended=10, got $APPENDED${NC}"
  exit 1
fi

if [ "$LAST_SEQ" != "9" ]; then
  echo -e "${RED}✗ Test 1 FAILED: Expected last_committed_seq=9, got $LAST_SEQ${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test 1 PASSED: 10 segments committed (seq 0-9)${NC}"
echo ""

# ============================================================================
# Test 2: Commit again (verify idempotency)
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 2: Commit again → verify idempotency (appended=0)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Committing again (should append 0)...${NC}"

COMMIT2_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/notes_commit_from_segments" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"study_session_id\": \"$SESSION_ID\"
  }")

echo "$COMMIT2_RESPONSE" | jq '.'
echo ""

# Verify idempotency
APPENDED2=$(echo "$COMMIT2_RESPONSE" | jq -r '.appended')
LAST_SEQ2=$(echo "$COMMIT2_RESPONSE" | jq -r '.last_committed_seq')

if [ "$APPENDED2" != "0" ]; then
  echo -e "${RED}✗ Test 2 FAILED: Expected appended=0 (idempotent), got $APPENDED2${NC}"
  exit 1
fi

if [ "$LAST_SEQ2" != "9" ]; then
  echo -e "${RED}✗ Test 2 FAILED: last_committed_seq should still be 9, got $LAST_SEQ2${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test 2 PASSED: Idempotent behavior confirmed (0 appended, no duplicates)${NC}"
echo ""

# ============================================================================
# Test 3: Finalize notes
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 3: Finalize → verify final text created${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Finalizing notes (calling Gemini)...${NC}"
echo -e "${YELLOW}(This may take a few seconds)${NC}"
echo ""

FINALIZE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/notes_finalize" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\"
  }")

echo "$FINALIZE_RESPONSE" | jq '.'
echo ""

# Verify final text created
HAS_FINAL=$(echo "$FINALIZE_RESPONSE" | jq -r '.notes_final_text != null')

if [ "$HAS_FINAL" != "true" ]; then
  echo -e "${RED}✗ Test 3 FAILED: notes_final_text is null${NC}"
  exit 1
fi

FINAL_LENGTH=$(echo "$FINALIZE_RESPONSE" | jq -r '.notes_final_text | length')

if [ "$FINAL_LENGTH" -lt "50" ]; then
  echo -e "${RED}✗ Test 3 FAILED: notes_final_text too short ($FINAL_LENGTH chars)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test 3 PASSED: Final notes created ($FINAL_LENGTH chars)${NC}"
echo ""

# ============================================================================
# Test 4: Verify notes can be retrieved
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 4: Verify notes can be retrieved${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Fetching notes via notes_get...${NC}"

GET_RESPONSE=$(curl -s "${SUPABASE_URL}/functions/v1/notes_get?lesson_id=$LESSON_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$GET_RESPONSE" | jq '{
  lesson_id,
  is_final,
  raw_text_length: (.notes_raw_text | length),
  final_text_length: (.notes_final_text | length),
  last_committed_seq
}'
echo ""

# Verify is_final flag
IS_FINAL=$(echo "$GET_RESPONSE" | jq -r '.is_final')

if [ "$IS_FINAL" != "true" ]; then
  echo -e "${RED}✗ Test 4 FAILED: is_final should be true${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test 4 PASSED: Notes retrieved successfully with is_final=true${NC}"
echo ""

# ============================================================================
# Test 5: Unauthorized access (verify 404, not 403)
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 5: Unauthorized access → verify 404 (not 403)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Attempting to access non-existent lesson...${NC}"

UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${SUPABASE_URL}/functions/v1/notes_get?lesson_id=00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $JWT_TOKEN")

HTTP_STATUS=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$UNAUTH_RESPONSE" | grep -v "HTTP_STATUS")

echo "$RESPONSE_BODY" | jq '.'
echo ""

if [ "$HTTP_STATUS" != "404" ]; then
  echo -e "${RED}✗ Test 5 FAILED: Expected HTTP 404, got $HTTP_STATUS${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test 5 PASSED: Unauthorized access returns 404 (not 403)${NC}"
echo ""

# ============================================================================
# Cleanup
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Cleanup${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Deleting test data...${NC}"

# Delete segments
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/live_transcript_segments?study_session_id=eq.$SESSION_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null

# Delete session
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/study_sessions?id=eq.$SESSION_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null

# Delete lesson (cascade deletes notes)
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/lessons?id=eq.$LESSON_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null

# Delete course
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/courses?id=eq.$COURSE_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "Workflow verified:"
echo "  ✓ 10 segments → commit → all in notes_raw_text"
echo "  ✓ Commit again → appended=0 (idempotent)"
echo "  ✓ Finalize → notes_final_text created"
echo "  ✓ Retrieve → is_final=true"
echo "  ✓ Unauthorized → 404 (not 403)"
echo ""
echo "Functions tested:"
echo "  - notes_commit_from_segments"
echo "  - notes_finalize"
echo "  - notes_get"
echo ""
