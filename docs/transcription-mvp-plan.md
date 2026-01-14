# Transcription MVP - Executable Task Breakdown

This document provides a complete task breakdown for implementing the pseudo-live transcription MVP with overlapping audio chunks.

---

## MVP Scope

### What's Included ✅

**Core Features:**
- ✅ Chunked audio recording (3s chunks with 800ms overlap)
- ✅ Direct upload to Supabase Storage
- ✅ Edge function endpoints (start, chunk, poll)
- ✅ Gemini-based transcription
- ✅ Overlap merge/deduplication algorithm
- ✅ Database tables with RLS
- ✅ Polling-based updates (2-5s interval)
- ✅ Session state management (recording → processing → complete/failed)
- ✅ Basic error handling and retry logic
- ✅ Live caption-style revisions (last 1-2 lines)

**Infrastructure:**
- ✅ Supabase Storage bucket (`raw_audio_chunks`)
- ✅ Database migrations (4 tables)
- ✅ Row Level Security policies
- ✅ Edge functions (Deno/TypeScript)
- ✅ Storage policies for user isolation

**Client Features:**
- ✅ Audio recording with overlap
- ✅ M4A/AAC encoding
- ✅ Background upload (chunks while recording)
- ✅ Real-time transcript display
- ✅ Polling for updates
- ✅ Error handling and retry

---

### What's Excluded (Post-MVP) ❌

**Not in MVP:**
- ❌ True WebSocket streaming (push-based updates)
- ❌ Speaker diarization (identifying multiple speakers)
- ❌ Word-level timestamps (only segment-level)
- ❌ Custom vocabulary or terminology training
- ❌ Real-time audio processing (client-side VAD, noise reduction)
- ❌ Offline transcription (requires internet)
- ❌ Video transcription (audio only)
- ❌ Translation to other languages
- ❌ Automated punctuation beyond Gemini defaults
- ❌ Transcript editing (view-only in MVP)
- ❌ Export formats (PDF, SRT, VTT)
- ❌ Search/indexing of transcripts
- ❌ Audio playback with transcript sync
- ❌ Window re-decode refinement (optional, costly)

**Deferred Infrastructure:**
- ❌ CDN for audio files
- ❌ Background job queue for async processing
- ❌ Analytics dashboard
- ❌ Admin panel for monitoring
- ❌ Rate limiting (basic limits only)
- ❌ Audit logging

---

## Backend Tasks

### Phase 1: Database and Storage Setup

#### Task B1.1: Run Database Migrations
**File:** `backend/supabase/migrations/001_transcription_tables.sql`

**Subtasks:**
- [ ] Review migration SQL
- [ ] Run migration via Supabase CLI or Dashboard
- [ ] Verify 4 tables created: `transcription_sessions`, `transcription_chunks`, `transcript_segments`, `transcripts`
- [ ] Verify indexes created
- [ ] Verify triggers created (`update_updated_at_column`)
- [ ] Test foreign key constraints (cascade deletes)
- [ ] Test check constraints (status enums, numeric ranges)

**Validation:**
```sql
-- Should return 4 tables
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'transcript%';

-- Should return indexes
SELECT indexname FROM pg_indexes 
WHERE tablename LIKE 'transcript%';
```

**Estimated time:** 1 hour

---

#### Task B1.2: Apply RLS Policies
**File:** `backend/supabase/policies/001_transcription_rls.sql`

**Subtasks:**
- [ ] Review RLS policies
- [ ] Run policy SQL via Supabase CLI or Dashboard
- [ ] Verify RLS enabled on all 4 tables
- [ ] Test session policies (user can only see own sessions)
- [ ] Test chunk policies (user can only access chunks from own sessions)
- [ ] Test segment policies (user can only access segments from own sessions)
- [ ] Test transcript policies (user can only access transcripts from own sessions)

**Validation:**
```sql
-- Should show rowsecurity = true for all
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename LIKE 'transcript%';

-- Test as specific user
SET LOCAL request.jwt.claims.sub = 'test-user-id';
SELECT * FROM transcription_sessions;  -- Should only see own
```

