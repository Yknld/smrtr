// ============================================================================
// Edge Function: podcast_get
// ============================================================================
// 
// Purpose: Get podcast episode metadata and all segments
// 
// Request:
//   GET /podcast_get?episode_id=<uuid>
//   Headers: Authorization: Bearer <user_token>
// 
// Response:
//   { 
//     episode: {
//       id: string,
//       lesson_id: string,
//       title: string,
//       status: string,
//       language: string,
//       voice_a_id: string,
//       voice_b_id: string,
//       total_segments: number
//     },
//     segments: [
//       {
//         seq: number,
//         speaker: string,
//         text: string,
//         tts_status: string,
//         audio_bucket: string | null,
//         audio_path: string | null,
//         duration_ms: number | null
//       }
//     ]
//   }
// 
// Features:
//   - JWT authentication required
//   - Ownership verified via RLS
//   - Segments always ordered by seq
//   - Returns both text and audio pointers
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log("🚀 podcast_get invoked:", req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("✓ CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =========================================================================
    // 1. Validate JWT and get user
    // =========================================================================
    
    const authHeader = req.headers.get("Authorization");
    console.log("📋 Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.log("❌ Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for auth validation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT
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

    // =========================================================================
    // 2. Parse and validate query parameters
    // =========================================================================
    
    const url = new URL(req.url);
    const episodeId = url.searchParams.get("episode_id");

    if (!episodeId) {
      console.log("❌ Missing episode_id parameter");
      return new Response(
        JSON.stringify({ error: "Missing required parameter: episode_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(episodeId)) {
      console.log("❌ Invalid UUID format:", episodeId);
      return new Response(
        JSON.stringify({ error: "Invalid episode_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📝 Fetching episode:", episodeId);

    // =========================================================================
    // 3. Fetch episode metadata (RLS will verify ownership)
    // =========================================================================
    
    const { data: episode, error: episodeError } = await supabaseClient
      .from("podcast_episodes")
      .select("id, lesson_id, title, status, language, voice_a_id, voice_b_id, total_segments")
      .eq("id", episodeId)
      .single();

    if (episodeError || !episode) {
      console.error("Episode not found or access denied:", episodeError);
      return new Response(
        JSON.stringify({ error: "Episode not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Episode found:", episode.title, `(${episode.total_segments} segments)`);

    // =========================================================================
    // 4. Fetch all segments ordered by seq
    // =========================================================================
    
    const { data: segments, error: segmentsError } = await supabaseClient
      .from("podcast_segments")
      .select("seq, speaker, text, tts_status, audio_bucket, audio_path, duration_ms")
      .eq("episode_id", episodeId)
      .order("seq", { ascending: true });

    if (segmentsError) {
      console.error("Error fetching segments:", segmentsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch segments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Fetched ${segments?.length || 0} segments`);

    // =========================================================================
    // 5. Return response
    // =========================================================================
    
    return new Response(
      JSON.stringify({
        episode,
        segments: segments || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
