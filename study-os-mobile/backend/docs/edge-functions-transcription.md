# Edge Functions - Transcription API Specification

This document fully specifies the pseudo-live transcription API endpoints, state machine, and behavior for overlapping audio chunk processing.

---

## Overview

The transcription API enables real-time audio transcription using a chunked upload approach:

1. Client starts a session
2. Client uploads audio chunks (3s each, 800ms overlap) to Supabase Storage
3. Client calls API to transcribe each chunk
4. Backend downloads audio, transcribes with Gemini, merges text
5. Client polls for updates (optional)
6. Client finalizes session when recording complete

**Key Features:**
- Near-real-time transcription (3-5 second latency per chunk)
- Overlap deduplication for seamless text merging
- Live caption-style revisions (last 1-2 lines may update)
- Stateful processing with retry support

---

## Endpoints

### 1. POST `/transcribe_start`

Start a new transcription session.

#### Authentication
- **Required**: Yes
- **Method**: JWT Bearer token (Supabase auth)
- **User**: `auth.uid()` must be valid

#### Request

```typescript
{
  language?: string  // Optional: 'en-US', 'es-ES', 'fr-FR', etc.
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Validation:**
- `language` must be supported by Gemini (if provided)
- User must not exceed max concurrent sessions (default: 10)

#### Response

```typescript
{
  session_id: string,          // UUID of created session
  upload_base_path: string     // Storage path prefix for chunks
}
```

**Example:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "upload_base_path": "transcription/user123/a1b2c3d4-e5f6-7890-abcd-ef1234567890/"
}
```

#### Behavior

1. **Validate user authentication**
   - Check `auth.uid()` is valid
   - Return 401 if not authenticated

2. **Check user limits**
   - Count user's active sessions (status = 'recording' or 'processing')
   - Return 429 if limit exceeded (max 10 concurrent sessions)

3. **Validate language**
   - If provided, check language is supported by Gemini
   - Return 400 if language not supported
   - Default to 'en-US' if not provided

4. **Create transcription session**
   - Insert row into `transcription_sessions`:
     ```sql
     INSERT INTO transcription_sessions (user_id, source_type, status, language)
     VALUES (auth.uid(), 'live_recording', 'recording', <language>)
     RETURNING id
     ```
   - Status: `recording`
   - Timestamps: `created_at`, `updated_at` auto-set

5. **Generate upload path**
   - Format: `transcription/{user_id}/{session_id}/`
   - Include trailing slash for easy path construction

6. **Initialize transcript record (optional)**
   - Insert row into `transcripts`:
     ```sql
     INSERT INTO transcripts (session_id, full_text)
     VALUES (<session_id>, '')
     ```

7. **Return response**
   - Return `session_id` and `upload_base_path`

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 429 | `TOO_MANY_SESSIONS` | User has reached max concurrent sessions (10) |
| 400 | `LANGUAGE_NOT_SUPPORTED` | Requested language not available |
| 500 | `INTERNAL_ERROR` | Database or system error |

#### Rate Limits

- Max 10 requests per minute per user
- Max 100 requests per minute globally

---

### 2. POST `/transcribe_chunk`

Submit an audio chunk for transcription.

#### Authentication
- **Required**: Yes
- **Method**: JWT Bearer token (Supabase auth)

#### Request

```typescript
{
  session_id: string,      // Session UUID from /transcribe_start
  chunk_index: number,     // Sequential index: 0, 1, 2, ...
  storage_path: string,    // Full Storage path to uploaded audio
  duration_ms: number,     // Chunk duration in milliseconds
  overlap_ms: number       // Overlap with previous chunk (0 for first)
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Example:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chunk_index": 0,
  "storage_path": "transcription/user123/a1b2c3d4.../chunk_0.m4a",
  "duration_ms": 3000,
  "overlap_ms": 0
}
```

**Validation:**
- `session_id` must exist and belong to authenticated user
- `chunk_index` must be sequential (no gaps)
- `storage_path` must exist in Storage
- `duration_ms` must be > 0 and < 60000 (max 60s per chunk)
- `overlap_ms` must be >= 0 and < duration_ms

#### Response

```typescript
{
  segments_added: TranscriptSegment[],  // New segments from this chunk
  merged_full_text?: string,            // Optional: Full transcript so far
  latest_chunk_index: number            // Latest processed chunk index
}
```

