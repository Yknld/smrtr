# Deployment Checklist: notes_commit_from_segments

## Pre-Deployment

### 1. Database Migration

- [ ] Run migration 012: `supabase/migrations/012_add_notes_to_lesson_outputs.sql`
  ```bash
  # If using Supabase CLI
  supabase db push
  
  # Or manually
  psql $DATABASE_URL -f supabase/migrations/012_add_notes_to_lesson_outputs.sql
  ```

- [ ] Verify migration with smoke test:
  ```bash
  psql $DATABASE_URL -f backend/tests/sql/notes_smoke_test.sql
  ```
  Expected: `✓ ALL TESTS PASSED`

### 2. Database Indexes

- [ ] Verify indexes exist:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'lesson_outputs' 
  AND indexname IN ('idx_lesson_outputs_lesson_type', 'idx_lesson_outputs_user_type');
  ```
  Expected: 2 rows

### 3. Supabase Secrets

- [ ] Verify secrets are set:
  ```bash
  supabase secrets list
  ```
  Required:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

- [ ] Set secrets if missing:
  ```bash
  supabase secrets set SUPABASE_URL=https://your-project.supabase.co
  supabase secrets set SUPABASE_ANON_KEY=your-anon-key
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
  ```

## Deployment

### 4. Deploy Function

- [ ] Deploy to Supabase:
  ```bash
  cd /Users/danielntumba/smrtr/study-os-mobile
  supabase functions deploy notes_commit_from_segments
  ```

- [ ] Verify deployment:
  ```bash
  supabase functions list
  ```
  Expected: `notes_commit_from_segments` in list

### 5. Test Deployed Function

- [ ] Get test data from database:
  ```sql
  -- Get a lesson_id
  SELECT id, title FROM lessons WHERE user_id = auth.uid() LIMIT 1;
  
  -- Get a study_session_id with transcript segments
  SELECT ss.id, ss.lesson_id, COUNT(lts.id) as segment_count
  FROM study_sessions ss
  LEFT JOIN live_transcript_segments lts ON lts.study_session_id = ss.id
  WHERE ss.user_id = auth.uid()
  GROUP BY ss.id, ss.lesson_id
  HAVING COUNT(lts.id) > 0
  LIMIT 1;
  ```

- [ ] Get JWT token:
  - Login to your app
  - Get `session.access_token` from Supabase auth
  - Or use: `await supabase.auth.getSession()`

- [ ] Run quick test:
  ```bash
  cd supabase/functions/notes_commit_from_segments
  
  # Edit curl-test.sh with your values
  nano curl-test.sh
  
  # Run test
  ./curl-test.sh
  ```

- [ ] Run comprehensive test:
  ```bash
  ./test.sh "YOUR_JWT" "LESSON_ID" "SESSION_ID"
  ```
  Expected: `✓ ALL TESTS PASSED`

## Post-Deployment Verification

### 6. Verify Database Updates

- [ ] Check notes were created:
  ```sql
  SELECT 
    lo.id,
    lo.lesson_id,
    lo.type,
    lo.status,
    LENGTH(lo.notes_raw_text) as text_length,
    lo.last_committed_seq,
    lo.updated_at
  FROM lesson_outputs lo
  WHERE lo.type = 'notes'
  ORDER BY lo.updated_at DESC
  LIMIT 5;
  ```

- [ ] Check segment count matches:
  ```sql
  SELECT 
    ss.id as session_id,
    lo.last_committed_seq,
    COUNT(lts.id) as total_segments
  FROM study_sessions ss
  JOIN lesson_outputs lo ON lo.lesson_id = ss.lesson_id AND lo.type = 'notes'
  LEFT JOIN live_transcript_segments lts ON lts.study_session_id = ss.id
  WHERE ss.user_id = auth.uid()
  GROUP BY ss.id, lo.last_committed_seq;
  ```
  Expected: `last_committed_seq` ≤ `total_segments`

### 7. Performance Check

- [ ] Test latency:
  ```bash
  time curl -X POST "https://your-project.supabase.co/functions/v1/notes_commit_from_segments" \
    -H "Authorization: Bearer YOUR_JWT" \
    -H "Content-Type: application/json" \
    -d '{"lesson_id":"...","study_session_id":"..."}'
  ```
  Expected: < 1 second

- [ ] Test idempotency (call twice):
  ```bash
  # First call - should append segments
  curl ... | jq '.appended'  # e.g., 10
  
  # Second call - should append 0
  curl ... | jq '.appended'  # 0
  ```

### 8. Error Handling

- [ ] Test invalid lesson ID:
  ```bash
  curl -X POST "..." \
    -H "Authorization: Bearer YOUR_JWT" \
    -d '{"lesson_id":"00000000-0000-0000-0000-000000000000","study_session_id":"..."}'
  ```
  Expected: `404 - Lesson not found or access denied`

- [ ] Test missing auth:
  ```bash
  curl -X POST "..." \
    -d '{"lesson_id":"...","study_session_id":"..."}'
  ```
  Expected: `401 - Missing authorization header`

- [ ] Test invalid JWT:
  ```bash
  curl -X POST "..." \
    -H "Authorization: Bearer invalid_token" \
    -d '{"lesson_id":"...","study_session_id":"..."}'
  ```
  Expected: `401 - Invalid or expired session`

## Integration

### 9. Frontend Integration

- [ ] Add function to frontend service layer
- [ ] Implement auto-commit interval (every 5-10 seconds)
- [ ] Add error handling and retries
- [ ] Test with live recording session

See `supabase/functions/notes_commit_from_segments/README.md` for integration examples.

## Monitoring

### 10. Set Up Monitoring (Optional)

- [ ] Check Supabase function logs:
  ```bash
  supabase functions logs notes_commit_from_segments
  ```

- [ ] Monitor error rate in Supabase dashboard
- [ ] Set up alerts for high error rate (> 5%)

## Rollback Plan

If deployment fails:

1. **Function issues:** Redeploy previous version or remove function:
   ```bash
   supabase functions delete notes_commit_from_segments
   ```

2. **Database issues:** Rollback migration:
   ```sql
   -- Remove notes type from constraint
   ALTER TABLE lesson_outputs DROP CONSTRAINT lesson_outputs_type_check;
   ALTER TABLE lesson_outputs ADD CONSTRAINT lesson_outputs_type_check 
     CHECK (type IN ('summary', 'key_concepts', 'flashcards', 'quiz', 'mindmap'));
   
   -- Drop new columns
   ALTER TABLE lesson_outputs DROP COLUMN notes_raw_text;
   ALTER TABLE lesson_outputs DROP COLUMN notes_final_text;
   ALTER TABLE lesson_outputs DROP COLUMN last_committed_seq;
   
   -- Drop indexes
   DROP INDEX IF EXISTS idx_lesson_outputs_lesson_type;
   DROP INDEX IF EXISTS idx_lesson_outputs_user_type;
   ```

## Sign-Off

- [ ] Function deployed successfully
- [ ] All tests passing
- [ ] Database verified
- [ ] Performance acceptable (< 1s)
- [ ] Error handling working
- [ ] Documentation complete
- [ ] Team notified

**Deployed by:** _________________  
**Date:** _________________  
**Environment:** ☐ Development ☐ Staging ☐ Production  

---

**Status:** Ready for deployment
