// ============================================================================
// Edge Function: lesson_generate_flashcards (V2 - With Caching)
// ============================================================================
// 
// Purpose: Generate flashcards from lesson content using Gemini AI with cache
// 
// Request:
//   POST /lesson_generate_flashcards
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "lesson_id": uuid,
//     "count"?: number (default: 15, range: 10-25)
//   }
// 
// Response:
//   {
//     "id": uuid,
//     "type": "flashcards",
//     "status": "ready",
//     "cached": boolean,
//     "content_json": {
//       "deck_title": string,
//       "cards": [{"id": string, "front": string, "back": string}],
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

console.log("lesson_generate_flashcards V2 boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gemini-2.0-flash-exp";
const MAX_INPUT_CHARS = 12000;
const MIN_CARDS = 10;
const MAX_CARDS = 25;
const DEFAULT_CARDS = 15;

interface RequestBody {
  lesson_id: string;
  count?: number;
}

interface FlashcardOutput {
  deck_title: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
    tags?: string[];
    difficulty?: number;
  }>;
  metadata: {
    count: number;
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
  console.log(`[${requestId}] lesson_generate_flashcards request received`);

  try {
    // ========================================================================
    // 1. AUTHENTICATION
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log(`[${requestId}] Missing Authorization header`);
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
    // Supabase Edge Runtime has already validated the JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get authenticated user from the JWT
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.log(`[${requestId}] JWT validation failed:`, userError?.message);
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

    const count = body.count !== undefined ? body.count : DEFAULT_CARDS;
    if (typeof count !== "number" || count < MIN_CARDS || count > MAX_CARDS) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_COUNT",
            message: `count must be a number between ${MIN_CARDS} and ${MAX_CARDS}`
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
      console.log(`[${requestId}] Lesson not found or not owned by user`);
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
    console.log(`[${requestId}] Gathering source inputs...`);
    const sourceInputs = await gatherSourceInputs(supabase, body.lesson_id);
    const sourceHash = await generateSourceHash(sourceInputs);
    
    console.log(`[${requestId}] Source hash: ${sourceHash}`);

    // ========================================================================
    // 5. CHECK CACHE
    // ========================================================================
    const cachedOutput = await checkCache(supabase, body.lesson_id, "flashcards", sourceHash);
    
    if (cachedOutput) {
      console.log(`[${requestId}] Cache HIT - Returning cached flashcards (id: ${cachedOutput.id}, version: ${cachedOutput.version})`);
      return new Response(
        JSON.stringify({
          ...cachedOutput,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Cache MISS - Generating new flashcards`);

    // ========================================================================
    // 6. GET CONTENT TEXT FOR GENERATION
    // ========================================================================
    const contentText = getContentText(sourceInputs, MAX_INPUT_CHARS);
    
    if (!contentText || contentText.trim().length === 0) {
      console.log(`[${requestId}] No content available for generation`);
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
        type: "flashcards",
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
    // 9. GENERATE FLASHCARDS WITH GEMINI
    // ========================================================================
    const prompt = `You are an expert educator creating flashcards from lesson content.

LESSON TITLE: ${lesson.title}

CONTENT:
${contentText}

Create exactly ${count} flashcards covering the key concepts from this lesson.

Return ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "deck_title": "A descriptive title for this flashcard deck",
  "cards": [
    {
      "id": "c1",
      "front": "Clear, concise question or concept",
      "back": "Complete, educational answer",
      "tags": ["topic1", "topic2"],
      "difficulty": 2
    }
  ]
}

RULES:
- Create exactly ${count} cards
- Each card focuses on ONE concept
- Front: Question or term (1-2 sentences max)
- Back: Clear explanation or definition (2-4 sentences)
- Tags: 1-3 relevant topics
- Difficulty: 1 (easy), 2 (medium), or 3 (hard)
- Use clear, simple language
- Focus on understanding, not memorization
- Output ONLY valid JSON, no extra text`;

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
            temperature: 0.7,
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
      
      // Update status to failed
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to generate flashcards"
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
    let parsedContent: { deck_title: string; cards: any[] };
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
    if (!parsedContent.deck_title || !Array.isArray(parsedContent.cards) || parsedContent.cards.length === 0) {
      console.error(`[${requestId}] Invalid flashcards structure`);
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_INVALID_FORMAT",
            message: "AI returned invalid flashcards format"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Parsed successfully: ${parsedContent.cards.length} cards`);

    // ========================================================================
    // 11. BUILD FINAL OUTPUT WITH METADATA
    // ========================================================================
    const flashcardsOutput: FlashcardOutput = {
      deck_title: parsedContent.deck_title,
      cards: parsedContent.cards,
      metadata: {
        count: parsedContent.cards.length,
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
        content_json: flashcardsOutput,
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
            message: "Failed to save flashcards"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Flashcards generation complete: ${finalRecord.id}`);

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