**Example:**
```json
{
  "segments_added": [
    {
      "id": "seg1",
      "session_id": "a1b2c3d4...",
      "chunk_index": 0,
      "text": "Hello, how are you doing today?",
      "start_ms": 0,
      "end_ms": 2800,
      "confidence": 0.95,
      "created_at": "2026-01-09T14:30:00Z"
    }
  ],
  "merged_full_text": "Hello, how are you doing today?",
  "latest_chunk_index": 0
}
```

#### Behavior

##### Step 1: Validate Session Ownership and Status

1. **Fetch session from database**
   ```sql
   SELECT * FROM transcription_sessions
   WHERE id = <session_id> AND user_id = auth.uid()
   ```

2. **Check session exists**
   - Return 404 if session not found
   - Return 403 if session belongs to different user

3. **Check session status**
   - Must be `status = 'recording'`
   - Return 409 if status is 'processing', 'complete', or 'failed'

##### Step 2: Validate Chunk Index Order

1. **Fetch latest chunk for session**
   ```sql
   SELECT MAX(chunk_index) FROM transcription_chunks
   WHERE session_id = <session_id>
   ```

2. **Check chunk order**
   - If no previous chunks: `chunk_index` must be 0
   - If previous chunks exist: `chunk_index` must be `max(chunk_index) + 1`
   - Return 400 if chunk index out of order (gaps not allowed)

3. **Check for duplicate**
   - If chunk with same index exists, return 409
   - Client should not retry with same index

##### Step 3: Insert/Update Chunk Record

1. **Insert chunk record**
   ```sql
   INSERT INTO transcription_chunks (
     session_id, chunk_index, storage_path, 
     duration_ms, overlap_ms, status
   ) VALUES (
     <session_id>, <chunk_index>, <storage_path>,
     <duration_ms>, <overlap_ms>, 'transcribing'
   )
   RETURNING id
   ```
   - Status: `transcribing` (in progress)

2. **Handle concurrent requests**
   - Use unique constraint on `(session_id, chunk_index)` to prevent duplicates
   - Return 409 if duplicate detected

##### Step 4: Fetch Audio from Storage

1. **Download audio file**
   ```typescript
   // Pseudocode
   const { data, error } = await supabase.storage
     .from('raw_audio_chunks')
     .download(storage_path)
   ```

2. **Validate file**
   - Check file exists (return 404 if not found)
   - Check file size < 10 MB
   - Check file format is supported (M4A, WebM, WAV, MP3, OGG)

3. **Error handling**
   - If download fails, mark chunk as `status = 'failed'`
   - Store error message in `transcription_chunks.error`
   - Return 500 with error details

##### Step 5: Transcribe with Gemini

1. **Prepare audio for Gemini**
   - Convert to format compatible with Gemini (if needed)
   - Ensure sample rate is appropriate (16kHz recommended)

2. **Call Gemini API**
   ```typescript
   // Pseudocode
   const response = await gemini.transcribeAudio({
     audio: audioBuffer,
     language: session.language || 'en-US',
     options: {
       enableAutomaticPunctuation: true,
       enableWordTimeOffsets: true,
       maxAlternatives: 1
     }
   })
   ```

3. **Extract transcript**
   - Get full transcript text
   - Get word-level timestamps (if available)
   - Get confidence scores

4. **Error handling**
   - If Gemini call fails, mark chunk as `status = 'failed'`
   - Store error in `transcription_chunks.error`
   - Return 500 with error details
   - Implement retry logic (up to 3 attempts with exponential backoff)

##### Step 6: Insert Transcript Segments

1. **Create segment records**
   - Split transcript into logical segments (sentences or phrases)
   - Calculate timestamps relative to session start:
     ```
     segment.start_ms = (chunk_index * chunk_duration_ms) - overlap_ms + word_start_offset
     segment.end_ms = segment.start_ms + word_duration
     ```

2. **Insert segments**
   ```sql
   INSERT INTO transcript_segments (
     session_id, chunk_index, text, 
     start_ms, end_ms, confidence
   ) VALUES (
     <session_id>, <chunk_index>, <text>,
     <start_ms>, <end_ms>, <confidence>
   )
   ```

3. **Handle multiple segments per chunk**
   - A 3-second chunk may produce 1-3 segments (sentences)
   - Each segment inserted separately

##### Step 7: Merge into Full Transcript (Overlap Deduplication)

