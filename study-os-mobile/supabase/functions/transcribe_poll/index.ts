// ============================================================================
// Edge Function: transcribe_poll
// ============================================================================
// 
// Purpose: Poll for transcription status and retrieve incremental results
// 
// Request:
//   GET /transcribe_poll?session_id=<uuid>&after_chunk_index=<number>
//   Headers: Authorization: Bearer <user_token>
//   Query Params:
//     - session_id: required
//     - after_chunk_index: optional, default -1 (returns all segments)
// 
// Response:
//   {
//     session_id: string,
//     status: string,
//     latest_chunk_index: number,  // Max chunk_index present
//     segments: Array<{ chunk_index: number, text: string, confidence?: number }>,
//     tail_text?: string,  // Last ~600 chars for live captions
//     chunks: Array<{ chunk_index: number, status: string }>,  // For compatibility
//     progress: number,
//     updated_at: string
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAIL_TEXT_LENGTH = 600; // Characters to return for live captions

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

    // Parse query parameters
    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");
    const afterChunkIndexParam = url.searchParams.get("after_chunk_index");
    const afterChunkIndex = afterChunkIndexParam ? parseInt(afterChunkIndexParam, 10) : -1;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "Missing session_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isNaN(afterChunkIndex)) {
      return new Response(
        JSON.stringify({ error: "Invalid after_chunk_index parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify session exists and belongs to user (RLS enforced)
    // RLS will return null if user doesn't own this session
    const { data: session, error: sessionError } = await supabaseClient
      .from("transcription_sessions")
      .select("id, status, language, created_at, updated_at")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      // Return 404 to prevent session ID probing
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch incremental transcript_segments (where chunk_index > after_chunk_index)
    const { data: segments, error: segmentsError } = await supabaseClient
      .from("transcript_segments")
      .select("chunk_index, text, confidence")
      .eq("session_id", session_id)
      .gt("chunk_index", afterChunkIndex)
      .order("chunk_index", { ascending: true });

    if (segmentsError) {
      console.error("Error fetching segments:", segmentsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch segments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute latest_chunk_index from segments (not chunks)
    // Returns -1 when no segments exist yet
    const { data: latestSegment } = await supabaseClient
      .from("transcript_segments")
      .select("chunk_index")
      .eq("session_id", session_id)
      .order("chunk_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestChunkIndex = latestSegment ? latestSegment.chunk_index : -1;

    // Fetch chunks (for status and progress)
    const { data: chunks, error: chunksError } = await supabaseClient
      .from("transcription_chunks")
      .select("chunk_index, status, duration_ms, error")
      .eq("session_id", session_id)
      .order("chunk_index", { ascending: true });

    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      // Non-fatal, continue with empty chunks
    }

    // Fetch tail_text from transcripts.full_text (simple: last 600 chars or omit)
    const { data: transcript } = await supabaseClient
      .from("transcripts")
      .select("full_text")
      .eq("session_id", session_id)
      .maybeSingle();

    // Only include tail_text if transcript exists
    const tailText = transcript?.full_text
      ? transcript.full_text.slice(-TAIL_TEXT_LENGTH)
      : undefined;

    // Compute overall progress
    const totalChunks = chunks?.length || 0;
    const completedChunks = chunks?.filter((c) => c.status === "done").length || 0;
    const progress = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;

    // Build response (minimal fields)
    const response: any = {
      session_id: session.id,
      status: session.status,  // "recording" | "processing" | "complete" | "failed"
      latest_chunk_index: latestChunkIndex,  // -1 when no segments yet
      segments: segments?.map((s) => ({
        chunk_index: s.chunk_index,
        text: s.text,
        confidence: s.confidence || undefined,
      })) || [],
      chunks: chunks?.map((c) => ({
        chunk_index: c.chunk_index,
        status: c.status,
        error: c.error || undefined,
      })) || [],
      progress,
    };

    // Only include tail_text if it exists
    if (tailText !== undefined) {
      response.tail_text = tailText;
    }

    return new Response(
      JSON.stringify(response),
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
