// ============================================================================
// Edge Function: podcast_generate_outline
// ============================================================================
// 
// Purpose: Generate teaching outline for podcast (Stage A of two-stage generation)
// 
// Request:
//   POST /podcast_generate_outline
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "lesson_id": uuid,
//     "duration_min"?: number (default: 12, range: 5-20)
//   }
// 
// Response:
//   {
//     "id": uuid,
//     "type": "podcast_outline",
//     "status": "ready",
//     "cached": boolean,
//     "content_json": {
//       "title": string,
//       "learning_goals": string[],
//       "sections": [{id, heading, bullets, time_sec}],
//       "analogy_bank": string[],
//       "checkpoints": [{prompt, answer}],
//       "metadata": {...}
//     }
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { 
  gatherSourceInputs, 
  generateSourceHash, 
  checkCache, 
  getContentText 
} from "../shared/sourceHash.ts";

console.log("podcast_generate_outline boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gemini-1.5-pro";
const MAX_INPUT_CHARS = 12000;
const MIN_DURATION = 5;
const MAX_DURATION = 20;
const DEFAULT_DURATION = 12;

interface RequestBody {
  lesson_id: string;
  duration_min?: number;
}

interface PodcastOutline {
  title: string;
  learning_goals: string[];
  sections: Array<{
    id: string;
    heading: string;
    bullets: string[];
    time_sec: number;
  }>;
  analogy_bank: string[];
  checkpoints: Array<{
    prompt: string;
    answer: string;
  }>;
  metadata: {
    duration_min: number;
    source_hash: string;
    version: number;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] podcast_generate_outline request received`);

  try {
    // ========================================================================
    // 1. AUTHENTICATION
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization header is required"
          }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get authenticated user
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token"
          }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    // ========================================================================
    // 2. VALIDATE INPUT
    // ========================================================================
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON in request body"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.lesson_id || typeof body.lesson_id !== "string") {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_LESSON_ID",
            message: "lesson_id is required and must be a valid UUID string"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const duration_min = body.duration_min !== undefined ? body.duration_min : DEFAULT_DURATION;
    if (typeof duration_min !== "number" || duration_min < MIN_DURATION || duration_min > MAX_DURATION) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_DURATION",
            message: `duration_min must be a number between ${MIN_DURATION} and ${MAX_DURATION}`
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 3. VERIFY LESSON OWNERSHIP
    // ========================================================================
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, user_id, title")
      .eq("id", body.lesson_id)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "LESSON_NOT_FOUND",
            message: "Lesson not found or access denied"
          }
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Lesson found: ${lesson.title}`);

    // ========================================================================
    // 4. GATHER SOURCE INPUTS & GENERATE HASH
    // ========================================================================
    const sourceInputs = await gatherSourceInputs(supabase, body.lesson_id);
    const sourceHash = await generateSourceHash(sourceInputs);
    
    console.log(`[${requestId}] Source hash: ${sourceHash}`);

    // ========================================================================
    // 5. CHECK CACHE
    // ========================================================================
    const cachedOutput = await checkCache(supabase, body.lesson_id, "podcast_outline", sourceHash);
    
    if (cachedOutput) {
      console.log(`[${requestId}] Cache HIT - Returning cached outline (id: ${cachedOutput.id})`);
      return new Response(
        JSON.stringify({
          ...cachedOutput,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Cache MISS - Generating new podcast outline`);

    // ========================================================================
    // 6. GET CONTENT TEXT FOR GENERATION
    // ========================================================================
    const contentText = getContentText(sourceInputs, MAX_INPUT_CHARS);
    
    if (!contentText || contentText.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "NO_CONTENT",
            message: "No text content found for this lesson. Please ensure the lesson has notes or transcript."
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Content text: ${contentText.length} characters`);

    // ========================================================================
    // 7. VERIFY GEMINI API KEY
    // ========================================================================
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "SERVICE_CONFIG_ERROR",
            message: "AI service not configured"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 8. CREATE PROCESSING OUTPUT RECORD
    // ========================================================================
    const { data: processingRecord, error: insertError } = await supabase
      .from("lesson_outputs")
      .insert({
        user_id: user.id,
        lesson_id: body.lesson_id,
        type: "podcast_outline",
        status: "processing",
        source_hash: sourceHash,
        model: MODEL,
        content_json: {}
      })
      .select()
      .single();

    if (insertError || !processingRecord) {
      console.error(`[${requestId}] Failed to create processing record:`, insertError);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to initiate generation"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Created processing record: ${processingRecord.id}`);

    // ========================================================================
    // 9. GENERATE OUTLINE WITH GEMINI
    // ========================================================================
    const prompt = `You are an expert podcast producer creating a teaching outline for an educational podcast.

LESSON TITLE: ${lesson.title}

CONTENT:
${contentText}

TARGET DURATION: ${duration_min} minutes

Create a structured teaching outline for a podcast that will teach this lesson effectively.

Return ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "title": "A catchy podcast title that captures the lesson (max 60 chars)",
  "learning_goals": [
    "What students will learn (3-5 goals)"
  ],
  "sections": [
    {
      "id": "s1",
      "heading": "Big Picture / Hook",
      "bullets": [
        "Key point to cover",
        "Example or analogy to use",
        "Question to pose"
      ],
      "time_sec": 90
    },
    {
      "id": "s2",
      "heading": "Core Concept 1",
      "bullets": ["..."],
      "time_sec": 180
    }
  ],
  "analogy_bank": [
    "Analogy 1: Compare X to Y because...",
    "Analogy 2: Think of X like..."
  ],
  "checkpoints": [
    {
      "prompt": "Quick question to ask: What shifts the IS curve?",
      "answer": "Brief answer: Government spending or investment changes"
    }
  ]
}

RULES FOR GREAT PODCAST OUTLINES:
1. Start with a HOOK (15-25 sec) that makes the topic relevant
2. Include "why it matters" early
3. Break into 3-5 sections (not too many)
4. Each section has 3-5 bullet points
5. Include 2-3 concrete analogies in analogy_bank
6. Add 2-3 checkpoints (mini-quiz questions) throughout
7. End with a short recap section
8. Total time should be close to ${duration_min * 60} seconds
9. Keep each section focused on ONE main idea
10. Use conversational language, not textbook language

OUTPUT ONLY valid JSON, no extra text.`;

    console.log(`[${requestId}] Calling Gemini API...`);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[${requestId}] Gemini API error:`, errorText);
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to generate podcast outline"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error(`[${requestId}] No text in Gemini response`);
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_GENERATION_FAILED",
            message: "AI did not return valid content"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Gemini response received, parsing...`);

    // ========================================================================
    // 10. PARSE AND VALIDATE RESPONSE
    // ========================================================================
    let parsedContent: {
      title: string;
      learning_goals: string[];
      sections: any[];
      analogy_bank: string[];
      checkpoints: any[];
    };
    
    try {
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/```\s*$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/```\s*$/, "");
      }
      
      parsedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse Gemini response:`, parseError);
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_PARSE_FAILED",
            message: "Failed to parse AI-generated content"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate structure
    if (!parsedContent.title || !Array.isArray(parsedContent.sections) || parsedContent.sections.length === 0) {
      console.error(`[${requestId}] Invalid outline structure`);
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_INVALID_FORMAT",
            message: "AI returned invalid outline format"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Parsed successfully: ${parsedContent.sections.length} sections`);

    // ========================================================================
    // 11. BUILD FINAL OUTPUT WITH METADATA
    // ========================================================================
    const outlineOutput: PodcastOutline = {
      title: parsedContent.title,
      learning_goals: parsedContent.learning_goals || [],
      sections: parsedContent.sections,
      analogy_bank: parsedContent.analogy_bank || [],
      checkpoints: parsedContent.checkpoints || [],
      metadata: {
        duration_min: duration_min,
        source_hash: sourceHash,
        version: processingRecord.version || 1
      }
    };

    // ========================================================================
    // 12. UPDATE RECORD TO READY
    // ========================================================================
    const { data: finalRecord, error: updateError } = await supabase
      .from("lesson_outputs")
      .update({
        status: "ready",
        content_json: outlineOutput,
        updated_at: new Date().toISOString()
      })
      .eq("id", processingRecord.id)
      .select()
      .single();

    if (updateError || !finalRecord) {
      console.error(`[${requestId}] Failed to update record:`, updateError);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to save outline"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Podcast outline generation complete: ${finalRecord.id}`);

    // ========================================================================
    // 13. RETURN SUCCESS
    // ========================================================================
    return new Response(
      JSON.stringify({
        ...finalRecord,
        cached: false
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({ 
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred"
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