**Algorithm Overview:**

The overlap deduplication algorithm ensures seamless text merging by:
1. Comparing text from overlap region with previous chunk
2. Identifying duplicate words/phrases
3. Trimming duplicates from new chunk
4. Applying "live caption" revisions if needed
5. Appending deduplicated text to full transcript

**Detailed Algorithm:**

1. **Fetch previous chunk transcript** (if `chunk_index > 0`)
   ```sql
   SELECT text FROM transcript_segments
   WHERE session_id = <session_id> 
     AND chunk_index = <chunk_index - 1>
   ORDER BY created_at
   ```

2. **Extract overlap region text**
   - From previous chunk: Last ~800ms of text (approximately last 2-4 words)
   - From current chunk: First ~800ms of text (approximately first 2-4 words)

3. **Find overlap match**
   - Compare overlap text from both chunks
   - Use fuzzy matching (Levenshtein distance or similar)
   - Allow for minor transcription differences (e.g., "it's" vs "its")

4. **Trim duplicate text from current chunk**
   - Remove matched overlap text from start of current chunk
   - Keep only new text that wasn't in previous chunk

5. **Apply "live caption" revisions** (optional)
   - If overlap reveals better transcription, update previous segment(s)
   - Example: 
     ```
     Previous: "...the power house of the cell"
     Current:  "...the powerhouse of the cell and..."
     Revision: Update previous to "...the powerhouse of the cell"
     ```
   - Only revise last 1-2 segments (avoid cascading changes)
   - Update `transcript_segments` rows if revised

6. **Append to full transcript**
   ```sql
   UPDATE transcripts
   SET full_text = full_text || ' ' || <deduplicated_text>,
       updated_at = now()
   WHERE session_id = <session_id>
   ```

**Example Overlap Deduplication:**

```
Chunk 0 (0.0s - 3.0s):
  Transcript: "Hello, how are you doing today? It's a beautiful morning."
  
Chunk 1 (2.2s - 5.2s):  [800ms overlap with Chunk 0]
  Raw transcript: "beautiful morning. Let's talk about cellular respiration."
  
Overlap region:
  Previous: "...beautiful morning."
  Current:  "beautiful morning. Let's..."
  Match found: "beautiful morning."
  
Deduplicated Chunk 1:
  "Let's talk about cellular respiration."
  
Merged full transcript:
  "Hello, how are you doing today? It's a beautiful morning. Let's talk about cellular respiration."
```

**Live Caption Revision Example:**

```
After Chunk 0:
  "The mitochondria is the power house of the cell."
  
After Chunk 1 (with overlap):
  Raw: "...the powerhouse of the cell. It produces ATP energy."
  
Revision detected:
  "power house" → "powerhouse" (single word more accurate)
  
Final merged transcript:
  "The mitochondria is the powerhouse of the cell. It produces ATP energy."
  (Note: "power house" was revised to "powerhouse")
```

##### Step 8: Mark Chunk as Done

1. **Update chunk status**
   ```sql
   UPDATE transcription_chunks
   SET status = 'done'
   WHERE id = <chunk_id>
   ```

2. **Update session timestamp**
   ```sql
   UPDATE transcription_sessions
   SET updated_at = now()
   WHERE id = <session_id>
   ```

##### Step 9: Return Response

1. **Fetch newly added segments**
   ```sql
   SELECT * FROM transcript_segments
   WHERE session_id = <session_id> 
     AND chunk_index = <chunk_index>
   ORDER BY created_at
   ```

2. **Optionally fetch full transcript**
   ```sql
   SELECT full_text FROM transcripts
   WHERE session_id = <session_id>
   ```

3. **Return response**
   - Include all segments added for this chunk
   - Optionally include full merged transcript (useful for client sync)
   - Include latest chunk index processed

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | Session belongs to different user |
| 404 | `SESSION_NOT_FOUND` | Session ID not found |
| 404 | `AUDIO_NOT_FOUND` | Storage path does not exist |
| 400 | `INVALID_CHUNK_INDEX` | Chunk index out of order or invalid |
| 409 | `CHUNK_ALREADY_EXISTS` | Duplicate chunk index |
| 409 | `SESSION_NOT_RECORDING` | Session status is not 'recording' |
| 413 | `CHUNK_TOO_LARGE` | Audio file exceeds 10 MB limit |
| 422 | `AUDIO_FORMAT_UNSUPPORTED` | Audio format not supported |
| 500 | `TRANSCRIPTION_FAILED` | Gemini transcription service error |
| 500 | `INTERNAL_ERROR` | Database or system error |

