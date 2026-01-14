#!/bin/bash
# ============================================================================
# Quick Curl Test: notes_commit_from_segments
# ============================================================================
# 
# Simple one-liner test for the notes commit function
# 
# Usage: Update the variables below, then run:
#   chmod +x curl-test.sh
#   ./curl-test.sh
# 
# ============================================================================

# ============================================================================
# CONFIGURATION - UPDATE THESE
# ============================================================================

# Your Supabase project URL
SUPABASE_URL="https://your-project.supabase.co"

# JWT token from your frontend (auth.session().access_token)
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Lesson ID (from lessons table)
LESSON_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Study session ID (from study_sessions table)
STUDY_SESSION_ID="d4e5f6g7-h8i9-0123-defg-456789012345"

# ============================================================================
# RUN TEST
# ============================================================================

echo "Testing notes_commit_from_segments..."
echo ""

curl -X POST "${SUPABASE_URL}/functions/v1/notes_commit_from_segments" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"study_session_id\": \"${STUDY_SESSION_ID}\"
  }" | jq '.'

echo ""
echo "Done!"
