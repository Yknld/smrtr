// ============================================================================
// Edge Function: notes_commit_from_segments
// ============================================================================
// 
// Purpose: Commit new transcript segments to canonical notes document
// 
// Request:
//   POST /notes_commit_from_segments
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     lesson_id: string,
//     study_session_id: string 
//   }
// 
// Response:
//   { 
//     ok: true,
//     appended: number,
//     last_committed_seq: number,
//     notes_preview: string
//   }
// 
// Features:
//   - Idempotent (safe to call repeatedly)
//   - Creates notes document if it doesn't exist
//   - Appends only new segments (using last_committed_seq cursor)
//   - Light formatting (newlines after sentences)
//   - Safe to call every 5-10 seconds during live recording
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommitRequest {
  lesson_id: string;
  study_session_id: string;
}

interface TranscriptSegment {
  seq: number;
  text: string;
}

serve(async (req: Request) => {
  console.log("🚀 Function invoked:", req.method, req.url);
  
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
    // 2. Parse and validate request
    // =========================================================================
    
    const body: CommitRequest = await req.json();
    const { lesson_id, study_session_id } = body;

    if (!lesson_id || !study_session_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: lesson_id, study_session_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lesson_id) || !uuidRegex.test(study_session_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid UUID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // 3. Verify lesson belongs to user (RLS-friendly)
    // =========================================================================
    
    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id, user_id")
      .eq("id", lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error("Lesson not found or access denied:", lessonError);
      return new Response(
        JSON.stringify({ error: "Lesson not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // 4. Load or create notes document
    // =========================================================================
    
    let { data: notes, error: notesError } = await supabaseClient
      .from("lesson_outputs")
      .select("id, notes_raw_text, last_committed_seq")
      .eq("lesson_id", lesson_id)
      .eq("type", "notes")
      .maybeSingle();

    if (notesError) {
      console.error("Error loading notes:", notesError);
      return new Response(
        JSON.stringify({ error: "Failed to load notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notes document if it doesn't exist
    if (!notes) {
      console.log("📝 Creating new notes document for lesson:", lesson_id);
      
      const { data: newNotes, error: createError } = await supabaseClient
        .from("lesson_outputs")
        .insert({
          user_id: user.id,
          lesson_id: lesson_id,
          type: "notes",
          status: "ready",
          content_json: {},
          notes_raw_text: "",
          last_committed_seq: 0,
        })
        .select("id, notes_raw_text, last_committed_seq")
        .single();

      if (createError || !newNotes) {
        console.error("Error creating notes:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create notes document" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      notes = newNotes;
    }

    const currentSeq = notes.last_committed_seq;
    const currentText = notes.notes_raw_text || "";

    console.log(`📖 Current notes: ${currentText.length} chars, last_committed_seq: ${currentSeq}`);

    // =========================================================================
    // 5. Query new transcript segments
    // =========================================================================
    
    const { data: newSegments, error: segmentsError } = await supabaseClient
      .from("live_transcript_segments")
      .select("seq, text")
      .eq("study_session_id", study_session_id)
      .gt("seq", currentSeq)
      .order("seq", { ascending: true });

    if (segmentsError) {
      console.error("Error loading transcript segments:", segmentsError);
      return new Response(
        JSON.stringify({ error: "Failed to load transcript segments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No new segments → return early (idempotent)
    if (!newSegments || newSegments.length === 0) {
      console.log("✅ No new segments to append");
      return new Response(
        JSON.stringify({
          ok: true,
          appended: 0,
          last_committed_seq: currentSeq,
          notes_preview: currentText.slice(-600),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📥 Found ${newSegments.length} new segments (seq ${newSegments[0].seq} to ${newSegments[newSegments.length - 1].seq})`);

    // =========================================================================
    // 6. Append segments with light formatting
    // =========================================================================
    
    const typedSegments = newSegments as TranscriptSegment[];
    let appendedText = "";

    for (let i = 0; i < typedSegments.length; i++) {
      const segment = typedSegments[i];
      const text = segment.text.trim();
      
      if (!text) continue;

      // Add space before segment (unless it's the first segment and notes are empty)
      if (appendedText.length > 0 || currentText.length > 0) {
        appendedText += " ";
      }

      // Add the segment text
      appendedText += text;

      // Light newline rule: if segment ends with sentence-ending punctuation, add newline
      if (/[.!?]$/.test(text)) {
        appendedText += "\n";
      }
    }

    const newText = currentText + appendedText;
    const latestSeq = typedSegments[typedSegments.length - 1].seq;

    console.log(`✍️  Appending ${appendedText.length} chars, updating seq to ${latestSeq}`);

    // =========================================================================
    // 7. Update notes document
    // =========================================================================
    
    const { error: updateError } = await supabaseClient
      .from("lesson_outputs")
      .update({
        notes_raw_text: newText,
        last_committed_seq: latestSeq,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notes.id);

    if (updateError) {
      console.error("Error updating notes:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Notes updated successfully");

    // =========================================================================
    // 8. Return success response
    // =========================================================================
    
    return new Response(
      JSON.stringify({
        ok: true,
        appended: typedSegments.length,
        last_committed_seq: latestSeq,
        notes_preview: newText.slice(-600), // Last 600 chars for preview
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
