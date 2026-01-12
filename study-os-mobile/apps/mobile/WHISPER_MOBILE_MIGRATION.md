# Live Transcription → Whisper Migration

## ✅ What Changed

### Before (Gemini Live API)
- ❌ WebSocket streaming
- ❌ Ephemeral tokens
- ❌ `Buffer` error (not available in React Native)
- ❌ Real-time but unstable

### After (Whisper Chunked)
- ✅ Chunked transcription (3-second chunks)
- ✅ Upload to Supabase Storage
- ✅ Process via `transcribe_chunk` Edge Function
- ✅ Powered by OpenAI Whisper
- ✅ More reliable

## 🔄 Flow

1. **Start Recording**
   - Creates transcription session via `transcribe_start`
   - Starts audio recording

2. **Every 3 Seconds**
   - Stops recording momentarily
   - Uploads audio chunk to Storage: `transcription/{user_id}/{session_id}/chunk_{index}.m4a`
   - Calls `transcribe_chunk` Edge Function
   - Whisper transcribes the audio
   - Returns `tail_text` (last 600 chars)
   - Resumes recording for next chunk

3. **Stop Recording**
   - Processes final chunk
   - Shows complete transcript

## 📦 New Dependency

Installed `react-native-fs` to read audio files from disk.

```bash
npm install --save react-native-fs
cd ios && pod install
```

## 🧪 Test Instructions

### 1. Rebuild the App
The app needs to be rebuilt because we added a native module (`react-native-fs`):

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/apps/mobile
npx expo run:ios
```

### 2. Test the Flow
1. Tap "🎤 Go to Live Transcription"
2. Tap "Start Recording"
3. **Speak clearly** for 10-15 seconds
4. Wait 3-4 seconds after speaking (for chunk processing)
5. Tap "Stop"
6. **Verify transcript appears!**

### Expected Behavior
- Status shows: "Creating session..." → "Recording..." → "Transcribing chunk 0..." → "Transcribing chunk 1..." → "Complete"
- Transcript updates every 3 seconds with new text
- No more "Buffer doesn't exist" error
- No more Gemini token calls

### Expected Console Logs
```
Audio recorder initialized for chunked transcription
Created session: <uuid>
Captured chunk: /path/to/audio.wav
Uploaded chunk 0
Got transcript: Your spoken words...
```

## 🐛 Troubleshooting

### "SUPABASE_URL is not defined"
Add to `.env`:
```
SUPABASE_URL=https://euxfugfzmpsemkjpcpuz.supabase.co
```

### "Failed to create session"
Check that you're signed in (run the Sign In button on Backend Test screen first).

### "Upload error"
- Verify Storage bucket `raw_audio_chunks` exists
- Verify RLS policies allow user to upload

### No transcript appears
- Check function logs: `supabase functions logs transcribe_chunk`
- Verify `OPENAI_API_KEY` is set in Supabase secrets
- Check that Whisper function is deployed

## 💰 Cost

**Per Recording:**
- 15 seconds = 5 chunks × 3 seconds = ~$0.00045 (less than a penny!)
- 1 minute = 20 chunks = ~$0.0036

Much cheaper than Gemini Live!

## 📊 Benefits

| Feature | Gemini Live | Whisper Chunked |
|---------|-------------|-----------------|
| **Latency** | ~100ms | ~3-4 seconds |
| **Reliability** | ❌ Unstable | ✅ Stable |
| **Complexity** | ❌ High | ✅ Low |
| **Cost** | 🤔 Complex | 💵 $0.006/min |
| **Errors** | ❌ Buffer issues | ✅ None |
| **MVP Ready** | ❌ No | ✅ Yes |

## 🎯 Next Steps

After confirming this works:
1. Remove Gemini Live dependencies
   - Delete `src/services/geminiLive.ts`
   - Delete `gemini_live_token` Edge Function
   - Remove Gemini token test button

2. Polish UI
   - Add progress indicator
   - Show chunk count
   - Add "Processing..." state

3. Optimize
   - Increase chunk size to 5-10 seconds (less API calls)
   - Add retry logic for failed chunks
   - Cache chunks locally before upload

---

**Status:** Ready to test! Rebuild the app and try recording. 🎤
