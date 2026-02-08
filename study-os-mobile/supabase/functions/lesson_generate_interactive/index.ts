// ============================================================================
// Edge Function: lesson_generate_interactive
// ============================================================================
//
// Purpose: Enqueue interactive module generation (RunPod/TheGeminiLoop). Uses
//          same lesson content order as video: summary → notes → transcript → title.
//
// Request:
//   POST /lesson_generate_interactive
//   Headers: Authorization: Bearer <user_token>
//   Body: { lesson_id: string, problem_texts?: string[] }
//   If problem_texts is provided (e.g. from interactive_extract_questions_from_image), those are used.
//   Otherwise problem_texts are generated from lesson context (summary → notes → title).
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
const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Strip UI metadata and separators so only the actual transcript/note body is used for question generation. */
function stripNoteMetadata(text: string): string {
  if (!text?.trim()) return text;
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^Topic:\s*(Not specified|$)/i.test(t)) continue;
    if (/^Date:\s*(Not specified|$)/i.test(t)) continue;
    if (/^Duration:\s*(Not specified|$)/i.test(t)) continue;
    if (/^---\s*Content from\s+.+\s*---\s*$/i.test(t)) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

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

    let body: { lesson_id?: string; problem_texts?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lessonId = body.lesson_id;
    const clientProblemTexts = Array.isArray(body.problem_texts)
      ? body.problem_texts.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : undefined;
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

    let problem_texts: string[] = clientProblemTexts?.length ? clientProblemTexts : [];

    if (problem_texts.length > 0) {
      console.log(`[${requestId}] Using ${problem_texts.length} problem_texts from request (e.g. from image extraction)`);
    }

    if (problem_texts.length === 0) {
      // Get lesson context: notes first (primary), then summary, then title
      let contextText = "";
      const inputs = await gatherSourceInputs(supabaseClient, lessonId);
    const hasNotes = !!(inputs.notes_final_text?.trim() || inputs.notes_raw_text?.trim());
    if (!hasNotes) {
      console.log(`[${requestId}] No notes in lesson_outputs (type=notes) for this lesson; will use summary or title`);
    }
    contextText = getContentText(inputs, MAX_CONTEXT_CHARS);
    contextText = stripNoteMetadata(contextText);
    if (contextText?.trim()) {
      const preview = contextText.trim().slice(0, 200).replace(/\n/g, " ");
      console.log(`[${requestId}] Using notes/transcript (${contextText.length} chars). Preview: ${preview}...`);
    }

    if (!contextText?.trim()) {
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
    }

    if (!contextText?.trim()) {
      contextText = `This lesson is about: ${lesson.title || "the topic"}`;
      console.log(`[${requestId}] Using lesson title only`);
    }

    if (contextText.length > MAX_CONTEXT_CHARS) {
      contextText = contextText.substring(0, MAX_CONTEXT_CHARS) + "\n\n[Truncated]";
    }

    // Generate practice questions from context via Gemini. Do not use raw summary chunks as questions.
    if (contextText.trim()) {
      const prompt = `You are an expert educator. The CONTENT below is the lesson transcript/notes. Generate 1 to 3 specific practice QUESTIONS or problems that a student would answer using this content. Each question must be a concrete question (e.g. "Calculate...", "Explain why...", "What is...") based only on the concepts, formulas, or facts in the notes. Do NOT return meta-questions like "What are the main concepts?"—return actual practice questions.

LESSON TITLE: ${lesson.title || "Untitled"}

TRANSCRIPT / NOTES:
${contextText.trim()}`;

      try {
        const geminiRes = await fetch(
          `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1024,
                responseMimeType: "application/json",
                responseJsonSchema: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 3,
                  description: "1 to 3 practice questions derived from the lesson notes",
                },
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
                const asStrings = parsed.filter((x): x is string => typeof x === "string").map((s) => s.trim());
                problem_texts = asStrings
                  .filter((s) => s.length > 15 && !/^(Key concepts|JavaScript is|This (lesson|module)|The (lesson|topic))/i.test(s))
                  .slice(0, 3);
                if (asStrings.length > 0 && problem_texts.length === 0) {
                  console.warn(`[${requestId}] Gemini returned ${asStrings.length} items but all were filtered out`);
                }
              }
            } catch (_) {
              console.warn(`[${requestId}] Gemini response was not valid JSON (length ${raw?.length ?? 0})`);
            }
          } else {
            console.warn(`[${requestId}] Gemini returned no text in response`);
          }
        } else {
          console.warn(`[${requestId}] Gemini API error: ${geminiRes.status}`);
        }
      } catch (e) {
        console.warn(`[${requestId}] Gemini question generation failed:`, e);
      }
    }

    // When Gemini returns no valid questions, use a single fallback (rare if structured output works)
    if (problem_texts.length === 0) {
      const trimmedContext = contextText.trim();
      const hasRealNotes = trimmedContext.length > 50 && !trimmedContext.startsWith("This lesson is about:");
      if (hasRealNotes) {
        const firstLine = trimmedContext.split("\n").find((l) => l.trim().length > 10)?.trim() ?? trimmedContext.slice(0, 100);
        problem_texts = [`Using the concepts from "${firstLine.replace(/"/g, "'").slice(0, 120)}", write a short practice problem and solve it step by step.`];
        console.log(`[${requestId}] Using note-based fallback (Gemini returned no valid questions; context had ${trimmedContext.length} chars)`);
      } else {
        const topic = lesson.title || "this topic";
        problem_texts = [`Explain the main ideas of "${topic}" and give one example.`];
        console.log(`[${requestId}] Using title-only fallback (no notes/summary)`);
      }
    } else {
      console.log(`[${requestId}] Generated ${problem_texts.length} practice questions from Gemini`);
    }
    } // end if (problem_texts.length === 0) — AI-from-context path

    if (problem_texts.length === 0) {
      const topic = lesson.title || "this topic";
      problem_texts = [`Explain the main ideas of "${topic}" and give one example.`];
      console.log(`[${requestId}] Final fallback: using title-only question`);
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

    // Enqueue RunPod job (problem_texts are either from user image or from lesson context)
    console.log(`[${requestId}] Sending ${problem_texts.length} problem_texts to RunPod`);
    if (problem_texts.length > 0) {
      const preview = problem_texts[0].slice(0, 80).replace(/\n/g, " ");
      console.log(`[${requestId}] First problem preview: ${preview}...`);
    }
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