**Estimated time:** 1 hour

---

#### Task B1.3: Create Storage Bucket
**File:** Supabase Dashboard → Storage

**Subtasks:**
- [ ] Create bucket named `raw_audio_chunks`
- [ ] Set bucket to private (not public)
- [ ] Configure file size limit: 10 MB
- [ ] Configure allowed MIME types: `audio/mp4`, `audio/mpeg`, `audio/webm`, `audio/wav`, `audio/ogg`
- [ ] Create storage policies for upload (user can upload to own directories)
- [ ] Create storage policies for download (user can download own files)
- [ ] Create storage policies for delete (user can delete own files)
- [ ] Test upload to path: `transcription/{user_id}/{session_id}/chunk_0.m4a`
- [ ] Test download from same path
- [ ] Test delete from same path

**Validation:**
- Upload test file via Supabase Dashboard
- Download test file via Dashboard
- Verify permissions work for different users

**Estimated time:** 2 hours

---

### Phase 2: Edge Functions - Core Endpoints

#### Task B2.1: Implement `transcribe_start` Endpoint
**File:** `backend/supabase/functions/transcribe_start/index.ts`

**Subtasks:**
- [ ] Set up Deno edge function boilerplate
- [ ] Import Supabase client (with service role key)
- [ ] Implement authentication check (`auth.uid()`)
- [ ] Implement user limit check (max 10 concurrent sessions)
- [ ] Validate language parameter (if provided)
- [ ] Create `transcription_sessions` row (status='recording')
- [ ] Create `transcripts` row (empty full_text)
- [ ] Generate `upload_base_path` (format: `transcription/{user_id}/{session_id}/`)
- [ ] Return response: `{ session_id, upload_base_path }`
- [ ] Handle errors (401, 429, 400, 500)
- [ ] Add rate limiting (max 10 req/min per user)
- [ ] Add logging (session created, user ID, language)

**Test cases:**
- [ ] Authenticated user can create session
- [ ] Unauthenticated request returns 401
- [ ] User with 10 active sessions gets 429
- [ ] Invalid language returns 400
- [ ] Database error returns 500

**Estimated time:** 4 hours

---

#### Task B2.2: Implement `transcribe_chunk` Endpoint - Part 1 (Validation)
**File:** `backend/supabase/functions/transcribe_chunk/index.ts`

**Subtasks:**
- [ ] Set up edge function boilerplate
- [ ] Import Supabase client
- [ ] Implement authentication check
- [ ] Parse request body: `{ session_id, chunk_index, storage_path, duration_ms, overlap_ms }`
- [ ] Validate session exists and belongs to user
- [ ] Validate session status is 'recording' (not complete/failed)
- [ ] Validate chunk_index is sequential (no gaps)
- [ ] Check for duplicate chunk_index (return 409)
- [ ] Validate storage_path format
- [ ] Validate duration_ms and overlap_ms ranges
- [ ] Insert `transcription_chunks` row (status='transcribing')

**Test cases:**
- [ ] Valid request succeeds
- [ ] Invalid session_id returns 404
- [ ] Wrong user returns 403
- [ ] Session not 'recording' returns 409
- [ ] Out-of-order chunk_index returns 400
- [ ] Duplicate chunk_index returns 409

**Estimated time:** 4 hours

---

#### Task B2.3: Implement `transcribe_chunk` Endpoint - Part 2 (Gemini Integration)
**File:** `backend/supabase/functions/transcribe_chunk/gemini.ts`

**Subtasks:**
- [ ] Download audio from Storage using `storage_path`
- [ ] Validate audio file exists (404 if not)
- [ ] Validate audio format (422 if unsupported)
- [ ] Configure Gemini API client (API key from env)
- [ ] Load chunk transcription prompt from config
- [ ] Inject language hint if session.language provided
- [ ] Call Gemini API with audio and prompt
- [ ] Extract transcript text from response
- [ ] Extract confidence scores (if available)
- [ ] Implement retry logic (3 attempts, exponential backoff: 2s, 4s, 8s)
- [ ] Handle Gemini API errors (500 if all retries fail)
- [ ] Update chunk status to 'failed' on error
- [ ] Store error message in `transcription_chunks.error`

