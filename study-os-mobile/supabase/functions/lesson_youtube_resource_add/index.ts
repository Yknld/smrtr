// ============================================================================
// Edge Function: lesson_youtube_resource_add
// ============================================================================
// 
// Purpose: Add YouTube videos as supplementary learning resources to lessons
// 
// Request:
//   POST /lesson_youtube_resource_add
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "lesson_id": uuid,
//     "youtube_url": string,
//     "title": string,           // Custom title for this resource
//     "notes"?: string,           // Why this video is helpful
//     "topic"?: string,           // What concept this helps with
//     "is_recommended"?: boolean  // Mark as top pick
//   }
// 
// Response:
//   {
//     "resource_id": uuid,
//     "youtube_video_id": uuid,
//     "video_id": string,
//     "message": "Resource added successfully"
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

console.log("lesson_youtube_resource_add boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  lesson_id: string;
  youtube_url: string;
  title: string;
  notes?: string;
  topic?: string;
  is_recommended?: boolean;
}

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received`);

  try {
    // Get Authorization header
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization header is required"
          }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token"
          }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON in request body"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    if (!body.lesson_id) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_LESSON_ID",
            message: "lesson_id is required"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.youtube_url) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_URL",
            message: "youtube_url is required"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.title || body.title.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_TITLE",
            message: "title is required and must not be empty"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(body.youtube_url);
    if (!videoId) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_YOUTUBE_URL",
            message: "Invalid YouTube URL format"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Extracted video ID: ${videoId}`);

    // Verify lesson exists and user owns it
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, title")
      .eq("id", body.lesson_id)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "LESSON_NOT_FOUND",
            message: "Lesson not found or access denied"
          }
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Verified lesson: ${lesson.title}`);

    // Call the helper function to add the resource
    const { data: result, error: functionError } = await supabase.rpc(
      'add_youtube_resource_to_lesson',
      {
        p_user_id: user.id,
        p_lesson_id: body.lesson_id,
        p_video_id: videoId,
        p_title: body.title,
        p_notes: body.notes || null,
        p_topic: body.topic || null,
        p_is_recommended: body.is_recommended || false,
      }
    );

    if (functionError) {
      console.error(`[${requestId}] Error adding resource:`, functionError);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "ADD_RESOURCE_FAILED",
            message: functionError.message || "Failed to add YouTube resource"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resourceId = result;
    console.log(`[${requestId}] Resource added: ${resourceId}`);

    // Fetch the created resource with video details
    const { data: resource, error: fetchError } = await supabase
      .from("lesson_youtube_resources")
      .select(`
        id,
        title,
        notes,
        topic,
        is_recommended,
        display_order,
        youtube_videos (
          id,
          video_id,
          title,
          thumbnail_url,
          duration_seconds
        )
      `)
      .eq("id", resourceId)
      .single();

    if (fetchError || !resource) {
      // Resource was created but we couldn't fetch it - still success
      console.warn(`[${requestId}] Resource created but fetch failed:`, fetchError);
      return new Response(
        JSON.stringify({
          resource_id: resourceId,
          video_id: videoId,
          message: "Resource added successfully"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success with full details
    return new Response(
      JSON.stringify({
        resource_id: resource.id,
        youtube_video_id: resource.youtube_videos.id,
        video_id: resource.youtube_videos.video_id,
        title: resource.title,
        notes: resource.notes,
        topic: resource.topic,
        is_recommended: resource.is_recommended,
        display_order: resource.display_order,
        thumbnail_url: resource.youtube_videos.thumbnail_url,
        duration_seconds: resource.youtube_videos.duration_seconds,
        message: "Resource added successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({ 
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred"
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
