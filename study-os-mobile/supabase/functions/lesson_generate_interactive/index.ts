// ============================================================================
// Edge Function: lesson_generate_interactive
// ============================================================================
//
// Purpose: Enqueue interactive module generation (RunPod/GeminiLoop). Uses
//          same lesson content order as video: summary → notes → transcript → title.
//
// Request:
//   POST /lesson_generate_interactive
//   Headers: Authorization: Bearer <user_token>
//   Body: { lesson_id: string }
//
// Response:
//   { lesson_id: string, status: "generating", job_id?: string }
//
// Flow: Inserts lesson_outputs (type=interactive_pages, status=processing),
//       calls RunPod with problem_texts derived from lesson content; RunPod
//       pushes module to Supabase and updates row to status=ready.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { gatherSourceInputs, getContentText } from "../shared/sourceHash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CONTEXT_CHARS = 8000;
const RUNPOD_API_BASE = "https://api.runpod.ai/v2";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] lesson_generate_interactive invoked`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const runpodApiKey = Deno.env.get("RUNPOD_API_KEY") ?? "";
    const runpodEndpoint = Deno.env.get("RUNPOD_ENDPOINT") ?? "";

    if (!runpodApiKey || !runpodEndpoint) {
      console.error(`[${requestId}] RUNPOD_API_KEY or RUNPOD_ENDPOINT not set`);
      return new Response(
        JSON.stringify({ error: "Interactive generation not configured (RunPod)" }),
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
      .select("id, user_id, title")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ error: "Lesson not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get lesson context (aligned with video: summary → notes/transcript → title)
    let contextText = "";
    const { data: summaryOutput } = await supabaseClient
      .from("lesson_outputs")
      .select("content_json")
      .eq("lesson_id", lessonId)
      .eq("type", "summary")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (summaryOutput?.content_json?.summary) {
      contextText = String(summaryOutput.content_json.summary);
      console.log(`[${requestId}] Using summary (${contextText.length} chars)`);
    }

    if (!contextText) {
      const inputs = await gatherSourceInputs(supabaseClient, lessonId);
      contextText = getContentText(inputs, MAX_CONTEXT_CHARS);
      if (contextText) {
        console.log(`[${requestId}] Using notes/transcript (${contextText.length} chars)`);
      }
    }

    if (!contextText?.trim()) {
      contextText = `This lesson is about: ${lesson.title || "the topic"}`;
      console.log(`[${requestId}] Using lesson title only`);
    }

    if (contextText.length > MAX_CONTEXT_CHARS) {
      contextText = contextText.substring(0, MAX_CONTEXT_CHARS) + "\n\n[Truncated]";
    }

    // Generate practice questions from context via Gemini. Do not use raw summary chunks as questions.
    let problem_texts: string[] = [];
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not set; cannot generate practice questions`);
      return new Response(
        JSON.stringify({
          error: "Interactive generation requires GEMINI_API_KEY. Add it in Supabase Dashboard → Edge Functions → Secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contextText.trim()) {
      const prompt = `You are an expert educator. Given the lesson content below, generate exactly 1 to 3 clear practice QUESTIONS or problems that a student could work through step-by-step. Each item must be a single question or problem statement (e.g. "Calculate...", "Explain why...", "Write code that..."). Do NOT return summaries, descriptions, or "Key concepts include" lists—only actual questions.

LESSON TITLE: ${lesson.title || "Untitled"}

CONTENT:
${contextText.trim()}

Return ONLY a JSON array of 1–3 strings. No other text. Example:
["What is the time complexity of binary search?", "Implement a function that reverses a string."]`;

      try {
        const geminiRes = await fetch(
          `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 1024,
              },
            }),
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (raw) {
            let cleaned = raw;
            if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
            else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
            try {
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed)) {
                problem_texts = parsed
                  .filter((x): x is string => typeof x === "string")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 15 && !/^(Key concepts|JavaScript is|This (lesson|module)|The (lesson|topic))/i.test(s))
                  .slice(0, 3);
              }
            } catch (_) {
              console.warn(`[${requestId}] Gemini response was not valid JSON`);
            }
          }
        } else {
          console.warn(`[${requestId}] Gemini API error: ${geminiRes.status}`);
        }
      } catch (e) {
        console.warn(`[${requestId}] Gemini question generation failed:`, e);
      }
    }

    // Only allow a single generic question fallback—never raw summary chunks as "questions"
    if (problem_texts.length === 0) {
      const topic = lesson.title || "this topic";
      problem_texts = [`Based on the lesson "${topic}", what are the main concepts and how would you explain them?`];
      console.log(`[${requestId}] Using single fallback question (Gemini unavailable or returned no valid questions)`);
    } else {
      console.log(`[${requestId}] Generated ${problem_texts.length} practice questions from Gemini`);
    }

    // Insert or update lesson_outputs (processing) so app shows "Generating"
    const { data: existing } = await supabaseAdmin
      .from("lesson_outputs")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("type", "interactive_pages")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from("lesson_outputs")
        .update({ status: "processing", content_json: {} })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("lesson_outputs").insert({
        user_id: user.id,
        lesson_id: lessonId,
        type: "interactive_pages",
        status: "processing",
        content_json: {},
      });
    }

    // Enqueue RunPod job
    const runUrl = `${RUNPOD_API_BASE}/${runpodEndpoint.trim()}/run`;
    const runBody = {
      input: {
        problem_texts,
        lesson_id: lessonId,
        user_id: user.id,
        push_to_supabase: true,
      },
    };

    const runRes = await fetch(runUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runpodApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(runBody),
    });

    if (!runRes.ok) {
      const errText = await runRes.text();
      console.error(`[${requestId}] RunPod run failed: ${runRes.status} ${errText}`);
      await supabaseAdmin
        .from("lesson_outputs")
        .update({ status: "failed", content_json: { error: errText } })
        .eq("lesson_id", lessonId)
        .eq("type", "interactive_pages")
        .eq("user_id", user.id);
      return new Response(
        JSON.stringify({ error: "Failed to start generation", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runData = await runRes.json();
    const jobId = runData.id ?? runData.job_id ?? undefined;
    console.log(`[${requestId}] RunPod job started: ${jobId}`);

    return new Response(
      JSON.stringify({
        lesson_id: lessonId,
        status: "generating",
        job_id: jobId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
