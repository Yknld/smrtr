# notes_get

Quick read access to lesson notes.

## Purpose

Retrieves notes for a lesson with fast read-only access. Returns final notes if available, otherwise returns raw notes.

## Endpoint

```
GET /functions/v1/notes_get?lesson_id=<uuid>
```

## Authentication

Requires valid JWT token. RLS ensures users can only access their own lesson notes.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lesson_id` | UUID | Yes | ID of the lesson to fetch notes for |

### Headers

```
Authorization: Bearer <jwt_token>
```

## Response

### Success (200)

```typescript
{
  lesson_id: string;
  notes_raw_text: string;
  notes_final_text: string | null;
  is_final: boolean;
  last_committed_seq: number;
  updated_at: string;
}
```

**Field Descriptions:**
- `lesson_id`: The lesson these notes belong to
- `notes_raw_text`: Raw notes accumulated from transcripts (always present)
- `notes_final_text`: Polished/formatted notes (null if not finalized)
- `is_final`: `true` if `notes_final_text` exists, `false` otherwise
- `last_committed_seq`: Last transcript segment sequence processed
- `updated_at`: ISO timestamp of last update

**Usage Guidelines:**
- **Display logic:** If `is_final` is `true`, display `notes_final_text`, otherwise display `notes_raw_text`
- **Empty notes:** If no notes exist yet, returns empty strings with `last_committed_seq: 0`

### Errors

| Code | Error | Meaning |
|------|-------|---------|
| 400 | Missing required parameter: lesson_id | Query parameter missing |
| 400 | Invalid lesson_id format | Not a valid UUID |
| 401 | Missing authorization header | JWT not provided |
| 401 | Invalid or expired session | JWT validation failed |
| 404 | Lesson not found or access denied | Lesson doesn't exist or user doesn't own it |
| 500 | Internal server error | Database or server error |

## Examples

### cURL

```bash
# Get notes for a lesson
curl "https://your-project.supabase.co/functions/v1/notes_get?lesson_id=34b9a0c7-62d7-4002-a642-00488b2c7f7c" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.'
```

### JavaScript/TypeScript

```typescript
import { supabase } from './supabase';

async function getLessonNotes(lessonId: string) {
  const { data, error } = await supabase.functions.invoke('notes_get', {
    method: 'GET',
    params: { lesson_id: lessonId },
  });
  
  if (error) {
    console.error('Failed to fetch notes:', error);
    return null;
  }
  
  // Use final text if available, otherwise raw text
  const displayText = data.is_final ? data.notes_final_text : data.notes_raw_text;
  
  return {
    text: displayText,
    isFinal: data.is_final,
    lastSeq: data.last_committed_seq,
    updatedAt: data.updated_at,
  };
}

// Usage
const notes = await getLessonNotes('lesson-id');
if (notes) {
  console.log('Notes:', notes.text);
  console.log('Final?', notes.isFinal);
}
```

### React Native

```typescript
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

function NotesScreen({ lessonId }: Props) {
  const [notes, setNotes] = useState<string>('');
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadNotes();
  }, [lessonId]);
  
  const loadNotes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('notes_get', {
        method: 'GET',
        params: { lesson_id: lessonId },
      });
      
      if (error) throw error;
      
      // Display final text if available, otherwise raw text
      const displayText = data.is_final 
        ? data.notes_final_text 
        : data.notes_raw_text;
      
      setNotes(displayText);
      setIsFinal(data.is_final);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <ScrollView>
          <Text style={styles.header}>
            {isFinal ? '📝 Final Notes' : '📄 Live Notes'}
          </Text>
          <Text style={styles.content}>{notes}</Text>
          {!isFinal && (
            <Text style={styles.hint}>
              These notes are being generated in real-time
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
```

## Response Examples

### No notes yet

```json
{
  "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c",
  "notes_raw_text": "",
  "notes_final_text": null,
  "is_final": false,
  "last_committed_seq": 0,
  "updated_at": "2026-01-11T08:25:31.000Z"
}
```

### Raw notes (during recording)

```json
{
  "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c",
  "notes_raw_text": "# Design Sprints\n\nA design sprint is a structured process...",
  "notes_final_text": null,
  "is_final": false,
  "last_committed_seq": 42,
  "updated_at": "2026-01-11T08:30:15.000Z"
}
```

### Final notes (completed)

```json
{
  "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c",
  "notes_raw_text": "# Design Sprints\n\nA design sprint is a structured process...",
  "notes_final_text": "# Design Sprints - Final Notes\n\nA design sprint is a time-boxed...",
  "is_final": true,
  "last_committed_seq": 87,
  "updated_at": "2026-01-11T09:15:22.000Z"
}
```

## Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Typical latency | < 200ms | Single database query |
| Max text size | No limit | PostgreSQL text field |
| Cached | No | Always fetches fresh data |

## Security

- ✅ **JWT required:** All requests must be authenticated
- ✅ **RLS enforced:** Users can only access their own lessons
- ✅ **Ownership verified:** Lesson must belong to authenticated user
- ✅ **Read-only:** Function does not modify data

## Testing

### Quick Test

```bash
# Get JWT
JWT=$(./get-jwt.sh user1@test.com password123 | grep "export JWT" | cut -d "'" -f2)

# Get notes
curl "https://your-project.supabase.co/functions/v1/notes_get?lesson_id=LESSON_ID" \
  -H "Authorization: Bearer $JWT" | jq '.'
```

### Run Test Script

```bash
cd supabase/functions/notes_get
./curl-test.sh "$JWT" "LESSON_ID"
```

## Deployment

```bash
supabase functions deploy notes_get --no-verify-jwt
```

## Related Functions

- `notes_commit_from_segments` - Commit transcript segments to notes
- `lesson_generate_summary` - Generate lesson summary

## Database Schema

### Table: `lesson_outputs`

```sql
SELECT 
  lesson_id,
  notes_raw_text,
  notes_final_text,
  last_committed_seq,
  updated_at
FROM lesson_outputs
WHERE lesson_id = :lesson_id
  AND type = 'notes';
```

### RLS Policy

Users can only query `lesson_outputs` for lessons they own. The function verifies lesson ownership before querying notes.

---

**Status:** ✅ Deployed and tested  
**Version:** 1  
**Method:** GET  
**Auth:** JWT required, RLS enforced  
**Purpose:** Fast read-only access to lesson notes
