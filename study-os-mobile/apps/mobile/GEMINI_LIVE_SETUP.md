# Gemini Live API Setup Guide

## Overview
This guide walks through setting up Gemini Live API transcription in the React Native app.

## Prerequisites

### 1. Backend Setup
✅ Supabase Edge Function `gemini_live_token` deployed and working  
✅ `GEMINI_API_KEY` secret configured in Supabase  
✅ User authentication working (Supabase Auth)  

### 2. Environment Variables
Create `.env` file in `apps/mobile/`:

```env
SUPABASE_URL=https://euxfugfzmpsemkjpcpuz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Installation

### Required Dependencies
```bash
cd apps/mobile

# Core dependencies
npm install @supabase/supabase-js

# Audio capture (Expo)
npx expo install expo-av

# Environment variables
npm install react-native-dotenv
```

### Optional (Production Audio)
For production-grade PCM16 audio access:
```bash
# Option 1: react-native-audio-recorder
npm install react-native-audio-recorder
cd ios && pod install && cd ..

# Option 2: Custom native module
# See docs/gemini-live.md for native implementation
```

## Configuration

### 1. Supabase Client
Create `src/data/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. Environment Variables
Add to `babel.config.js`:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }]
  ]
};
```

Create `.env.d.ts` for TypeScript:

```typescript
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
}
```

### 3. iOS Permissions
Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for live transcription."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app needs access to your microphone for live transcription.",
        "NSSpeechRecognitionUsageDescription": "This app needs speech recognition for transcription."
      }
    }
  }
}
```

## Files Created

### Service Layer
✅ `src/services/geminiLive.ts` - Core service handling:
  - Token fetching from Supabase Edge Function
  - WebSocket connection to Gemini Live API
  - Audio capture and streaming
  - Transcription event parsing

### UI Layer
✅ `src/screens/LiveTranscription/LiveTranscriptionScreen.tsx` - Live transcription screen with:
  - Start/Stop recording controls
  - Real-time transcript display
  - Connection status indicator
  - Error handling

### Documentation
✅ `docs/gemini-live.md` - Complete integration guide:
  - Architecture diagram
  - Audio format requirements
  - Token lifecycle
  - Error handling
  - Testing guide

✅ `src/screens/LiveTranscription/liveTranscription.spec.md` - Screen specification

## Testing

### 1. Backend Token Test
Test ephemeral token generation:

```bash
cd ../../backend/tests

# Get user JWT
TOKEN=$(node get-token.js user1@test.com password123 | tail -1)

# Fetch ephemeral token
curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_live_token \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

Expected response:
```json
{
  "token": "auth_tokens/...",
  "expire_time": "2026-01-10T07:53:02.434Z",
  "new_session_expire_time": "2026-01-10T07:24:02.434Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "request_id": "..."
}
```

### 2. Mobile App Test
```bash
# Start Expo dev server
cd apps/mobile
npx expo start

# Run on iOS simulator
i

# Or run on physical device
# Scan QR code with Expo Go app
```

Test flow:
1. Navigate to Live Transcription screen
2. Tap "Start" button
3. Grant microphone permission when prompted
4. Speak into microphone
5. Verify transcript appears in real-time
6. Tap "Stop" to end session

### 3. Debug Logging
Enable verbose logging in `src/services/geminiLive.ts`:

```typescript
// Add to constructor
console.log('[GeminiLive] Service initialized');

// Monitor WebSocket messages
this.ws.onmessage = (event) => {
  console.log('[GeminiLive] WS message:', event.data);
  this.handleWebSocketMessage(event.data);
};
```

## Known Limitations (MVP)

### Audio Capture
⚠️ **Issue**: `expo-av` doesn't provide raw PCM16 buffer access  
🔧 **Workaround**: Audio streaming not fully implemented (structure only)  
✅ **Solution**: Use native module or `react-native-audio-recorder` for production  

### Platform Support
⚠️ **Issue**: iOS-only configuration  
🔧 **Workaround**: Add Android audio capture in future iteration  

### Network Resilience
⚠️ **Issue**: No automatic reconnection on token expiry  
🔧 **Workaround**: Manual restart required  
✅ **Solution**: Implement auto-reconnect logic in service  

## Next Steps

### Phase 1: Complete Audio Pipeline
1. Integrate `react-native-audio-recorder` or native module
2. Implement PCM16 buffer access
3. Add resampling to 16kHz if needed
4. Test audio streaming end-to-end

### Phase 2: Production Hardening
1. Add automatic reconnection on token expiry
2. Implement network error recovery
3. Add audio buffering for poor connections
4. Handle background/foreground transitions

### Phase 3: Enhanced Features
1. Save transcripts to database
2. Export transcripts as text/PDF
3. Multi-language support
4. Real-time word highlighting
5. Pause/Resume functionality

## Troubleshooting

### "User not authenticated"
- Ensure user is logged in via Supabase Auth
- Check `.env` has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### "TOKEN_CREATE_FAILED"
- Verify `GEMINI_API_KEY` secret in Supabase dashboard
- Check Edge Function logs for detailed error

### "WebSocket connection failed"
- Check network connectivity
- Verify ephemeral token is valid and not expired
- Ensure token used within `new_session_expire_time` (1 minute)

### "Microphone permission denied"
- Check iOS Settings → Privacy → Microphone
- Ensure app has permission enabled
- Re-install app if permission was previously denied

### "Audio frame sending not implemented"
- Expected for MVP using `expo-av`
- WebSocket and token flow working correctly
- Implement native audio module for production

## Support

### Documentation
- `apps/mobile/docs/gemini-live.md` - Full integration guide
- `backend/docs/gemini-live-transcription.md` - Backend architecture
- `backend/docs/gemini-ephemeral-token.md` - Token details

### Code
- `src/services/geminiLive.ts` - Service implementation
- `src/screens/LiveTranscription/LiveTranscriptionScreen.tsx` - UI implementation

### External Resources
- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live-api)
- [Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)
