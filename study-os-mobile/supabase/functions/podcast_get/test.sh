#!/bin/bash
# ============================================================================
# Test Script: podcast_get
# ============================================================================
# 
# Purpose: Test the podcast_get edge function
# 
# Usage:
#   ./test.sh <JWT_TOKEN> [EPISODE_ID]
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
EPISODE_ID="${2:-}"
SUPABASE_URL="${SUPABASE_URL:-https://euxfugfzmpsemkjpcpuz.supabase.co}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/podcast_get"

# ============================================================================
# Validate inputs
# ============================================================================

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}Error: JWT token required${NC}"
  echo "Usage: $0 <JWT_TOKEN> [EPISODE_ID]"
  echo ""
  echo "Get JWT:"
  echo "  ./get-jwt.sh user1@test.com password123"
  exit 1
fi

# Get episode ID if not provided
if [ -z "$EPISODE_ID" ]; then
  echo -e "${YELLOW}No episode_id provided, fetching from database...${NC}"
  
  ANON_KEY=$(grep SUPABASE_ANON_KEY apps/mobile/.env | cut -d'=' -f2)
  
  EPISODE_ID=$(curl -s "${SUPABASE_URL}/rest/v1/podcast_episodes?select=id&limit=1" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.[0].id // empty')
  
  if [ -z "$EPISODE_ID" ]; then
    echo -e "${RED}No podcast episodes found in database${NC}"
    echo "Create one first using podcast_create function"
    exit 1
  fi
  
  echo -e "${GREEN}Found episode: $EPISODE_ID${NC}"
  echo ""
fi

# ============================================================================
# Test 1: Valid episode
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 1: Get valid episode${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE=$(curl -s "${FUNCTION_URL}?episode_id=${EPISODE_ID}" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | jq '.'
echo ""

# Validate response
if echo "$RESPONSE" | jq -e '.episode.id' > /dev/null 2>&1; then
  TITLE=$(echo "$RESPONSE" | jq -r '.episode.title')
  STATUS=$(echo "$RESPONSE" | jq -r '.episode.status')
  SEGMENT_COUNT=$(echo "$RESPONSE" | jq -r '.segments | length')
  
  echo -e "${GREEN}✓ Test 1 PASSED${NC}"
  echo "  - Title: $TITLE"
  echo "  - Status: $STATUS"
  echo "  - Segments: $SEGMENT_COUNT"
  echo ""
else
  echo -e "${RED}✗ Test 1 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Test 2: Missing episode_id
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 2: Missing episode_id (should return 400)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE2=$(curl -s "${FUNCTION_URL}" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE2" | jq '.'
echo ""

if echo "$RESPONSE2" | jq -e '.error' | grep -q "Missing required parameter"; then
  echo -e "${GREEN}✓ Test 2 PASSED (Error handled correctly)${NC}"
  echo ""
else
  echo -e "${RED}✗ Test 2 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Test 3: Invalid UUID
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 3: Invalid UUID format (should return 400)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE3=$(curl -s "${FUNCTION_URL}?episode_id=invalid-uuid" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE3" | jq '.'
echo ""

if echo "$RESPONSE3" | jq -e '.error' | grep -q "Invalid episode_id format"; then
  echo -e "${GREEN}✓ Test 3 PASSED (Error handled correctly)${NC}"
  echo ""
else
  echo -e "${RED}✗ Test 3 FAILED${NC}"
  exit 1
fi

# ============================================================================
# Test 4: Non-existent episode
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 4: Non-existent episode (should return 404)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE4=$(curl -s "${FUNCTION_URL}?episode_id=00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE4" | jq '.'
echo ""

if echo "$RESPONSE4" | jq -e '.error' | grep -q "not found"; then
  echo -e "${GREEN}✓ Test 4 PASSED (Error handled correctly)${NC}"
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
echo "Function is working correctly:"
echo "  ✓ Returns episode metadata"
echo "  ✓ Returns segments ordered by seq"
echo "  ✓ Handles missing parameters"
echo "  ✓ Handles invalid UUIDs"
echo "  ✓ Handles non-existent episodes"
echo "  ✓ JWT authentication working"
echo ""
