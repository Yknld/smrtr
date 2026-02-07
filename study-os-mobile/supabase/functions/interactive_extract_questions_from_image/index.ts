// ============================================================================
// Edge Function: interactive_extract_questions_from_image
// ============================================================================
//
// Purpose: Read practice questions from a photo using Gemini 3 Flash. Returns
//          problem_texts in the format the interactive loop expects (array of
//          strings, 1–5 items; if image has >5 questions, picks the 5 hardest).
//
// Request:
//   POST /interactive_extract_questions_from_image
//   Headers: Authorization: Bearer <user_token>
//   Body: { image_base64: string, image_mime_type?: string }
//
// Response:
//   200: { problem_texts: string[] }
//   400: { error: string } — no image or extraction produced no questions
//   401: Not authenticated
//   503: GEMINI_API_KEY not set
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] interactive_extract_questions_from_image invoked`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not set" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { image_base64?: string; image_mime_type?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBase64 = typeof body.image_base64 === "string" ? body.image_base64.trim() : undefined;
    const imageMimeType = typeof body.image_mime_type === "string" ? body.image_mime_type.trim() || "image/jpeg" : "image/jpeg";

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractPrompt = `This image contains one or more practice questions, problems, or exercises (e.g. math, physics, statistics). It may include tables, formulas, and multi-part problems (a, b, c, etc.).

Rules:
- Treat each part (a, b, c, d, etc.) as a SEPARATE question. So "a. Calculate the mean" and "b. Suppose Y = 3" are two separate array elements.
- Include any shared setup (e.g. table, preamble) in the first part only, or repeat briefly in each part if needed.
- Extract every distinct question or part in full: include all given numbers, units, table data, and exact question text. Preserve mathematical notation.
- Return a JSON array of strings only. One string per question or per part. Include 1 to 20 items. No commentary.`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: extractPrompt },
      { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
    ];

    const geminiRes = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 20,
              description: "List of extracted practice questions",
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.warn(`[${requestId}] Gemini vision API error: ${geminiRes.status} ${errText.slice(0, 200)}`);
      return new Response(
        JSON.stringify({ error: "Could not read questions from the image. Try a clearer photo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const candidate = geminiData.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text?.trim();
    if (!raw) {
      const finishReason = candidate?.finishReason ?? geminiData.candidates?.[0]?.finishReason;
      console.warn(`[${requestId}] Gemini returned no text. finishReason=${finishReason ?? "none"} promptFeedback=${JSON.stringify(geminiData.promptFeedback ?? null)}`);
      return new Response(
        JSON.stringify({ error: "Could not read questions from the image. Try a clearer photo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();

    function parseExtracted(str: string): string[] {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
        return parsed.questions
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.problem_texts)) {
        return parsed.problem_texts
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    }

    let extracted: string[] = [];
    try {
      extracted = parseExtracted(cleaned);
    } catch {
      // Truncated JSON: response may end mid-string (e.g. "b. Suppose that Y = 3 with no closing "])
      if (cleaned.startsWith("[") && !cleaned.endsWith("]")) {
        const lastComplete = cleaned.lastIndexOf('", "');
        if (lastComplete > 0) {
          try {
            extracted = parseExtracted(cleaned.slice(0, lastComplete + 1) + "]");
          } catch {
            // ignore
          }
        }
        if (extracted.length === 0) {
          try {
            extracted = parseExtracted(cleaned + '"]');
          } catch {
            // ignore
          }
        }
      }
    }
    if (extracted.length === 0) {
      console.warn(`[${requestId}] Gemini response not valid JSON. Preview: ${cleaned.slice(0, 300)}`);
      return new Response(
        JSON.stringify({ error: "Could not read questions from the image. Try a clearer photo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let problem_texts: string[] = extracted.length <= 5 ? extracted.slice(0, 5) : [];

    if (extracted.length > 5) {
      const pickPrompt = `You are an expert educator. Below are ${extracted.length} practice questions (or parts a, b, c of problems). Choose exactly the 5 HARDEST or most challenging ones. Return a JSON array of exactly 5 strings, ordered hardest first. Each string must be the EXACT text of one question from the list below (copy verbatim, do not rephrase).

QUESTIONS:
${extracted.map((q, i) => `${i + 1}. ${q}`).join("\n\n")}`;

      const pickRes = await fetch(
        `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: pickPrompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
              responseJsonSchema: {
                type: "array",
                items: { type: "string" },
                minItems: 5,
                maxItems: 5,
                description: "Exactly 5 hardest questions, exact text from list",
              },
            },
          }),
        }
      );

      if (pickRes.ok) {
        const pickData = await pickRes.json();
        const pickRaw = pickData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (pickRaw) {
          let pickCleaned = pickRaw.trim();
          if (pickCleaned.startsWith("```json")) pickCleaned = pickCleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
          else if (pickCleaned.startsWith("```")) pickCleaned = pickCleaned.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
          let picked: string[] = [];
          try {
            const pickParsed = JSON.parse(pickCleaned);
            if (Array.isArray(pickParsed)) {
              picked = pickParsed.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
            }
          } catch {
            if (pickCleaned.startsWith("[") && !pickCleaned.endsWith("]")) {
              const lastComplete = pickCleaned.lastIndexOf('", "');
              if (lastComplete > 0) {
                try {
                  const repaired = JSON.parse(pickCleaned.slice(0, lastComplete + 1) + "]");
                  if (Array.isArray(repaired)) picked = repaired.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
                } catch {
                  /* ignore */
                }
              }
            }
          }
          if (picked.length >= 5) {
            problem_texts = picked.slice(0, 5);
            console.log(`[${requestId}] Picked 5 hardest from ${extracted.length} questions`);
          } else if (picked.length > 0) {
            const pickedSet = new Set(picked);
            for (const q of extracted) {
              if (picked.length >= 5) break;
              if (!pickedSet.has(q)) {
                picked.push(q);
                pickedSet.add(q);
              }
            }
            problem_texts = picked.length >= 5 ? picked.slice(0, 5) : extracted.slice(0, 5);
          } else {
            problem_texts = extracted.slice(0, 5);
          }
        } else {
          problem_texts = extracted.slice(0, 5);
        }
      } else {
        problem_texts = extracted.slice(0, 5);
      }
    }

    console.log(`[${requestId}] Extracted ${problem_texts.length} problem_texts from image`);
    return new Response(
      JSON.stringify({ problem_texts }),
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
