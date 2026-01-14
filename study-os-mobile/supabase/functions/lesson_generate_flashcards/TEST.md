# Testing lesson_generate_flashcards

## Quick Test

### 1. Get a JWT Token

```bash
# If you have a test user, authenticate and get JWT
# Example using Supabase CLI or your auth system
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Create a Test Lesson with Content

You need a lesson that has been transcribed. If you don't have one, create a test lesson with a live session and transcript:

```sql
-- Create test course
INSERT INTO courses (user_id, title) 
VALUES ('your-user-id', 'Test Course')
RETURNING id;

-- Create test lesson
INSERT INTO lessons (user_id, course_id, title, source_type, status)
VALUES ('your-user-id', 'course-id', 'Test Lesson', 'live_session', 'ready')
RETURNING id;

-- Create test study session
INSERT INTO study_sessions (user_id, lesson_id, mode, status)
VALUES ('your-user-id', 'lesson-id', 'live_transcribe', 'ended')
RETURNING id;

-- Add test transcript segments
INSERT INTO live_transcript_segments (user_id, study_session_id, seq, text)
VALUES 
  ('your-user-id', 'session-id', 0, 'Welcome to our lesson on Python programming.'),
  ('your-user-id', 'session-id', 1, 'Today we will learn about variables and data types.'),
  ('your-user-id', 'session-id', 2, 'A variable is a named storage location in memory.'),
  ('your-user-id', 'session-id', 3, 'Python has several basic data types including integers, floats, strings, and booleans.'),
  ('your-user-id', 'session-id', 4, 'Integers are whole numbers like 1, 2, 3.'),
  ('your-user-id', 'session-id', 5, 'Floats are decimal numbers like 3.14 or 2.5.'),
  ('your-user-id', 'session-id', 6, 'Strings are text enclosed in quotes like "hello".'),
  ('your-user-id', 'session-id', 7, 'Booleans are True or False values.');
```

### 3. Call the Function

```bash
# Set your variables
export SUPABASE_URL="https://your-project.supabase.co"
export JWT_TOKEN="your-jwt-token"
export LESSON_ID="your-lesson-id"

# Call the function
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"lesson_id\": \"${LESSON_ID}\",
    \"count\": 15
  }" | jq
```

### 4. Verify Results

Check the database for the generated outputs:

```sql
-- View generated flashcards
SELECT 
  id,
  type,
  status,
  content_json->'cards' as flashcards,
  created_at
FROM lesson_outputs
WHERE lesson_id = 'your-lesson-id'
  AND type = 'flashcards'
ORDER BY created_at DESC
LIMIT 1;

-- View generated quiz
SELECT 
  id,
  type,
  status,
  content_json->'questions' as quiz_questions,
  created_at
FROM lesson_outputs
WHERE lesson_id = 'your-lesson-id'
  AND type = 'quiz'
ORDER BY created_at DESC
LIMIT 1;
```

## Full Test Script

```bash
#!/bin/bash

# Configuration
SUPABASE_URL="https://your-project.supabase.co"
JWT_TOKEN="your-jwt-token"
LESSON_ID="your-lesson-id"

echo "🧪 Testing lesson_generate_flashcards..."
echo ""
echo "Configuration:"
echo "  URL: $SUPABASE_URL"
echo "  Lesson ID: $LESSON_ID"
echo ""

# Test 1: Valid request with default count
echo "Test 1: Generate flashcards with default count (15)"
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}" \
  -w "\nStatus: %{http_code}\n" | jq

echo ""
echo "---"
echo ""

# Test 2: Valid request with custom count
echo "Test 2: Generate flashcards with count=20"
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 20}" \
  -w "\nStatus: %{http_code}\n" | jq

echo ""
echo "---"
echo ""

# Test 3: Invalid count (should fail)
echo "Test 3: Invalid count (should return 400)"
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 5}" \
  -w "\nStatus: %{http_code}\n" | jq

echo ""
echo "---"
echo ""

# Test 4: Missing Authorization (should fail)
echo "Test 4: Missing authorization (should return 401)"
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}" \
  -w "\nStatus: %{http_code}\n" | jq

echo ""
echo "---"
echo ""

# Test 5: Invalid lesson_id (should fail)
echo "Test 5: Invalid lesson_id (should return 404)"
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"00000000-0000-0000-0000-000000000000\"}" \
  -w "\nStatus: %{http_code}\n" | jq

echo ""
echo "✅ Test suite complete"
```

## Expected Results

### Successful Response

```json
{
  "flashcards": {
    "id": "uuid",
    "user_id": "uuid",
    "lesson_id": "uuid",
    "type": "flashcards",
    "status": "ready",
    "content_json": {
      "cards": [
        {
          "front": "What is a variable in Python?",
          "back": "A named storage location in memory used to store data values."
        },
        {
          "front": "What are the basic data types in Python?",
          "back": "Integers, floats, strings, and booleans."
        }
        // ... 13 more cards (15 total)
      ]
    },
    "created_at": "2026-01-10T...",
    "updated_at": "2026-01-10T..."
  },
  "quiz": {
    "id": "uuid",
    "user_id": "uuid",
    "lesson_id": "uuid",
    "type": "quiz",
    "status": "ready",
    "content_json": {
      "questions": [
        {
          "q": "Which of the following is NOT a basic Python data type?",
          "choices": [
            "Integer",
            "Float",
            "Array",
            "Boolean"
          ],
          "answer_index": 2,
          "explanation": "Array is not a basic Python data type. The basic types are int, float, str, and bool. Arrays are part of the numpy library or can be represented as lists."
        }
        // ... 4 more questions (5 total)
      ]
    },
    "created_at": "2026-01-10T...",
    "updated_at": "2026-01-10T..."
  }
}
```

## Troubleshooting

### Error: NO_CONTENT

**Problem**: No text content found for lesson

**Solution**: Ensure the lesson has transcript data in `live_transcript_segments` or other supported content sources

```sql
-- Check for transcript segments
SELECT COUNT(*) 
FROM live_transcript_segments lts
JOIN study_sessions ss ON ss.id = lts.study_session_id
WHERE ss.lesson_id = 'your-lesson-id';
```

### Error: LESSON_NOT_FOUND

**Problem**: Lesson doesn't exist or user doesn't own it

**Solution**: Verify lesson exists and user_id matches

```sql
-- Check lesson ownership
SELECT id, user_id, title 
FROM lessons 
WHERE id = 'your-lesson-id';
```

### Error: AI_GENERATION_FAILED

**Problem**: Gemini API error

**Solution**: Check Gemini API key is set correctly

```bash
# Check if GEMINI_API_KEY is set
supabase secrets list
```

### Error: UNAUTHORIZED

**Problem**: Invalid or expired JWT token

**Solution**: Generate a fresh JWT token from your authentication system

## Performance Testing

Test with varying lesson lengths:

```bash
# Short lesson (< 500 words) - Should complete in ~3-5 seconds
# Medium lesson (500-2000 words) - Should complete in ~5-8 seconds
# Long lesson (2000+ words) - Should complete in ~8-15 seconds
```

Monitor logs:

```bash
supabase functions logs lesson_generate_flashcards --follow
```
