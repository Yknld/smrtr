# Notes Commit From Segments

Appends new transcript segments into `notes_raw_text` in a single write, using `last_committed_seq` as a cursor.

## Purpose

Incrementally build canonical notes documents from live transcript segments during recording sessions. This function is designed to be called repeatedly (every 5-10 seconds) during live transcription to keep notes up-to-date.

## Endpoint

```
POST /notes_commit_from_segments
```

## Request

```typescript
{
  lesson_id: string;      // UUID of the lesson
  study_session_id: string; // UUID of the study session (has transcript segments)
}
```

## Response

### Success (200)

```typescript
{
  ok: true,
  appended: number,           // Number of segments appended
  last_committed_seq: number, // New cursor position
  notes_preview: string       // Last 600 chars of notes
}
```

### Errors

| Code | Error | Meaning |
|------|-------|---------|
| 400 | Missing required fields | lesson_id or study_session_id missing |
| 400 | Invalid UUID format | IDs are not valid UUIDs |
| 401 | Missing authorization header | JWT not provided |
| 401 | Invalid or expired session | JWT validation failed |
| 404 | Lesson not found or access denied | Lesson doesn't exist or user doesn't own it |
| 500 | Internal server error | Database or server error |

## How It Works

### 1. First Call (No Notes Document Exists)

```bash
POST /notes_commit_from_segments
{
  "lesson_id": "a1b2...",
  "study_session_id": "d4e5..."
}
```

**Result:**
- ✅ Creates new notes document in `lesson_outputs`
- ✅ Sets `type = 'notes'`, `status = 'ready'`, `last_committed_seq = 0`
- ✅ Loads all segments with `seq > 0` (all segments)
- ✅ Appends them to `notes_raw_text`
- ✅ Updates `last_committed_seq` to latest segment seq

### 2. Subsequent Calls (Incremental Updates)

```bash
# Call again after 5-10 seconds
POST /notes_commit_from_segments
{
  "lesson_id": "a1b2...",
  "study_session_id": "d4e5..."
}
```

**Result:**
- ✅ Loads existing notes document
- ✅ Reads `last_committed_seq` (e.g., 15)
- ✅ Loads only NEW segments with `seq > 15`
- ✅ Appends them to existing `notes_raw_text`
- ✅ Updates `last_committed_seq` to new latest

### 3. No New Segments (Idempotent)

If called before new segments arrive:

```json
{
  "ok": true,
  "appended": 0,
  "last_committed_seq": 15,
  "notes_preview": "..."
}
```

No changes made to database. **Safe to call repeatedly.**

## Text Formatting

Light formatting rules are applied:

- **Spacing:** Segments joined with spaces
- **Newlines:** Added after segments ending with `.`, `!`, or `?`
- **No duplication:** Cursor prevents reprocessing segments

Example input segments:
```
Seq 1: "Welcome to today's lecture"
Seq 2: "We'll discuss design sprints."
Seq 3: "First, let's define the term"
```

Output text:
```
Welcome to today's lecture We'll discuss design sprints.
First, let's define the term
```

## Rate Limits & Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **Call frequency** | Every 5-10 seconds | Safe during live recording |
| **Processing** | Text concatenation only | No AI/LLM calls |
| **Typical latency** | < 500ms | Database query + update |
| **Idempotent** | Yes | Safe to retry on failure |
| **Database writes** | 1 per call | Only if new segments exist |

## Security

- ✅ **JWT validation:** User must be authenticated
- ✅ **RLS enforcement:** User can only access their own lessons
- ✅ **Lesson ownership:** Verified before any updates
- ✅ **No injection:** Parameterized queries only

## Testing

### 1. Using test.sh (Comprehensive)

```bash
cd supabase/functions/notes_commit_from_segments
chmod +x test.sh

# Get JWT from your frontend app
JWT="eyJhbGci..."
LESSON_ID="a1b2c3..."
SESSION_ID="d4e5f6..."

./test.sh "$JWT" "$LESSON_ID" "$SESSION_ID"
```

Tests:
- ✓ Creates notes on first call
- ✓ Appends segments
- ✓ Idempotent behavior
- ✓ Error handling

### 2. Using curl-test.sh (Quick)

