# Testing Caching Pattern for Flashcards & Quiz

## Prerequisites

1. **Apply Migration 014** (Add version, source_hash, model columns)

```sql
-- Run this in Supabase SQL Editor
-- Copy contents of: study-os-mobile/supabase/migrations/014_enhance_lesson_outputs.sql
```

2. **Deploy Functions**

```bash
cd study-os-mobile/supabase/functions

# Deploy updated flashcards
supabase functions deploy lesson_generate_flashcards

# Deploy new quiz function
supabase functions deploy lesson_generate_quiz
```

3. **Get Test Credentials**

```bash
# You need:
# - SUPABASE_URL
# - User JWT token
# - Lesson ID that has content (notes or transcript)

# Get token:
cd study-os-mobile
node scripts/test-tutor-chat.js  # Or use any auth test script
```

---

## Test 1: Flashcards Generation (First Time - Cache Miss)

```bash
export JWT_TOKEN="your_jwt_token"
export LESSON_ID="your_lesson_id"
export SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"

curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 15}"
```

**Expected Response:**
```json
{
  "id": "uuid",
  "type": "flashcards",
  "status": "ready",
  "cached": false,
  "source_hash": "abc123...",
  "version": 1,
  "model": "gemini-2.0-flash-exp",
  "content_json": {
    "deck_title": "...",
    "cards": [
      {
        "id": "c1",
        "front": "...",
        "back": "...",
        "tags": ["..."],
        "difficulty": 2
      }
    ],
    "metadata": {
      "count": 15,
      "source_hash": "abc123...",
      "version": 1
    }
  }
}
```

**✅ Success Criteria:**
- `cached: false` (first generation)
- `source_hash` is not empty
- `version: 1`
- Cards array has 15 items
- Status is `ready`

---

## Test 2: Flashcards Generation (Second Time - Cache Hit)

**Run the SAME command again immediately:**

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 15}"
```

**Expected Response:**
```json
{
  "id": "same_uuid_as_before",
  "type": "flashcards",
  "status": "ready",
  "cached": true,
  "source_hash": "abc123...",  // SAME as Test 1
  "version": 1,
  "content_json": { ... }  // SAME as Test 1
}
```

**✅ Success Criteria:**
- `cached: true` (returned from cache)
- Response is instant (no AI generation time)
- `source_hash` matches Test 1
- `id` matches Test 1 (same record)
- Content is identical to Test 1

---

## Test 3: Quiz Generation (Cache Miss)

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_quiz" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 8}"
```

**Expected Response:**
```json
{
  "id": "uuid",
  "type": "quiz",
  "status": "ready",
  "cached": false,
  "source_hash": "abc123...",  // SAME as flashcards!
  "version": 1,
  "model": "gemini-2.0-flash-exp",
  "content_json": {
    "title": "...",
    "questions": [
      {
        "id": "q1",
        "question": "...",
        "choices": ["A", "B", "C", "D"],
        "answer_index": 1,
        "explanation": "...",
        "tags": ["..."],
        "difficulty": 2
      }
    ],
    "metadata": {
      "count": 8,
      "source_hash": "abc123...",
      "version": 1
    }
  }
}
```

**✅ Success Criteria:**
- `cached: false` (first quiz generation)
- `source_hash` is SAME as flashcards (same lesson content)
- Questions array has 8 items
- Each question has 4 choices
- `answer_index` is 0-3

---

## Test 4: Quiz Generation (Cache Hit)

**Run the same command again:**

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_quiz" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 8}"
```

**Expected Response:**
```json
{
  "id": "same_uuid_as_test_3",
  "cached": true,
  ...
}
```

**✅ Success Criteria:**
- `cached: true`
- Instant response
- Content matches Test 3

---

## Test 5: Cross-Device Consistency Simulation

**Simulate a second device requesting flashcards for the same lesson:**

```bash
# Get a NEW JWT token from SAME user on "different device"
# (or just use same token)

curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 15}"
```

**Expected:**
- `cached: true`
- Returns SAME flashcards as Test 1/2
- SAME `source_hash`
- SAME `id`

**✅ Success:** Cross-device consistency verified

---

## Test 6: Content Change Invalidates Cache

**Modify the lesson content:**

```bash
# Option 1: Add a note to the lesson via SQL
# (Or use the app to add notes)

# Then request flashcards again:
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 15}"
```

**Expected:**
- `cached: false` (new generation because content changed)
- `source_hash` is DIFFERENT from Tests 1-5
- `version: 2` (auto-incremented)
- NEW flashcards generated

**✅ Success:** Cache invalidation works correctly

---

## Test 7: Database Verification

**Check lesson_outputs table:**

```sql
SELECT 
  id,
  lesson_id,
  type,
  status,
  source_hash,
  version,
  model,
  created_at,
  updated_at,
  (content_json->>'metadata') as metadata_json
FROM lesson_outputs
WHERE lesson_id = 'YOUR_LESSON_ID'
ORDER BY type, version DESC;
```

**Expected Results:**
```
type         | version | source_hash | status | model
-------------|---------|-------------|--------|----------------------
flashcards   | 2       | def456...   | ready  | gemini-2.0-flash-exp
flashcards   | 1       | abc123...   | ready  | gemini-2.0-flash-exp
quiz         | 1       | abc123...   | ready  | gemini-2.0-flash-exp
```

**✅ Success Criteria:**
- Both types exist
- Versions increment correctly
- source_hash values are consistent
- All statuses are `ready`

---

## Test 8: Error Handling - No Content

**Test with a lesson that has NO notes or transcript:**

```bash
# Create empty lesson or use one without content
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${EMPTY_LESSON_ID}\", \"count\": 15}"
```

**Expected Response:**
```json
{
  "error": {
    "code": "NO_CONTENT",
    "message": "No text content found for this lesson. Please ensure the lesson has notes or transcript."
  }
}
```

**Status Code:** 400

**✅ Success:** Proper error handling for empty lessons

---

## Test 9: Error Handling - Invalid Count

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 100}"
```

**Expected Response:**
```json
{
  "error": {
    "code": "INVALID_COUNT",
    "message": "count must be a number between 10 and 25"
  }
}
```

**Status Code:** 400

**✅ Success:** Input validation works

---

## Test 10: Performance Test

**Time the cache hit vs cache miss:**

```bash
# Cache MISS (first generation):
time curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${NEW_LESSON_ID}\", \"count\": 15}"
  
# Expected: 5-15 seconds

# Cache HIT (immediate return):
time curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${NEW_LESSON_ID}\", \"count\": 15}"
  
# Expected: < 1 second
```

**✅ Success:** Cache hits are significantly faster

---

## Summary Checklist

- [ ] Migration 014 applied successfully
- [ ] Functions deployed without errors
- [ ] Test 1: Cache miss generates new flashcards
- [ ] Test 2: Cache hit returns cached flashcards
- [ ] Test 3: Quiz generation works independently
- [ ] Test 4: Quiz cache works
- [ ] Test 5: Cross-device consistency verified
- [ ] Test 6: Cache invalidation on content change
- [ ] Test 7: Database has correct records
- [ ] Test 8: Error handling for no content
- [ ] Test 9: Input validation works
- [ ] Test 10: Performance improvement visible

---

## Troubleshooting

### "Column source_hash does not exist"
- Migration 014 not applied. Run it in Supabase SQL Editor.

### "Function not found"
- Functions not deployed. Run `supabase functions deploy`.

### "No content found"
- Lesson has no notes or transcript. Add some content first.

### Cache not working (always cached: false)
- Check if `source_hash` column has values
- Check if `status` is "ready" for cached records
- Look at function logs: `supabase functions logs lesson_generate_flashcards`

### Always getting same old flashcards
- Cache is working! To force regeneration, modify lesson content.

---

**Next:** After all tests pass, update mobile app to use these endpoints.
