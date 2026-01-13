# Contracts

This directory contains TypeScript type definitions and API contracts for the Study OS mobile application.

## Purpose

Define **contracts** (interfaces, types, API shapes) that are shared between:
- Mobile client
- Backend services
- Database schemas
- External APIs

Contracts are **not implementation** - they define the shape of data and API interactions.

---

## File Structure

```
contracts/
├── transcription.contract.ts   # Transcription system types
├── api.contract.ts             # API endpoints and payloads
└── README.md                   # This file
```

---

## Transcription System

### Overview

The transcription system enables **pseudo-live transcription** with overlapping audio chunks:

1. **Client records audio** in real-time (e.g., during a study session)
2. **Client splits audio into chunks** (e.g., 5-second chunks with 0.5-1.0s overlap)
3. **Client uploads each chunk** to Supabase Storage
4. **Client calls backend** with chunk metadata (storage path, duration, overlap)
5. **Backend transcribes chunk** using external service (e.g., OpenAI Whisper)
6. **Backend merges text** handling overlap and returns new segments
7. **Client displays transcript** in real-time as chunks are processed

### Key Concepts

#### Overlapping Chunks

**Why overlap?**
- Audio segmentation may split words/sentences awkwardly
- Overlap ensures context is preserved across chunk boundaries
- Backend can merge overlapping regions intelligently

**How it works:**
- Each chunk includes the last ~0.5-1.0 seconds from the previous chunk
- Backend compares transcribed text from overlap region
- Backend trims repeated/duplicate text
- Result: Seamless transcript across chunk boundaries

**Example:**
```
Chunk 0: [0.0s - 5.0s]  → "Hello, how are you doing today? It's a beautiful..."
Chunk 1: [4.5s - 9.5s]  → "...beautiful day outside. Let's talk about biology."
                           ↑ 0.5s overlap

Backend merges:
"Hello, how are you doing today? It's a beautiful day outside. Let's talk about biology."
(Removes duplicate "beautiful" from overlap)
```

#### Live Caption Behavior

The system may **revise the last 1-2 lines** from previous chunks:
- Transcription services can improve accuracy with more context
- When chunk N arrives, backend may update text from chunk N-1
- Client should replace last 1-2 lines, not just append

**Example:**
```
After Chunk 0: "The mitochondria is the power house..."
After Chunk 1: "The mitochondria is the powerhouse of the cell."
                                    ↑ Fixed "power house" → "powerhouse"
```

### Workflow

#### 1. Start Session

```typescript
POST /api/transcribe/start
Request:  { language: 'en-US' }
Response: { session_id: '123', upload_base_path: 'transcriptions/123/' }
```

- Client starts recording
- Backend creates `TranscriptionSession` record
- Backend returns session ID and storage path

#### 2. Upload & Transcribe Chunks

```typescript
// Client uploads chunk to Supabase Storage
const storagePath = await uploadAudioChunk(audioBlob, 'transcriptions/123/chunk_0.webm');

// Client submits chunk for transcription
POST /api/transcribe/chunk
Request: {
  session_id: '123',
  chunk_index: 0,
  storage_path: 'transcriptions/123/chunk_0.webm',
  duration_ms: 5000,
  overlap_ms: 0  // First chunk has no overlap
}
Response: {
  segments_added: [
    { id: 'seg1', text: 'Hello, how are you...', chunk_index: 0, ... }
  ],
  merged_text_delta: 'Hello, how are you...',
  merged_full_text: 'Hello, how are you...'
}
```

**Flow:**
1. Client uploads audio chunk to Supabase Storage
2. Client calls `/api/transcribe/chunk` with storage path
3. Backend downloads audio from storage
4. Backend calls transcription service (e.g., OpenAI Whisper API)
5. Backend merges with previous chunks, handling overlap
6. Backend saves `TranscriptionChunk` and `TranscriptSegment` records
7. Backend returns new segments and merged text

**Important:** Client uploads chunk audio to Supabase Storage first, then calls backend with `storage_path`. Backend never receives raw audio bytes in API request.

#### 3. Poll for Updates (Optional)