**Test cases:**
- [ ] Valid audio transcribes successfully
- [ ] Missing audio file returns 404
- [ ] Invalid audio format returns 422
- [ ] Gemini API failure retries 3 times
- [ ] Failed chunk marked with error message

**Estimated time:** 6 hours

---

#### Task B2.4: Implement `transcribe_chunk` Endpoint - Part 3 (Merge Algorithm)
**File:** `backend/supabase/functions/transcribe_chunk/merge.ts`

**Subtasks:**
- [ ] Implement text normalization (lowercase, strip punctuation, collapse whitespace)
- [ ] Fetch existing full transcript from `transcripts` table
- [ ] Extract suffix from existing transcript (last 10 words)
- [ ] Extract prefix from new chunk transcript (first 10 words)
- [ ] Implement suffix-prefix matching algorithm
- [ ] Find longest common substring (minimum 2 words)
- [ ] Trim overlap from new chunk transcript
- [ ] Implement live caption revision logic (optional, check if new version better)
- [ ] Update `transcript_segments` if revisions applied
- [ ] Append deduplicated text to full transcript
- [ ] Update `transcripts.full_text` with merged result
- [ ] Handle no-overlap case (append with warning log)

**Test cases:**
- [ ] 2-word overlap correctly identified and trimmed
- [ ] 5-word overlap correctly identified and trimmed
- [ ] No overlap case logs warning and appends
- [ ] Revision applied when new version more accurate
- [ ] Punctuation preserved correctly

**Estimated time:** 6 hours

---

#### Task B2.5: Implement `transcribe_chunk` Endpoint - Part 4 (Finalize)
**File:** `backend/supabase/functions/transcribe_chunk/index.ts`

**Subtasks:**
- [ ] Insert `transcript_segments` rows (one or more per chunk)
- [ ] Calculate timestamps (start_ms, end_ms relative to session start)
- [ ] Store confidence scores in segments
- [ ] Update chunk status to 'done'
- [ ] Update session updated_at timestamp
- [ ] Fetch newly added segments
- [ ] Return response: `{ segments_added, merged_full_text, latest_chunk_index }`
- [ ] Add comprehensive logging (chunk processed, overlap found, revisions)
- [ ] Handle all errors with appropriate status codes
- [ ] Add timeout (30s max)

**Test cases:**
- [ ] Full pipeline completes successfully
- [ ] Segments inserted with correct chunk_index
- [ ] Full merged transcript is accurate
- [ ] Response includes all expected fields
- [ ] Timeout returns 504

**Estimated time:** 4 hours

---

#### Task B2.6: Implement `transcribe_poll` Endpoint
**File:** `backend/supabase/functions/transcribe_poll/index.ts`

**Subtasks:**
- [ ] Set up edge function boilerplate
- [ ] Parse query params: `session_id`, `after_chunk_index`
- [ ] Implement authentication check
- [ ] Validate session exists and belongs to user
- [ ] Fetch session status from `transcription_sessions`
- [ ] Fetch segments filtered by `after_chunk_index` (if provided)
- [ ] Fetch latest chunk index (max chunk_index where status='done')
- [ ] Optionally fetch full transcript from `transcripts`
- [ ] Return response: `{ status, segments, merged_full_text?, latest_chunk_index? }`
- [ ] Add rate limiting (max 30 req/min per session)
- [ ] Add caching headers (cache for 2s)

**Test cases:**
- [ ] Returns current session status
- [ ] Returns all segments when after_chunk_index not provided
- [ ] Returns filtered segments when after_chunk_index provided
- [ ] Returns full transcript when requested
- [ ] Rate limiting works (429 after 30 req/min)

**Estimated time:** 3 hours

---

### Phase 3: Edge Functions - Deployment and Testing

#### Task B3.1: Deploy Edge Functions
**File:** All functions

