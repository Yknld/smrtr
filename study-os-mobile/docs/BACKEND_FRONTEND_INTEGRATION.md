# Backend-Frontend Integration Guide

This document explains how to connect frontend features to Supabase Edge Functions in this project.

## Overview

The project uses **Supabase Edge Functions** (Deno-based serverless functions) as the backend API layer. The mobile app communicates with these functions using authenticated HTTP requests.

## Architecture Pattern

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │ 1. Get auth session
         │ 2. Call edge function with Bearer token
         ▼
┌─────────────────┐
│  Supabase       │
│  Edge Function  │
│  (Deno)         │
└────────┬────────┘
         │ 3. Validate JWT
         │ 4. Process request
         │ 5. Return response
         ▼
┌─────────────────┐
│  External API   │
│  (AssemblyAI,   │
│   Gemini, etc)  │
└─────────────────┘
```

## Step-by-Step Integration

### 1. Backend: Create Edge Function

**Location:** `supabase/functions/<function_name>/index.ts`

**Template:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate JWT using service role (supports ES256)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error("Auth validation failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Authenticated:", user.email, user.id);

    // 3. Create client for database operations (with user context for RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // 4. Parse request body
    const body = await req.json();

    // 5. Process request (your business logic here)
    // Example: Call external API, query database, etc.

    // 6. Return response
    return new Response(
      JSON.stringify({ success: true, data: {} }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2. Backend: Configure Environment Variables

Edge functions can access secrets via `Deno.env.get()`.

**Set secrets:**

```bash
# Set a secret
supabase secrets set MY_API_KEY=your-key-here

# List secrets
supabase secrets list

# Unset a secret
supabase secrets unset MY_API_KEY
```

**Common secrets:**
- `ASSEMBLYAI_API_KEY` - For live transcription
- `GEMINI_API_KEY` - For AI features (summaries, flashcards)
- `YOUTUBE_API_KEY` - For YouTube imports

### 3. Backend: Deploy Function

```bash
cd supabase/functions

# Deploy single function
supabase functions deploy <function_name> --no-verify-jwt

# Deploy all functions
./deploy.sh
```

**Note:** `--no-verify-jwt` is used because we manually validate JWTs in the function code to support ES256 algorithm.

### 4. Frontend: Call Edge Function

**Location:** `apps/mobile/src/services/<feature>.ts` or directly in screens

**Pattern:**

```typescript
import { supabase } from '../config/supabase';

export async function callEdgeFunction() {
  try {
    // 1. Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please sign in.');
    }

    // 2. Call edge function
    const response = await fetch(
      'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/<function_name>',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // your request data
        }),
      }
    );

    // 3. Handle response
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Edge function call failed:', error);
    throw error;
  }
}
```

### 5. Frontend: Handle Errors

**Common error patterns:**

```typescript
try {
  const result = await callEdgeFunction();
  // Success
} catch (error: any) {
  if (error.message.includes('Not authenticated')) {
    // Redirect to login
    Alert.alert('Session Expired', 'Please sign in again.');
  } else if (error.message.includes('Network')) {
    // Network error
    Alert.alert('Network Error', 'Please check your connection.');
  } else {
    // Generic error
    Alert.alert('Error', error.message);
  }
}
```

## Real Example: Live Transcription

### Backend: `transcribe_start/index.ts`

```typescript
// 1. Validate auth (see template above)

// 2. Parse request
const body: StartRequest = await req.json();
const { language, provider = "assemblyai" } = body;

// 3. Create session in database
const { data: session, error: sessionError } = await supabaseClient
  .from("transcription_sessions")
  .insert({
    user_id: user.id,
    source_type: "live_recording",
    status: "recording",
    language: language || null,
    provider: provider,
  })
  .select("id, user_id, status, language, created_at")
  .single();

// 4. Get temporary token from external API
const tokenResponse = await fetch(
  "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600",
  {
    headers: {
      Authorization: Deno.env.get("ASSEMBLYAI_API_KEY") ?? "",
    },
  }
);

const { token } = await tokenResponse.json();

// 5. Return session info + token
return new Response(
  JSON.stringify({
    session_id: session.id,
    assemblyai_ws_url: `wss://streaming.assemblyai.com/v3/ws?token=${token}`,
    assemblyai_token: token,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

### Frontend: `assemblyLive.ts`

```typescript
async start() {
  // 1. Get auth session
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !data.session) {
    throw new Error('Not authenticated. Please sign in.');
  }

  // 2. Call backend
  const response = await fetch(
    'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_start',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'assemblyai',
        language: 'en-US',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Backend error: ${response.status}`);
  }

  const backendData = await response.json();

  // 3. Use response data
  this.sessionInfo = {
    session_id: backendData.session_id,
    assemblyai_token: backendData.assemblyai_token,
    assemblyai_ws_url: backendData.assemblyai_ws_url,
    expires_at: backendData.expires_at
  };

  // 4. Connect to external service
  await this.connectWebSocket();
}
```

## Testing

### 1. Test Backend Function Locally

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve <function_name> --env-file ./supabase/.env.local

# Test with curl
curl http://localhost:54321/functions/v1/<function_name> \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"test": "data"}'
```

