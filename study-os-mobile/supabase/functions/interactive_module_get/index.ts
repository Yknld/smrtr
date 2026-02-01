// ============================================================================
// Edge Function: interactive_module_get
// ============================================================================
//
// Purpose: Return interactive homework module manifest with signed URLs for
//          assets (components, visuals, audio, problem SVGs) so the static
//          solver screen can load them without exposing storage.
//
// Request:
//   GET /interactive_module_get?lesson_id=<uuid>
//   Headers: Authorization: Bearer <user_token>
//
// Response:
//   { manifest: { id, questions, version, ... } } with asset paths replaced
//   by signed URLs (problem.visualization, steps[].component, steps[].visual,
//   steps[].audio). If no interactive_pages output for lesson: 404.
//
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "lesson_assets";
const SIGNED_URL_EXPIRY_SEC = 3600; // 1 hour

function collectAssetPaths(manifest: any): string[] {
  const paths: string[] = [];
  if (manifest.questions && Array.isArray(manifest.questions)) {
    for (const q of manifest.questions) {
      if (q.problem?.visualization) paths.push(q.problem.visualization);
      for (const step of q.steps || []) {
        if (step.component) paths.push(step.component);
        if (step.visual) paths.push(step.visual);
        if (step.audio) paths.push(step.audio);
      }
    }
  } else if (manifest.problem?.visualization) {
    paths.push(manifest.problem.visualization);
    for (const step of manifest.steps || []) {
      if (step.component) paths.push(step.component);
      if (step.visual) paths.push(step.visual);
      if (step.audio) paths.push(step.audio);
    }
  }
  return [...new Set(paths)];
}

function replacePathWithUrl(
  obj: any,
  pathKey: string,
  urlMap: Record<string, string>,
  storagePrefix: string
): void {
  const rel = obj[pathKey];
  if (!rel || typeof rel !== "string") return;
  const url = urlMap[`${storagePrefix}/${rel}`] ?? urlMap[rel];
  if (url) obj[pathKey] = url;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const lessonId = url.searchParams.get("lesson_id");
    if (!lessonId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId)) {
      return new Response(JSON.stringify({ error: "Missing or invalid lesson_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id, user_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson || lesson.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Lesson not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin so we see the row the RunPod worker updated (avoids RLS/replication quirks)
    const { data: output, error: outputError } = await supabaseAdmin
      .from("lesson_outputs")
      .select("content_json")
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id)
      .eq("type", "interactive_pages")
      .eq("status", "ready")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (outputError || !output?.content_json) {
      return new Response(JSON.stringify({ error: "No interactive module found for this lesson" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storage_prefix } = output.content_json as { storage_prefix?: string };
    if (!storage_prefix) {
      return new Response(JSON.stringify({ error: "Invalid interactive_pages record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const manifestPath = `${storage_prefix}/manifest.json`;
    const { data: manifestBytes, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(manifestPath);

    if (downloadError || !manifestBytes) {
      const detail = downloadError?.message ? ` (${downloadError.message})` : "";
      return new Response(
        JSON.stringify({ error: "Failed to load module manifest" + detail }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const manifestText = await manifestBytes.text();
    let manifest: any;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid manifest format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assetPaths = collectAssetPaths(manifest);
    const urlMap: Record<string, string> = {};
    for (const rel of assetPaths) {
      const fullPath = `${storage_prefix}/${rel}`;
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(fullPath, SIGNED_URL_EXPIRY_SEC);
      if (signed?.signedUrl) {
        urlMap[fullPath] = signed.signedUrl;
        urlMap[rel] = signed.signedUrl;
      }
    }

    if (manifest.questions && Array.isArray(manifest.questions)) {
      for (const q of manifest.questions) {
        if (q.problem) replacePathWithUrl(q.problem, "visualization", urlMap, storage_prefix);
        for (const step of q.steps || []) {
          replacePathWithUrl(step, "component", urlMap, storage_prefix);
          replacePathWithUrl(step, "visual", urlMap, storage_prefix);
          replacePathWithUrl(step, "audio", urlMap, storage_prefix);
        }
      }
    } else {
      if (manifest.problem) replacePathWithUrl(manifest.problem, "visualization", urlMap, storage_prefix);
      for (const step of manifest.steps || []) {
        replacePathWithUrl(step, "component", urlMap, storage_prefix);
        replacePathWithUrl(step, "visual", urlMap, storage_prefix);
        replacePathWithUrl(step, "audio", urlMap, storage_prefix);
      }
    }

    return new Response(JSON.stringify({ manifest }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("interactive_module_get error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
