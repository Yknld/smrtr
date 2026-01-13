# Formatting Utils Specification

Utility functions for text and number formatting.

---

## Purpose

Provide consistent text and number formatting across the app.

---

## Function Contracts

### `truncateText(text, length)`

Truncate text to specified length with ellipsis.

**Signature**:
```typescript
function truncateText(text: string, length: number): string
```

**Parameters**:
- `text` - Text to truncate
- `length` - Maximum length (default: 100)

**Returns**: Truncated text with "..." if exceeds length

**Example**:
```typescript
truncateText('This is a long note about biology', 20)
// "This is a long no..."

truncateText('Short note', 20)
// "Short note"
```

---

### `pluralize(count, singular, plural?)`

Pluralize word based on count.

**Signature**:
```typescript
function pluralize(count: number, singular: string, plural?: string): string
```

**Parameters**:
- `count` - Number to check
- `singular` - Singular form
- `plural` - Plural form (optional, defaults to `singular + 's'`)

**Returns**: Appropriate form based on count

**Example**:
```typescript
pluralize(1, 'note')     // "1 note"
pluralize(5, 'note')     // "5 notes"
pluralize(1, 'class', 'classes')  // "1 class"
pluralize(3, 'class', 'classes')  // "3 classes"
```

---

### `capitalize(text)`

Capitalize first letter of text.

**Signature**:
```typescript
function capitalize(text: string): string
```

**Example**:
```typescript
capitalize('biology')     // "Biology"
capitalize('chemistry')   // "Chemistry"
```

---

### `formatNumber(num)`

Format number with thousands separator.

**Signature**:
```typescript
function formatNumber(num: number): string
```

**Example**:
```typescript
formatNumber(1000)      // "1,000"
formatNumber(1234567)   // "1,234,567"
formatNumber(42)        // "42"
```

---

### `formatPercentage(value, max)`

Format value as percentage.

**Signature**:
```typescript
function formatPercentage(value: number, max: number): string
```

**Example**:
```typescript
formatPercentage(65, 100)   // "65%"
formatPercentage(3, 4)      // "75%"
```

---

### `initials(name)`

Get initials from name.

**Signature**:
```typescript
function initials(name: string): string
```

**Returns**: Up to 2 uppercase initials

**Example**:
```typescript
initials('John Doe')         // "JD"
initials('Jane')             // "J"
initials('Mary Jane Watson') // "MJ" (first and last)
```

---

### `wordCount(text)`

Count words in text.

**Signature**:
```typescript
function wordCount(text: string): number
```

**Example**:
```typescript
wordCount('This is a note')  // 4
wordCount('Hello')           // 1
```

---

### `readingTime(text)`

Estimate reading time in minutes (assuming 200 words/min).

**Signature**:
```typescript
function readingTime(text: string): number
```

**Returns**: Estimated minutes, minimum 1

**Example**:
```typescript
readingTime('Short note')  // 1 (minimum)
readingTime('Lorem ipsum...')  // 5 (for ~1000 words)
```

---

## Implementation Example

```typescript
export function truncateText(text: string, length: number = 100): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : (plural || singular + 's');
  return `${count} ${word}`;
}

export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatPercentage(value: number, max: number): string {
  const percentage = Math.round((value / max) * 100);
  return `${percentage}%`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export function readingTime(text: string): number {
  const words = wordCount(text);
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}
```

---

## Testing

```typescript
import {
  truncateText,
  pluralize,
  capitalize,
  formatNumber,
  formatPercentage,
  initials,
  wordCount,
  readingTime,
} from './formatting.utils';

describe('formatting.utils', () => {
  test('truncateText truncates long text', () => {
    expect(truncateText('This is a long text', 10)).toBe('This is a ...');
  });
  
  test('pluralize handles singular and plural', () => {
    expect(pluralize(1, 'note')).toBe('1 note');
    expect(pluralize(5, 'note')).toBe('5 notes');
  });
  
  test('capitalize capitalizes first letter', () => {
    expect(capitalize('biology')).toBe('Biology');
  });
  
  test('formatNumber adds thousands separator', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });
  
  test('initials extracts initials from name', () => {
    expect(initials('John Doe')).toBe('JD');
  });
});
```

---

## Usage

```typescript
import {
  truncateText,
  pluralize,
  formatPercentage,
  readingTime,
} from '@/utils/formatting.utils';

// Truncate note preview
<Text>{truncateText(note.content, 100)}</Text>

// Display note count
<Text>{pluralize(notes.length, 'note')}</Text>

// Display progress
<Text>{formatPercentage(progress.lastPosition, progress.duration)}</Text>

// Display reading time
<Text>{readingTime(note.content)} min read</Text>
```
