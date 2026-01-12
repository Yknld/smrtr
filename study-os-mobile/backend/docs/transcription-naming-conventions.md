# Transcription System - Naming Conventions

**Purpose:** Prevent confusion between session and chunk status values.

---

## 🎯 **Status Field Naming**

### **Session Status (transcription_sessions.status)**

```typescript
type SessionStatus = 
  | "recording"   // User is actively recording and uploading chunks
  | "processing"  // Recording stopped, backend finalizing transcript
  | "complete"    // ✅ Transcription finished successfully
  | "failed";     // ❌ Transcription failed
```

**Schema:**
```sql
status text NOT NULL DEFAULT 'recording'
  CHECK (status IN ('recording', 'processing', 'complete', 'failed'))
```

**Flow:**
```
recording → processing → complete
              ↓
            failed
```

---

### **Chunk Status (transcription_chunks.status)**

```typescript
type ChunkStatus = 
  | "uploaded"      // Chunk uploaded to Storage, awaiting transcription
  | "transcribing"  // Gemini API call in progress
  | "done"          // ✅ Chunk transcribed successfully
  | "failed";       // ❌ Chunk transcription failed
```

**Schema:**
```sql
status text NOT NULL DEFAULT 'uploaded'
  CHECK (status IN ('uploaded', 'transcribing', 'done', 'failed'))
```

**Flow:**
```
uploaded → transcribing → done
              ↓
            failed
```

---

## ⚠️ **Critical Rule: "done" vs "complete"**

### **DO ✅**
```typescript
// Session status
if (session.status === "complete") {
  showFinalTranscript();
}

// Chunk status
if (chunk.status === "done") {
  appendToTranscript(chunk.text);
}
```

### **DON'T ❌**
```typescript
// ❌ WRONG: Session should use "complete", not "done"
if (session.status === "done") {
  showFinalTranscript();
}

// ❌ WRONG: Chunk should use "done", not "complete"
if (chunk.status === "complete") {
  appendToTranscript(chunk.text);
}
```

---

## 🧠 **Why This Matters**

### **Problem:**
- **"done"** is ambiguous in UI code
- Developers might use `status === "done"` without checking entity type
- Leads to bugs: "Why isn't the session completing?"

### **Solution:**
- **Sessions** use `"complete"` (more formal, finalized)
- **Chunks** use `"done"` (quick, incremental)
- Different words → impossible to mix up

---

## 📝 **Usage in Code**

### **Backend Edge Functions:**

**transcribe_start/index.ts:**
```typescript
// ✅ Correct
const { data: session } = await supabaseClient
  .from("transcription_sessions")
  .insert({ status: "recording" })  // ✅ Session starts as "recording"
  .single();
```

**transcribe_chunk/index.ts:**
```typescript
// ✅ Correct
await supabaseClient
  .from("transcription_chunks")
  .update({ status: "done" })  // ✅ Chunk completed
  .eq("id", chunk.id);
```

**transcribe_poll/index.ts:**
```typescript
// ✅ Correct
const { data: session } = await supabaseClient
  .from("transcription_sessions")
  .select("status")
  .single();

return {
  status: session.status  // "recording" | "processing" | "complete" | "failed"
};
```

---

### **Client-Side (React Native):**

**Polling Logic:**
```typescript
// ✅ Correct
const pollTranscription = async () => {
  const response = await fetch(`/transcribe_poll?session_id=${sessionId}`);
  const data = await response.json();
  
  // Check session status (complete, not done)
  if (data.status === "complete") {
    stopPolling();
    showFinalTranscript(data.tail_text);
  }
  
  // Check chunk statuses (done, not complete)
  const completedChunks = data.chunks.filter(c => c.status === "done");
  updateProgress(completedChunks.length / data.total_chunks);
};
```

**UI Rendering:**
```typescript
// ✅ Correct
const getSessionBadge = (status: SessionStatus) => {
  switch (status) {
    case "recording": return <Badge color="blue">Recording</Badge>;
    case "processing": return <Badge color="yellow">Processing</Badge>;
    case "complete": return <Badge color="green">Complete</Badge>;  // ✅
    case "failed": return <Badge color="red">Failed</Badge>;
  }
};

const getChunkBadge = (status: ChunkStatus) => {
  switch (status) {
    case "uploaded": return <Badge color="gray">Queued</Badge>;
    case "transcribing": return <Badge color="blue">Transcribing</Badge>;
    case "done": return <Badge color="green">Done</Badge>;  // ✅
    case "failed": return <Badge color="red">Failed</Badge>;
  }
};
```

---

## 🧪 **Testing Checklist**

When writing tests, always verify:

- [ ] Sessions never have `status = "done"`
- [ ] Sessions use `status = "complete"` for finished state
- [ ] Chunks never have `status = "complete"`
- [ ] Chunks use `status = "done"` for finished state
- [ ] TypeScript types enforce this distinction
- [ ] UI components use correct status values

---

## 📚 **Quick Reference Table**

| Entity | Final Success Status | Why? |
|--------|---------------------|------|
| **Session** | `"complete"` | Formal, indicates entire recording finished |
| **Chunk** | `"done"` | Quick, incremental work unit finished |

| Status Value | Used By | Meaning |
|-------------|---------|---------|
| `"recording"` | Sessions | User actively recording |
| `"processing"` | Sessions | Backend finalizing |
| `"complete"` | Sessions | ✅ Final success state |
| `"uploaded"` | Chunks | Awaiting transcription |
| `"transcribing"` | Chunks | API call in progress |
| `"done"` | Chunks | ✅ Final success state |
| `"failed"` | Both | ❌ Error state |

---

## 🔍 **Code Review Checklist**

When reviewing PRs, check for:

```typescript
// ❌ RED FLAGS
session.status === "done"           // Should be "complete"
chunk.status === "complete"         // Should be "done"
status === "done" /* which one? */  // Ambiguous!

// ✅ CORRECT
session.status === "complete"       // Clear: this is a session
chunk.status === "done"             // Clear: this is a chunk
```

---

## 🛠️ **Migration Path (If Needed)**

If you accidentally used "done" for sessions in existing code:

1. **Database:**
   ```sql
   UPDATE transcription_sessions
   SET status = 'complete'
   WHERE status = 'done';
   ```

2. **Code:**
   - Find/replace `session.status === "done"` → `session.status === "complete"`
   - Run tests to verify

3. **TypeScript:**
   ```typescript
   // Update type definition
   type SessionStatus = "recording" | "processing" | "complete" | "failed";
   // TypeScript will catch any remaining "done" usages
   ```

---

**Maintain this convention religiously to avoid UI bugs!** 🎯