#### Rate Limits

- Max 60 requests per minute per session (1 chunk per second on average)
- Max 10 concurrent transcriptions per user
- Timeout: 30 seconds per chunk transcription

#### Retry Behavior

**Client Retry:**
- On 500 errors: Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- On 429 errors: Wait and retry after rate limit window
- On 4xx errors (except 429): Do not retry (client error)

**Backend Retry:**
- Gemini API failures: Retry up to 3 times with exponential backoff (2s, 4s, 8s)
- Storage download failures: Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Database transient errors: Retry up to 3 times immediately

---

### 3. GET `/transcribe_poll`

Poll for transcription updates and session status.

#### Authentication
- **Required**: Yes
- **Method**: JWT Bearer token (Supabase auth)

#### Request

**Query Parameters:**
```typescript
{
  session_id: string,           // Session UUID (required)
  after_chunk_index?: number    // Optional: Only return segments after this index
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Example:**
```
GET /transcribe_poll?session_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&after_chunk_index=5
```

**Validation:**
- `session_id` is required
- `after_chunk_index` must be >= 0 if provided
- Session must belong to authenticated user

#### Response

```typescript
{
  status: 'recording' | 'processing' | 'complete' | 'failed',
  segments: TranscriptSegment[],       // Filtered by after_chunk_index
  merged_full_text?: string,           // Optional: Full transcript
  latest_chunk_index?: number,         // Latest processed chunk
  error?: string                       // If status = 'failed'
}
```

**Example:**
```json
{
  "status": "recording",
  "segments": [
    {
      "id": "seg6",
      "session_id": "a1b2c3d4...",
      "chunk_index": 6,
      "text": "Photosynthesis converts light energy into chemical energy.",
      "start_ms": 18000,
      "end_ms": 21000,
      "confidence": 0.92,
      "created_at": "2026-01-09T14:35:00Z"
    }
  ],
  "merged_full_text": "...(full transcript)...",
  "latest_chunk_index": 6
}
```

#### Behavior

1. **Validate session ownership**
   ```sql
   SELECT status FROM transcription_sessions
   WHERE id = <session_id> AND user_id = auth.uid()
   ```
   - Return 404 if not found
   - Return 403 if belongs to different user

2. **Fetch session status**
   - Return current session status

3. **Fetch segments** (optionally filtered)
   ```sql
   SELECT * FROM transcript_segments
   WHERE session_id = <session_id>
     AND (chunk_index > <after_chunk_index> OR <after_chunk_index> IS NULL)
   ORDER BY chunk_index, created_at
   ```

4. **Fetch latest chunk index**
   ```sql
   SELECT MAX(chunk_index) FROM transcription_chunks
   WHERE session_id = <session_id> AND status = 'done'
   ```

5. **Optionally fetch full transcript**
   ```sql
   SELECT full_text FROM transcripts
   WHERE session_id = <session_id>
   ```

6. **Return response**
   - Include session status
   - Include filtered segments
   - Optionally include full transcript (useful for client sync)
   - Include latest processed chunk index

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | Session belongs to different user |
| 404 | `SESSION_NOT_FOUND` | Session ID not found |
| 400 | `INVALID_QUERY_PARAMS` | Invalid query parameters |
| 500 | `INTERNAL_ERROR` | Database or system error |

#### Rate Limits

- Max 30 requests per minute per session
- Recommended polling interval: 2-5 seconds

#### Use Cases

**Real-time Updates:**
- Client polls every 2-3 seconds during active recording
- Pass `after_chunk_index` to get only new segments since last poll
- Display new text as it arrives

**Status Checking:**
- Check if transcription is complete
- Check for errors during processing
- Determine when to stop polling

**Sync After Disconnect:**
- Client reconnects after network interruption
- Poll with `after_chunk_index` of last received segment
- Catch up on missed transcription results

---

## State Machine

### Session Status States

```
     [START]
        ↓
   ┌─────────────┐
   │  recording  │ ← Initial state after /transcribe_start
   └─────────────┘
        ↓ (client calls /transcribe_finish or final chunk processed)
   ┌─────────────┐
   │ processing  │ ← Finalizing transcription
   └─────────────┘
        ↓ ↓
        ↓ └─→ (error)
        ↓         ↓
   ┌─────────────┐   ┌──────────┐
   │  complete   │   │  failed  │
   └─────────────┘   └──────────┘
     [END - success]  [END - error]
