# Classes Repository Specification

This file will handle all data operations related to classes.

---

## Purpose

Fetch and manage class data from Supabase.

---

## Database Schema (Expected)

```sql
Table: classes
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- name (text)
- subject (text, optional)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## Function Contracts

### `fetchClasses()`

Fetch all classes for the current user.

**Signature**:
```typescript
async function fetchClasses(): Promise<Class[]>
```

**Returns**: Array of Class objects, sorted by name

**Errors**: Throws error if fetch fails

**Query**:
```sql
SELECT * FROM classes
WHERE user_id = auth.uid()
ORDER BY name ASC
```

**Usage**:
```typescript
const classes = await fetchClasses();
// [{ id: '123', name: 'Biology 101', ... }, ...]
```

---

### `fetchClassById(id)`

Fetch a single class by ID.

**Signature**:
```typescript
async function fetchClassById(id: string): Promise<Class | null>
```

**Parameters**:
- `id` - Class UUID

**Returns**: Class object or null if not found

**Errors**: Throws error if fetch fails

**Query**:
```sql
SELECT * FROM classes
WHERE id = :id
AND user_id = auth.uid()
LIMIT 1
```

**Usage**:
```typescript
const classData = await fetchClassById('123');
if (classData) {
  // Class found
}
```

---

## Implementation Example

```typescript
import { supabase } from './supabase';
import { Class } from '@/types/class.type';

export async function fetchClasses(): Promise<Class[]> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }
    
    return data as Class[];
  } catch (error) {
    console.error('Error in fetchClasses:', error);
    throw error;
  }
}

export async function fetchClassById(id: string): Promise<Class | null> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch class: ${error.message}`);
    }
    
    return data as Class;
  } catch (error) {
    console.error('Error in fetchClassById:', error);
    throw error;
  }
}
```

---

## Row Level Security (RLS)

Supabase policies should enforce:
- Users can only read their own classes
- Users can only create classes for themselves
- Users can only update/delete their own classes

**Policy example**:
```sql
CREATE POLICY "Users can view own classes"
ON classes FOR SELECT
USING (auth.uid() = user_id);
```

---

## Future Functions (Not MVP)

- `createClass(name, subject)` - Create new class
- `updateClass(id, updates)` - Update class details
- `deleteClass(id)` - Delete class
- `searchClasses(query)` - Search classes by name

---

## Error Handling

All functions should:
1. Catch Supabase errors
2. Log errors to console
3. Throw errors with context
4. Let screens handle error state

```typescript
try {
  // Query
} catch (error) {
  console.error('Error in fetchClasses:', error);
  throw new Error('Failed to load classes');
}
```

---

## Testing

Mock Supabase responses:

```typescript
jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Biology 101', subject: 'Biology' },
          { id: '2', name: 'Chemistry 201', subject: 'Chemistry' },
        ],
        error: null,
      }),
    })),
  },
}));

test('fetchClasses returns array of classes', async () => {
  const classes = await fetchClasses();
  expect(classes).toHaveLength(2);
  expect(classes[0].name).toBe('Biology 101');
});
```

---

## Usage in Screens

```typescript
// HomeScreen
import { fetchClasses } from '@/data/classes.repo';

const [classes, setClasses] = useState<Class[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function loadClasses() {
    try {
      setLoading(true);
      const data = await fetchClasses();
      setClasses(data);
    } catch (err) {
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }
  
  loadClasses();
}, []);
```
