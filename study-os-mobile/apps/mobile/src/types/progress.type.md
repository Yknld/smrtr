# Progress Type Specification

Defines the structure of a Progress entity for tracking study sessions.

---

## Purpose

Track user's progress through study sessions for each class, enabling session resumption.

---

## Type Definition

```typescript
export interface Progress {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Class this progress belongs to (UUID) */
  classId: string;
  
  /** User who owns this progress (UUID) */
  userId: string;
  
  /** Optional: Current session ID */
  sessionId?: string;
  
  /** Last position in study content (seconds or content index) */
  lastPosition: number;
  
  /** Completion percentage (0-100) */
  completionPercentage: number;
  
  /** When the user last studied this class */
  lastStudiedAt: Date;
  
  /** Optional: Serialized session state (JSON) */
  sessionState?: Record<string, any>;
  
  /** When the progress was created */
  createdAt: Date;
  
  /** When the progress was last updated */
  updatedAt: Date;
}
```

---

## Usage Examples

### Check if Resumable

```typescript
const progress: Progress = {
  id: 'progress-123',
  classId: 'class-456',
  userId: 'user-789',
  sessionId: 'session-abc',
  lastPosition: 150,
  completionPercentage: 65,
  lastStudiedAt: new Date('2026-01-09T12:00:00Z'),
  createdAt: new Date('2026-01-08T10:00:00Z'),
  updatedAt: new Date('2026-01-09T12:00:00Z'),
};

function isResumable(progress: Progress | null): boolean {
  if (!progress) return false;
  
  return (
    progress.lastPosition > 0 &&
    progress.completionPercentage < 100
  );
}

// Usage
if (isResumable(progress)) {
  // Show "Continue" action
}
```

### Format Last Studied

```typescript
function formatLastStudied(progress: Progress): string {
  const now = new Date();
  const diff = now.getTime() - progress.lastStudiedAt.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hours ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// "2 hours ago"
```

### Display Progress

```typescript
<View>
  <Text>{progress.completionPercentage}% complete</Text>
  <ProgressBar value={progress.completionPercentage} max={100} />
  <Text>Last studied {formatLastStudied(progress)}</Text>
</View>
```

---

## Database Mapping

Maps to `progress` table in Supabase:

| Type Field | Database Column | Notes |
|------------|-----------------|-------|
| `id` | `id` | UUID, primary key |
| `classId` | `class_id` | UUID, foreign key to `classes` |
| `userId` | `user_id` | UUID, foreign key to `auth.users` |
| `sessionId` | `session_id` | UUID, nullable |
| `lastPosition` | `last_position` | Integer |
| `completionPercentage` | `completion_percentage` | Integer (0-100) |
| `lastStudiedAt` | `last_studied_at` | Timestamp |
| `sessionState` | `session_state` | JSONB, nullable |
| `createdAt` | `created_at` | Timestamp |
| `updatedAt` | `updated_at` | Timestamp |

---

## Transformation Example

When fetching from Supabase:

```typescript
// API response (snake_case)
interface ProgressResponse {
  id: string;
  class_id: string;
  user_id: string;
  session_id?: string;
  last_position: number;
  completion_percentage: number;
  last_studied_at: string;
  session_state?: any;
  created_at: string;
  updated_at: string;
}

// Transform to Progress type (camelCase)
function transformProgress(response: ProgressResponse): Progress {
  return {
    id: response.id,
    classId: response.class_id,
    userId: response.user_id,
    sessionId: response.session_id,
    lastPosition: response.last_position,
    completionPercentage: response.completion_percentage,
    lastStudiedAt: new Date(response.last_studied_at),
    sessionState: response.session_state,
    createdAt: new Date(response.created_at),
    updatedAt: new Date(response.updated_at),
  };
}
```

---

## Session State

The `sessionState` field can store arbitrary session data as JSON:

```typescript
interface SessionState {
  currentChapter?: number;
  bookmarks?: number[];
  audioSpeed?: number;
  volume?: number;
  notes?: string[];
}

const progress: Progress = {
  // ... other fields
  sessionState: {
    currentChapter: 3,
    bookmarks: [45, 120, 300],
    audioSpeed: 1.25,
  },
};
```

---

## Extended Types (Future)

### With Class Name

```typescript
export interface ProgressWithClass extends Progress {
  className: string;
}
```

### Update Input

```typescript
export interface UpdateProgressInput {
  lastPosition: number;
  completionPercentage?: number;
  sessionState?: Record<string, any>;
}
```

---

## Validation Rules

When updating progress:

- `lastPosition`: Must be >= 0
- `completionPercentage`: Must be 0-100
- `lastStudiedAt`: Auto-updated on each progress update

---

## Completion Logic

Progress is considered complete when:

```typescript
function isComplete(progress: Progress): boolean {
  return progress.completionPercentage === 100;
}

function shouldShowContinue(progress: Progress): boolean {
  return (
    progress.lastPosition > 0 &&
    progress.completionPercentage < 100
  );
}
```

---

## Related Types

- `Class` - The class this progress belongs to
- `Note` - Notes generated during the study session
