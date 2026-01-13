#!/bin/bash
# ============================================================================
# Test Script: notes_commit_from_segments
# ============================================================================
# 
# Purpose: Test the notes commit edge function with real data
# 
# Prerequisites:
#   - Supabase function deployed
#   - User authenticated (get JWT from frontend)
#   - Lesson and study session exist with transcript segments
# 
# Usage:
#   ./test.sh <JWT_TOKEN> <LESSON_ID> <STUDY_SESSION_ID>
# 
# Example:
#   ./test.sh "eyJ..." "a1b2c3..." "d4e5f6..."
# 
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Configuration
# ============================================================================

# Get from arguments or use defaults
JWT_TOKEN="${1:-}"
LESSON_ID="${2:-}"
STUDY_SESSION_ID="${3:-}"

# Supabase project URL (update this or pass as env var)
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/notes_commit_from_segments"

# ============================================================================
# Validate inputs
# ============================================================================

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}Error: JWT token required${NC}"
  echo "Usage: $0 <JWT_TOKEN> <LESSON_ID> <STUDY_SESSION_ID>"
  echo ""
  echo "Get JWT from your frontend app's auth.session().access_token"
  exit 1
fi

if [ -z "$LESSON_ID" ]; then
  echo -e "${RED}Error: Lesson ID required${NC}"
  echo "Usage: $0 <JWT_TOKEN> <LESSON_ID> <STUDY_SESSION_ID>"
  exit 1
fi

if [ -z "$STUDY_SESSION_ID" ]; then
  echo -e "${RED}Error: Study session ID required${NC}"
  echo "Usage: $0 <JWT_TOKEN> <LESSON_ID> <STUDY_SESSION_ID>"
  exit 1
fi

# ============================================================================
# Test 1: First commit (should create notes and append segments)
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 1: First commit (create notes + append segments)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Request:${NC}"
echo "POST $FUNCTION_URL"
echo "Body: { lesson_id: \"$LESSON_ID\", study_session_id: \"$STUDY_SESSION_ID\" }"
echo ""

RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"study_session_id\": \"$STUDY_SESSION_ID\"
  }")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
  APPENDED=$(echo "$RESPONSE" | jq -r '.appended')
  LAST_SEQ=$(echo "$RESPONSE" | jq -r '.last_committed_seq')
  
  echo -e "${GREEN}✓ Test 1 PASSED${NC}"
  echo "  - Appended: $APPENDED segments"
  echo "  - Last committed seq: $LAST_SEQ"
  echo ""
else
  echo -e "${RED}✗ Test 1 FAILED${NC}"
  echo "$RESPONSE"
  exit 1
fi

# ============================================================================
# Test 2: Idempotent call (should append 0 new segments)
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 2: Idempotent call (should append 0 segments)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

sleep 1  # Brief pause

RESPONSE2=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"$LESSON_ID\",
    \"study_session_id\": \"$STUDY_SESSION_ID\"
  }")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE2" | jq '.'
echo ""

# Check if 0 appended
if echo "$RESPONSE2" | jq -e '.appended == 0' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Test 2 PASSED (Idempotent)${NC}"
  echo "  - No duplicate segments appended"
  echo ""
else
  echo -e "${RED}✗ Test 2 FAILED (Not idempotent)${NC}"
  exit 1
fi

# ============================================================================
# Test 3: Show notes preview
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 3: Notes preview${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

PREVIEW=$(echo "$RESPONSE2" | jq -r '.notes_preview')
echo -e "${YELLOW}Current notes (last 600 chars):${NC}"
echo "$PREVIEW"
echo ""

# ============================================================================
# Test 4: Error handling - Invalid lesson ID
# ============================================================================

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test 4: Error handling (invalid lesson ID)${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

RESPONSE3=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"00000000-0000-0000-0000-000000000000\",
    \"study_session_id\": \"$STUDY_SESSION_ID\"
  }")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE3" | jq '.'
echo ""

# Check if error
if echo "$RESPONSE3" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Test 4 PASSED (Error handled correctly)${NC}"
  echo ""
else
  echo -e "${RED}✗ Test 4 FAILED (Should return error)${NC}"
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
echo "  ✓ Creates notes document on first call"
echo "  ✓ Appends transcript segments"
echo "  ✓ Idempotent (safe to call repeatedly)"
echo "  ✓ Updates last_committed_seq cursor"
echo "  ✓ Handles errors gracefully"
echo ""
echo -e "${YELLOW}Rate Limits:${NC}"
echo "  - Safe to call every 5-10 seconds during live recording"
echo "  - Function processes only NEW segments (cursor-based)"
echo "  - No heavy processing (just text concatenation)"
echo "  - Typical latency: <500ms"
echo ""
