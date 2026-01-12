# Supabase Client Specification

This file will initialize and export the Supabase client for use throughout the data layer.

---

## Purpose

Configure Supabase client with environment variables and export for use in repositories.

---

## Responsibilities

- Create Supabase client instance
- Configure authentication settings
- Export client for repository imports
- Handle connection errors gracefully

---

## Configuration

### Environment Variables (from `.env`)

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous (public) key

### Client Options

```typescript
{
  auth: {
    autoRefreshToken: true,      // Auto-refresh tokens
    persistSession: true,         // Persist session in storage
    detectSessionInUrl: false,    // Don't detect session from URL (mobile)
  },
}
```

---

## Implementation Contract

```typescript
import { createClient } from '@supabase/supabase-js';

// Type the database schema (future)
// import { Database } from '@/types/database.types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Usage in Repositories

All repository files import this client:

```typescript
import { supabase } from './supabase';

export async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*');
    
  if (error) throw error;
  return data;
}
```

---

## Authentication (Future)

When implementing auth:

```typescript
// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  // Handle auth state
});
```

---

## Error Handling

The client itself doesn't handle errors - repositories should:

```typescript
try {
  const { data, error } = await supabase.from('classes').select('*');
  
  if (error) {
    // Supabase returns error in response
    throw new Error(`Supabase error: ${error.message}`);
  }
  
  return data;
} catch (error) {
  // Network or other errors
  console.error('Failed to fetch from Supabase:', error);
  throw error;
}
```

---

## Storage (Future)

For file uploads (images, audio):

```typescript
await supabase.storage
  .from('bucket-name')
  .upload('path/to/file', fileData);
```

---

## Real-time Subscriptions (Future)

For live updates:

```typescript
supabase
  .channel('notes-channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'notes' },
    (payload) => {
      // Handle new note
    }
  )
  .subscribe();
```

---

## Dependencies

```json
{
  "@supabase/supabase-js": "^2.x.x",
  "react-native-url-polyfill": "^2.x.x"
}
```

Note: `react-native-url-polyfill` required for React Native compatibility.

---

## Initialization

Import at app startup (in `app/App.tsx`):

```typescript
import { supabase } from '@/data/supabase';

// Client is now available for use
```

---

## Testing

Mock the client in tests:

```typescript
jest.mock('@/data/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      // ... etc
    })),
  },
}));
```
