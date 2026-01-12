# Test: lesson_generate_summary Edge Function

Test suite for the `lesson_generate_summary` Edge Function.

---

## Prerequisites

1. **Supabase Project Running**
   ```bash
   supabase start
   # or use production URL
   ```

2. **Environment Variables**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (configured in Supabase secrets)

3. **Test User JWT**
   ```bash
   # Get JWT from authenticated session
   export USER_JWT="eyJhbGc..."
   ```

4. **Test Lesson with Content**
   - Create a lesson with text content, transcript, or audio
   - Note the `lesson_id`

---

## Test Cases

### Test 1: Generate Summary (Default Parameters)

**Description:** Generate a summary with default tone (casual) and length (medium).

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "output_id": "uuid",
  "summary": "A 4-5 paragraph summary...",
  "key_concepts": [
    "Concept 1",
    "Concept 2",
    "...",
    "8-10 concepts total"
  ],
  "example_questions": [
    "Question 1?",
    "Question 2?",
    "...",
    "5 questions total"
  ],
  "metadata": {
    "content_source": "live_transcript",
    "content_length": 12345,
    "tone": "casual",
    "length": "medium"
  }
}
```

**Validation:**
- ✅ Status: 200
- ✅ `output_id` is a valid UUID
- ✅ `summary` is a non-empty string
- ✅ `key_concepts` is an array with 8-10 items
- ✅ `example_questions` is an array with 5 items
- ✅ `metadata.content_source` is one of: `live_transcript`, `transcription`, `text_asset`

---

### Test 2: Generate Summary (Exam Tone, Long Length)

**Description:** Generate a formal, comprehensive summary for exam preparation.

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID",
    "tone": "exam",
    "length": "long"
  }'
```

**Expected Response:**
```json
{
  "output_id": "uuid",
  "summary": "A 6-8 paragraph formal summary...",
  "key_concepts": [
    "10-12 concepts"
  ],
  "example_questions": [
    "5-7 questions"
  ],
  "metadata": {
    "content_source": "transcription",
    "content_length": 45000,
    "tone": "exam",
    "length": "long"
  }
}
```

**Validation:**
- ✅ Status: 200
- ✅ `key_concepts` has 10-12 items
- ✅ `example_questions` has 5-7 items
- ✅ Summary tone is formal and structured

---

### Test 3: Generate Summary (Deep Tone, Short Length)

**Description:** Generate a concise but detailed academic summary.

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID",
    "tone": "deep",
    "length": "short"
  }'
```

**Expected Response:**
```json
{
  "output_id": "uuid",
  "summary": "A 2-3 paragraph academic summary...",
  "key_concepts": [
    "5-8 concepts"
  ],
  "example_questions": [
    "3 questions"
  ],
  "metadata": {
    "tone": "deep",
    "length": "short"
  }
}
```

**Validation:**
- ✅ Status: 200
- ✅ `key_concepts` has 5-8 items
- ✅ `example_questions` has 3 items
- ✅ Summary is concise but thorough

---

### Test 4: Missing Authorization Header

**Description:** Request without JWT should fail.

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "error": "Missing authorization header"
}
```

**Validation:**
- ✅ Status: 401
- ✅ Error message present

---

### Test 5: Invalid JWT

**Description:** Request with expired or invalid JWT should fail.

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer invalid_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid or expired session. Please sign in again."
}
```

**Validation:**
- ✅ Status: 401
- ✅ Error message indicates authentication failure

---

### Test 6: Missing lesson_id

**Description:** Request without lesson_id should fail.

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "error": "lesson_id is required"
}
```

**Validation:**
- ✅ Status: 400
- ✅ Error message indicates missing parameter

---

### Test 7: Lesson Not Found

**Description:** Request with non-existent lesson_id should fail.

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "00000000-0000-0000-0000-000000000000"
  }'
```

**Expected Response:**
```json
{
  "error": "Lesson not found or unauthorized"
}
```

**Validation:**
- ✅ Status: 404
- ✅ Error message indicates lesson not found

---

### Test 8: Unauthorized Lesson Access

**Description:** Request for lesson belonging to another user should fail.

**Setup:**
1. Create a lesson with User A
2. Try to access it with User B's JWT

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_B_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "USER_A_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "error": "Lesson not found or unauthorized"
}
```

