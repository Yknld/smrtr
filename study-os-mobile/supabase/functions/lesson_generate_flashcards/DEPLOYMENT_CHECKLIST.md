# Deployment Checklist - lesson_generate_flashcards

## Pre-Deployment

### ✅ Code Complete
- [x] Main function implemented (`index.ts`)
- [x] Shared helper created (`lessonHelpers.ts`)
- [x] Configuration file added (`deno.json`)
- [x] No linter errors
- [x] Error handling implemented
- [x] Logging added throughout

### ✅ Documentation Complete
- [x] README.md - Full API documentation
- [x] TEST.md - Testing guide
- [x] IMPLEMENTATION_SUMMARY.md - Technical details
- [x] QUICK_REFERENCE.md - Quick reference
- [x] CLIENT_EXAMPLE.tsx - Integration examples
- [x] DEPLOYMENT_CHECKLIST.md - This file

### ✅ Integration Complete
- [x] Added to deploy.sh script
- [x] Added to main functions README.md
- [x] No database migrations required (uses existing tables)

## Deployment Steps

### 1. Verify Prerequisites

```bash
# Check Supabase CLI installed
supabase --version

# Check project linked
supabase projects list

# Check current directory
pwd  # Should be in study-os-mobile/supabase/functions
```

**Status**: ⬜ Not started | ✅ Complete

---

### 2. Set Environment Variables

```bash
# Set Gemini API key (if not already set)
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Verify secrets
supabase secrets list
```

**Status**: ⬜ Not started | ✅ Complete

**Notes**: 
- Get API key from: https://aistudio.google.com/app/apikey
- Ensure key has Gemini API access enabled

---

### 3. Deploy Function

```bash
# Option A: Deploy all functions (recommended)
cd /Users/danielntumba/smrtr/study-os-mobile/supabase/functions
./deploy.sh

# Option B: Deploy only this function
supabase functions deploy lesson_generate_flashcards --no-verify-jwt
```

**Status**: ⬜ Not started | ✅ Complete

**Expected Output**:
```
📦 Deploying lesson_generate_flashcards...
✅ Function deployed successfully
```

---

### 4. Verify Deployment

```bash
# Check function is deployed
supabase functions list

# Check logs
supabase functions logs lesson_generate_flashcards --tail
```

**Status**: ⬜ Not started | ✅ Complete

**Expected**: Function should appear in list with status "deployed"

---

### 5. Test Function

#### 5.1 Get Test Data

```sql
-- Find a lesson with transcript data
SELECT 
  l.id as lesson_id,
  l.title,
  COUNT(lts.id) as segment_count
FROM lessons l
JOIN study_sessions ss ON ss.lesson_id = l.id
JOIN live_transcript_segments lts ON lts.study_session_id = ss.id
WHERE l.user_id = 'YOUR_USER_ID'
GROUP BY l.id, l.title
HAVING COUNT(lts.id) > 0
LIMIT 5;
```

**Test Lesson ID**: _________________

**Status**: ⬜ Not started | ✅ Complete

---

#### 5.2 Get JWT Token

```bash
# Get JWT token for test user
# (Use your auth system to get a valid token)
export JWT_TOKEN="your_jwt_token_here"
```

**Status**: ⬜ Not started | ✅ Complete

---

#### 5.3 Run Test

```bash
# Set variables
export SUPABASE_URL="https://your-project.supabase.co"
export LESSON_ID="your-lesson-id-from-step-5.1"

# Test function
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 15}" \
  | jq
```

**Status**: ⬜ Not started | ✅ Complete

**Expected Response**: JSON with `flashcards` and `quiz` objects

---

#### 5.4 Verify Database

```sql
-- Check flashcards were created
SELECT 
  id,
  type,
  status,
  jsonb_array_length(content_json->'cards') as card_count,
  created_at
FROM lesson_outputs
WHERE lesson_id = 'YOUR_LESSON_ID'
  AND type = 'flashcards'
ORDER BY created_at DESC
LIMIT 1;

-- Check quiz was created
SELECT 
  id,
  type,
  status,
  jsonb_array_length(content_json->'questions') as question_count,
  created_at
FROM lesson_outputs
WHERE lesson_id = 'YOUR_LESSON_ID'
  AND type = 'quiz'
ORDER BY created_at DESC
LIMIT 1;
```

**Status**: ⬜ Not started | ✅ Complete

