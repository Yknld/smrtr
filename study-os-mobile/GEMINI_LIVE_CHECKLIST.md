# Gemini Live API - Implementation Checklist

## ✅ Completed Tasks

### Backend (Already Working)
- [x] Supabase Edge Function `gemini_live_token` deployed
- [x] Dynamic import to avoid boot failures
- [x] Ephemeral token minting with v1alpha
- [x] User authentication via JWT
- [x] Error logging with request_id
- [x] GEMINI_API_KEY secret configured

### Service Layer
- [x] `src/services/geminiLive.ts` created
- [x] `GeminiLiveService` class implemented
- [x] Token fetching from Supabase Edge Function
- [x] WebSocket connection logic
- [x] Audio capture structure (MVP)
- [x] Transcription event parsing
- [x] Status management (5 states)
- [x] Error handling callbacks
- [x] Cleanup and resource management

### UI Layer
- [x] `src/screens/LiveTranscription/LiveTranscriptionScreen.tsx` created
- [x] Start/Stop/Clear buttons
- [x] Status badge with indicators
- [x] Real-time transcript display
- [x] Partial vs final line rendering
- [x] Auto-scroll to bottom
- [x] Error alerts
- [x] Loading states
- [x] Responsive layout

### Documentation
- [x] `docs/gemini-live.md` - Complete integration guide
- [x] `src/screens/LiveTranscription/liveTranscription.spec.md` - Screen spec
- [x] `GEMINI_LIVE_SETUP.md` - Setup instructions
- [x] `src/services/README.md` - Service conventions
- [x] `GEMINI_LIVE_IMPLEMENTATION.md` - Implementation summary
- [x] `README.md` updated with feature description

## ⏳ TODO for Production

### Phase 1: Audio Pipeline (High Priority)
- [ ] Install `react-native-audio-recorder` or create native module
- [ ] Implement raw PCM16 buffer access
- [ ] Add audio frame chunking (20-40ms frames)
- [ ] Implement `sendAudioFrame()` logic
- [ ] Test audio quality and latency
- [ ] Add resampling if device uses 44.1kHz/48kHz

### Phase 2: Production Hardening (Medium Priority)
- [ ] Auto-reconnect on token expiry
- [ ] Network error recovery
- [ ] Audio buffering for poor connections
- [ ] Background/foreground handling
- [ ] Analytics integration
- [ ] Crash reporting (Sentry)

### Phase 3: Android Support (Medium Priority)
- [ ] Android audio capture (MediaRecorder/AudioRecord)
- [ ] Android permissions in app.json
- [ ] Test on Android devices
- [ ] Platform-specific audio configs

### Phase 4: Enhanced Features (Low Priority)
- [ ] Save transcripts to Supabase
- [ ] Export as text/PDF
- [ ] Language selection UI
- [ ] Real-time word count
- [ ] Timestamp markers
- [ ] Pause/Resume (not just Stop/Start)

## 🧪 Testing Checklist

### Backend Token Test
- [x] Fetch ephemeral token with valid JWT
- [x] Verify token format (`auth_tokens/...`)
- [x] Verify expiry times (30 min / 1 min)
- [x] Verify model locked to `gemini-2.5-flash-native-audio-preview-12-2025`
- [x] Test with invalid JWT (should 401)
- [x] Test with missing GEMINI_API_KEY (should 500)

### Mobile App Test
- [ ] Install dependencies (`@supabase/supabase-js`, `expo-av`)
- [ ] Create `.env` with SUPABASE_URL and SUPABASE_ANON_KEY
- [ ] Configure Supabase client
- [ ] Run app on iOS simulator
- [ ] Navigate to Live Transcription screen
- [ ] Tap "Start" → Verify status changes (CONNECTING → CONNECTED → RECORDING)
- [ ] Grant microphone permission
- [ ] Speak → Verify transcript appears (partial → final)
- [ ] Tap "Stop" → Verify session ends cleanly
- [ ] Test "Clear" button
- [ ] Test error handling (disconnect network, etc.)

### Production Audio Test (After Phase 1)
- [ ] Verify PCM16 buffer access
- [ ] Verify audio frames reach Gemini API
- [ ] Verify transcription accuracy
- [ ] Test latency (<500ms ideal)
- [ ] Test long sessions (>5 minutes)
- [ ] Test in noisy environments

## 📦 Dependencies to Install

```bash
cd apps/mobile

# Core (Required)
npm install @supabase/supabase-js
npx expo install expo-av

# Environment variables
npm install react-native-dotenv
# Then configure babel.config.js

# Production audio (Phase 1)
# Option 1:
npm install react-native-audio-recorder
cd ios && pod install && cd ..

# Option 2: Custom native module
# See docs/gemini-live.md for iOS implementation
```

## 🔧 Configuration Steps

### 1. Environment Variables
Create `apps/mobile/.env`:
```env
SUPABASE_URL=https://euxfugfzmpsemkjpcpuz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Supabase Client
Create `apps/mobile/src/data/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 3. iOS Permissions
Update `apps/mobile/app.json`:
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
    ]
  }
}
```

### 4. Babel Configuration
Update `apps/mobile/babel.config.js`:
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

## 📊 Success Metrics

### MVP (Current)
- [x] Backend: Ephemeral token creation working ✅
- [x] Service: Token fetch and WebSocket connection ✅
- [x] UI: Complete screen with real-time updates ✅
- [x] Docs: Comprehensive integration guide ✅

### Phase 1 (Audio Pipeline)
- [ ] Audio frames reaching Gemini API
- [ ] Transcription accuracy >90%
- [ ] Latency <500ms
- [ ] Session stability >5 minutes

### Phase 2 (Production)
- [ ] Auto-reconnect success rate >95%
- [ ] Crash rate <0.1%
- [ ] Background mode support
- [ ] Production deployment

## 🎯 Current Status

**MVP Complete:** ✅  
**Production Ready:** ⏳ Phase 1 pending (audio pipeline)  
**Estimated Time to Production:** 1-2 weeks (Phase 1 completion)

## 📞 Support

### If Token Fetch Fails
1. Check Supabase logs: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/logs
2. Verify GEMINI_API_KEY secret is set
3. Test with curl (see `backend/tests/TEST_GEMINI_LIVE.md`)

### If WebSocket Fails
1. Check token not expired (within `new_session_expire_time`)
2. Verify network connectivity
3. Check browser console for WebSocket errors
4. Try re-fetching token

### If Audio Not Working (Expected for MVP)
1. This is expected - expo-av doesn't provide raw buffers
2. Proceed to Phase 1: Install native audio module
3. See `docs/gemini-live.md` for native implementation

## ✅ Ready to Start Testing

All code is in place! Next steps:
1. Install dependencies (`npm install`)
2. Configure environment (`.env`, `supabase.ts`)
3. Run app (`npx expo start`)
4. Test Live Transcription screen
5. For production audio, proceed to Phase 1
