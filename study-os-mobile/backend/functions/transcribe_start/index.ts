// ============================================================================
// Edge Function: transcribe_start
// ============================================================================
// 
// Purpose: Initialize a new transcription session
// 
// Request:
//   POST /transcribe_start
//   Headers: Authorization: Bearer <user_token>
//   Body: { language?: string }
// 
// Response:
//   { session_id: string, status: string, created_at: string }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartRequest {
  language?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client with anon key for auth check
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify user is authenticated by passing JWT directly
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a new client with the user's token for database operations
    // This ensures RLS policies work correctly
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
    const { language } = body;

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

    return new Response(
      JSON.stringify({
        session_id: session.id,
        status: session.status,
        language: session.language,
        created_at: session.created_at,
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
