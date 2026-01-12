# transcribe_poll Incremental Updates

**Deployed:** 2026-01-10  
**Status:** ✅ Production Ready

---

## 🎯 **Incremental Polling Enhancement**

**Before:** Returns full transcript and all chunks on every poll  
**Now:** Returns only new segments since last poll (incremental updates)

**Benefits:**
- ✅ Reduced bandwidth (only new data)
- ✅ Faster response times
- ✅ Lower client-side processing (no re-rendering of old segments)
- ✅ Perfect for live captions (display new text as it arrives)

---

## 📡 **API Specification**

### **Endpoint:**
```
GET /transcribe_poll
```

### **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `session_id` | UUID | ✅ Yes | - | Transcription session ID |
| `after_chunk_index` | number | ❌ No | `-1` | Return segments after this chunk index |

### **Request Headers:**
```
Authorization: Bearer <user_jwt_token>
```

### **Response Schema:**
```typescript
{
  session_id: string;           // Session UUID
  status: string;               // "recording" | "processing" | "complete" | "failed"
  latest_chunk_index: number;   // Max chunk_index present (-1 if no chunks)
  segments: Array<{             // NEW: Incremental segments
    chunk_index: number;
    text: string;
    confidence?: number;
  }>;
  tail_text?: string;           // Last 600 chars of full_text (optional)
  chunks: Array<{               // For backward compatibility
    chunk_index: number;
    status: string;
    duration_ms: number;
    error?: string;
  }>;
  progress: number;             // 0-100
  total_chunks: number;
  completed_chunks: number;
  failed_chunks: number;
  language: string;
  created_at: string;
  updated_at: string;
}
```

---

## 🔄 **Incremental Polling Flow**

### **Client-Side Pseudocode:**

```typescript
let lastChunkIndex = -1;  // Start at -1 to get all segments

// Poll every 2 seconds
setInterval(async () => {
  const response = await fetch(
    `/transcribe_poll?session_id=${sessionId}&after_chunk_index=${lastChunkIndex}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  
  // Display only new segments (incremental)
  if (data.segments.length > 0) {
    data.segments.forEach(segment => {
      appendToUI(segment.text);  // Only new text!
    });
    
    // Update cursor for next poll
    lastChunkIndex = data.latest_chunk_index;
  }
  
  // Update live captions (last 600 chars)
  if (data.tail_text) {
    updateLiveCaptions(data.tail_text);
  }
  
  // Check if complete
  if (data.status === "complete") {
    stopPolling();
  }
}, 2000);
```

---

## 📊 **Query Examples**

### **Example 1: Initial Poll (Get All Segments)**
```bash
GET /transcribe_poll?session_id=abc-123
```

**Response:**
```json
{
  "session_id": "abc-123",
  "status": "recording",
  "latest_chunk_index": 2,
  "segments": [
    { "chunk_index": 0, "text": "Hello world" },
    { "chunk_index": 1, "text": "this is a test" },
    { "chunk_index": 2, "text": "of incremental polling" }
  ],
  "tail_text": "Hello world this is a test of incremental polling",
  "chunks": [...],
  "progress": 100,
  ...
}
```

### **Example 2: Incremental Poll (Only New Segments)**
```bash
GET /transcribe_poll?session_id=abc-123&after_chunk_index=2
```

**Response:**
```json
{
  "session_id": "abc-123",
  "status": "recording",
  "latest_chunk_index": 4,
  "segments": [
    { "chunk_index": 3, "text": "with live updates" },
    { "chunk_index": 4, "text": "arriving in real time" }
  ],
  "tail_text": "...test of incremental polling with live updates arriving in real time",
  "chunks": [...],
  "progress": 100,
  ...
}
```

### **Example 3: No New Segments**
```bash
GET /transcribe_poll?session_id=abc-123&after_chunk_index=4
```

**Response:**
```json
{
  "session_id": "abc-123",
  "status": "recording",
  "latest_chunk_index": 4,
  "segments": [],  // ✅ Empty array - no new segments
  "tail_text": "...",
  "chunks": [...],
  "progress": 100,
  ...
}
```

---

## 🏗️ **Implementation Details**

### **Database Query (RLS User Client):**
```typescript
// Fetch only segments where chunk_index > after_chunk_index
const { data: segments } = await supabaseClient
  .from("transcript_segments")
  .select("chunk_index, text, confidence, created_at")
  .eq("session_id", session_id)
  .gt("chunk_index", afterChunkIndex)  // ✅ Incremental filter
  .order("chunk_index", { ascending: true })
  .order("created_at", { ascending: true });
```

**RLS Enforcement:**
- ✅ User can only access their own segments
- ✅ No admin client needed (all data belongs to user)
- ✅ Ownership validated via session lookup

### **Compute latest_chunk_index:**
```typescript
const latestChunkIndex = chunks && chunks.length > 0
  ? Math.max(...chunks.map(c => c.chunk_index))
  : -1;
