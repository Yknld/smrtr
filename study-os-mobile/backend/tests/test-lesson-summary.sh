#!/bin/bash

# ============================================================================
# Test Script: lesson_generate_summary Edge Function
# ============================================================================
# 
# Usage:
#   USER_JWT="your_jwt" LESSON_ID="your_lesson_id" ./test-lesson-summary.sh
# 
# ============================================================================

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
USER_JWT="${USER_JWT}"
LESSON_ID="${LESSON_ID}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
if [ -z "$USER_JWT" ]; then
  echo -e "${RED}Error: USER_JWT must be set${NC}"
  echo "Usage: USER_JWT=\"your_jwt\" LESSON_ID=\"your_lesson_id\" ./test-lesson-summary.sh"
  exit 1
fi

if [ -z "$LESSON_ID" ]; then
  echo -e "${RED}Error: LESSON_ID must be set${NC}"
  echo "Usage: USER_JWT=\"your_jwt\" LESSON_ID=\"your_lesson_id\" ./test-lesson-summary.sh"
  exit 1
fi

echo "Testing lesson_generate_summary Edge Function"
echo "=============================================="
echo "Supabase URL: $SUPABASE_URL"
echo "Lesson ID: $LESSON_ID"
echo ""

PASSED=0
FAILED=0

# Test 1: Default parameters
echo -e "${YELLOW}Test 1: Generate summary (default parameters)${NC}"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}")

echo "$RESPONSE" | jq '.'
OUTPUT_ID=$(echo "$RESPONSE" | jq -r '.output_id')

if [ "$OUTPUT_ID" != "null" ] && [ -n "$OUTPUT_ID" ]; then
  echo -e "${GREEN}✅ Test 1 PASSED: Summary generated with ID $OUTPUT_ID${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 1 FAILED${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Exam tone, long length
echo -e "${YELLOW}Test 2: Generate summary (exam tone, long length)${NC}"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"tone\": \"exam\", \"length\": \"long\"}")

echo "$RESPONSE" | jq '.'
KEY_CONCEPTS_COUNT=$(echo "$RESPONSE" | jq '.key_concepts | length')

if [ "$KEY_CONCEPTS_COUNT" -ge 10 ] 2>/dev/null; then
  echo -e "${GREEN}✅ Test 2 PASSED: Long summary has $KEY_CONCEPTS_COUNT concepts${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 2 FAILED: Expected 10+ concepts, got $KEY_CONCEPTS_COUNT${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Deep tone, short length
echo -e "${YELLOW}Test 3: Generate summary (deep tone, short length)${NC}"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"tone\": \"deep\", \"length\": \"short\"}")

echo "$RESPONSE" | jq '.'
QUESTIONS_COUNT=$(echo "$RESPONSE" | jq '.example_questions | length')

if [ "$QUESTIONS_COUNT" -eq 3 ] 2>/dev/null; then
  echo -e "${GREEN}✅ Test 3 PASSED: Short summary has $QUESTIONS_COUNT questions${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 3 FAILED: Expected 3 questions, got $QUESTIONS_COUNT${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Missing authorization
echo -e "${YELLOW}Test 4: Missing authorization header${NC}"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}")

echo "$RESPONSE" | jq '.'
ERROR=$(echo "$RESPONSE" | jq -r '.error')

if [[ "$ERROR" == *"authorization"* ]]; then
  echo -e "${GREEN}✅ Test 4 PASSED: Unauthorized request rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 4 FAILED: Expected authorization error${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Missing lesson_id
echo -e "${YELLOW}Test 5: Missing lesson_id${NC}"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{}")

echo "$RESPONSE" | jq '.'
ERROR=$(echo "$RESPONSE" | jq -r '.error')

if [[ "$ERROR" == *"required"* ]]; then
  echo -e "${GREEN}✅ Test 5 PASSED: Missing lesson_id rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 5 FAILED: Expected required field error${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: Invalid lesson_id
echo -e "${YELLOW}Test 6: Invalid lesson_id${NC}"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"00000000-0000-0000-0000-000000000000\"}")

echo "$RESPONSE" | jq '.'
ERROR=$(echo "$RESPONSE" | jq -r '.error')

if [[ "$ERROR" == *"not found"* ]] || [[ "$ERROR" == *"unauthorized"* ]]; then
  echo -e "${GREEN}✅ Test 6 PASSED: Invalid lesson_id rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 6 FAILED: Expected not found error${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 7: CORS preflight
echo -e "${YELLOW}Test 7: CORS preflight${NC}"
RESPONSE=$(curl -s -X OPTIONS \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type" \
  -i)

if [[ "$RESPONSE" == *"Access-Control-Allow-Origin"* ]]; then
  echo -e "${GREEN}✅ Test 7 PASSED: CORS headers present${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ Test 7 FAILED: CORS headers missing${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "=============================================="
echo -e "Test suite completed"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi
