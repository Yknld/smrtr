# Time Utils Specification

Utility functions for time and date formatting and calculations.

---

## Purpose

Provide consistent time/date formatting across the app.

---

## Function Contracts

### `formatDate(date)`

Format a date as "Jan 9, 2026".

**Signature**:
```typescript
function formatDate(date: Date): string
```

**Example**:
```typescript
formatDate(new Date('2026-01-09'))  // "Jan 9, 2026"
formatDate(new Date('2025-12-25'))  // "Dec 25, 2025"
```

---

### `formatTime(date)`

Format time as "2:30 PM".

**Signature**:
```typescript
function formatTime(date: Date): string
```

**Example**:
```typescript
formatTime(new Date('2026-01-09T14:30:00'))  // "2:30 PM"
formatTime(new Date('2026-01-09T09:05:00'))  // "9:05 AM"
```

---

### `formatDateTime(date)`

Format date and time as "Jan 9, 2026 at 2:30 PM".

**Signature**:
```typescript
function formatDateTime(date: Date): string
```

**Example**:
```typescript
formatDateTime(new Date('2026-01-09T14:30:00'))
// "Jan 9, 2026 at 2:30 PM"
```

---

### `formatDuration(seconds)`

Format duration in seconds as "5m 30s" or "2h 15m".

**Signature**:
```typescript
function formatDuration(seconds: number): string
```

**Rules**:
- Less than 60s: "30s"
- 1-59 minutes: "5m 30s"
- 1+ hours: "2h 15m"

**Example**:
```typescript
formatDuration(30)     // "30s"
formatDuration(90)     // "1m 30s"
formatDuration(330)    // "5m 30s"
formatDuration(3600)   // "1h"
formatDuration(7815)   // "2h 10m"
```

---

### `formatRelativeTime(date)`

Format date as relative time: "2 hours ago", "3 days ago".

**Signature**:
```typescript
function formatRelativeTime(date: Date): string
```

**Rules**:
- Less than 1 min: "Just now"
- 1-59 minutes: "5 minutes ago"
- 1-23 hours: "2 hours ago"
- 1-6 days: "3 days ago"
- 7+ days: "Jan 9, 2026" (absolute date)

**Example**:
```typescript
// Assuming now is Jan 9, 2026 at 3:00 PM

formatRelativeTime(new Date('2026-01-09T14:55:00'))  // "Just now"
formatRelativeTime(new Date('2026-01-09T14:30:00'))  // "30 minutes ago"
formatRelativeTime(new Date('2026-01-09T13:00:00'))  // "2 hours ago"
formatRelativeTime(new Date('2026-01-08T15:00:00'))  // "1 day ago"
formatRelativeTime(new Date('2026-01-02T15:00:00'))  // "Jan 2, 2026"
```

---

### `getTimeDifference(startDate, endDate)`

Calculate difference between two dates in seconds.

**Signature**:
```typescript
function getTimeDifference(startDate: Date, endDate: Date): number
```

**Returns**: Difference in seconds (absolute value)

**Example**:
```typescript
const start = new Date('2026-01-09T14:00:00');
const end = new Date('2026-01-09T14:05:30');

getTimeDifference(start, end)  // 330 (5 minutes 30 seconds)
```

---

### `addSeconds(date, seconds)`

Add seconds to a date.

**Signature**:
```typescript
function addSeconds(date: Date, seconds: number): Date
```

**Example**:
```typescript
const date = new Date('2026-01-09T14:00:00');
addSeconds(date, 300)  // 2026-01-09T14:05:00 (5 minutes later)
```

---

## Implementation Example

```typescript
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return secs > 0 ? `${hours}h ${minutes}m ${secs}s` : `${hours}h ${minutes}m`;
  }
  
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}
```

---

## Testing

```typescript
import {
  formatDate,
  formatTime,
  formatDuration,
  formatRelativeTime,
} from './time.utils';

describe('time.utils', () => {
  test('formatDate formats correctly', () => {
    const date = new Date('2026-01-09');
    expect(formatDate(date)).toBe('Jan 9, 2026');
  });
  
  test('formatDuration handles various durations', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3600)).toBe('1h');
  });
  
  test('formatRelativeTime handles recent dates', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });
});
```

---

## Usage

```typescript
import { formatDate, formatRelativeTime } from '@/utils/time.utils';

// Display note timestamp
<Text>{formatDate(note.createdAt)}</Text>

// Display last studied
<Text>Last studied {formatRelativeTime(progress.lastStudiedAt)}</Text>

// Display duration
<Text>Duration: {formatDuration(session.duration)}</Text>
```