```

#### State Descriptions

**`recording`**
- Active recording session
- Client can upload chunks
- Client calls `/transcribe_chunk` for each chunk
- Session can be in this state for minutes to hours
- Transition to `processing` when client signals completion or timeout

**`processing`**
- Client finished recording, finalizing transcription
- No new chunks accepted
- Backend may be processing last few chunks
- Performing final merge and cleanup
- Typically brief (seconds to minutes)
- Transition to `complete` when all chunks processed successfully
- Transition to `failed` if critical error occurs

**`complete`**
- All chunks transcribed successfully
- Full transcript available
- Session read-only (no changes allowed)
- Terminal state (success)

**`failed`**
- Transcription failed due to error
- Error message stored in session or chunk
- Client should not retry (requires new session)
- Terminal state (error)

#### State Transitions

| From | To | Trigger | Conditions |
|------|-----|---------|------------|
| `recording` | `processing` | Client calls `/transcribe_finish` | All expected chunks received |
| `recording` | `processing` | Automatic timeout | No chunks received for 5 minutes |
| `recording` | `failed` | Critical error | Unrecoverable system error |
| `processing` | `complete` | All chunks done | All chunks have `status = 'done'` |
| `processing` | `failed` | Processing error | Too many failed chunks or critical error |
| `complete` | - | - | Terminal state |
| `failed` | - | - | Terminal state |

---

### Chunk Status States

```
     [START]
        ↓
   ┌───────────┐
   │ uploaded  │ ← Chunk record created, audio in Storage
   └───────────┘
        ↓ (backend starts transcription)
   ┌───────────┐
   │transcribing│ ← Actively being transcribed by Gemini
   └───────────┘
        ↓ ↓
        ↓ └─→ (error)
        ↓         ↓
   ┌─────────┐   ┌──────────┐
   │  done   │   │  failed  │
   └─────────┘   └──────────┘
   [END - success] [END - error]
```

#### State Descriptions

**`uploaded`**
- Chunk record exists in database
- Audio file exists in Storage
- Waiting for backend to start transcription
- Typically brief (milliseconds to seconds)

**`transcribing`**
- Backend actively transcribing this chunk
- Audio downloaded from Storage
- Gemini API call in progress
- Typically 1-5 seconds

**`done`**
- Transcription completed successfully
- Segments inserted into database
- Text merged into full transcript
- Terminal state (success)

**`failed`**
- Transcription failed for this chunk
- Error message stored in `transcription_chunks.error`
- Client may retry by submitting chunk again (new chunk_index)
- Terminal state (error)

#### State Transitions

| From | To | Trigger | Conditions |
|------|-----|---------|------------|
| `uploaded` | `transcribing` | Backend starts processing | API call received |
| `transcribing` | `done` | Transcription success | Gemini returns transcript |
| `transcribing` | `failed` | Transcription error | Gemini fails after retries |
| `uploaded` | `failed` | Timeout | No processing started within 60s |
| `done` | - | - | Terminal state |
| `failed` | - | - | Terminal state (client can submit new chunk) |

---

## Live Caption Style Behavior

### Overview

The transcription system uses **"live caption" style processing**, which means:
1. The backend may **revise the last 1-2 lines** of transcript when new chunks arrive
2. Text is not strictly append-only
3. Client should **replace the last 1-2 segments** rather than only appending

This mimics how live TV captions or YouTube auto-captions work: as more context arrives, previous text may be refined for accuracy.

### Why Revisions Occur

#### Reason 1: Better Context

Gemini transcribes more accurately with more context. When chunk N+1 arrives, the overlap region provides additional context that may improve transcription of chunk N.

**Example:**
```
Chunk 0 alone: "The cell contains many organelles including the mighty con drea"
Chunk 1 with overlap: "...mitochondria which produces ATP"

Revision: "mighty con drea" → "mitochondria" (clearer with more context)
```

#### Reason 2: Word Boundaries

Audio segmentation may split words awkwardly. The overlap allows the backend to detect and fix split words.

**Example:**
```
Chunk 0: "We need to study photo..."
Chunk 1: "...synthesis today"

