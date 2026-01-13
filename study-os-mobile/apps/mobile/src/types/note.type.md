# Note Type Specification

Defines the structure of a Note entity.

---

## Purpose

Represent a note generated during a study session for a specific class.

---

## Type Definition

```typescript
export interface Note {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Class this note belongs to (UUID) */
  classId: string;
  
  /** User who owns this note (UUID) */
  userId: string;
  
  /** Note content (markdown or plain text) */
  content: string;
  
  /** Optional: Study session this note was created in */
  sessionId?: string;
  
  /** When the note was created */
  createdAt: Date;
  
  /** When the note was last updated */
  updatedAt: Date;
}
```

---

## Usage Examples

### Display Note

```typescript
const note: Note = {
  id: 'note-123',
  classId: 'class-456',
  userId: 'user-789',
  content: 'Cellular respiration involves three main stages: glycolysis, Krebs cycle, and electron transport chain.',
  sessionId: 'session-abc',
  createdAt: new Date('2026-01-09T14:30:00Z'),
  updatedAt: new Date('2026-01-09T14:30:00Z'),
};

// Render
<Text>{note.content}</Text>
<Text>{formatDate(note.createdAt)}</Text>  // "Jan 9, 2026"
```

### Filter Notes by Class

```typescript
const classNotes = notes.filter(note => note.classId === 'class-456');
```

### Sort Notes

```typescript
// Sort by newest first
const sorted = notes.sort((a, b) => 
  b.createdAt.getTime() - a.createdAt.getTime()
);
```

### Preview Content

```typescript
function getPreview(note: Note, length: number = 100): string {
  return note.content.length > length
    ? note.content.substring(0, length) + '...'
    : note.content;
}
```

---

## Database Mapping

Maps to `notes` table in Supabase:

| Type Field | Database Column | Notes |
|------------|-----------------|-------|
| `id` | `id` | UUID, primary key |
| `classId` | `class_id` | UUID, foreign key to `classes` |
| `userId` | `user_id` | UUID, foreign key to `auth.users` |
| `content` | `content` | Text, not null |
| `sessionId` | `session_id` | UUID, nullable |
| `createdAt` | `created_at` | Timestamp |
| `updatedAt` | `updated_at` | Timestamp |

---

## Transformation Example

When fetching from Supabase:

```typescript
// API response (snake_case)
interface NoteResponse {
  id: string;
  class_id: string;
  user_id: string;
  content: string;
  session_id?: string;
  created_at: string;
  updated_at: string;
}

// Transform to Note type (camelCase)
function transformNote(response: NoteResponse): Note {
  return {
    id: response.id,
    classId: response.class_id,
    userId: response.user_id,
    content: response.content,
    sessionId: response.session_id,
    createdAt: new Date(response.created_at),
    updatedAt: new Date(response.updated_at),
  };
}
```

---

## Extended Types (Future)

### With Class Name

```typescript
export interface NoteWithClass extends Note {
  className: string;
}
```

### Create Input

```typescript
export interface CreateNoteInput {
  classId: string;
  content: string;
  sessionId?: string;
}
```

### Update Input

```typescript
export interface UpdateNoteInput {
  content: string;
}
```

---

## Content Format

Notes are stored as plain text or markdown:

- **Plain text**: Simple text content
- **Markdown** (future): Formatted content with headings, lists, etc.

Example markdown note:

```markdown
# Cellular Respiration

## Key Points
- Occurs in mitochondria
- Produces ATP energy
- Three main stages

## Stages
1. Glycolysis
2. Krebs Cycle
3. Electron Transport Chain
```

---

## Validation Rules (Future)

When implementing note creation/editing:

- `content`: Required, min 1 character, max 10,000 characters
- `classId`: Must be valid class user owns
- `userId`: Auto-set from auth session

---

## Metadata (Future)

Additional fields that could be added:

```typescript
export interface NoteWithMetadata extends Note {
  wordCount: number;
  readingTime: number;  // Estimated minutes
  tags?: string[];
  isPinned?: boolean;
}
```

---

## Related Types

- `Class` - The class this note belongs to
- `Progress` - Study session that generated this note
