# Gemini Ephemeral Tokens

**Purpose:** Understanding ephemeral tokens for Gemini Live API WebSocket connections.

**Official Docs:** https://ai.google.dev/gemini-api/docs/ephemeral-tokens

---

## 🔑 **What Are Ephemeral Tokens?**

Ephemeral tokens are short-lived, single-use credentials for connecting to the Gemini Live API via WebSocket. They allow secure client-to-server connections without exposing your API key.

**Key Characteristics:**
- **Short-lived:** 1-30 minutes
- **Single-use:** Can only be used once
- **Live API only:** Only work with Gemini Live API (WebSocket)
- **Requires v1alpha:** The `authTokens` API requires `apiVersion: "v1alpha"` when creating the client
- **token.name as API key:** The returned `token.name` is used like an API key for WebSocket connections

---

## 🏗️ **Token Creation (Backend)**

**Edge Function:** `gemini_live_token`

**Method:**
```typescript
import { GoogleGenAI } from "@google/genai";

// IMPORTANT: Must set apiVersion: "v1alpha" for authTokens API
const client = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1alpha" }
});

const token = await client.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
    httpOptions: { apiVersion: "v1alpha" },
    liveConnectConstraints: {
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      config: {
        sessionResumption: {},
        responseModalities: ["AUDIO"],
        inputAudioTranscription: {}
      }
    }
  }
});

// token.name is what the client uses
return { token: token.name };
```

---

## ⏱️ **Token Expiration Times**

### **Two Expiration Times:**

| Field | Default | Meaning |
|-------|---------|---------|
| **`newSessionExpireTime`** | ~1 minute | Client must connect within this time |
| **`expireTime`** | ~30 minutes | Maximum session duration after connection |

**Flow:**
```
T+0: Token created
  ↓
T+1m: Must connect by now (newSessionExpireTime)
  ↓
T+30m: Session ends (expireTime)
```

**If client doesn't connect within `newSessionExpireTime`:**
- Token becomes invalid
- Must request a new token

**After connection:**
- Session can last until `expireTime`
- If disconnected, cannot reconnect (uses = 1)

---

## 📱 **Token Usage (Client)**

### **1. Get Token from Backend**

```typescript
const response = await fetch('/gemini_live_token', {
  headers: { Authorization: `Bearer ${userJwt}` }
});

const { token } = await response.json();
// token = "projects/.../locations/.../cachedTokens/..."
```

### **2. Connect to Gemini Live API**

**Use `token.name` as API key:**

```typescript
// WebSocket connection
const ws = new WebSocket(
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${token}`
);

// Alternative: Authorization header (if using SDK)
const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Token ${token}`
  }
});

// Alternative: access_token query param
const ws = new WebSocket(`${url}?access_token=${token}`);
```

**✅ Recommended:** Use `?key=${token}` (simplest)

---

## 🔒 **Security Benefits**

### **Why Use Ephemeral Tokens?**

| Without Tokens | With Tokens |
|----------------|-------------|
| ❌ API key exposed to client | ✅ Token exposed (expires quickly) |
| ❌ Key can be reused indefinitely | ✅ Single-use only |
| ❌ Key works for all APIs | ✅ Scoped to Live API only |
| ❌ If leaked, permanent damage | ✅ If leaked, expires in <30 min |

**Best Practice:**
```typescript
// ❌ DON'T: Expose API key
const ws = new WebSocket(`wss://...?key=${GEMINI_API_KEY}`);

// ✅ DO: Use ephemeral token
const { token } = await getEphemeralToken();
const ws = new WebSocket(`wss://...?key=${token}`);
```

---

## 🔗 **Live Connect Constraints**

**Optional:** Lock the token to specific model and config.

```typescript
liveConnectConstraints: {
  model: "gemini-2.5-flash-native-audio-preview-12-2025",
  config: {
    sessionResumption: {},           // Enable session resumption
    responseModalities: ["AUDIO"],    // Gemini responds with audio
    inputAudioTranscription: {}       // Enable input transcription events
  }
}
```

**Why Lock Config?**
- ✅ Security: Client can't change model
- ✅ Cost control: Prevent expensive model usage
- ✅ Consistency: Ensure expected behavior

---

## 📋 **Token Response Format**

**From our Edge Function:**

```json
{
  "token": "projects/.../locations/.../cachedTokens/abc123...",
  "expire_time": "2026-01-10T08:00:00Z",
  "new_session_expire_time": "2026-01-10T07:31:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "request_id": "uuid"
}
```

**Client should:**
1. Store `token` for WebSocket connection
2. Note `new_session_expire_time` (connect within ~1 minute)
3. Note `expire_time` (session ends at this time)
4. Save `request_id` for debugging if issues occur

---

## 🧪 **Testing**

### **1. Request Token**

```bash
TOKEN=$(node get-token.js user1@test.com password123 | tail -1)