```bash
# Edit curl-test.sh with your values
nano curl-test.sh

# Run
chmod +x curl-test.sh
./curl-test.sh
```

### 3. Manual curl

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/notes_commit_from_segments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "YOUR_LESSON_ID",
    "study_session_id": "YOUR_SESSION_ID"
  }'
```

## Integration Example

### Frontend (React Native)

```typescript
import { supabase } from './supabase';

class NotesCommitService {
  private commitInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start committing transcript segments to notes every 5 seconds
   */
  startAutoCommit(lessonId: string, sessionId: string) {
    this.commitInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          'notes_commit_from_segments',
          {
            body: {
              lesson_id: lessonId,
              study_session_id: sessionId,
            },
          }
        );
        
        if (error) {
          console.error('Failed to commit notes:', error);
          return;
        }
        
        console.log(`✓ Committed ${data.appended} segments (seq: ${data.last_committed_seq})`);
        
        // Optionally show preview in UI
        if (data.appended > 0) {
          this.onNotesUpdated?.(data.notes_preview);
        }
      } catch (err) {
        console.error('Notes commit error:', err);
      }
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Stop auto-committing
   */
  stopAutoCommit() {
    if (this.commitInterval) {
      clearInterval(this.commitInterval);
      this.commitInterval = null;
    }
  }
  
  /**
   * Manual commit (call when user pauses/stops recording)
   */
  async commitNow(lessonId: string, sessionId: string) {
    const { data, error } = await supabase.functions.invoke(
      'notes_commit_from_segments',
      {
        body: {
          lesson_id: lessonId,
          study_session_id: sessionId,
        },
      }
    );
    
    if (error) throw error;
    return data;
  }
  
  onNotesUpdated?: (preview: string) => void;
}

export const notesCommitService = new NotesCommitService();
```

### Usage in Component

```typescript
import { notesCommitService } from './services/notesCommit';

function LiveTranscriptionScreen() {
  const [lessonId] = useState('...');
  const [sessionId] = useState('...');
  
  const startRecording = () => {
    // Start transcript recording...
    
    // Start auto-committing notes every 5 seconds
    notesCommitService.startAutoCommit(lessonId, sessionId);
    notesCommitService.onNotesUpdated = (preview) => {
      console.log('Notes updated:', preview);
    };
  };
  
  const stopRecording = async () => {
    // Stop auto-commit
    notesCommitService.stopAutoCommit();
    
    // Do one final commit
    const result = await notesCommitService.commitNow(lessonId, sessionId);
    console.log(`Final commit: ${result.appended} segments`);
    
    // Stop transcript recording...
  };
  
  return (
    <View>
      <Button onPress={startRecording} title="Start" />
      <Button onPress={stopRecording} title="Stop" />
    </View>
  );
}
```

## Database Schema

This function interacts with:

### `lesson_outputs`
- **Reads/Creates:** Notes document (`type = 'notes'`)
- **Updates:** `notes_raw_text`, `last_committed_seq`, `updated_at`

### `live_transcript_segments`
- **Reads:** Segments where `seq > last_committed_seq`
- **Order:** By `seq` ascending

### `lessons`
- **Reads:** Verify ownership (RLS check)

See `backend/docs/notes-implementation.md` for full schema details.

## Deployment

```bash
# Deploy function
supabase functions deploy notes_commit_from_segments

# Set secrets (if not already set)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Troubleshooting

### "Lesson not found or access denied"
- Verify lesson_id exists
- Verify lesson belongs to authenticated user
- Check RLS policies on `lessons` table

### "No new segments"
- Normal if called before segments arrive
- Check `live_transcript_segments` table has data
- Verify `study_session_id` is correct

### High latency (> 1s)
- Check database indexes on `live_transcript_segments(study_session_id, seq)`
- Consider reducing commit frequency (10s instead of 5s)

## Next Steps

This function only does text concatenation. For AI-enhanced notes:

1. **Create separate edge function** (e.g., `notes_enhance`)
2. **Call Gemini API** to format/summarize raw notes
3. **Update** `notes_final_text` when ready

Keep this function lightweight for real-time use.

---

**Status:** ✅ Ready for deployment and testing
