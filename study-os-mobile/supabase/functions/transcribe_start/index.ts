// ============================================================================
// Edge Function: transcribe_start
// ============================================================================
// 
// Purpose: Initialize a new transcription session with AssemblyAI
// 
// Request:
//   POST /transcribe_start
//   Headers: Authorization: Bearer <user_token>
//   Body: { language?: string, provider?: string }
// 
// Response:
//   { 
//     session_id: string, 
//     status: string, 
//     created_at: string,
//     assemblyai_ws_url: string,
//     expires_at: string
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartRequest {
  language?: string;
  provider?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for auth validation (handles ES256)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT using service role (supports ES256)
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error("Auth validation failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Authenticated:", user.email, user.id);

    // Create client for database operations (with user context for RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Parse request body
    const body: StartRequest = await req.json();
    const { language, provider = "assemblyai" } = body;

    // Validate language if provided
    if (language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
      return new Response(
        JSON.stringify({ error: "Invalid language format. Use format: en, en-US, es-ES" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create transcription session
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

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create transcription session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize empty transcript
    const { error: transcriptError } = await supabaseClient
      .from("transcripts")
      .insert({
        session_id: session.id,
        full_text: "",
      });

    if (transcriptError) {
      console.error("Error creating transcript:", transcriptError);
      // Non-fatal, continue
    }

    // Get temporary token from AssemblyAI (for v3 API)
    let assemblyaiToken = "";
    let assemblyaiWsUrl = "";
    
    if (provider === "assemblyai") {
      const assemblyaiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
      if (!assemblyaiKey) {
        console.error("ASSEMBLYAI_API_KEY not configured");
        return new Response(
          JSON.stringify({ error: "AssemblyAI not configured on server" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Get temporary token (expires in 10 minutes)
        const tokenResponse = await fetch(
          "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600",
          {
            headers: {
              Authorization: assemblyaiKey,
            },
          }
        );

        if (!tokenResponse.ok) {
          throw new Error(`AssemblyAI token request failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        assemblyaiToken = tokenData.token;

        // Construct v3 WebSocket URL with token
        assemblyaiWsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&format_turns=true&end_of_turn_confidence_threshold=0.8&min_end_of_turn_silence_when_confident=700&max_turn_silence=3000&token=${assemblyaiToken}`;
        
        console.log("✅ AssemblyAI temporary token obtained");
      } catch (error) {
        console.error("Failed to get AssemblyAI token:", error);
        return new Response(
          JSON.stringify({ error: "Failed to get AssemblyAI token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Session expires in 10 minutes (matching token expiry)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        session_id: session.id,
        status: session.status,
        language: session.language,
        created_at: session.created_at,
        assemblyai_ws_url: assemblyaiWsUrl,
        assemblyai_token: assemblyaiToken,
        expires_at: expiresAt,
      }),
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