### 2. Test Backend Function in Production

```bash
# Get auth token from mobile app (console.log it)
# Then test:
curl https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/<function_name> \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"test": "data"}'
```

### 3. Test Frontend Integration

```typescript
// Add debug logging
console.log('🔍 Calling edge function...');
console.log('📋 Request:', { provider, language });

const response = await fetch(...);

console.log('📥 Response status:', response.status);
const data = await response.json();
console.log('📦 Response data:', data);
```

## Common Issues

### Issue: "Invalid JWT"

**Cause:** Supabase uses ES256 algorithm, but some JWT libraries expect HS256.

**Solution:** Use `supabaseAdmin.auth.getUser(jwt)` instead of manual JWT verification.

```typescript
// ❌ Don't do this
const decoded = jwt.verify(token, secret);

// ✅ Do this
const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
```

### Issue: "CORS error"

**Cause:** Missing CORS headers in edge function response.

**Solution:** Add CORS headers to all responses:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In every response
return new Response(
  JSON.stringify({ ... }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

### Issue: "Missing authorization header"

**Cause:** Frontend not sending auth token.

**Solution:** Always get session and include Bearer token:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error('Not authenticated');

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});
```

### Issue: "Function not found"

**Cause:** Function not deployed or wrong URL.

**Solution:**
1. Check function is deployed: `supabase functions list`
2. Verify URL format: `https://<project-ref>.supabase.co/functions/v1/<function-name>`
3. Check function name matches directory name

## Best Practices

### 1. Security

- ✅ **Always validate auth** in edge functions
- ✅ **Use service role key** only in edge functions (never in mobile app)
- ✅ **Store API keys** as Supabase secrets (not in code)
- ✅ **Use RLS policies** for database access
- ❌ **Never expose** service role key or API keys in mobile app

### 2. Error Handling

- ✅ **Return consistent error format**: `{ error: "message" }`
- ✅ **Use appropriate HTTP status codes**: 401, 400, 500, etc.
- ✅ **Log errors** with context: `console.error("Context:", error)`
- ✅ **Handle network errors** in frontend with retry logic

### 3. Performance

- ✅ **Cache auth session** (Supabase does this automatically)
- ✅ **Use connection pooling** for database queries
- ✅ **Minimize round trips** (batch operations when possible)
- ✅ **Set timeouts** for external API calls

### 4. Testing

- ✅ **Test auth flow** (valid token, expired token, no token)
- ✅ **Test error cases** (network error, API error, validation error)
- ✅ **Test edge cases** (empty input, invalid input, large input)
- ✅ **Monitor logs** in Supabase dashboard

## Deployment Checklist

Before deploying a new feature:

- [ ] Edge function created in `supabase/functions/<name>/`
- [ ] Function validates auth using `supabaseAdmin.auth.getUser()`
- [ ] Function has CORS headers on all responses
- [ ] Required secrets set: `supabase secrets set KEY=value`
- [ ] Function deployed: `supabase functions deploy <name> --no-verify-jwt`
- [ ] Frontend service/screen calls function with Bearer token
- [ ] Error handling implemented in frontend
- [ ] Tested with valid auth token
- [ ] Tested with expired/invalid token
- [ ] Tested error cases (network, API errors)
- [ ] Logs checked in Supabase dashboard

## Resources

- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Deno Docs**: https://deno.land/manual
- **JWT Validation**: https://supabase.com/docs/guides/functions/auth
- **CORS Setup**: https://supabase.com/docs/guides/functions/cors

## Examples in This Codebase

| Feature | Backend Function | Frontend Service | Status |
|---------|-----------------|------------------|--------|
| Live Transcription | `transcribe_start` | `assemblyLive.ts` | ✅ Connected |
| Gemini Live Token | `gemini_live_token` | `geminiLive.ts` | ✅ Connected |
| Flashcard Generation | `lesson_generate_flashcards` | TBD | ⏳ Pending |
| Summary Generation | `lesson_generate_summary` | TBD | ⏳ Pending |
| YouTube Import | `lesson_create_from_youtube` | TBD | ⏳ Pending |
| Study Plan | `study_plan_upsert` | TBD | ⏳ Pending |
| Push Tokens | `push_token_upsert` | TBD | ⏳ Pending |

## Next Steps

1. **Connect remaining features** using this pattern
2. **Add error tracking** (Sentry, LogRocket, etc.)
3. **Implement retry logic** for transient failures
4. **Add request/response logging** for debugging
5. **Create integration tests** for critical paths
