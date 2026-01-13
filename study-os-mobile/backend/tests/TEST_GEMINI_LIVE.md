# Test Gemini Live API from Terminal

**Quick guide to test the Gemini Live API WebSocket connection.**

---

## 🎯 **Option 1: Test Token Creation Only (curl)**

**Step 1: Get user token**
```bash
cd /Users/danielntumba/smrtr/study-os-mobile/backend/tests
TOKEN=$(node get-token.js user1@test.com password123 | tail -1)
```

**Step 2: Request ephemeral token**
```bash
curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_live_token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

**Expected Output:**
```json
{
  "token": "projects/.../cachedTokens/...",
  "expire_time": "2026-01-10T08:00:00Z",
  "new_session_expire_time": "2026-01-10T07:31:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "request_id": "uuid"
}
```

✅ **If you see this, the Edge Function is working!**

---

## 🎤 **Option 2: Test Full WebSocket Connection (Node.js)**

**⚠️ Note:** This requires audio in **PCM16 format** (16-bit, 16kHz, mono, little-endian). M4A/MP3 files won't work without conversion.

### **Prerequisites:**

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/backend/tests

# Install dependencies (if not already done)
npm install
```

### **Run Test:**

```bash
node test-gemini-live.js <path-to-audio-file>
```

**Example:**
```bash
# Test with your audio file
node test-gemini-live.js "/Users/danielntumba/smrtr/12 Bellrock Dr 3.m4a"
```

**⚠️ Important:** The audio file must be in PCM16 format. M4A files need conversion first.

---

## 🔄 **Convert Audio to PCM16 (if needed)**

**Using ffmpeg:**
```bash
# Install ffmpeg (if not installed)
brew install ffmpeg

# Convert M4A to PCM16 (16kHz, mono, 16-bit, little-endian)
ffmpeg -i "input.m4a" \
  -f s16le \
  -acodec pcm_s16le \
  -ar 16000 \
  -ac 1 \
  output.pcm
```

**Then test:**
```bash
node test-gemini-live.js output.pcm
```

---

## 📋 **What the Test Script Does**

1. ✅ Authenticates with Supabase (user1@test.com)
2. ✅ Requests ephemeral token from `/gemini_live_token`
3. ✅ Connects to Gemini Live API WebSocket
4. ✅ Sends audio file as base64
5. ✅ Listens for transcription events
6. ✅ Prints transcription text to console
7. ✅ Closes connection after 10 seconds

---

## 🎯 **Expected Output**

```
🔐 Step 1: Authenticating...
✅ Authenticated as: user1@test.com

🎫 Step 2: Getting ephemeral token...
✅ Ephemeral token received:
   Token: projects/.../cachedTokens/...
   Expires: 2026-01-10T08:00:00Z
   New session expires: 2026-01-10T07:31:00Z
   Model: gemini-2.5-flash-native-audio-preview-12-2025

🔌 Step 3: Connecting to Gemini Live API WebSocket...
✅ WebSocket connected!

📁 Step 4: Reading audio file...
✅ Audio file loaded: 69.23 KB

⚠️  Note: Audio must be PCM16 format for Gemini Live API
   This script will attempt to send the file as-is, but it may fail
   if the file is not in the correct format (raw PCM16, 16kHz, mono).

📤 Step 5: Streaming audio to Gemini...
✅ Audio sent, waiting for transcription...

🎤 Transcription received:
─────────────────────────────────────────────────────
This is the transcribed text from your audio...
─────────────────────────────────────────────────────

⏱️  10 seconds elapsed, closing connection...
🔌 WebSocket closed (code: 1000)
```

---

## ⚠️ **Common Issues**

### **1. "Invalid audio format" error**
**Cause:** Audio is not in PCM16 format  
**Fix:** Convert audio using ffmpeg (see above)

### **2. "Token expired" error**
**Cause:** Waited too long between getting token and connecting  
**Fix:** Run script again (gets fresh token automatically)

### **3. "WebSocket connection failed"**
**Cause:** Network issue or invalid token  
**Fix:** Check `GEMINI_API_KEY` is set in Supabase secrets

### **4. No transcription received**
**Possible causes:**
- Audio format incorrect (must be PCM16)
- Audio too short (< 1 second)
- Audio contains no speech
- Model processing time exceeded timeout

---

## 🧪 **Quick Command (All-in-One)**

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/backend/tests && \
npm install && \
node test-gemini-live.js "/Users/danielntumba/smrtr/12 Bellrock Dr 3.m4a"
```

**⚠️ This will likely fail because M4A is not PCM16. Convert first!**

---

## 📝 **For Production Mobile App**

The mobile app will:
1. Capture audio directly from microphone in PCM16 format
2. Stream ~100ms chunks in real-time
3. Receive transcriptions as the user speaks
4. Display live captions immediately

**This test script simulates that flow using a pre-recorded file.**

---

## 🔗 **Related Files**

- **Edge Function:** `supabase/functions/gemini_live_token/index.ts`
- **Test Script:** `backend/tests/test-gemini-live.js`
- **Token Helper:** `backend/tests/get-token.js`
- **Documentation:** `backend/docs/gemini-live-transcription.md`

---

**Quick test the Edge Function with curl (Option 1) to verify it's working!** ✅