```typescript
GET /api/transcribe/poll?session_id=123&after_chunk_index=0
Response: {
  status: 'recording',
  segments: [
    { id: 'seg2', text: "It's a beautiful day...", chunk_index: 1, ... }
  ],
  merged_full_text: "Hello, how are you... It's a beautiful day...",
  latest_chunk_index: 1
}
```

- Use for real-time updates in UI
- Use for recovery after network interruption
- Pass `after_chunk_index` to get only new segments

### Data Model

#### TranscriptionSession

Represents a single recording/transcription job.

```typescript
interface TranscriptionSession {
  id: string;
  user_id: string;
  source_type: 'live_recording';
  status: 'recording' | 'processing' | 'complete' | 'failed';
  language?: string;
  created_at: Date;
  updated_at: Date;
}
```

**Status flow:**
- `recording` - Active recording, chunks still being added
- `processing` - Recording complete, final transcription in progress
- `complete` - All chunks transcribed, final text ready
- `failed` - Transcription failed (error)

#### TranscriptionChunk

Individual audio chunk within a session.

```typescript
interface TranscriptionChunk {
  id: string;
  session_id: string;
  chunk_index: number;           // Sequential: 0, 1, 2, ...
  storage_path: string;           // Supabase Storage path
  duration_ms: number;
  overlap_ms: number;             // Overlap with previous chunk
  status: 'uploaded' | 'transcribing' | 'done' | 'failed';
  error?: string;
  created_at: Date;
}
```

**Chunk ordering:**
- `chunk_index` must be sequential (0, 1, 2, ...)
- Cannot skip indices
- Backend validates chunk order

#### TranscriptSegment

Transcribed text segment from chunk(s).

```typescript
interface TranscriptSegment {
  id: string;
  session_id: string;
  chunk_index: number;           // Source chunk
  text: string;                  // Transcribed text
  created_at: Date;
  start_ms?: number;             // Optional: Timestamp in session
  end_ms?: number;
  confidence?: number;           // Optional: 0.0 - 1.0
}
```

**Segment text:**
- May span multiple lines
- May be partial sentence (split at chunk boundaries)
- Backend handles merging/trimming overlap

---

## API Endpoints

### Transcription API

#### `POST /api/transcribe/start`

Start a new transcription session.

**Request:**
```typescript
{
  language?: string;  // Optional: 'en-US', 'es-ES', etc.
}
```

**Response:**
```typescript
{
  session_id: string;           // Use for subsequent calls
  upload_base_path: string;     // Supabase Storage path prefix
}
```

**Errors:**
- `LANGUAGE_NOT_SUPPORTED` - Requested language not available

---

#### `POST /api/transcribe/chunk`

Submit an audio chunk for transcription.

**Request:**
```typescript
{
  session_id: string;
  chunk_index: number;          // Sequential: 0, 1, 2, ...
  storage_path: string;         // Where audio was uploaded
  duration_ms: number;
  overlap_ms: number;           // Overlap with previous chunk
}
```

**Response:**
```typescript
{
  segments_added: TranscriptSegment[];    // New segments
  merged_text_delta?: string;             // Only new text
  merged_full_text?: string;              // Full transcript so far
}
```

**Errors:**
- `SESSION_NOT_FOUND` - Invalid session_id
- `SESSION_ALREADY_COMPLETE` - Cannot add chunks to completed session
- `INVALID_CHUNK_INDEX` - Chunk index out of order
- `CHUNK_ALREADY_EXISTS` - Duplicate chunk index
- `STORAGE_PATH_INVALID` - Audio file not found in storage
- `AUDIO_FORMAT_UNSUPPORTED` - Unsupported audio format
- `TRANSCRIPTION_SERVICE_ERROR` - External service failed

**Notes:**
- Client must upload audio to Supabase Storage before calling this endpoint
- Backend downloads audio from storage using `storage_path`
- Chunks must be submitted in order (0, 1, 2, ...)
- Chunks overlap by ~0.5-1.0 seconds; backend trims repeated text from overlap
- System may revise the last 1-2 lines from previous chunks (live caption behavior)

---

#### `GET /api/transcribe/poll`

