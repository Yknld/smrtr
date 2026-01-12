# Class Type Specification

Defines the structure of a Class entity.

---

## Purpose

Represent a class that a user is enrolled in and can study.

---

## Type Definition

```typescript
export interface Class {
  /** Unique identifier (UUID) */
  id: string;
  
  /** User who owns this class (UUID) */
  userId: string;
  
  /** Display name of the class */
  name: string;
  
  /** Optional subject category (e.g., "Biology", "Chemistry") */
  subject?: string;
  
  /** When the class was created */
  createdAt: Date;
  
  /** When the class was last updated */
  updatedAt: Date;
}
```

---

## Usage Examples

### Display Class

```typescript
const classData: Class = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-456',
  name: 'Biology 101',
  subject: 'Biology',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-09'),
};

// Render
<Text>{classData.name}</Text>  // "Biology 101"
<Text>{classData.subject}</Text>  // "Biology"
```

### Filter Classes

```typescript
const biologyClasses = classes.filter(cls => cls.subject === 'Biology');
```

### Sort Classes

```typescript
// Sort by name
const sorted = classes.sort((a, b) => a.name.localeCompare(b.name));

// Sort by most recent
const recent = classes.sort((a, b) => 
  b.updatedAt.getTime() - a.updatedAt.getTime()
);
```

---

## Database Mapping

Maps to `classes` table in Supabase:

| Type Field | Database Column | Notes |
|------------|-----------------|-------|
| `id` | `id` | UUID, primary key |
| `userId` | `user_id` | UUID, foreign key to `auth.users` |
| `name` | `name` | Text, not null |
| `subject` | `subject` | Text, nullable |
| `createdAt` | `created_at` | Timestamp |
| `updatedAt` | `updated_at` | Timestamp |

---

## Transformation Example

When fetching from Supabase:

```typescript
// API response (snake_case)
interface ClassResponse {
  id: string;
  user_id: string;
  name: string;
  subject?: string;
  created_at: string;
  updated_at: string;
}

// Transform to Class type (camelCase)
function transformClass(response: ClassResponse): Class {
  return {
    id: response.id,
    userId: response.user_id,
    name: response.name,
    subject: response.subject,
    createdAt: new Date(response.created_at),
    updatedAt: new Date(response.updated_at),
  };
}
```

---

## Extended Types (Future)

### With Progress

```typescript
export interface ClassWithProgress extends Class {
  progress?: Progress;
  hasResumableSession: boolean;
  lastStudiedAt?: Date;
}
```

### Create Input

```typescript
export interface CreateClassInput {
  name: string;
  subject?: string;
}
```

### Update Input

```typescript
export interface UpdateClassInput {
  name?: string;
  subject?: string;
}
```

---

## Validation Rules (Future)

When implementing class creation:

- `name`: Required, 1-100 characters
- `subject`: Optional, max 50 characters
- `userId`: Auto-set from auth session

---

## Related Types

- `Progress` - Tracks study progress for a class
- `Note` - Notes generated during study for a class