**Validation:**
- ✅ Status: 404
- ✅ RLS policies prevent cross-user access

---

### Test 9: No Content Available

**Description:** Request for lesson with no content should fail gracefully.

**Setup:**
1. Create a lesson with no assets, transcripts, or text

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "EMPTY_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "error": "No content available for this lesson. Please add text, audio, or transcript first.",
  "error_code": "NO_CONTENT_AVAILABLE"
}
```

**Validation:**
- ✅ Status: 400
- ✅ Error code is `NO_CONTENT_AVAILABLE`
- ✅ Error message is helpful

---

### Test 10: PDF Content (Unsupported)

**Description:** Request for lesson with only PDF assets should return unsupported error.

**Setup:**
1. Create a lesson with only PDF assets (no text or transcript)

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "PDF_ONLY_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "error": "PDF extraction not yet supported. Please use text or audio lessons.",
  "error_code": "UNSUPPORTED_CONTENT_TYPE"
}
```

**Validation:**
- ✅ Status: 400
- ✅ Error code is `UNSUPPORTED_CONTENT_TYPE`
- ✅ Error message indicates PDF not supported

---

### Test 11: Verify Database Storage

**Description:** Verify that summary is correctly stored in `lesson_outputs` table.

**Steps:**

1. Generate a summary:
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID"
  }' | jq '.output_id'
```

2. Query the database:
```sql
SELECT 
  id,
  user_id,
  lesson_id,
  type,
  status,
  content_json,
  created_at
FROM lesson_outputs
WHERE id = 'OUTPUT_ID_FROM_STEP_1';
```

**Expected Result:**
- ✅ Record exists with correct `output_id`
- ✅ `type` = `'summary'`
- ✅ `status` = `'ready'`
- ✅ `content_json` contains `summary`, `key_concepts`, `example_questions`
- ✅ `user_id` matches authenticated user
- ✅ `lesson_id` matches request

---

### Test 12: Retrieve Saved Summary

**Description:** Verify that saved summary can be retrieved via Supabase client.

**Request:**
```typescript
const { data, error } = await supabase
  .from('lesson_outputs')
  .select('*')
  .eq('lesson_id', 'YOUR_LESSON_ID')
  .eq('type', 'summary')
  .eq('status', 'ready')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

console.log(data.content_json);
```

**Expected Result:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "lesson_id": "uuid",
  "type": "summary",
  "status": "ready",
  "content_json": {
    "summary": "...",
    "key_concepts": [...],
    "example_questions": [...]
  },
  "created_at": "2026-01-10T...",
  "updated_at": "2026-01-10T..."
}
```

**Validation:**
- ✅ Query returns exactly one record
- ✅ `content_json` structure is valid
- ✅ RLS allows user to read their own output

---

### Test 13: Multiple Summaries (Regeneration)

**Description:** Verify that multiple summaries can be generated for the same lesson.

**Steps:**

1. Generate first summary:
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID",
    "tone": "casual"
  }' | jq '.output_id'
```

2. Generate second summary with different parameters:
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID",
    "tone": "exam"
  }' | jq '.output_id'
```

3. Query database:
```sql
SELECT id, content_json->>'summary' as summary_preview
FROM lesson_outputs
WHERE lesson_id = 'YOUR_LESSON_ID'
  AND type = 'summary'
ORDER BY created_at DESC;
```

**Expected Result:**
- ✅ Two separate records exist
- ✅ Both have `status = 'ready'`
- ✅ Summaries have different tones
- ✅ Most recent summary is returned first

---

### Test 14: Content Truncation

**Description:** Verify that very long content is truncated properly.

**Setup:**
1. Create a lesson with >50,000 characters of content

**Request:**
```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "LONG_CONTENT_LESSON_ID"
  }'
```

**Expected Response:**
```json
{
  "output_id": "uuid",
  "summary": "...",
  "key_concepts": [...],
  "example_questions": [...],
  "metadata": {
    "content_source": "transcription",
    "content_length": 50000,
    "tone": "casual",
    "length": "medium"
  }
}
```

**Validation:**
- ✅ Status: 200
- ✅ `metadata.content_length` = 50000 (max limit)
- ✅ Summary is still coherent
- ✅ No timeout or error

