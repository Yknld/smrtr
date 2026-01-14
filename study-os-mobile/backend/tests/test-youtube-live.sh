#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI"

echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  YouTube Recommendations - Live Test${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"

# Random topics
TOPICS=(
  "Machine Learning Neural Networks"
  "Quantum Physics for Beginners"
  "React Hooks Complete Guide"
  "Spanish Grammar Subjunctive"
  "World War II History"
  "Cell Division Mitosis"
  "Binary Search Algorithm"
  "French Revolution 1789"
)

TOPIC=${TOPICS[$RANDOM % ${#TOPICS[@]}]}

echo -e "\n${YELLOW}🎲 Random Topic: ${TOPIC}${NC}\n"

# Get token
echo -e "${CYAN}🔐 Getting authentication token...${NC}"
JWT_TOKEN=$(node get-token.js 2>&1 | grep -A 1 "Access Token:" | tail -1 | tr -d ' ')

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Failed to get token${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Token obtained${NC}"

# Create course
echo -e "\n${CYAN}📚 Creating test course...${NC}"
COURSE_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/courses" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"title\": \"Test Course: ${TOPIC}\",
    \"term\": \"Test 2026\",
    \"color\": \"#4CAF50\"
  }")

COURSE_ID=$(echo $COURSE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$COURSE_ID" ]; then
  echo -e "${RED}❌ Failed to create course${NC}"
  echo "$COURSE_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✓ Course created: ${COURSE_ID}${NC}"

# Create lesson
echo -e "\n${CYAN}📝 Creating test lesson...${NC}"
LESSON_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/lessons" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"course_id\": \"${COURSE_ID}\",
    \"title\": \"${TOPIC}\",
    \"source_type\": \"import\",
    \"status\": \"ready\"
  }")

LESSON_ID=$(echo $LESSON_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$LESSON_ID" ]; then
  echo -e "${RED}❌ Failed to create lesson${NC}"
  echo "$LESSON_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✓ Lesson created: ${LESSON_ID}${NC}"

# Get YouTube recommendations
echo -e "\n${CYAN}🎥 Getting YouTube recommendations...${NC}"
echo -e "${YELLOW}⏳ This may take 5-10 seconds (AI is working!)${NC}\n"

START_TIME=$(date +%s)

RECS_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"count\": 3,
    \"force\": true
  }")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check if successful
if echo "$RECS_RESPONSE" | grep -q '"results"'; then
  echo -e "${GREEN}✓ Recommendations received in ${DURATION}s${NC}\n"
  
  # Display results
  echo -e "${CYAN}══════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  📺 RECOMMENDED VIDEOS${NC}"
  echo -e "${CYAN}══════════════════════════════════════════════${NC}\n"
  
  # Pretty print JSON
  echo "$RECS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RECS_RESPONSE"
  
  echo -e "\n${CYAN}══════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ TEST PASSED!${NC}"
  echo -e "${CYAN}══════════════════════════════════════════════${NC}\n"
else
  echo -e "${RED}❌ Failed to get recommendations${NC}"
  echo "$RECS_RESPONSE"
  exit 1
fi

# Cleanup
echo -e "${CYAN}🧹 Cleaning up...${NC}"
curl -s -X DELETE \
  "${SUPABASE_URL}/rest/v1/courses?id=eq.${COURSE_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: ${ANON_KEY}" > /dev/null
echo -e "${GREEN}✓ Test data removed${NC}\n"

echo -e "${GREEN}🎉 Test complete! YouTube recommendations are working!${NC}"
