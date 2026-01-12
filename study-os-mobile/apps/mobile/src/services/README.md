# Services

Business logic and external service integrations.

## Files

### `geminiLive.ts`
Gemini Live API service for real-time audio transcription.

**Features:**
- Ephemeral token management (fetch from Supabase Edge Function)
- WebSocket connection to Gemini Live API
- Audio capture and streaming (PCM16 mono 16kHz)
- Transcription event parsing
- Connection status management
- Error handling and reconnection

**Usage:**
```typescript
import { GeminiLiveService, ConnectionStatus } from '../services/geminiLive';

const service = new GeminiLiveService({
  onTranscript: (text: string, isFinal: boolean) => {
    console.log(isFinal ? 'Final:' : 'Partial:', text);
  },
  onStatusChange: (status: ConnectionStatus) => {
    console.log('Status:', status);
  },
  onError: (error: Error) => {
    console.error('Error:', error);
  },
});

// Start transcription
await service.start();

// Stop transcription
await service.stop();
```

**Dependencies:**
- `expo-av` for audio capture (MVP)
- `@supabase/supabase-js` for authentication and token fetch

**Notes:**
- MVP uses `expo-av` which doesn't provide raw PCM buffers
- Production should use native audio module or `react-native-audio-recorder`
- See `docs/gemini-live.md` for complete integration guide

## Conventions

1. **Naming**: Services use PascalCase class names (e.g., `GeminiLiveService`)
2. **Exports**: Export both class and related types/enums
3. **Error Handling**: Services throw errors; consumers handle them
4. **State**: Services manage internal state; expose via callbacks or getters
5. **Cleanup**: Provide explicit cleanup methods (e.g., `stop()`, `destroy()`)

## Future Services

- `transcriptionService.ts` - Chunked transcription (existing backend)
- `audioProcessingService.ts` - Audio format conversion, resampling
- `syncService.ts` - Offline/online data synchronization
- `notificationService.ts` - Push notifications
