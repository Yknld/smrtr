// ============================================================================
// Edge Function: notes_get
// ============================================================================
// 
// Purpose: Get notes for a lesson (quick read access)
// 
// Request:
//   GET /notes_get?lesson_id=<uuid>
//   Headers: Authorization: Bearer <user_token>
// 
// Response:
//   { 
//     lesson_id: string,
//     notes_raw_text: string,
//     notes_final_text: string | null,
//     is_final: boolean,
//     last_committed_seq: number,
//     updated_at: string
//   }
// 
// Features:
//   - JWT authentication required
//   - Ownership verified via RLS
//   - Returns final text if available, else raw text
//   - Fast read-only access
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log("🚀 notes_get invoked:", req.method, req.url);
  
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
    const lessonId = url.searchParams.get("lesson_id");

    if (!lessonId) {
      console.log("❌ Missing lesson_id parameter");
      return new Response(
        JSON.stringify({ error: "Missing required parameter: lesson_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lessonId)) {
      console.log("❌ Invalid UUID format:", lessonId);
      return new Response(
        JSON.stringify({ error: "Invalid lesson_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📝 Fetching notes for lesson:", lessonId);

    // =========================================================================
    // 3. Verify lesson exists and user owns it
    // =========================================================================
    
    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id, user_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error("Lesson not found or access denied:", lessonError);
      return new Response(
        JSON.stringify({ error: "Lesson not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Lesson found and access verified");

    // =========================================================================
    // 4. Fetch notes (RLS will verify ownership)
    // =========================================================================
    
    const { data: notes, error: notesError } = await supabaseClient
      .from("lesson_outputs")
      .select("lesson_id, notes_raw_text, notes_final_text, last_committed_seq, updated_at")
      .eq("lesson_id", lessonId)
      .eq("type", "notes")
      .maybeSingle();

    if (notesError) {
      console.error("Error fetching notes:", notesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no notes exist, return empty structure
    if (!notes) {
      console.log("📝 No notes found for lesson, returning empty structure");
      return new Response(
        JSON.stringify({
          lesson_id: lessonId,
          notes_raw_text: "",
          notes_final_text: null,
          is_final: false,
          last_committed_seq: 0,
          updated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Notes found:", {
      raw_length: notes.notes_raw_text?.length || 0,
      final_length: notes.notes_final_text?.length || 0,
      last_seq: notes.last_committed_seq,
    });

    // =========================================================================
    // 5. Return response with is_final flag
    // =========================================================================
    
    return new Response(
      JSON.stringify({
        lesson_id: notes.lesson_id,
        notes_raw_text: notes.notes_raw_text || "",
        notes_final_text: notes.notes_final_text,
        is_final: !!notes.notes_final_text,
        last_committed_seq: notes.last_committed_seq || 0,
        updated_at: notes.updated_at,
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