---

### Test 15: CORS Preflight

**Description:** Verify CORS headers are set correctly.

**Request:**
```bash
curl -X OPTIONS \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type" \
  -v
```

**Expected Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

**Validation:**
- ✅ Status: 200 or 204
- ✅ CORS headers present
- ✅ No body in response

---

## Integration Test Script

**File:** `backend/tests/test-lesson-summary.sh`

```bash
#!/bin/bash

# Configuration
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
USER_JWT="${USER_JWT}"
LESSON_ID="${LESSON_ID}"

if [ -z "$USER_JWT" ] || [ -z "$LESSON_ID" ]; then
  echo "Error: USER_JWT and LESSON_ID must be set"
  exit 1
fi

echo "Testing lesson_generate_summary Edge Function"
echo "=============================================="
echo ""

# Test 1: Default parameters
echo "Test 1: Generate summary (default parameters)"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}")

echo "$RESPONSE" | jq '.'
OUTPUT_ID=$(echo "$RESPONSE" | jq -r '.output_id')

if [ "$OUTPUT_ID" != "null" ]; then
  echo "✅ Test 1 PASSED: Summary generated with ID $OUTPUT_ID"
else
  echo "❌ Test 1 FAILED"
fi
echo ""

# Test 2: Exam tone, long length
echo "Test 2: Generate summary (exam tone, long length)"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"tone\": \"exam\", \"length\": \"long\"}")

echo "$RESPONSE" | jq '.'
KEY_CONCEPTS_COUNT=$(echo "$RESPONSE" | jq '.key_concepts | length')

if [ "$KEY_CONCEPTS_COUNT" -ge 10 ]; then
  echo "✅ Test 2 PASSED: Long summary has $KEY_CONCEPTS_COUNT concepts"
else
  echo "❌ Test 2 FAILED: Expected 10+ concepts, got $KEY_CONCEPTS_COUNT"
fi
echo ""

# Test 3: Missing authorization
echo "Test 3: Missing authorization header"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}")

ERROR=$(echo "$RESPONSE" | jq -r '.error')

if [[ "$ERROR" == *"authorization"* ]]; then
  echo "✅ Test 3 PASSED: Unauthorized request rejected"
else
  echo "❌ Test 3 FAILED: Expected authorization error"
fi
echo ""

# Test 4: Missing lesson_id
echo "Test 4: Missing lesson_id"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d "{}")

ERROR=$(echo "$RESPONSE" | jq -r '.error')

if [[ "$ERROR" == *"required"* ]]; then
  echo "✅ Test 4 PASSED: Missing lesson_id rejected"
else
  echo "❌ Test 4 FAILED: Expected required field error"
fi
echo ""

echo "=============================================="
echo "Test suite completed"
```

**Usage:**
```bash
chmod +x backend/tests/test-lesson-summary.sh
USER_JWT="your_jwt" LESSON_ID="your_lesson_id" ./backend/tests/test-lesson-summary.sh
```

---

## Performance Benchmarks

| Content Length | Tone   | Length | Avg Response Time | Token Usage |
|---------------|--------|--------|-------------------|-------------|
| 5,000 chars   | casual | short  | 3-5 seconds       | ~2,000      |
| 10,000 chars  | casual | medium | 4-6 seconds       | ~4,000      |
| 25,000 chars  | exam   | long   | 6-8 seconds       | ~8,000      |
| 50,000 chars  | deep   | long   | 8-12 seconds      | ~13,000     |

---

## Troubleshooting

### Issue: "Service configuration error"

**Cause:** `GEMINI_API_KEY` not set in Supabase secrets

**Solution:**
```bash
supabase secrets set GEMINI_API_KEY=your_api_key
```

### Issue: "Failed to generate valid summary"

**Cause:** Gemini returned invalid JSON

**Solution:**
- Check Gemini API status
- Review prompt template
- Retry request

### Issue: Timeout after 30 seconds

**Cause:** Content too long or Gemini API slow

**Solution:**
- Reduce content length
- Use shorter `length` parameter
- Check Gemini API latency

---

## Related Documentation

- [Gemini Summary Documentation](../docs/gemini-summary.md)
- [Edge Functions README](../../supabase/functions/README.md)
- [Database Schema](../docs/db-schema.md)