Revision: "photo" becomes "photosynthesis" (joined across chunk boundary)
```

#### Reason 3: Punctuation and Grammar

With more context, the backend can add better punctuation and correct grammar.

**Example:**
```
Chunk 0: "lets talk about biology its really interesting"
Chunk 1: "especially when studying cells"

Revision: "lets talk about biology its really interesting" 
       → "Let's talk about biology. It's really interesting,"
```

### Revision Scope

**Only last 1-2 segments revised:**
- Revisions are limited to recent text (within overlap window)
- Earlier segments are never changed (stable history)
- Prevents cascading changes that would disrupt client UI

**Which segments can be revised:**
- Segments from chunk N-1 (immediately previous chunk)
- Only if they fall within the overlap region (~800ms = last 2-4 words)
- Maximum 2 segments (typically 1-2 sentences)

**Which segments are never revised:**
- Segments from chunk N-2 or earlier (older chunks)
- Segments outside overlap window
- Already-finalized segments

### Client Handling

#### Recommended Display Strategy

**Option 1: Replace Last N Lines (Recommended)**
```typescript
// Pseudocode
function updateTranscript(newSegments) {
  // Remove last 1-2 segments from display
  const stableSegments = displayedSegments.slice(0, -2);
  
  // Append all new segments (includes any revisions)
  const updatedSegments = [...stableSegments, ...newSegments];
  
  // Render updated transcript
  setDisplayedSegments(updatedSegments);
}
```

**Option 2: Diff and Update**
```typescript
// Pseudocode
function updateTranscript(newSegments) {
  // Compare new segments with existing
  const { added, modified } = diffSegments(displayedSegments, newSegments);
  
  // Update only changed segments
  for (const segment of modified) {
    updateSegmentInUI(segment.id, segment.text);
  }
  
  // Append new segments
  appendSegmentsToUI(added);
}
```

**Option 3: Show Revision Indicator**
```typescript
// Show visual indicator when text is revised
<span className="revised">mitochondria</span>  // Highlight revised word
<span className="deleted">mighty con drea</span> // Show strikethrough
```

#### Client State Management

**Track revision status:**
```typescript
interface DisplayedSegment {
  id: string;
  text: string;
  chunk_index: number;
  is_final: boolean;      // True if older than 2 chunks
  can_be_revised: boolean; // True if within last 2 segments
}
```

**Mark segments as final:**
```typescript
// After chunk N+2 arrives, segments from chunk N are final
function markSegmentsAsFinal(chunk_index: number) {
  segments
    .filter(seg => seg.chunk_index <= chunk_index - 2)
    .forEach(seg => seg.is_final = true);
}
```

### Backend Revision Logic

1. **Compare overlap text**
   - Extract last ~800ms of previous chunk
   - Extract first ~800ms of current chunk
   - Find matching text region

2. **Detect differences**
   - Compare transcribed text in overlap region
   - Use fuzzy matching to allow minor variations
   - Calculate confidence that revision is better

3. **Apply revision if confidence high**
   - Threshold: 80% confidence that new version is more accurate
   - Update affected `transcript_segments` rows
   - Mark as revised in response (optional flag)

4. **Update full transcript**
   - Replace revised text in `transcripts.full_text`
   - Maintain correct word order and spacing

### Example: Full Revision Flow

```
=== Chunk 0 Processing ===
Raw transcript: "The mitochondria is the power house of the cell"
Segments: ["The mitochondria is the power house of the cell"]
Full text: "The mitochondria is the power house of the cell"

Client displays:
  "The mitochondria is the power house of the cell"

=== Chunk 1 Processing (with 800ms overlap) ===
Overlap region in Chunk 0: "power house of the cell"
Overlap region in Chunk 1: "powerhouse of the cell and"

Difference detected: "power house" vs "powerhouse"
Confidence: 95% (Chunk 1 more accurate with more context)

Revision applied:
  Segment updated: "The mitochondria is the powerhouse of the cell"
  Full text: "The mitochondria is the powerhouse of the cell"

New text from Chunk 1: "and it produces ATP energy"
Deduplicated: "and it produces ATP energy"

Final full text: "The mitochondria is the powerhouse of the cell and it produces ATP energy"

Client receives response:
  segments_added: [
    { text: "The mitochondria is the powerhouse of the cell", chunk_index: 0, revised: true },
    { text: "and it produces ATP energy", chunk_index: 1, revised: false }
  ]

