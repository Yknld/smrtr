# Notes Commit Function

## Quick Reference

**Function:** `notes_commit_from_segments`  
**Purpose:** Append new transcript segments to canonical notes document  
**Call frequency:** Every 5-10 seconds during live recording  
**Latency:** < 500ms  

## API

```typescript
POST /functions/v1/notes_commit_from_segments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "lesson_id": "uuid",
  "study_session_id": "uuid"
}
```

**Response:**
```typescript
{
  "ok": true,
  "appended": 7,              // Number of segments appended
  "last_committed_seq": 42,   // New cursor position
  "notes_preview": "..."      // Last 600 chars
}
```

## How It Works

1. **Validates** JWT and lesson ownership
2. **Loads** (or creates) notes document for lesson
3. **Reads** `last_committed_seq` cursor (e.g., 15)
4. **Queries** `live_transcript_segments` where `seq > 15`
5. **Appends** new segments with light formatting:
   - Join with spaces
   - Add newline after `.`, `!`, `?`
6. **Updates** `notes_raw_text` and `last_committed_seq`
7. **Returns** count and preview

## Features

✅ **Idempotent:** Safe to call repeatedly  
✅ **Auto-create:** Creates notes document on first call  
✅ **Cursor-based:** Only processes new segments  
✅ **No AI:** Just text concatenation (fast)  
✅ **RLS-safe:** User can only access own lessons  

## Deployment

```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# Deploy function
supabase functions deploy notes_commit_from_segments

# Verify
curl -X POST "https://your-project.supabase.co/functions/v1/notes_commit_from_segments" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id":"...","study_session_id":"..."}'
```

## Testing

```bash
cd supabase/functions/notes_commit_from_segments

# Quick test
./curl-test.sh

# Comprehensive test
./test.sh "JWT_TOKEN" "LESSON_ID" "SESSION_ID"
```

## Integration Example

```typescript
// Start recording
const startRecording = async () => {
  // 1. Create study session
  const session = await createStudySession(lessonId);
  
  // 2. Start transcript recording
  await startTranscriptRecording(session.id);
  
  // 3. Start auto-committing notes every 5 seconds
  const commitInterval = setInterval(async () => {
    const result = await supabase.functions.invoke('notes_commit_from_segments', {
      body: { lesson_id: lessonId, study_session_id: session.id }
    });
    
    console.log(`✓ Committed ${result.data.appended} segments`);
  }, 5000);
  
  return { session, commitInterval };
};

// Stop recording
const stopRecording = async ({ session, commitInterval }) => {
  // 1. Stop auto-commit
  clearInterval(commitInterval);
  
  // 2. Final commit
  await supabase.functions.invoke('notes_commit_from_segments', {
    body: { lesson_id: lessonId, study_session_id: session.id }
  });
  
  // 3. Stop transcript recording
  await stopTranscriptRecording(session.id);
};
```

## Rate Limits

| Metric | Recommendation | Rationale |
|--------|----------------|-----------|
| **Frequency** | 5-10 seconds | Balance latency vs. DB load |
| **Max frequency** | 1 second | Technical limit (not recommended) |
| **Retries** | Yes, idempotent | Safe to retry on network error |
| **Concurrent calls** | 1 per lesson | Use queue if calling frequently |

## Database Impact

Per call:
- **Reads:** 3 queries (lesson, notes, segments)
- **Writes:** 1 update (only if new segments exist)
- **Indexes used:**
  - `lessons(id, user_id)`
  - `lesson_outputs(lesson_id, type)`
  - `live_transcript_segments(study_session_id, seq)`

**Performance:** All queries use indexes, < 100ms total.

## Error Handling

```typescript
try {
  const result = await supabase.functions.invoke('notes_commit_from_segments', {
    body: { lesson_id, study_session_id }
  });
  
  if (result.error) {
    if (result.error.message.includes('not found')) {
      // Lesson doesn't exist or user doesn't own it
      console.error('Access denied');
    } else if (result.error.message.includes('Invalid UUID')) {
      // Bad input format
      console.error('Invalid IDs');
    } else {
      // Server error, retry
      console.error('Server error, retrying...');
    }
  } else {
    console.log(`✓ Appended ${result.data.appended} segments`);
  }
} catch (err) {
  // Network error, retry
  console.error('Network error:', err);
}
```

## Files

```
supabase/functions/notes_commit_from_segments/
├── index.ts           # Main function
├── deno.json          # Deno config
├── README.md          # Full documentation
├── test.sh            # Comprehensive test
└── curl-test.sh       # Quick curl test
```

## Related Documentation

- **Schema:** `backend/docs/notes-implementation.md`
- **Database:** `backend/docs/db-schema.md`
- **Migration:** `supabase/migrations/012_add_notes_to_lesson_outputs.sql`
- **Smoke test:** `backend/tests/sql/notes_smoke_test.sql`

## Next Steps (Not Implemented)

These are intentionally deferred:

- ❌ **AI formatting** (use separate function later)
- ❌ **Background jobs** (call from frontend for now)
- ❌ **Notes versioning** (add if needed)
- ❌ **Real-time subscriptions** (polling is fine for MVP)

---

**Status:** ✅ Ready for deployment
