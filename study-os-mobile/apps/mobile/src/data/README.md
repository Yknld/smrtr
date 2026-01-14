# Data Layer

This directory contains data fetching logic and repository patterns for interacting with Supabase.

## Purpose

Provide a clean abstraction layer between the backend (Supabase) and the rest of the app. All data fetching, mutations, and caching logic lives here.

---

## Responsibilities

The data layer MUST:
- Initialize and configure Supabase client
- Fetch data from backend
- Transform API responses to app types
- Handle errors and retries
- Manage caching strategies (if needed)
- Type all responses properly

The data layer MUST NOT:
- Update UI components directly
- Navigate between screens
- Contain business logic or calculations
- Store application state
- Import from `screens/` or `components/`

---

## File Structure

```
data/
├── supabase.ts              # Supabase client initialization
├── classes.repo.ts          # Class data repository
├── notes.repo.ts            # Notes data repository
├── progress.repo.ts         # Progress data repository
└── README.md                # This file
```

For MVP, use `.spec.md` files to define contracts.

---

## Repository Pattern

Each entity (Class, Note, Progress) has its own repository file that exports functions for data operations.

### Naming Convention
- File: `[entity].repo.ts`
- Functions: `fetch[Entity]`, `fetch[Entity]By[Criteria]`

### Example Repository Interface

```typescript
// classes.repo.ts
export async function fetchClasses(): Promise<Class[]> {
  // Fetch all classes for current user
}

export async function fetchClassById(id: string): Promise<Class | null> {
  // Fetch single class by ID
}
```

---

## Error Handling

All repository functions should handle errors consistently:

```typescript
try {
  const { data, error } = await supabase.from('classes').select('*');
  
  if (error) {
    throw new Error(`Failed to fetch classes: ${error.message}`);
  }
  
  return data;
} catch (error) {
  console.error('Data layer error:', error);
  throw error;  // Let screen handle error state
}
```

---

## Type Safety

All functions must return properly typed data:

```typescript
import { Class } from '@/types/class.type';

export async function fetchClasses(): Promise<Class[]> {
  // Implementation
  return data as Class[];
}
```

---

## Supabase Client

The `supabase.ts` file exports a configured Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

All repositories import this client:

```typescript
import { supabase } from './supabase';
```

---

## Planned Repositories

### `classes.repo`
- `fetchClasses()` - Get all classes for current user
- `fetchClassById(id)` - Get single class by ID

### `notes.repo`
- `fetchNotesByClassId(classId)` - Get all notes for a class
- `fetchNoteById(id)` - Get single note by ID

### `progress.repo`
- `fetchProgressByClassId(classId)` - Get progress for a class
- `updateProgress(classId, progress)` - Update progress (future)

---

## Caching Strategy (Future)

For MVP, no caching. Future enhancements:
- React Query for server state caching
- Optimistic updates
- Background refetching
- Cache invalidation on mutations

---

## Testing Strategy

Data layer should be tested independently:
- Mock Supabase client responses
- Test error handling
- Test data transformations
- Test type safety

---

## Usage in Screens

Screens import and call repository functions:

```typescript
import { fetchClasses } from '@/data/classes.repo';

export function HomeScreen() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadClasses() {
      try {
        const data = await fetchClasses();
        setClasses(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    
    loadClasses();
  }, []);
  
  // ... render
}
```

---

## Best Practices

1. **Single responsibility** - One repository per entity
2. **Type safety** - Always return typed data
3. **Error handling** - Catch and rethrow errors with context
4. **No side effects** - Functions should be pure (no state updates)
5. **Async/await** - Use async/await, not promises
6. **Document contracts** - Use JSDoc for function documentation