curl -X POST https://your-project.supabase.co/functions/v1/gemini_live_token \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:**
```json
{
  "token": "projects/.../cachedTokens/...",
  "expire_time": "...",
  "new_session_expire_time": "...",
  "model": "...",
  "request_id": "..."
}
```

### **2. Connect to WebSocket**

```typescript
const ws = new WebSocket(
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${token}`
);

ws.onopen = () => console.log('Connected!');
```

---

## ⚠️ **Common Issues**

### **1. "Token expired" on connect**

**Cause:** Waited too long between getting token and connecting  
**Fix:** Token is valid for ~1 minute. Connect immediately after getting it.

```typescript
// ❌ BAD: Too slow
const { token } = await getToken();
await doSomeOtherStuff();  // Too much delay!
const ws = new WebSocket(`...?key=${token}`); // Token expired!

// ✅ GOOD: Connect immediately
const { token } = await getToken();
const ws = new WebSocket(`...?key=${token}`); // Connect within seconds
```

### **2. "Invalid token" error**

**Possible causes:**
- Token format incorrect (must be full `token.name` string)
- Using wrong API version (must be `v1alpha`)
- API key invalid when creating token

### **3. "Token already used"**

**Cause:** Tried to reuse token (uses = 1)  
**Fix:** Request new token for each WebSocket connection

```typescript
// ❌ BAD: Reuse token
const { token } = await getToken();
const ws1 = new WebSocket(`...?key=${token}`); // OK
ws1.close();
const ws2 = new WebSocket(`...?key=${token}`); // ❌ Error: token already used

// ✅ GOOD: Get new token
const { token: token1 } = await getToken();
const ws1 = new WebSocket(`...?key=${token1}`);
ws1.close();

const { token: token2 } = await getToken();
const ws2 = new WebSocket(`...?key=${token2}`); // OK
```

---

## 🔧 **Implementation Notes**

### **Backend (Edge Function)**

**Requirements:**
- ✅ Use `@google/genai` SDK (not REST API)
- ✅ Set `apiVersion: "v1alpha"`
- ✅ Validate user JWT before creating token
- ✅ Never expose `GEMINI_API_KEY` to client
- ✅ Log errors with request_id for debugging

### **Client (Mobile App)**

**Requirements:**
- ✅ Request token before starting recording
- ✅ Connect within ~1 minute of getting token
- ✅ Handle token expiration (request new if needed)
- ✅ Don't reuse tokens (single-use)
- ✅ Close WebSocket when done

---

## 📚 **Related Documentation**

- **Ephemeral Tokens:** https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- **Live API Overview:** https://ai.google.dev/gemini-api/docs/live
- **WebSocket Protocol:** https://ai.google.dev/gemini-api/docs/live-guide
- **Our Edge Function:** `supabase/functions/gemini_live_token/index.ts`
- **Full Live API Guide:** `backend/docs/gemini-live-transcription.md`

---

## ✅ **Summary**

**Ephemeral tokens provide secure, short-lived credentials for Gemini Live API:**

- ✅ Short-lived (1-30 minutes)
- ✅ Single-use (can't reuse)
- ✅ API key stays on server
- ✅ Client gets token via authenticated endpoint
- ✅ Use `token.name` as WebSocket API key
- ✅ Must use `apiVersion: v1alpha`
- ✅ Only work with Live API (WebSocket)

**Flow:**
```
Client → Backend (/gemini_live_token) → Get ephemeral token
  ↓
Client → Gemini Live API (WebSocket) → Use token as key
  ↓
Stream audio & receive transcriptions
```

**This pattern prevents API key leakage while enabling direct client-to-Gemini connections for low-latency streaming.**