```

### **Optional tail_text:**
```typescript
// Fetch from transcripts.full_text
const { data: transcript } = await supabaseClient
  .from("transcripts")
  .select("full_text")
  .eq("session_id", session_id)
  .maybeSingle();

const tailText = transcript?.full_text
  ? transcript.full_text.slice(-600)
  : undefined;
```

---

## 🎨 **Client UI Patterns**

### **Pattern 1: Append-Only Live Captions**
```typescript
// Display only new segments as they arrive
segments.forEach(segment => {
  const div = document.createElement('div');
  div.textContent = segment.text;
  captionsContainer.appendChild(div);
});
```

### **Pattern 2: Rolling Window (Last 600 chars)**
```typescript
// Use tail_text for smooth live captions
liveCaptionsElement.textContent = data.tail_text;
```

### **Pattern 3: Full Transcript (Rebuild on Demand)**
```typescript
// When user requests full transcript, fetch all segments
const fullResponse = await fetch(
  `/transcribe_poll?session_id=${sessionId}&after_chunk_index=-1`
);
const fullTranscript = fullResponse.segments
  .map(s => s.text)
  .join(' ');
```

---

## ⚡ **Performance Comparison**

### **Scenario: 10-minute recording, 120 chunks, 5KB transcript**

| Metric | Full Poll (Before) | Incremental Poll (After) |
|--------|-------------------|-------------------------|
| **Initial request** | 5KB | 5KB |
| **Poll #60 (5 min)** | 5KB | ~50 bytes (1 new segment) |
| **Poll #120 (10 min)** | 5KB | ~50 bytes (1 new segment) |
| **Total bandwidth** | 600KB (120 polls × 5KB) | ~11KB (1×5KB + 119×50 bytes) |
| **Bandwidth savings** | - | ✅ **98.2% reduction** |

---

## 🧪 **Testing Incremental Polling**

### **Test 1: Initial Poll**
```bash
TOKEN=$(node get-token.js user1@test.com password123 | grep "Bearer" ...)

curl "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_poll?session_id=YOUR_SESSION_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- `segments` array contains all segments
- `latest_chunk_index` = max chunk index

### **Test 2: Incremental Poll**
```bash
# After initial poll, use latest_chunk_index from previous response
curl "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_poll?session_id=YOUR_SESSION_ID&after_chunk_index=2" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- `segments` array contains only chunks > 2
- If no new chunks, `segments` = `[]`

### **Test 3: Ownership Validation**
```bash
# User B tries to poll User A's session
TOKEN_B=$(node get-token.js user2@test.com password456 | grep "Bearer" ...)

curl "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_poll?session_id=USER_A_SESSION_ID" \
  -H "Authorization: Bearer $TOKEN_B"
```

**Expected:**
- HTTP 403: "Forbidden: session does not belong to user"

---

## 🔐 **Security**

### ✅ **RLS Enforced:**
- All queries use user's JWT token
- `transcript_segments` table has RLS policy:
  ```sql
  CREATE POLICY "Users can view own transcript segments"
  ON transcript_segments FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM transcription_sessions 
      WHERE user_id = auth.uid()
    )
  );
  ```

### ✅ **Ownership Validation:**
- Session ownership checked before returning any data
- Cross-user access blocked at function level AND database level

---

## 📈 **Use Cases**

### ✅ **Live Lecture Transcription**
- Student records 1-hour lecture
- Client polls every 2 seconds
- Displays new transcript segments in real-time
- Uses `tail_text` for rolling live captions

### ✅ **Meeting Notes**
- User records team meeting
- App shows live transcript during recording
- After meeting ends, full transcript available
- No re-rendering of old segments (smooth UX)

### ✅ **Podcast Transcription**
- User uploads 30-minute podcast
- Backend processes in chunks
- Client polls for new segments as they complete
- Progress bar updates based on `completed_chunks`

---

## 🔮 **Future Enhancements (Not in MVP)**

- [ ] WebSocket push (eliminate polling)
- [ ] Segment timestamps (`start_ms`, `end_ms`)
- [ ] Speaker diarization tags
- [ ] Real-time confidence scores
- [ ] Delta compression (only changed text)
- [ ] Cursor-based pagination (for very long transcripts)

---

## 📚 **Related Files**

- **Function:** `supabase/functions/transcribe_poll/index.ts`
- **Backup:** `backend/functions/transcribe_poll/index.ts`
- **Chunk Function:** `supabase/functions/transcribe_chunk/index.ts`
- **Tests:** `backend/tests/get-token.js`
- **Docs:** `backend/functions/CLIENT_INTEGRATION.md`

---

## ✅ **Deployment Checklist**

- [x] `after_chunk_index` query param added (default -1)
- [x] Incremental segment query implemented
- [x] `latest_chunk_index` computed and returned
- [x] `tail_text` optionally returned (last 600 chars)
- [x] Session status included
- [x] Ownership validation via RLS user client
- [x] Backward compatible (chunks array still returned)
- [x] No schema changes
- [x] Deployed to production

---

**MVP Complete!** ✅ Ready for live transcription polling.
