// ============================================================================
// Edge Function: gemini_live_token
// ============================================================================
// 
// Purpose: Mint ephemeral tokens for Gemini Live API WebSocket connections
// 
// Request:
//   POST /gemini_live_token
//   Headers: Authorization: Bearer <user_token>
// 
// Response:
//   {
//     token: string,
//     expire_time: string,
//     new_session_expire_time: string,
//     model: string
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

// Top-level log to confirm module load
console.log("gemini_live_token boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Token expiration times
const EXPIRE_TIME_MINUTES = 30;
const NEW_SESSION_EXPIRE_TIME_MINUTES = 1;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate request ID for debugging
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received`);

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log(`[${requestId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header", request_id: requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT token
    const token = authHeader.replace("Bearer ", "");

    // Verify user is authenticated
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      console.log(`[${requestId}] Authentication failed:`, userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized", request_id: requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ 
          error: "Service configuration error", 
          request_id: requestId 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate expiration times
    const now = new Date();
    const expireTime = new Date(now.getTime() + EXPIRE_TIME_MINUTES * 60 * 1000);
    const newSessionExpireTime = new Date(now.getTime() + NEW_SESSION_EXPIRE_TIME_MINUTES * 60 * 1000);

    console.log(`[${requestId}] Attempting to import @google/genai SDK...`);

    try {
      // Dynamic import to avoid boot-time failure
      const { GoogleGenAI } = await import("npm:@google/genai@1.35.0");
      console.log(`[${requestId}] SDK imported successfully`);

      // Initialize Google GenAI client with API key and v1alpha
      // v1alpha is required for authTokens API
      const client = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: { apiVersion: "v1alpha" },
      });

      console.log(`[${requestId}] Creating ephemeral token...`);

      // Create ephemeral token using official SDK
      // Docs: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
      const token = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime: expireTime.toISOString(),
          newSessionExpireTime: newSessionExpireTime.toISOString(),
          liveConnectConstraints: {
            model: "gemini-2.5-flash-native-audio-preview-12-2025",
            config: {
              sessionResumption: {},
              responseModalities: ["AUDIO"],
              inputAudioTranscription: {},
            },
          },
        },
      });

      console.log(`[${requestId}] Ephemeral token created successfully`);

      // Return token to client (never expose GEMINI_API_KEY)
      return new Response(
        JSON.stringify({
          token: token.name,
          expire_time: expireTime.toISOString(),
          new_session_expire_time: newSessionExpireTime.toISOString(),
          model: "gemini-2.5-flash-native-audio-preview-12-2025",
          request_id: requestId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (importError) {
      // Log import or SDK error details
      console.error(`[${requestId}] SDK import or token creation failed:`, {
        name: importError instanceof Error ? importError.name : "UnknownError",
        message: importError instanceof Error ? importError.message : String(importError),
        stack: importError instanceof Error ? importError.stack : undefined,
      });

      // Return 500 with specific error
      return new Response(
        JSON.stringify({
          error: "GENAI_IMPORT_FAILED",
          message: importError instanceof Error ? importError.message : "Failed to load SDK",
          request_id: requestId,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    // Log full error details for debugging
    console.error(`[${requestId}] Token creation failed:`, {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      status: (error as any)?.status || (error as any)?.statusCode,
      response: (error as any)?.response,
      body: (error as any)?.body,
    });
    
    // Don't leak internal error details to client
    return new Response(
      JSON.stringify({ 
        error: "TOKEN_CREATE_FAILED", 
        request_id: requestId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
