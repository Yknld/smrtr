# Playback Store Specification

This file will manage active study session playback state.

---

## Purpose

Track the current study session state, including playback position and controls.

---

## State Shape

```typescript
interface PlaybackState {
  classId: string | null;
  sessionId: string | null;
  isPlaying: boolean;
  position: number;  // Current position in seconds or content index
  duration: number;  // Total duration
  isPaused: boolean;
}
```

---

## Context API Implementation

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlaybackContextValue {
  playback: PlaybackState;
  startSession: (classId: string, sessionId: string) => void;
  resumeSession: (classId: string, sessionId: string, position: number) => void;
  updatePosition: (position: number) => void;
  pauseSession: () => void;
  playSession: () => void;
  endSession: () => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [playback, setPlayback] = useState<PlaybackState>({
    classId: null,
    sessionId: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    isPaused: false,
  });
  
  function startSession(classId: string, sessionId: string) {
    setPlayback({
      classId,
      sessionId,
      isPlaying: true,
      position: 0,
      duration: 0,
      isPaused: false,
    });
    persistPlayback({ classId, sessionId, position: 0 });
  }
  
  function resumeSession(classId: string, sessionId: string, position: number) {
    setPlayback({
      classId,
      sessionId,
      isPlaying: true,
      position,
      duration: 0,
      isPaused: false,
    });
  }
  
  function updatePosition(position: number) {
    setPlayback(prev => ({ ...prev, position }));
    if (playback.classId && playback.sessionId) {
      persistPlayback({
        classId: playback.classId,
        sessionId: playback.sessionId,
        position,
      });
    }
  }
  
  function pauseSession() {
    setPlayback(prev => ({ ...prev, isPlaying: false, isPaused: true }));
  }
  
  function playSession() {
    setPlayback(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  }
  
  function endSession() {
    setPlayback({
      classId: null,
      sessionId: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      isPaused: false,
    });
    clearPersistedPlayback();
  }
  
  async function persistPlayback(data: {
    classId: string;
    sessionId: string;
    position: number;
  }) {
    try {
      await AsyncStorage.setItem('playback', JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting playback:', error);
    }
  }
  
  async function clearPersistedPlayback() {
    try {
      await AsyncStorage.removeItem('playback');
    } catch (error) {
      console.error('Error clearing playback:', error);
    }
  }
  
  return (
    <PlaybackContext.Provider
      value={{
        playback,
        startSession,
        resumeSession,
        updatePosition,
        pauseSession,
        playSession,
        endSession,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}
```

---

## Usage in App

Wrap app with PlaybackProvider:

```typescript
// app/App.tsx
import { PlaybackProvider } from '@/state/playback.store';

export default function App() {
  return (
    <SessionProvider>
      <PlaybackProvider>
        <NavigationContainer>
          {/* Routes */}
        </NavigationContainer>
      </PlaybackProvider>
    </SessionProvider>
  );
}
```

---

## Usage in Screens

### Start New Session

```typescript
import { usePlayback } from '@/state/playback.store';

export function StudyHubScreen() {
  const { startSession } = usePlayback();
  const { classId } = route.params;
  
  function handleStudyNow() {
    const sessionId = generateSessionId();  // Or fetch from API
    startSession(classId, sessionId);
    navigation.navigate('StudySession');
  }
  
  return <Button onPress={handleStudyNow}>Study now</Button>;
}
```

### Resume Session

```typescript
export function StudyHubScreen() {
  const { resumeSession } = usePlayback();
  const { classId } = route.params;
  const [progress, setProgress] = useState<Progress | null>(null);
  
  useEffect(() => {
    async function loadProgress() {
      const data = await fetchProgressByClassId(classId);
      setProgress(data);
    }
    loadProgress();
  }, [classId]);
  
  function handleContinue() {
    if (progress) {
      resumeSession(classId, progress.sessionId, progress.lastPosition);
      navigation.navigate('StudySession');
    }
  }
  
  return <Button onPress={handleContinue}>Continue</Button>;
}
```

### Track Position

```typescript
export function StudySessionScreen() {
  const { playback, updatePosition, endSession } = usePlayback();
  
  // Update position during playback
  useEffect(() => {
    const interval = setInterval(() => {
      updatePosition(playback.position + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [playback.position]);
  
  function handleFinish() {
    endSession();
    navigation.goBack();
  }
  
  return (
    <View>
      <Text>Position: {playback.position}s</Text>
      <Button onPress={handleFinish}>Finish</Button>
    </View>
  );
}
```

---

## Persistence

Playback state is persisted to AsyncStorage to survive app restarts:

```typescript
// On app init (in PlaybackProvider)
useEffect(() => {
  async function loadPersistedPlayback() {
    try {
      const stored = await AsyncStorage.getItem('playback');
      if (stored) {
        const data = JSON.parse(stored);
        // Optionally restore playback state
        resumeSession(data.classId, data.sessionId, data.position);
      }
    } catch (error) {
      console.error('Error loading playback:', error);
    }
  }
  
  loadPersistedPlayback();
}, []);
```

---

## Syncing with Backend

Periodically sync position to backend:

```typescript
// In PlaybackProvider
useEffect(() => {
  const interval = setInterval(() => {
    if (playback.sessionId && playback.position > 0) {
      syncPositionToBackend(playback.sessionId, playback.position);
    }
  }, 10000);  // Sync every 10 seconds
  
  return () => clearInterval(interval);
}, [playback]);

async function syncPositionToBackend(sessionId: string, position: number) {
  try {
    await updateProgress(sessionId, position);
  } catch (error) {
    console.error('Error syncing position:', error);
  }
}
```

---

## Testing

Mock playback provider:

```typescript
const mockPlayback = {
  playback: {
    classId: 'class-123',
    sessionId: 'session-456',
    isPlaying: true,
    position: 50,
    duration: 100,
    isPaused: false,
  },
  startSession: jest.fn(),
  resumeSession: jest.fn(),
  updatePosition: jest.fn(),
  pauseSession: jest.fn(),
  playSession: jest.fn(),
  endSession: jest.fn(),
};

jest.mock('@/state/playback.store', () => ({
  usePlayback: () => mockPlayback,
}));
```

---

## Future Enhancements

- Audio/video playback controls
- Playback speed adjustment
- Background audio support
- Offline playback mode
- Seek functionality
- Playlist management
