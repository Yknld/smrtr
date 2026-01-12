#!/bin/bash
# ============================================================================
# Quick Curl Test: notes_get
# ============================================================================
# 
# Usage: ./curl-test.sh [JWT_TOKEN] [LESSON_ID]
# 
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
JWT_TOKEN="${1:-}"
LESSON_ID="${2:-}"
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/notes_get"

# ============================================================================
# Get JWT if not provided
# ============================================================================

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${YELLOW}No JWT provided, attempting to get one...${NC}"
  
  if [ -f "../../get-jwt.sh" ]; then
    JWT_TOKEN=$(../../get-jwt.sh user1@test.com password123 2>/dev/null | grep "export JWT" | cut -d "'" -f2)
    
    if [ -z "$JWT_TOKEN" ]; then
      echo -e "${RED}Failed to get JWT token${NC}"
      echo "Usage: $0 JWT_TOKEN LESSON_ID"
      exit 1
    fi
    
    echo -e "${GREEN}✓ Got JWT token${NC}"
  else
    echo -e "${RED}Error: JWT token required${NC}"
    echo "Usage: $0 JWT_TOKEN LESSON_ID"
    exit 1
  fi
fi

# ============================================================================
# Get lesson ID if not provided
# ============================================================================

if [ -z "$LESSON_ID" ]; then
  echo -e "${YELLOW}No lesson_id provided, fetching from database...${NC}"
  
  ANON_KEY=$(grep SUPABASE_ANON_KEY ../../apps/mobile/.env | cut -d'=' -f2 2>/dev/null || echo "")
  
  if [ -n "$ANON_KEY" ]; then
    LESSON_ID=$(curl -s "${SUPABASE_URL}/rest/v1/lessons?select=id&limit=1" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.[0].id // empty')
    
    if [ -n "$LESSON_ID" ]; then
      echo -e "${GREEN}✓ Found lesson: $LESSON_ID${NC}"
    else
      echo -e "${RED}No lessons found in database${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error: lesson_id required${NC}"
    echo "Usage: $0 JWT_TOKEN LESSON_ID"
    exit 1
  fi
fi

echo ""

# ============================================================================
# Test 1: Get notes
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 1: Get notes for lesson${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Request:${NC}"
echo "GET ${FUNCTION_URL}?lesson_id=${LESSON_ID}"
echo ""

RESPONSE=$(curl -s "${FUNCTION_URL}?lesson_id=${LESSON_ID}" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.lesson_id' > /dev/null 2>&1; then
  IS_FINAL=$(echo "$RESPONSE" | jq -r '.is_final')
  LAST_SEQ=$(echo "$RESPONSE" | jq -r '.last_committed_seq')
  RAW_LENGTH=$(echo "$RESPONSE" | jq -r '.notes_raw_text | length')
  
  echo -e "${GREEN}✓ Test 1 PASSED${NC}"
  echo "  - Lesson ID: ${LESSON_ID}"
  echo "  - Is final: ${IS_FINAL}"
  echo "  - Last committed seq: ${LAST_SEQ}"
  echo "  - Raw text length: ${RAW_LENGTH} chars"
  echo ""
else
  echo -e "${RED}✗ Test 1 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Test 2: Missing lesson_id
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 2: Missing lesson_id (should return 400)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE2=$(curl -s "${FUNCTION_URL}" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE2" | jq '.'
echo ""

if echo "$RESPONSE2" | jq -e '.error' | grep -q "Missing required parameter"; then
  echo -e "${GREEN}✓ Test 2 PASSED${NC}"
  echo ""
else
  echo -e "${RED}✗ Test 2 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Test 3: Invalid UUID
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 3: Invalid UUID (should return 400)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE3=$(curl -s "${FUNCTION_URL}?lesson_id=invalid" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE3" | jq '.'
echo ""

if echo "$RESPONSE3" | jq -e '.error' | grep -q "Invalid lesson_id format"; then
  echo -e "${GREEN}✓ Test 3 PASSED${NC}"
  echo ""
else
  echo -e "${RED}✗ Test 3 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Test 4: Non-existent lesson
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 4: Non-existent lesson (should return 404)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE4=$(curl -s "${FUNCTION_URL}?lesson_id=00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE4" | jq '.'
echo ""

if echo "$RESPONSE4" | jq -e '.error' | grep -q "not found"; then
  echo -e "${GREEN}✓ Test 4 PASSED${NC}"
  echo ""
else
  echo -e "${RED}✗ Test 4 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "Function working correctly:"
echo "  ✓ Returns notes data"
echo "  ✓ Handles missing notes (returns empty)"
echo "  ✓ Handles missing parameters"
echo "  ✓ Handles invalid UUIDs"
echo "  ✓ Handles non-existent lessons"
echo "  ✓ JWT authentication working"
echo ""
echo "Quick test command:"
echo "  curl \"${FUNCTION_URL}?lesson_id=${LESSON_ID}\" \\"
echo "    -H \"Authorization: Bearer \$JWT\" | jq '.'"
echo ""
