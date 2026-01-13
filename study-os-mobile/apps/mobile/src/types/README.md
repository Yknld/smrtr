# Types

This directory contains TypeScript type definitions for the entire application.

## Purpose

Provide a single source of truth for all data types used across screens, components, data layer, and state management.

---

## Responsibilities

This directory MUST:
- Define core entity types (Class, Note, Progress)
- Define screen props and route params
- Provide type safety across all layers
- Use explicit types (not inference)

This directory MUST NOT:
- Contain implementation code
- Import from other layers (except types)
- Define React components

---

## File Structure

```
types/
├── class.type.ts        # Class entity type
├── note.type.ts         # Note entity type
├── progress.type.ts     # Progress entity type
├── routes.type.ts       # Navigation route params (future)
└── README.md            # This file
```

For MVP, use `.md` files to define type contracts.

---

## Naming Conventions

- **Entity types**: Singular, PascalCase (e.g., `Class`, `Note`)
- **Props types**: `[Component]Props` (e.g., `HomeScreenProps`)
- **State types**: `[Domain]State` (e.g., `SessionState`)
- **File names**: `[entity].type.ts`

---

## Type Definition Pattern

Each entity should have:
1. **Base type** - Core fields
2. **Create input** - For creating new entities
3. **Update input** - For updating entities
4. **Query result** - With relations (if needed)

Example:

```typescript
// Base type
export interface Class {
  id: string;
  userId: string;
  name: string;
  subject?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create input (future)
export interface CreateClassInput {
  name: string;
  subject?: string;
}

// Update input (future)
export interface UpdateClassInput {
  name?: string;
  subject?: string;
}

// With relations (future)
export interface ClassWithProgress extends Class {
  progress?: Progress;
}
```

---

## Exporting Types

Export all types from a central `index.ts` for easy imports:

```typescript
// types/index.ts
export * from './class.type';
export * from './note.type';
export * from './progress.type';
```

Usage:

```typescript
import { Class, Note, Progress } from '@/types';
```

---

## Type Transformations

When API shape differs from app shape, transform in data layer:

```typescript
// API response shape
interface ClassResponse {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

// Transform to app type
function transformClass(response: ClassResponse): Class {
  return {
    id: response.id,
    userId: response.user_id,
    name: response.name,
    createdAt: new Date(response.created_at),
    updatedAt: new Date(response.updated_at),
  };
}
```

---

## Utility Types

Define commonly used utility types:

```typescript
// Nullable type
export type Nullable<T> = T | null;

// Async state
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Pagination (future)
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
```

---

## Best Practices

1. **Single source of truth** - All types defined here, used everywhere
2. **Explicit types** - Don't rely on inference
3. **Immutable** - Types are readonly, never mutated
4. **Documented** - Use JSDoc comments for complex types
5. **Consistent naming** - Follow conventions
6. **No logic** - Types only, no functions or implementations

---

## Example Type Documentation

```typescript
/**
 * Represents a class that a user is enrolled in.
 */
export interface Class {
  /** Unique identifier (UUID) */
  id: string;
  
  /** User who owns this class (UUID) */
  userId: string;
  
  /** Display name of the class */
  name: string;
  
  /** Optional subject category */
  subject?: string;
  
  /** When the class was created */
  createdAt: Date;
  
  /** When the class was last updated */
  updatedAt: Date;
}
```

---

## Testing

Types don't need runtime tests, but you can use type assertions:

```typescript
import { Class } from '@/types/class.type';

const mockClass: Class = {
  id: '123',
  userId: 'user-456',
  name: 'Biology 101',
  subject: 'Biology',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// TypeScript will error if mockClass doesn't match Class type
```
