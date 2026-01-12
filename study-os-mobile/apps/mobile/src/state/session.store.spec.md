# Session Store Specification

This file will manage user authentication and session state.

---

## Purpose

Track user authentication state and provide session management across the app.

---

## State Shape

```typescript
interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}
```

---

## Context API Implementation

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/data/supabase';

interface SessionContextValue {
  session: SessionState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  // Initialize session on mount
  useEffect(() => {
    loadSession();
    
    // Listen to Supabase auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setSession({
            user: {
              id: session.user.id,
              email: session.user.email!,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setSession({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );
    
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  
  async function loadSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setSession({
          user: {
            id: session.user.id,
            email: session.user.email!,
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setSession({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setSession({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }
  
  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    // Session will be updated via onAuthStateChange
  }
  
  async function logout() {
    await supabase.auth.signOut();
    // Session will be updated via onAuthStateChange
  }
  
  async function refreshSession() {
    await loadSession();
  }
  
  return (
    <SessionContext.Provider value={{ session, login, logout, refreshSession }}>
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

## Usage in App

Wrap app with SessionProvider:

```typescript
// app/App.tsx
import { SessionProvider } from '@/state/session.store';

export default function App() {
  return (
    <SessionProvider>
      <NavigationContainer>
        {/* Routes */}
      </NavigationContainer>
    </SessionProvider>
  );
}
```

---

## Usage in Screens

Access session state and actions:

```typescript
import { useSession } from '@/state/session.store';

export function HomeScreen() {
  const { session, logout } = useSession();
  
  if (session.isLoading) {
    return <LoadingState />;
  }
  
  if (!session.isAuthenticated) {
    return <LoginScreen />;
  }
  
  return (
    <View>
      <Text>Welcome, {session.user?.email}</Text>
      <Button onPress={logout}>Logout</Button>
    </View>
  );
}
```

---

## Protected Routes Pattern

Create a wrapper for protected screens:

```typescript
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useSession();
  
  if (session.isLoading) {
    return <LoadingScreen />;
  }
  
  if (!session.isAuthenticated) {
    return <Navigate to="Login" />;
  }
  
  return <>{children}</>;
}

// Usage
<ProtectedRoute>
  <HomeScreen />
</ProtectedRoute>
```

---

## Persistence

Session is managed by Supabase, which persists tokens automatically. No need for manual AsyncStorage.

---

## Testing

Mock session provider:

```typescript
const mockSession = {
  session: {
    user: { id: '123', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  },
  login: jest.fn(),
  logout: jest.fn(),
  refreshSession: jest.fn(),
};

jest.mock('@/state/session.store', () => ({
  useSession: () => mockSession,
}));
```

---

## Future Enhancements

- Social login (Google, Apple)
- Password reset flow
- Email verification
- User profile updates
- Multi-factor authentication
