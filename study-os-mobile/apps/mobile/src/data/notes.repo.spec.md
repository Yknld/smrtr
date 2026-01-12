# Notes Repository Specification

This file will handle all data operations related to notes.

---

## Purpose

Fetch and manage note data from Supabase.

---

## Database Schema (Expected)

```sql
Table: notes
- id (uuid, primary key)
- class_id (uuid, foreign key to classes)
- user_id (uuid, foreign key to auth.users)
- content (text)
- created_at (timestamp)
- updated_at (timestamp)
- session_id (uuid, optional - links to study session)
```

---

## Function Contracts

### `fetchNotesByClassId(classId)`

Fetch all notes for a specific class.

**Signature**:
```typescript
async function fetchNotesByClassId(classId: string): Promise<Note[]>
```

**Parameters**:
- `classId` - UUID of the class

**Returns**: Array of Note objects, sorted by created_at (newest first)

**Errors**: Throws error if fetch fails

**Query**:
```sql
SELECT * FROM notes
WHERE class_id = :classId
AND user_id = auth.uid()
ORDER BY created_at DESC
```

**Usage**:
```typescript
const notes = await fetchNotesByClassId('class-123');
// [{ id: '1', content: 'Note text...', created_at: '...' }, ...]
```

---

### `fetchNoteById(id)`

Fetch a single note by ID.

**Signature**:
```typescript
async function fetchNoteById(id: string): Promise<Note | null>
```

**Parameters**:
- `id` - Note UUID

**Returns**: Note object or null if not found

**Errors**: Throws error if fetch fails

**Query**:
```sql
SELECT * FROM notes
WHERE id = :id
AND user_id = auth.uid()
LIMIT 1
```

**Usage**:
```typescript
const note = await fetchNoteById('note-123');
if (note) {
  // Display full note
}
```

---

## Implementation Example

```typescript
import { supabase } from './supabase';
import { Note } from '@/types/note.type';

export async function fetchNotesByClassId(classId: string): Promise<Note[]> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }
    
    return data as Note[];
  } catch (error) {
    console.error('Error in fetchNotesByClassId:', error);
    throw error;
  }
}

export async function fetchNoteById(id: string): Promise<Note | null> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch note: ${error.message}`);
    }
    
    return data as Note;
  } catch (error) {
    console.error('Error in fetchNoteById:', error);
    throw error;
  }
}
```

---

## Row Level Security (RLS)

Supabase policies should enforce:
- Users can only read notes they created
- Notes are auto-generated (no manual creation in MVP)

**Policy example**:
```sql
CREATE POLICY "Users can view own notes"
ON notes FOR SELECT
USING (auth.uid() = user_id);
```

---

## Empty State Handling

If a class has no notes, return empty array `[]`:

```typescript
const notes = await fetchNotesByClassId('class-123');
if (notes.length === 0) {
  // Show EmptyState component
}
```

---

## Future Functions (Not MVP)

- `createNote(classId, content)` - Manual note creation
- `updateNote(id, content)` - Edit note
- `deleteNote(id)` - Delete note
- `searchNotes(classId, query)` - Search notes by content

---

## Data Transformations (Optional)

If API response differs from app types, transform here:

```typescript
export async function fetchNotesByClassId(classId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Transform API response to app types
  return data.map(note => ({
    id: note.id,
    classId: note.class_id,
    content: note.content,
    createdAt: new Date(note.created_at),
    updatedAt: new Date(note.updated_at),
  }));
}
```

---

## Error Handling

All functions should:
1. Catch Supabase errors
2. Log errors to console
3. Throw errors with context
4. Let screens handle error state

---

## Testing

Mock Supabase responses:

```typescript
jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: '1', content: 'Note 1', created_at: '2026-01-09T12:00:00Z' },
              { id: '2', content: 'Note 2', created_at: '2026-01-08T12:00:00Z' },
            ],
            error: null,
          }),
        })),
      })),
    })),
  },
}));

test('fetchNotesByClassId returns notes for class', async () => {
  const notes = await fetchNotesByClassId('class-123');
  expect(notes).toHaveLength(2);
  expect(notes[0].content).toBe('Note 1');
});
```

---

## Usage in Screens

```typescript
// ClassNotesScreen
import { fetchNotesByClassId } from '@/data/notes.repo';

const { classId } = route.params;
const [notes, setNotes] = useState<Note[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadNotes() {
    try {
      setLoading(true);
      const data = await fetchNotesByClassId(classId);
      setNotes(data);
    } catch (err) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }
  
  loadNotes();
}, [classId]);
```
