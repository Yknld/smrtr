# Progress Repository Specification

This file will handle all data operations related to study progress and resumable sessions.

---

## Purpose

Fetch and manage progress/session data from Supabase to determine if a user can resume studying.

---

## Database Schema (Expected)

```sql
Table: progress
- id (uuid, primary key)
- class_id (uuid, foreign key to classes)
- user_id (uuid, foreign key to auth.users)
- last_position (integer) - Last position in study content
- completion_percentage (integer) - 0-100
- last_studied_at (timestamp)
- session_state (json, optional) - Serialized session data
- created_at (timestamp)
- updated_at (timestamp)
```

---

## Function Contracts

### `fetchProgressByClassId(classId)`

Fetch progress data for a specific class to determine if a session can be resumed.

**Signature**:
```typescript
async function fetchProgressByClassId(classId: string): Promise<Progress | null>
```

**Parameters**:
- `classId` - UUID of the class

**Returns**: Progress object or null if no progress exists

**Errors**: Throws error if fetch fails

**Query**:
```sql
SELECT * FROM progress
WHERE class_id = :classId
AND user_id = auth.uid()
ORDER BY updated_at DESC
LIMIT 1
```

**Usage**:
```typescript
const progress = await fetchProgressByClassId('class-123');
if (progress && progress.lastPosition > 0) {
  // Show "Continue" action
  hasResumableSession = true;
}
```

---

### `hasResumableSession(classId)`

Helper function to quickly check if a resumable session exists.

**Signature**:
```typescript
async function hasResumableSession(classId: string): Promise<boolean>
```

**Parameters**:
- `classId` - UUID of the class

**Returns**: Boolean indicating if session can be resumed

**Errors**: Returns false if fetch fails (don't block UI)

**Implementation**:
```typescript
export async function hasResumableSession(classId: string): Promise<boolean> {
  try {
    const progress = await fetchProgressByClassId(classId);
    return progress !== null && progress.lastPosition > 0;
  } catch (error) {
    console.error('Error checking resumable session:', error);
    return false;  // Fail gracefully
  }
}
```

**Usage**:
```typescript
const canResume = await hasResumableSession('class-123');
// true or false
```

---

## Implementation Example

```typescript
import { supabase } from './supabase';
import { Progress } from '@/types/progress.type';

export async function fetchProgressByClassId(
  classId: string
): Promise<Progress | null> {
  try {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('class_id', classId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();  // Returns null if not found
    
    if (error) {
      throw new Error(`Failed to fetch progress: ${error.message}`);
    }
    
    return data as Progress | null;
  } catch (error) {
    console.error('Error in fetchProgressByClassId:', error);
    throw error;
  }
}

export async function hasResumableSession(classId: string): Promise<boolean> {
  try {
    const progress = await fetchProgressByClassId(classId);
    
    // Consider resumable if:
    // 1. Progress exists
    // 2. Last position > 0
    // 3. Not 100% complete
    return (
      progress !== null &&
      progress.lastPosition > 0 &&
      progress.completionPercentage < 100
    );
  } catch (error) {
    console.error('Error checking resumable session:', error);
    return false;
  }
}
```

---

## Row Level Security (RLS)

Supabase policies should enforce:
- Users can only read their own progress
- Users can only update their own progress

**Policy example**:
```sql
CREATE POLICY "Users can view own progress"
ON progress FOR SELECT
USING (auth.uid() = user_id);
```

---

## Business Logic

### When is a session resumable?

A session is resumable when:
1. Progress record exists
2. `lastPosition > 0` (user started studying)
3. `completionPercentage < 100` (not finished)
4. `lastStudiedAt` is within reasonable time (optional, e.g., < 7 days)

```typescript
export function isResumable(progress: Progress | null): boolean {
  if (!progress) return false;
  
  const hasProgress = progress.lastPosition > 0;
  const notComplete = progress.completionPercentage < 100;
  const withinTimeframe = true;  // Optional: check lastStudiedAt
  
  return hasProgress && notComplete && withinTimeframe;
}
```

---

## Future Functions (Not MVP)

- `createProgress(classId)` - Initialize progress for new session
- `updateProgress(classId, position, percentage)` - Update progress during study
- `resetProgress(classId)` - Start over (clear progress)
- `fetchAllProgress()` - Get progress for all classes (for dashboard)

---

## Error Handling

Handle missing progress gracefully (it's not an error):

```typescript
const progress = await fetchProgressByClassId('class-123');
if (!progress) {
  // No progress yet - first time studying
  return false;
}
```

---

## Testing

Mock Supabase responses:

```typescript
jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: '1',
                  class_id: 'class-123',
                  lastPosition: 50,
                  completionPercentage: 65,
                  lastStudiedAt: '2026-01-09T12:00:00Z',
                },
                error: null,
              }),
            })),
          })),
        })),
      })),
    })),
  },
}));

test('hasResumableSession returns true when progress exists', async () => {
  const canResume = await hasResumableSession('class-123');
  expect(canResume).toBe(true);
});

test('hasResumableSession returns false when no progress', async () => {
  // Mock returns null
  const canResume = await hasResumableSession('class-456');
  expect(canResume).toBe(false);
});
```

---

## Usage in Screens

### Home Screen
```typescript
// Check if class has resumable session
const progress = await fetchProgressByClassId(classId);
const hasResumable = isResumable(progress);

// Pass to navigation
navigation.navigate('StudyHub', {
  classId,
  className,
  hasResumableSession: hasResumable,
});
```

### StudyHub Screen
```typescript
// Fetch progress to show details
const progress = await fetchProgressByClassId(classId);

if (progress) {
  // Show "Continue" action
  // Display last studied time
  // Show completion percentage
}
```

---

## Data Transformations

Transform timestamps to Date objects:

```typescript
return {
  ...data,
  lastStudiedAt: new Date(data.last_studied_at),
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
};
```