Client updates display:
  1. Remove last segment (old version)
  2. Append revised segment + new segment
  
Result:
  "The mitochondria is the powerhouse of the cell and it produces ATP energy"
```

---

## Limits and Constraints

### Session Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max concurrent sessions per user | 10 | Prevent resource exhaustion |
| Max session duration | 4 hours | Prevent abandoned sessions |
| Session timeout (no chunks) | 5 minutes | Auto-cleanup inactive sessions |
| Max chunks per session | 4800 | 4 hours @ 3s chunks = 4800 chunks |

### Chunk Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max chunk size | 10 MB | Storage and bandwidth efficiency |
| Max chunk duration | 60 seconds | Prevent oversized chunks |
| Min chunk duration | 100 ms | Avoid too-small chunks |
| Recommended chunk duration | 3 seconds | Optimal latency vs accuracy |
| Recommended overlap | 800 ms | Good context without too much redundancy |
| Max overlap | 50% of duration | Prevent excessive duplication |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/transcribe_start` | 10 requests | Per minute per user |
| `/transcribe_chunk` | 60 requests | Per minute per session |
| `/transcribe_poll` | 30 requests | Per minute per session |
| Global API | 1000 requests | Per minute across all users |

### Processing Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max concurrent transcriptions per user | 10 | Gemini API quota and cost control |
| Transcription timeout | 30 seconds | Prevent hanging requests |
| Max retry attempts | 3 | Balance reliability vs latency |
| Retry backoff | 2s, 4s, 8s | Exponential backoff |

### Storage Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max storage per user | 500 MB | Cost control |
| Max active sessions per user | 10 | Prevent abuse |
| Chunk retention | 30 days | Balance cost vs recovery needs |
| Transcript retention | Indefinite | Text is cheap to store |

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```typescript
{
  error: {
    code: string,           // Machine-readable error code
    message: string,        // Human-readable message
    details?: any,          // Optional additional context
    retry_after?: number    // Seconds to wait before retry (for 429)
  }
}
```

### Error Categories

#### 4xx Client Errors (Don't Retry)

**400 Bad Request**
- Invalid parameters
- Malformed JSON
- Missing required fields
- Action: Fix request and retry

**401 Unauthorized**
- Missing or invalid auth token
- Expired token
- Action: Re-authenticate

**403 Forbidden**
- User doesn't own resource
- Insufficient permissions
- Action: Check authorization

**404 Not Found**
- Session doesn't exist
- Audio file not found in Storage
- Action: Check IDs, verify upload completed

**409 Conflict**
- Duplicate chunk index
- Session already complete
- Action: Check state, don't retry

**413 Payload Too Large**
- Chunk exceeds size limit
- Action: Reduce chunk size or quality

**422 Unprocessable Entity**
- Unsupported audio format
- Invalid audio data
- Action: Convert to supported format

#### 429 Rate Limit (Retry After Delay)

**429 Too Many Requests**
- Rate limit exceeded
- Response includes `retry_after` seconds
- Action: Wait and retry

#### 5xx Server Errors (Retry with Backoff)

**500 Internal Server Error**
- Database error
- Unexpected exception
- Action: Retry with exponential backoff

**503 Service Unavailable**
- Gemini API temporarily down
- System overload
- Action: Retry with exponential backoff

**504 Gateway Timeout**
- Request timeout (>30s)
- Gemini API slow
- Action: Retry with exponential backoff

### Retry Strategy

**Client-side retry logic:**

```typescript
// Pseudocode
async function transcribeChunkWithRetry(request, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await transcribeChunk(request);
      return response;
    } catch (error) {
      // Don't retry on 4xx errors (except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      // On last attempt, throw error
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Calculate backoff delay
      const delay = error.status === 429
        ? error.retry_after * 1000  // Use server-provided delay
        : Math.pow(2, attempt) * 1000;  // Exponential: 2s, 4s, 8s
      
      // Wait before retry
      await sleep(delay);
    }
  }
}
```

---

## Related Documentation

- [Transcription Contracts](../../contracts/README.md) - Type definitions
- [Database Schema](../supabase/migrations/001_transcription_tables.sql) - Table structure
- [RLS Policies](../supabase/policies/001_transcription_rls.sql) - Security policies
- [Storage Setup](./transcription-storage.md) - Storage configuration
