// ============================================================================
// Edge Function: lesson_generate_interactive_reset
// ============================================================================
//
// Purpose: Reset interactive module generation state when a RunPod job was
//          purged or failed and the UI is stuck on "Generating". Sets
//          lesson_outputs (type=interactive_pages) to status='failed' so
//          the Interact card shows "Generate" again.
//
// Request:
//   POST /lesson_generate_interactive_reset
//   Headers: Authorization: Bearer <user_token>
//   Body: { lesson_id: string }
//
// Response:
//   { lesson_id: string, status: "reset" }
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] lesson_generate_interactive_reset invoked`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { lesson_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lessonId = body.lesson_id;
    if (!lessonId || typeof lessonId !== "string") {
      return new Response(
        JSON.stringify({ error: "lesson_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ error: "Lesson not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("lesson_outputs")
      .update({ status: "failed" })
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id)
      .eq("type", "interactive_pages")
      .in("status", ["queued", "processing"])
      .select("id");

    if (updateError) {
      console.error(`[${requestId}] Update failed:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to reset interactive generation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Reset interactive_pages for lesson ${lessonId}, rows updated: ${updated?.length ?? 0}`);

    return new Response(
      JSON.stringify({ lesson_id: lessonId, status: "reset" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[${requestId}] Error:`, err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