**Subtasks:**
- [ ] Deploy `transcribe_start` to Supabase
- [ ] Deploy `transcribe_chunk` to Supabase
- [ ] Deploy `transcribe_poll` to Supabase
- [ ] Set environment variables (Gemini API key)
- [ ] Test deployed functions via curl/Postman
- [ ] Verify CORS headers for mobile client
- [ ] Test error handling in production environment
- [ ] Check logs for errors

**Validation:**
```bash
# Test transcribe_start
curl -X POST https://<project>.supabase.co/functions/v1/transcribe_start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"language":"en-US"}'

# Should return { session_id, upload_base_path }
```

**Estimated time:** 2 hours

---

#### Task B3.2: Integration Testing
**File:** Test suite

**Subtasks:**
- [ ] Write end-to-end test: start → upload → chunk → poll
- [ ] Test with real audio files (3-second M4A chunks)
- [ ] Test overlap deduplication with known inputs
- [ ] Test error cases (invalid session, missing audio, etc.)
- [ ] Test rate limiting
- [ ] Test concurrent chunk uploads
- [ ] Test session state transitions
- [ ] Verify database records created correctly
- [ ] Verify full transcript accuracy
- [ ] Performance test (10 chunks in rapid succession)

**Estimated time:** 4 hours

---

## Mobile Tasks

### Phase 1: Audio Recording Setup

#### Task M1.1: Implement Audio Recorder with Chunking
**File:** `apps/mobile/src/features/recording/AudioRecorder.tsx`

**Subtasks:**
- [ ] Set up React Native audio recording library (react-native-audio-recorder-player or expo-av)
- [ ] Request microphone permissions (iOS and Android)
- [ ] Configure audio settings:
  - [ ] Sample rate: 16000 Hz
  - [ ] Channels: Mono (1)
  - [ ] Encoding: AAC/M4A
  - [ ] Bit rate: 64 kbps
- [ ] Implement chunking logic (3000ms chunks)
- [ ] Implement overlap logic (record 800ms extra, rewind)
- [ ] Buffer chunks in memory or temp storage
- [ ] Trigger callback for each complete chunk
- [ ] Handle recording lifecycle (start, pause, resume, stop)
- [ ] Handle interruptions (phone calls, backgrounding)

**Test cases:**
- [ ] Recording starts successfully
- [ ] Chunks are 3000ms duration
- [ ] Overlap is 800ms (last 800ms of chunk N = first 800ms of chunk N+1)
- [ ] Chunks saved as M4A files
- [ ] Permissions handled correctly

**Estimated time:** 6 hours

---

#### Task M1.2: Implement Chunk Upload to Storage
**File:** `apps/mobile/src/features/recording/ChunkUploader.tsx`

