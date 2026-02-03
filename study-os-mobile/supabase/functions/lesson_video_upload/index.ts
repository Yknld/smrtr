// ============================================================================
// Edge Function: lesson_video_upload
// ============================================================================
//
// Purpose: One-time upload slot for OpenHand (or any CLI) to upload the
//          rendered video directly to the lesson. No anon key in the prompt;
//          caller uses a single-use token passed in the prompt by
//          lesson_generate_video.
//
// Request:
//   POST /lesson_video_upload
//   Headers: X-Upload-Token: <one-time token>
//   Body: raw video bytes (video/mp4)
//
// Response:
//   200 { ok: true, storage_path: string }
//   400/401 { error: string }
//
// Deploy with --no-verify-jwt so the agent can call without JWT.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-upload-token",
};

const BUCKET = "lesson-assets";
const MAX_BYTES = 200 * 1024 * 1024; // 200MB

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = req.headers.get("X-Upload-Token")?.trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing X-Upload-Token header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Find the lesson_assets row for this token (video with this upload_token)
  const { data: rows, error: findError } = await supabaseAdmin
    .from("lesson_assets")
    .select("id, lesson_id, user_id, storage_path, metadata")
    .eq("kind", "video")
    .limit(100);

  if (findError) {
    return new Response(
      JSON.stringify({ error: "Failed to look up token" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const row = (rows ?? []).find(
    (r: { metadata?: { upload_token?: string } }) => (r.metadata as { upload_token?: string })?.upload_token === token
  );

  if (!row) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired upload token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // If poller already uploaded, treat as success (idempotent)
  if (row.storage_path) {
    return new Response(
      JSON.stringify({ ok: true, storage_path: row.storage_path, already_uploaded: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const videoBody = await req.arrayBuffer();
  if (videoBody.byteLength === 0) {
    return new Response(
      JSON.stringify({ error: "Empty body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (videoBody.byteLength > MAX_BYTES) {
    return new Response(
      JSON.stringify({ error: `Video too large (max ${MAX_BYTES / 1024 / 1024}MB)` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const storagePath = `${row.user_id}/${row.lesson_id}/${row.id}.mp4`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, videoBody, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    return new Response(
      JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  const { upload_token: _t, ...rest } = metadata;
  const metadataWithoutToken = rest;

  const { error: updateError } = await supabaseAdmin
    .from("lesson_assets")
    .update({
      storage_path: storagePath,
      mime_type: "video/mp4",
      duration_ms: 30000,
      metadata: metadataWithoutToken,
    })
    .eq("id", row.id);

  if (updateError) {
    return new Response(
      JSON.stringify({ error: `DB update failed: ${updateError.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, storage_path: storagePath }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
