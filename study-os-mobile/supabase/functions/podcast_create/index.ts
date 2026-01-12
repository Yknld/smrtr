// ============================================================================
// Edge Function: podcast_create
// ============================================================================
// 
// Purpose: Create a new AI-generated podcast episode for a lesson
// 
// Request:
//   POST /podcast_create
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     lesson_id: string,
//     language?: string (default: "en"),
//     voice_a_id?: string (default: "gemini_voice_a"),
//     voice_b_id?: string (default: "gemini_voice_b")
//   }
// 
// Response:
//   {
//     episode_id: string,
//     status: "queued"
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PodcastCreateRequest {
  lesson_id: string;
  language?: string;
  voice_a_id?: string;
  voice_b_id?: string;
}

interface PodcastCreateResponse {
  episode_id: string;
  status: "queued";
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received`);

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    // Validate JWT and get user
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error(`[${requestId}] Auth validation failed:`, authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated user:`, user.id);

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
    const body: PodcastCreateRequest = await req.json();
    const { 
      lesson_id, 
      language = "en",
      voice_a_id = "gemini_voice_a",
      voice_b_id = "gemini_voice_b"
    } = body;

    // Validate lesson_id
    if (!lesson_id) {
      return new Response(
        JSON.stringify({ error: "lesson_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Creating podcast episode for lesson:`, lesson_id);

    // Verify lesson exists and belongs to user (RLS will enforce this)
    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id, title, user_id")
      .eq("id", lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error(`[${requestId}] Lesson not found or unauthorized:`, lessonError?.message);
      return new Response(
        JSON.stringify({ 
          error: "Lesson not found or unauthorized",
          error_code: "LESSON_NOT_FOUND"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Lesson verified:`, lesson.title);

    // Check if there's already a podcast episode for this lesson
    const { data: existingEpisode } = await supabaseClient
      .from("podcast_episodes")
      .select("id, status")
      .eq("lesson_id", lesson_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's an existing episode that's not failed, return it
    if (existingEpisode && existingEpisode.status !== "failed") {
      console.log(`[${requestId}] Existing episode found:`, existingEpisode.id);
      return new Response(
        JSON.stringify({
          episode_id: existingEpisode.id,
          status: existingEpisode.status,
          message: "Episode already exists for this lesson",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new podcast episode
    const { data: episode, error: episodeError } = await supabaseClient
      .from("podcast_episodes")
      .insert({
        user_id: user.id,
        lesson_id: lesson_id,
        title: lesson.title, // Use lesson title as episode title
        status: "queued",
        language: language,
        voice_a_id: voice_a_id,
        voice_b_id: voice_b_id,
        total_segments: 0, // Will be updated when script is generated
      })
      .select("id, status")
      .single();

    if (episodeError) {
      console.error(`[${requestId}] Failed to create episode:`, episodeError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create podcast episode",
          error_code: "CREATE_FAILED"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Episode created successfully:`, episode.id);

    // Return success response
    const response: PodcastCreateResponse = {
      episode_id: episode.id,
      status: "queued",
    };

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        request_id: requestId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
