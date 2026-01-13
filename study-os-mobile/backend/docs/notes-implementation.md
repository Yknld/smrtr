# Live Notes Implementation

## Overview

Added support for canonical live notes documents that can be updated incrementally from transcript segments during live lessons.

## Design Decision: Using `lesson_outputs` Table

We extended the existing `lesson_outputs` table (which already handles summary, flashcards, quiz, mindmap) rather than creating a new table. This keeps the schema minimal and leverages existing RLS policies.

## Schema Changes

### New Type: `notes`

Added `'notes'` to the `lesson_outputs.type` constraint, alongside existing types.

### New Columns

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `notes_raw_text` | text | NULL | Accumulated raw notes from transcript segments |
| `notes_final_text` | text | NULL | Polished/finalized notes (set when complete) |
| `last_committed_seq` | int | 0 | Last transcript segment sequence processed |

### New Indexes

```sql
-- Query notes for a specific lesson
idx_lesson_outputs_lesson_type ON (lesson_id, type)

-- Query all user notes (for search/aggregation)
idx_lesson_outputs_user_type ON (user_id, type, updated_at DESC)
```

## How It Works

### 1. Create Notes Document

```sql
INSERT INTO lesson_outputs (
  user_id,
  lesson_id,
  type,
  status,
  notes_raw_text,
  last_committed_seq
) VALUES (
  '...',
  '...',
  'notes',
  'queued',
  '',
  0
);
```

### 2. Incremental Updates

As transcript segments arrive, append to notes:

```sql
UPDATE lesson_outputs
SET 
  notes_raw_text = notes_raw_text || E'\n\n' || :new_notes_chunk,
  last_committed_seq = :new_seq,
  status = 'ready',
  updated_at = now()
WHERE lesson_id = :lesson_id 
  AND type = 'notes'
  AND last_committed_seq < :new_seq;
```

The `last_committed_seq` prevents reprocessing the same transcript segments.

### 3. Finalize Notes

When live session completes:

```sql
UPDATE lesson_outputs
SET 
  notes_final_text = :polished_notes,
  updated_at = now()
WHERE lesson_id = :lesson_id 
  AND type = 'notes';
```

### 4. Query Notes

```sql
-- Get current notes for a lesson
SELECT 
  notes_raw_text,
  notes_final_text,
  last_committed_seq,
  updated_at
FROM lesson_outputs
WHERE lesson_id = :lesson_id 
  AND type = 'notes'
  AND user_id = auth.uid();
```

## Security

RLS policies automatically apply from existing `lesson_outputs` policies:

- ✅ Users can only read their own notes
- ✅ Users can only update their own notes
- ✅ Users can only create notes for lessons they own
- ✅ Deleting a lesson cascades to delete its notes

## Files Created/Modified

### Migration
- `supabase/migrations/012_add_notes_to_lesson_outputs.sql`
  - Adds 'notes' to type constraint
  - Adds notes-specific columns
  - Creates indexes
  - Adds documentation comments

### Tests
- `backend/tests/sql/notes_smoke_test.sql`
  - Tests all CRUD operations
  - Tests incremental updates
  - Tests constraint enforcement
  - Tests index creation

### Documentation
- `backend/docs/db-schema.md` - Updated `lesson_outputs` section
- `backend/docs/notes-implementation.md` - This file

## Testing

Run the smoke test:

```bash
psql $DATABASE_URL -f backend/tests/sql/notes_smoke_test.sql
```

Expected output:

```
✓ Test 1: Created course and lesson
✓ Test 2: Created notes output
✓ Test 3: Updated notes (seq 0→3, 3→6)
✓ Test 4: Finalized notes
✓ Test 5: Queried notes by lesson_id
✓ Test 6: Verified indexes exist
✓ Test 7: Type constraint working
✓ Test 8: Retrieved full notes record
✓ ALL TESTS PASSED
```

## Next Steps (Not Implemented Yet)

These are intentionally deferred per requirements:

- **Edge function** to process transcript→notes (use Gemini API)
- **Background job** to batch-process segments
- **Notes formatting** (markdown, structure, etc.)
- **Notes versioning** (track changes over time)

For now, the schema is ready and clients can manually update notes via direct SQL or edge functions you build later.

## Example Usage Pattern

```typescript
// Frontend pseudocode for live notes
interface LiveNotesService {
  async createNotesDocument(lessonId: string): Promise<string>;
  
  async appendTranscriptSegment(
    lessonId: string,
    segment: TranscriptSegment,
    notesChunk: string
  ): Promise<void>;
  
  async finalizeNotes(
    lessonId: string,
    polishedNotes: string
  ): Promise<void>;
  
  async getNotes(lessonId: string): Promise<NotesDocument>;
}

// Backend edge function pseudocode
async function processTranscriptToNotes(
  lessonId: string,
  newSegments: TranscriptSegment[]
) {
  // 1. Get current last_committed_seq
  const notes = await getNotesForLesson(lessonId);
  
  // 2. Filter segments we haven't processed
  const unprocessedSegments = newSegments.filter(
    s => s.seq > notes.last_committed_seq
  );
  
  // 3. Generate notes from new segments
  const notesChunk = await gemini.generateNotes(unprocessedSegments);
  
  // 4. Append to notes
  await appendNotes(
    lessonId,
    notesChunk,
    Math.max(...unprocessedSegments.map(s => s.seq))
  );
}
```

## Design Rationale

### Why `lesson_outputs` instead of a new table?

1. **Consistency**: All AI-generated content lives in one place
2. **Reuse RLS**: No need to duplicate security policies
3. **Simpler queries**: Join once to get all outputs for a lesson
4. **Minimal schema**: Follows requirement to keep it minimal

### Why `last_committed_seq`?

Enables idempotent incremental updates. If processing fails halfway, we can resume from the last committed sequence without duplicate notes.

### Why both `notes_raw_text` and `notes_final_text`?

- **Raw**: Live-updated during recording (rough, may have redundancies)
- **Final**: Polished/formatted after session ends (clean, organized)

This mirrors how humans take rough notes during class, then organize them later.

## Constraints Verified

- ✅ Type constraint includes 'notes'
- ✅ `last_committed_seq` defaults to 0
- ✅ RLS policies inherited from `lesson_outputs`
- ✅ Indexes created for efficient queries
- ✅ Cascade deletes work (lesson deletion removes notes)
- ✅ NULL allowed for `notes_raw_text` and `notes_final_text` (backward compat)

---

**Status**: ✅ Schema complete, ready for edge function implementation
