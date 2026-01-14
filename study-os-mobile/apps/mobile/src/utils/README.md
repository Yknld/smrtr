# Utils

This directory contains pure utility functions used across the app.

## Purpose

Provide reusable, testable helper functions for common operations like formatting, calculations, and transformations.

---

## Responsibilities

Utility functions MUST:
- Be pure (no side effects)
- Take inputs and return outputs
- Be fully testable in isolation
- Have clear, single responsibilities

Utility functions MUST NOT:
- Use React hooks or components
- Make API calls or fetch data
- Access global state
- Navigate or handle routing
- Import from screens or components

---

## File Structure

```
utils/
├── time.utils.ts          # Time/date formatting and calculations
├── formatting.utils.ts    # Text and number formatting
├── validation.utils.ts    # Input validation (future)
└── README.md              # This file
```

For MVP, use `.spec.md` files to define utility contracts.

---

## Naming Conventions

- **File names**: `[domain].utils.ts`
- **Function names**: `[verb][Noun]` (e.g., `formatDate`, `calculateProgress`)
- **Export style**: Named exports (not default)

---

## Example Utility

```typescript
/**
 * Formats a date as "Jan 9, 2026"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats duration in seconds as "5m 30s"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}
```

---

## Testing

Utils should have 100% test coverage:

```typescript
import { formatDate, formatDuration } from './time.utils';

describe('time.utils', () => {
  test('formatDate formats date correctly', () => {
    const date = new Date('2026-01-09');
    expect(formatDate(date)).toBe('Jan 9, 2026');
  });
  
  test('formatDuration formats seconds correctly', () => {
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(30)).toBe('30s');
  });
});
```

---

## Usage in Components/Screens

```typescript
import { formatDate, formatDuration } from '@/utils/time.utils';
import { truncateText } from '@/utils/formatting.utils';

export function NoteCard({ note }: { note: Note }) {
  return (
    <Card>
      <Text>{formatDate(note.createdAt)}</Text>
      <Text>{truncateText(note.content, 100)}</Text>
    </Card>
  );
}
```

---

## Best Practices

1. **Pure functions** - No side effects, same input → same output
2. **Single responsibility** - One function, one job
3. **Type safety** - Use TypeScript, define input/output types
4. **Error handling** - Handle edge cases gracefully
5. **Documentation** - Use JSDoc comments
6. **Performance** - Optimize for repeated calls (memoization if needed)

---

## Common Utility Categories

### Time/Date Utils
- Format dates for display
- Calculate time differences
- Relative time ("2 hours ago")
- Duration formatting

### Formatting Utils
- Truncate text
- Format numbers (thousands separator)
- Pluralize words
- Capitalize text

### Validation Utils (Future)
- Email validation
- Phone number validation
- URL validation
- Input sanitization

### Calculation Utils (Future)
- Percentage calculations
- Progress tracking
- Statistical functions

---

## Exporting Utils

Export from a central `index.ts`:

```typescript
// utils/index.ts
export * from './time.utils';
export * from './formatting.utils';
```

Usage:

```typescript
import { formatDate, truncateText } from '@/utils';
```

---

## When NOT to Create a Util

Don't create utils for:
- One-off logic used in single screen
- React-specific logic (use hooks instead)
- Data fetching (use data layer)
- State management (use state layer)