**Subtasks:**
- [ ] Import Supabase client
- [ ] Implement upload function using Supabase Storage API
- [ ] Generate storage path: `transcription/{user_id}/{session_id}/chunk_{index}.m4a`
- [ ] Upload chunk blob/file to Storage
- [ ] Handle upload progress (for UI feedback)
- [ ] Implement retry logic (3 attempts, exponential backoff)
- [ ] Handle upload errors (network, quota exceeded, permissions)
- [ ] Upload chunks in background (don't block recording)
- [ ] Queue chunks if upload slower than recording rate
- [ ] Log upload success/failure

**Test cases:**
- [ ] Chunk uploads successfully to correct path
- [ ] Multiple chunks upload concurrently
- [ ] Upload retries on network failure
- [ ] Upload fails gracefully when quota exceeded
- [ ] Upload queue manages backlog

**Estimated time:** 4 hours

---

### Phase 2: Transcription API Integration

#### Task M2.1: Implement Session Management
**File:** `apps/mobile/src/features/transcription/TranscriptionSession.tsx`

**Subtasks:**
- [ ] Create session state management (useState or Context)
- [ ] Call `POST /transcribe_start` on recording start
- [ ] Store session_id and upload_base_path in state
- [ ] Track session status (recording, processing, complete, failed)
- [ ] Handle session errors (can't create, user limit reached)
- [ ] Implement session cleanup on unmount
- [ ] Persist session state (AsyncStorage) for recovery after app backgrounded

**Test cases:**
- [ ] Session created successfully
- [ ] session_id stored in state
- [ ] upload_base_path used for uploads
- [ ] Session state persists across app background/foreground
- [ ] Multiple sessions can't be created simultaneously

**Estimated time:** 3 hours

---

#### Task M2.2: Implement Chunk Transcription Calls
**File:** `apps/mobile/src/features/transcription/ChunkTranscriber.tsx`

**Subtasks:**
- [ ] Call `POST /transcribe_chunk` after each chunk upload
- [ ] Pass session_id, chunk_index, storage_path, duration_ms, overlap_ms
- [ ] Handle response (segments_added, merged_full_text, latest_chunk_index)
- [ ] Update local transcript state with new segments
- [ ] Implement retry logic for failed chunks
- [ ] Handle errors (session not found, chunk rejected, etc.)
- [ ] Track chunk processing status (uploaded, transcribing, done, failed)
- [ ] Log API calls and responses

**Test cases:**
- [ ] Chunk transcription call succeeds
- [ ] New segments added to local state
- [ ] Full transcript updated
- [ ] Failed chunks retry appropriately
- [ ] Error messages displayed to user

**Estimated time:** 4 hours

---

#### Task M2.3: Implement Polling for Updates
**File:** `apps/mobile/src/features/transcription/TranscriptionPoller.tsx`

**Subtasks:**
- [ ] Implement polling loop (every 3 seconds)
- [ ] Call `GET /transcribe_poll` with session_id and after_chunk_index
- [ ] Update local transcript with new segments
- [ ] Track latest_chunk_index to avoid fetching duplicates
- [ ] Stop polling when session status is 'complete' or 'failed'
- [ ] Handle polling errors gracefully (don't crash loop)
- [ ] Implement exponential backoff on repeated errors
- [ ] Pause polling when app backgrounded, resume when foregrounded

**Test cases:**
- [ ] Polling starts when recording begins
- [ ] New segments fetched and displayed
- [ ] Polling stops when session complete
- [ ] Polling handles network errors
- [ ] Polling pauses/resumes correctly

**Estimated time:** 3 hours

---

### Phase 3: UI and UX

#### Task M3.1: Build Recording Screen UI
**File:** `apps/mobile/src/screens/RecordingScreen.tsx`

**Subtasks:**
- [ ] Create recording screen layout
- [ ] Add record button (start/stop)
- [ ] Add pause/resume button
- [ ] Show recording duration timer
- [ ] Show visual waveform or recording indicator
- [ ] Display chunk upload progress (e.g., "Uploading chunk 5/12")
- [ ] Show transcription status (e.g., "Transcribing...")
- [ ] Handle permissions requests with clear messaging

**Design elements:**
- [ ] Record button (red circle, large, centered)
- [ ] Timer (00:00 format, top center)
- [ ] Waveform visualization (optional)
- [ ] Upload/transcription status text (bottom)

**Estimated time:** 4 hours

---

#### Task M3.2: Build Transcript Display UI
**File:** `apps/mobile/src/screens/TranscriptDisplayScreen.tsx`

**Subtasks:**
- [ ] Create scrollable transcript view
- [ ] Display transcript text in real-time as segments arrive
- [ ] Auto-scroll to bottom as new text appears
- [ ] Implement live caption behavior (replace last 1-2 lines on revision)
- [ ] Show loading indicator when transcribing
- [ ] Show error message if transcription fails
- [ ] Add empty state (no transcript yet)
- [ ] Style text for readability (font size, line height, padding)

**Design elements:**
- [ ] Scrollable text area (full screen)
- [ ] Monospace or readable font
- [ ] Auto-scroll to latest text
- [ ] Highlight revised text (optional)

**Estimated time:** 3 hours

---

#### Task M3.3: Implement Error Handling and Retry UI
**File:** Various

**Subtasks:**
- [ ] Show error toast/alert for upload failures
- [ ] Show error toast/alert for transcription failures
- [ ] Add "Retry" button for failed chunks
- [ ] Show session error if session creation fails
- [ ] Display user-friendly error messages (not raw API errors)
- [ ] Log errors to console for debugging
- [ ] Handle quota exceeded gracefully (inform user)

**Error messages:**
- "Couldn't upload audio. Retrying..."
- "Transcription failed. Please check your connection."
- "Session limit reached. Please complete an active session first."

**Estimated time:** 2 hours

---

### Phase 4: Testing and Refinement

#### Task M4.1: Manual Testing
**File:** N/A (testing)

**Subtasks:**
- [ ] Test full recording flow (start → record 30s → stop)
- [ ] Verify transcript appears in real-time
- [ ] Test with different audio qualities (quiet, loud, noisy)
- [ ] Test with different accents and speaking speeds
- [ ] Test interruptions (phone call during recording)
- [ ] Test app backgrounding/foregrounding
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test with poor network connection
- [ ] Test with no network connection (should fail gracefully)

**Estimated time:** 4 hours

---

#### Task M4.2: Performance Testing
**File:** N/A (testing)

**Subtasks:**
- [ ] Record long session (5+ minutes)
- [ ] Verify no memory leaks
- [ ] Verify battery usage is reasonable
- [ ] Check upload queue doesn't grow unbounded
- [ ] Verify app doesn't crash on long recordings
- [ ] Profile audio recording overhead
- [ ] Profile upload/transcription overhead

**Estimated time:** 2 hours

---

## QA Checklist

### Overlap and Text Quality

#### Boundary Repeats (Most Critical)

**What to check:**
- [ ] No duplicate words at chunk boundaries
- [ ] Example: "beautiful morning" should not appear twice
- [ ] Test with 5 consecutive chunks, verify no duplicates

**How to test:**
1. Record audio with clear chunk boundaries
2. Speak phrase that spans boundary (e.g., say "beautiful morning outside" at 2.5s-3.5s mark)
3. Check merged transcript for duplicates
4. Expected: "...beautiful morning outside..." (once)
5. Not: "...beautiful morning beautiful morning outside..."

**Pass criteria:**
- [ ] 0 duplicate words in merged transcript
- [ ] Overlap region correctly identified (logged)
- [ ] Trimmed text logged shows correct overlap length

---

#### Missing Words

**What to check:**
- [ ] No words dropped at chunk boundaries
- [ ] All spoken words appear in transcript
- [ ] Test with fast speech and slow speech

**How to test:**
1. Record known text (read a paragraph)
2. Compare transcript to source text
3. Count missing words
4. Check if missing words are at chunk boundaries

**Pass criteria:**
- [ ] <5% words missing overall
- [ ] <1% words missing at chunk boundaries
- [ ] `[inaudible]` markers used appropriately for genuinely unclear audio

---

#### Live Caption Revisions

**What to check:**
- [ ] Last 1-2 lines can be revised
- [ ] Revisions improve accuracy
- [ ] Older text is never changed

**How to test:**
1. Record audio with correctable error in overlap region
2. Example: Say "photo synthesis" (as two words) then "photosynthesis" (as one word)
3. Check if revision applied
4. Check if older segments unchanged

**Pass criteria:**
- [ ] Revision applied when appropriate (e.g., "photo synthesis" → "photosynthesis")
- [ ] Only segments within last 2 chunks revised
- [ ] Segments older than 2 chunks never changed
- [ ] Revision confidence threshold met (80%+)

---

### Failure Handling

#### Network Failures

**What to check:**
- [ ] Upload retries work
- [ ] Transcription API retries work
- [ ] Polling handles network errors gracefully
- [ ] User is informed of network issues

**How to test:**
1. Start recording
2. Disable network mid-recording
3. Re-enable network
4. Verify system recovers

**Pass criteria:**
- [ ] Chunks queued during network outage
- [ ] Chunks upload when network restored
- [ ] Transcription resumes automatically
- [ ] No data loss
- [ ] User sees clear error message and recovery indication

---

#### API Errors

**What to check:**
- [ ] 429 rate limit handled with backoff
- [ ] 500 errors retry with exponential backoff
- [ ] 4xx errors don't retry indefinitely
- [ ] Errors logged for debugging

**How to test:**
1. Simulate rate limit (many rapid requests)
2. Verify 429 response handled
3. Verify retry after delay
4. Simulate 500 error from API
5. Verify retries with backoff

**Pass criteria:**
- [ ] Rate limit respected (waits before retry)
- [ ] 500 errors retry 3 times with backoff (2s, 4s, 8s)
- [ ] 4xx errors fail fast (no retries except 429)
- [ ] Error messages shown to user

---

#### Audio Quality Issues

**What to check:**
- [ ] Background noise handled gracefully
- [ ] Quiet audio doesn't crash system
- [ ] Loud audio doesn't distort
- [ ] `[inaudible]` markers used appropriately

**How to test:**
1. Record in noisy environment
2. Record very quiet speech
3. Record loud speech
4. Record with music in background

**Pass criteria:**
- [ ] System doesn't crash on any audio quality
- [ ] Transcription attempts all chunks
- [ ] `[inaudible]` markers used when genuinely unclear
- [ ] Poor quality logged for review

---

#### Edge Cases

**What to check:**
- [ ] Very short recording (< 5 seconds) works
- [ ] Very long recording (> 1 hour) works
- [ ] Rapid start/stop works
- [ ] App backgrounding during recording works
- [ ] Phone call during recording handled gracefully

**How to test:**
1. Record 2-second clip (< 1 chunk)
2. Record 2-hour clip (many chunks)
3. Start and immediately stop recording
4. Background app during recording
5. Receive phone call during recording

**Pass criteria:**
- [ ] Short recordings complete successfully
- [ ] Long recordings don't cause memory issues or crashes
- [ ] Rapid start/stop doesn't cause race conditions
- [ ] Backgrounding pauses recording gracefully
- [ ] Phone call pauses recording, resumes after

---

## Cost Controls Checklist

### API Usage Controls

#### Gemini API Limits

**Controls to implement:**
- [ ] Max 10 concurrent transcriptions per user
- [ ] Max 4800 chunks per session (4 hours @ 3s chunks)
- [ ] Timeout after 5 minutes of inactivity (auto-finalize session)
- [ ] Rate limit: Max 60 chunks per minute per session
- [ ] Log all Gemini API calls for cost tracking

**Monitoring:**
- [ ] Track Gemini API usage per user per day
- [ ] Alert if user exceeds 1000 API calls per day
- [ ] Alert if global API usage exceeds budget threshold
- [ ] Dashboard showing daily/monthly Gemini costs

**Cost estimation:**
- 1 hour recording = 1200 chunks @ 3s each
- Gemini API cost: ~$X per 1000 chunks (check current pricing)
- Target: < $0.50 per hour of recording

---

#### Storage Controls

**Controls to implement:**
- [ ] Max 500 MB storage per user
- [ ] Max 10 MB per chunk (reject larger files)
- [ ] Delete raw audio after 30 days (keep transcripts)
- [ ] Delete failed sessions after 7 days
- [ ] Implement storage cleanup cron job

**Monitoring:**
- [ ] Track storage usage per user
- [ ] Alert when user approaches 500 MB limit
- [ ] Alert when global storage exceeds budget
- [ ] Dashboard showing storage growth over time

**Cost estimation:**
- 1 hour M4A audio ≈ 30 MB
- 500 MB limit ≈ 16 hours of audio per user
- Storage cost: ~$0.021 per GB per month (Supabase pricing)
- Target: < $10/month storage costs per 100 users

---

#### Rate Limiting

**Limits to enforce:**
- [ ] Max 10 sessions per minute per user (prevent abuse)
- [ ] Max 60 chunks per minute per session (prevent spam)
- [ ] Max 30 polls per minute per session (prevent poll spam)
- [ ] Global limit: 1000 API requests per minute

**Implementation:**
- [ ] Use Supabase Edge Function rate limiting
- [ ] Return 429 with `retry_after` header
- [ ] Log rate limit violations
- [ ] Block users who repeatedly violate limits (manual review)

---

#### User Quotas

**Quotas to implement:**
- [ ] Free tier: 2 hours of transcription per month
- [ ] Premium tier: 20 hours of transcription per month
- [ ] Track usage per user per month
- [ ] Enforce quota limits (reject new sessions when exceeded)
- [ ] Allow quota reset on subscription renewal

**UI indicators:**
- [ ] Show user their quota usage (e.g., "1.5 / 2.0 hours used this month")
- [ ] Warn user when approaching limit (e.g., "90% of quota used")
- [ ] Clear error message when quota exceeded
- [ ] Upsell to premium tier when free quota exceeded

---

#### Optional: Window Re-decode (Cost Multiplier)

**Decision:**
- [ ] **Disable in MVP** (adds 20% cost, defer to post-MVP)
- [ ] If enabled, only for premium users
- [ ] Provide toggle in settings (on/off)

**Cost impact:**
- Window re-decode: 20% more API calls
- Free tier: Would reduce quota from 2h to 1.67h
- Premium tier: More expensive, less appealing

**Recommendation:** Disable window re-decode in MVP, evaluate if users need it post-launch.

---

## Timeline Estimate

### Backend Track
- Phase 1 (Database/Storage): 4 hours
- Phase 2 (Edge Functions): 27 hours
- Phase 3 (Deploy/Test): 6 hours
- **Total Backend: ~37 hours** (≈1 week)

### Mobile Track
- Phase 1 (Audio Recording): 10 hours
- Phase 2 (API Integration): 10 hours
- Phase 3 (UI/UX): 9 hours
- Phase 4 (Testing): 6 hours
- **Total Mobile: ~35 hours** (≈1 week)

### QA and Refinement
- QA Checklist execution: 8 hours
- Bug fixes and refinement: 8 hours
- **Total QA: ~16 hours** (≈2-3 days)

### **Total MVP: ~88 hours (≈2-2.5 weeks with 1 full-time developer)**

---

## Success Criteria

**MVP is complete when:**
- [ ] User can record audio on mobile
- [ ] Audio automatically uploads as chunks to Supabase Storage
- [ ] Backend transcribes chunks using Gemini
- [ ] Transcript appears in real-time on mobile screen
- [ ] Overlap deduplication works (no duplicate words)
- [ ] Live caption revisions work (last 1-2 lines can update)
- [ ] Error handling works (network failures, API errors)
- [ ] Cost controls in place (rate limits, quotas, cleanup)
- [ ] All QA checklist items pass
- [ ] Documentation complete and accurate

**Definition of "Done":**
- All backend tasks completed and tested
- All mobile tasks completed and tested
- All QA checklist items pass
- Cost controls verified
- Performance acceptable (< 5s latency per chunk)
- No critical bugs
- User-facing errors handled gracefully

---

## Post-MVP Enhancements (Backlog)

**High Priority:**
1. WebSocket streaming (replace polling)
2. Transcript editing (manual corrections)
3. Export formats (PDF, TXT, SRT)
4. Audio playback with transcript sync

**Medium Priority:**
5. Speaker diarization (multi-speaker support)
6. Word-level timestamps
7. Custom vocabulary/terminology
8. Translation to other languages

**Low Priority:**
9. Window re-decode refinement
10. Real-time audio processing (VAD, noise reduction)
11. Offline transcription
12. Video transcription

---

## Related Documentation

- [Transcription Contracts](../contracts/README.md)
- [Database Schema](../backend/supabase/migrations/001_transcription_tables.sql)
- [RLS Policies](../backend/supabase/policies/001_transcription_rls.sql)
- [Edge Functions API](../backend/docs/edge-functions-transcription.md)
- [Storage Setup](../backend/docs/transcription-storage.md)
- [Gemini Prompts](../backend/ai/gemini/prompts.transcription.md)