Poll for transcription updates.

**Query Parameters:**
```typescript
{
  session_id: string;
  after_chunk_index?: number;   // Optional: Only return segments after this index
}
```

**Response:**
```typescript
{
  status: 'recording' | 'processing' | 'complete' | 'failed';
  segments: TranscriptSegment[];         // Filtered by after_chunk_index
  merged_full_text?: string;             // Full transcript
  latest_chunk_index?: number;           // Latest chunk processed
}
```

**Errors:**
- `SESSION_NOT_FOUND` - Invalid session_id

**Use Cases:**
- Real-time transcript updates in UI
- Check if session is complete
- Recover after network interruption

---

## Implementation Notes

### Client Responsibilities

1. **Record audio** in chunks (e.g., 5 seconds each)
2. **Add overlap** to each chunk (~0.5-1.0s from previous chunk)
3. **Upload chunks** to Supabase Storage at `upload_base_path`
4. **Call `/api/transcribe/chunk`** with storage path
5. **Display transcript** in real-time as responses arrive
6. **Handle revisions** by replacing last 1-2 lines (not just appending)

### Backend Responsibilities

1. **Create session** and return storage path
2. **Download audio** from Supabase Storage
3. **Call transcription service** (e.g., OpenAI Whisper)
4. **Merge text** from overlapping regions
5. **Trim duplicates** in overlap
6. **Detect revisions** and update previous segments if needed
7. **Return segments** and merged text

### Storage Structure

```
supabase-storage://
└── transcriptions/
    └── {session_id}/
        ├── chunk_0.webm
        ├── chunk_1.webm
        ├── chunk_2.webm
        └── ...
```

### Audio Format

- **Recommended**: WebM with Opus codec (browser-friendly)
- **Alternative**: WAV, MP3, M4A, OGG
- **Sample rate**: 16kHz or 48kHz
- **Channels**: Mono or stereo

---

## Future Enhancements

### Transcription Features

- **Speaker diarization** - Identify different speakers
- **Punctuation restoration** - Add proper punctuation
- **Word-level timestamps** - Timestamps for each word
- **Custom vocabulary** - Domain-specific terms (e.g., medical, legal)
- **Real-time streaming** - WebSocket-based streaming transcription

### Additional Contracts

- **Study session contracts** - Link transcription to study sessions
- **Note generation contracts** - Convert transcript to structured notes
- **Analytics contracts** - Track transcription usage and costs

---

## Usage in App

### Mobile Client

```typescript
import {
  TranscriptionSession,
  TranscriptSegment,
  TranscribeStartRequest,
  TranscribeChunkRequest,
} from '@/contracts/transcription.contract';

// Start session
const startReq: TranscribeStartRequest = { language: 'en-US' };
const { session_id, upload_base_path } = await api.post('/api/transcribe/start', startReq);

// Record and upload chunk
const audioBlob = await recordAudioChunk(5000); // 5 seconds
const storagePath = await uploadToSupabase(audioBlob, `${upload_base_path}/chunk_0.webm`);

// Transcribe chunk
const chunkReq: TranscribeChunkRequest = {
  session_id,
  chunk_index: 0,
  storage_path: storagePath,
  duration_ms: 5000,
  overlap_ms: 0,
};
const { segments_added, merged_full_text } = await api.post('/api/transcribe/chunk', chunkReq);

// Display transcript
setTranscript(merged_full_text);
```

### Backend

```typescript
import {
  TranscriptionSession,
  TranscriptionChunk,
  TranscriptSegment,
} from '@/contracts/transcription.contract';

// Backend uses same types for database models and API handlers
const session: TranscriptionSession = await db.createSession({
  user_id: userId,
  source_type: 'live_recording',
  status: 'recording',
});
```

---

## Best Practices

1. **Use contracts everywhere** - Import from this directory, don't duplicate types
2. **Don't add implementation** - Contracts are types only
3. **Version carefully** - Breaking changes to contracts affect client and backend
4. **Document thoroughly** - Add comments explaining complex types
5. **Validate at boundaries** - Use runtime validation (e.g., Zod) at API boundaries
