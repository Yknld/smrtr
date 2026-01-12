// ============================================================================
// Edge Function: transcribe_chunk
// ============================================================================
// 
// Purpose: Transcribe an uploaded audio chunk
// 
// Request:
//   POST /transcribe_chunk
//   Headers: Authorization: Bearer <user_token>
//   Body: {
//     session_id: string,
//     chunk_index: number,
//     storage_path: string,
//     duration_ms: number,
//     overlap_ms: number
//   }
// 
// Response:
//   {
//     chunk_id: string,
//     chunk_index: number,
//     status: string,
//     tail_text?: string  // Last ~600 chars for live captions
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Guardrails
const MAX_CHUNK_DURATION_MS = 10000; // 10 seconds
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const TAIL_TEXT_LENGTH = 600; // Characters to return for live captions

interface ChunkRequest {
  session_id: string;
  chunk_index: number;
  storage_path: string;
  duration_ms: number;
  overlap_ms: number;
}

/**
 * Simple overlap merge algorithm
 * Compares last ~160 chars of existing text to beginning of new text
 * Trims largest overlap and appends
 */
function simpleOverlapMerge(existingText: string, newText: string): string {
  if (!existingText) return newText;
  if (!newText) return existingText;

  // Normalize: lowercase, collapse whitespace
  const normalize = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  // Compare last 160 chars of existing with beginning of new
  const OVERLAP_WINDOW = 160;
  const existingTail = existingText.slice(-OVERLAP_WINDOW);
  const existingTailNorm = normalize(existingTail);

  // Try to find overlap from longest to shortest (minimum 10 chars)
  let bestOverlap = 0;
  for (let len = Math.min(existingTailNorm.length, normalize(newText).length); len >= 10; len--) {
    const tailSegment = existingTailNorm.slice(-len);
    const newPrefix = normalize(newText.slice(0, len * 2)); // Check up to 2x length in new text

    if (newPrefix.includes(tailSegment)) {
      bestOverlap = len;
      break;
    }
  }

  // If overlap found, trim it from new text
  if (bestOverlap > 0) {
    // Find actual character position in original (non-normalized) text
    // Simple heuristic: use word count as proxy
    const overlapWords = existingTailNorm.slice(-bestOverlap).split(" ").length;
    const newTextWords = newText.split(/\s+/);
    const trimmedNew = newTextWords.slice(overlapWords).join(" ");
    return existingText + " " + trimmedNew;
  }

  // No overlap found, just append
  return existingText + " " + newText;
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
    const body: ChunkRequest = await req.json();
    const { session_id, chunk_index, storage_path, duration_ms, overlap_ms } = body;

    // Validate input
    if (!session_id || chunk_index < 0 || !storage_path || duration_ms <= 0 || overlap_ms < 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply guardrails
    if (duration_ms > MAX_CHUNK_DURATION_MS) {
      return new Response(
        JSON.stringify({ error: `Chunk duration exceeds maximum of ${MAX_CHUNK_DURATION_MS}ms` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabaseClient
      .from("transcription_sessions")
      .select("id, user_id, status, language")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: session does not belong to user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status !== "recording") {
      return new Response(
        JSON.stringify({ error: `Session is in '${session.status}' state, cannot add chunks` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) IDEMPOTENCY: Check if chunk already exists with status='done'
    const { data: existingChunk, error: checkError } = await supabaseClient
      .from("transcription_chunks")
      .select("id, chunk_index, status")
      .eq("session_id", session_id)
      .eq("chunk_index", chunk_index)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing chunk:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check chunk status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If chunk already processed successfully, return cached result
    if (existingChunk && existingChunk.status === "done") {
      console.log(`Chunk ${chunk_index} already processed, returning cached result`);
      
      // Fetch current transcript tail_text
      const { data: transcript } = await supabaseClient
        .from("transcripts")
        .select("full_text")
        .eq("session_id", session_id)
        .maybeSingle();

      const tailText = transcript?.full_text
        ? transcript.full_text.slice(-TAIL_TEXT_LENGTH)
        : "";

      return new Response(
        JSON.stringify({
          chunk_id: existingChunk.id,
          chunk_index: existingChunk.chunk_index,
          status: "done",
          tail_text: tailText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or reuse chunk record
    let chunk = existingChunk;
    if (!chunk) {
      const { data: newChunk, error: chunkError } = await supabaseClient
        .from("transcription_chunks")
        .insert({
          session_id,
          chunk_index,
          storage_path,
          duration_ms,
          overlap_ms,
          status: "uploaded",
        })
        .select("id, chunk_index, status")
        .single();

      if (chunkError) {
        console.error("Error creating chunk:", chunkError);
        return new Response(
          JSON.stringify({ error: "Failed to create chunk record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      chunk = newChunk;
    }

    // STATUS TRANSITION: uploaded -> transcribing
    await supabaseClient
      .from("transcription_chunks")
      .update({ status: "transcribing" })
      .eq("id", chunk.id);

    // Fetch audio file from Storage using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from("raw_audio_chunks")
      .download(storage_path);

    if (downloadError || !fileData) {
      console.error("Error downloading audio file:", downloadError);
      const errorMsg = downloadError?.message || "Failed to download audio file";
      await supabaseClient
        .from("transcription_chunks")
        .update({ status: "failed", error: errorMsg })
        .eq("id", chunk.id);
      return new Response(
        JSON.stringify({ error: "Failed to download audio file from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check file size
    const fileSize = fileData.size;
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      const errorMsg = `File size ${fileSize} exceeds maximum of ${MAX_FILE_SIZE_BYTES} bytes`;
      await supabaseClient
        .from("transcription_chunks")
        .update({ status: "failed", error: errorMsg })
        .eq("id", chunk.id);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert Blob to Buffer for transcription
    const audioBuffer = new Uint8Array(await fileData.arrayBuffer());

    // Transcribe audio using Whisper
    try {
      const { WhisperTranscriber } = await import("../../lib/transcription/WhisperTranscriber.ts");
      
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }

      const transcriber = new WhisperTranscriber(apiKey);
      const result = await transcriber.transcribeAudio(audioBuffer, {
        language: session.language || "en",
        chunkIndex: chunk_index,
        sessionId: session_id,
      });

      const newText = result.text.trim();
      
      if (!newText) {
        throw new Error("Whisper returned empty transcript");
      }

      console.log(`[transcribe_chunk] Transcription successful:`, {
        sessionId: session_id,
        chunkIndex: chunk_index,
        textLength: newText.length,
        detectedLanguage: result.language,
      });

      // Insert transcript segment
      const { error: segmentError } = await supabaseClient
        .from("transcript_segments")
        .insert({
          session_id,
          chunk_index,
          text: newText,
          confidence: result.confidence || null,
        });

      if (segmentError) {
        console.error("Error inserting segment:", segmentError);
        // Continue, not fatal
      }

      // 2) OVERLAP DEDUPE MERGE: Update transcripts.full_text
      const { data: existingTranscript } = await serviceClient
        .from("transcripts")
        .select("full_text")
        .eq("session_id", session_id)
        .maybeSingle();

      let mergedText = newText;
      if (existingTranscript && existingTranscript.full_text) {
        mergedText = simpleOverlapMerge(existingTranscript.full_text, newText);
      }

      // Upsert merged transcript
      const { error: upsertError } = await serviceClient
        .from("transcripts")
        .upsert({
          session_id,
          full_text: mergedText,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "session_id"
        });

      if (upsertError) {
        console.error("Error upserting transcript:", upsertError);
        // Continue, not fatal
      }

      // STATUS TRANSITION: transcribing -> done
      await supabaseClient
        .from("transcription_chunks")
        .update({ status: "done" })
        .eq("id", chunk.id);

      // 3) RETURN tail_text: Last 600 chars
      const tailText = mergedText.slice(-TAIL_TEXT_LENGTH);

      return new Response(
        JSON.stringify({
          chunk_id: chunk.id,
          chunk_index: chunk.chunk_index,
          status: "done",
          tail_text: tailText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (transcriptionError) {
      // Handle transcription failure
      console.error("Transcription failed:", {
        sessionId: session_id,
        chunkIndex: chunk_index,
        error: transcriptionError instanceof Error ? transcriptionError.message : String(transcriptionError),
        stack: transcriptionError instanceof Error ? transcriptionError.stack : undefined,
      });
      
      const errorMsg = transcriptionError instanceof Error 
        ? transcriptionError.message 
        : "Transcription failed";
      
      await supabaseClient
        .from("transcription_chunks")
        .update({ status: "failed", error: errorMsg })
        .eq("id", chunk.id);
      
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
