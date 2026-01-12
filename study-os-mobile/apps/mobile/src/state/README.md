# State Management

This directory contains application-level state management logic.

## Purpose

Manage cross-screen state that needs to be shared or persisted across the app.

---

## Responsibilities

The state layer MUST:
- Manage cross-screen state (user session, current playback)
- Provide state access patterns (Context API, hooks)
- Handle state updates and synchronization
- Persist state when needed (AsyncStorage)

The state layer MUST NOT:
- Fetch data directly (use data layer instead)
- Contain UI components
- Navigate or handle routing
- Contain business logic

---

## State vs. Server Data

### Client State (Managed Here)
- UI state (modal open/closed, tab selection)
- Form inputs (before submission)
- Current playback position (while studying)
- User preferences (theme, settings)

### Server State (Managed in Screens + Data Layer)
- Classes, notes, progress (from Supabase)
- Use `useState` in screens + data layer functions
- Consider React Query for caching (future)

### Shared State (Managed Here)
- User session (auth state)
- Current class being studied
- Active study session state
- Global notifications/toasts

---

## State Management Pattern

For MVP, use React Context API + hooks:

```typescript
// session.store.ts
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState<Session | null>(null);
  
  // Provider implementation
  
  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
```

---

## Planned State Stores

### `session.store`
- User authentication state
- User profile data
- Session management (login/logout)

### `playback.store`
- Current study session state
- Playback position
- Audio/video controls (future)

---

## State Persistence

Use AsyncStorage for persisting state:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save
await AsyncStorage.setItem('session', JSON.stringify(session));

// Load
const stored = await AsyncStorage.getItem('session');
const session = stored ? JSON.parse(stored) : null;

// Clear
await AsyncStorage.removeItem('session');
```

---

## Usage in App

Wrap app with providers in `app/App.tsx`:

```typescript
import { SessionProvider } from '@/state/session.store';
import { PlaybackProvider } from '@/state/playback.store';

export default function App() {
  return (
    <SessionProvider>
      <PlaybackProvider>
        <NavigationContainer>
          {/* Screens */}
        </NavigationContainer>
      </PlaybackProvider>
    </SessionProvider>
  );
}
```

---

## Usage in Screens

Access state via hooks:

```typescript
import { useSession } from '@/state/session.store';

export function HomeScreen() {
  const { session } = useSession();
  
  if (!session) {
    // Not logged in
    return <LoginScreen />;
  }
  
  // Render home
}
```

---

## Future Enhancements

- Zustand for simpler state management
- Redux Toolkit for complex state
- React Query for server state caching
- Recoil for atomic state management

---

## Testing

Mock providers in tests:

```typescript
const mockSession = { user: { id: '123', email: 'test@example.com' } };

function renderWithProviders(component) {
  return render(
    <SessionProvider value={mockSession}>
      {component}
    </SessionProvider>
  );
}

test('renders with session', () => {
  renderWithProviders(<HomeScreen />);
  // Assertions
});
```

---

## Best Practices

1. **Minimal state** - Only store what's truly cross-screen
2. **Single source of truth** - Don't duplicate server data
3. **Type safety** - Use TypeScript for state types
4. **Avoid prop drilling** - Use Context for deeply nested components
5. **Performance** - Split contexts to avoid unnecessary re-renders