**Expected**: 2 rows (1 flashcards, 1 quiz) with status='ready'

---

### 6. Error Testing

Test error cases to ensure proper handling:

#### 6.1 Invalid Lesson ID
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "00000000-0000-0000-0000-000000000000"}' \
  | jq
```

**Expected**: 404 error with code "LESSON_NOT_FOUND"

**Status**: ⬜ Not started | ✅ Complete

---

#### 6.2 Invalid Count
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\", \"count\": 5}" \
  | jq
```

**Expected**: 400 error with code "INVALID_COUNT"

**Status**: ⬜ Not started | ✅ Complete

---

#### 6.3 Missing Authorization
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LESSON_ID}\"}" \
  | jq
```

**Expected**: 401 error with code "UNAUTHORIZED"

**Status**: ⬜ Not started | ✅ Complete

---

### 7. Performance Testing

```bash
# Test with different lesson sizes
# Record response times

# Small lesson (<500 words)
time curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${SMALL_LESSON_ID}\"}"

# Medium lesson (500-2000 words)
time curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${MEDIUM_LESSON_ID}\"}"

# Large lesson (2000+ words)
time curl -X POST "${SUPABASE_URL}/functions/v1/lesson_generate_flashcards" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"${LARGE_LESSON_ID}\"}"
```

**Response Times**:
- Small: _______ seconds
- Medium: _______ seconds
- Large: _______ seconds

**Status**: ⬜ Not started | ✅ Complete

---

## Post-Deployment

### 8. Monitor Logs

```bash
# Watch logs for errors
supabase functions logs lesson_generate_flashcards --tail

# Check for any errors in first hour
supabase functions logs lesson_generate_flashcards --limit 100
```

**Status**: ⬜ Not started | ✅ Complete

**Issues Found**: _________________

---

### 9. Update Mobile App

- [ ] Add flashcard generation button to lesson detail screen
- [ ] Implement loading state during generation
- [ ] Display flashcards in UI
- [ ] Display quiz in UI
- [ ] Handle error cases
- [ ] Add "regenerate" option
- [ ] Cache results (check existing before generating)

**Status**: ⬜ Not started | ✅ Complete

**Branch/PR**: _________________

---

### 10. Documentation

- [ ] Update main project README if needed
- [ ] Add to API documentation
- [ ] Create user-facing documentation
- [ ] Add to changelog

**Status**: ⬜ Not started | ✅ Complete

---

## Rollback Plan

If issues occur, rollback steps:

```bash
# 1. Disable function (if needed)
# Delete from Supabase dashboard or:
supabase functions delete lesson_generate_flashcards

# 2. Clean up test data (if needed)
# DELETE FROM lesson_outputs WHERE type IN ('flashcards', 'quiz');

# 3. Investigate logs
supabase functions logs lesson_generate_flashcards --limit 1000

# 4. Fix issues and redeploy
# Make changes, then:
supabase functions deploy lesson_generate_flashcards --no-verify-jwt
```

---

## Success Criteria

Function is considered successfully deployed when:

- ✅ Function deploys without errors
- ✅ Function appears in `supabase functions list`
- ✅ Test request returns valid flashcards and quiz
- ✅ Database records created correctly
- ✅ Error cases handled properly
- ✅ Response times acceptable (<15s for large lessons)
- ✅ No errors in logs during testing
- ✅ Mobile app integration works

---

## Notes

**Deployment Date**: _________________

**Deployed By**: _________________

**Supabase Project**: _________________

**Environment**: ⬜ Development | ⬜ Staging | ⬜ Production

**Issues Encountered**: 

_________________

**Resolution**: 

_________________

---

## Sign-off

**Developer**: _________________ Date: _______

**QA**: _________________ Date: _______

**Product**: _________________ Date: _______

---

## Support

For issues or questions:

1. Check logs: `supabase functions logs lesson_generate_flashcards`
2. Review documentation in `/supabase/functions/lesson_generate_flashcards/`
3. Check Gemini API status: https://status.cloud.google.com/
4. Review Supabase status: https://status.supabase.com/

---

## Additional Resources

- **Full Documentation**: `README.md`
- **Testing Guide**: `TEST.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Quick Reference**: `QUICK_REFERENCE.md`
- **Client Examples**: `CLIENT_EXAMPLE.tsx`
- **Main Functions README**: `../README.md`
