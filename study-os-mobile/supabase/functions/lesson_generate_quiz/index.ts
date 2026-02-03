// ============================================================================
// Edge Function: lesson_generate_quiz
// ============================================================================
// 
// Purpose: Generate multiple-choice quiz from lesson content with caching
// 
// Request:
//   POST /lesson_generate_quiz
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "lesson_id": uuid,
//     "count"?: number (default: 8, range: 5-15)
//   }
// 
// Response:
//   {
//     "id": uuid,
//     "type": "quiz",
//     "status": "ready",
//     "cached": boolean,
//     "content_json": {
//       "title": string,
//       "questions": [{id, question, choices, answer_index, explanation, ...}],
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

console.log("lesson_generate_quiz boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gemini-3-flash-preview";
const MAX_INPUT_CHARS = 12000;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 15;
const DEFAULT_QUESTIONS = 8;

interface RequestBody {
  lesson_id: string;
  count?: number;
}

interface QuizOutput {
  title: string;
  questions: Array<{
    id: string;
    question: string;
    choices: string[];
    answer_index: number;
    explanation: string;
    tags?: string[];
    difficulty?: number;
  }>;
  metadata: {
    count: number;
    source_hash: string;
    version: number;
  };
}

/** Load content from lesson_assets: text files as string, PDF/images as base64 parts for Gemini multimodal. */
async function loadContentFromAssets(
  supabase: any,
  userId: string,
  lessonId: string
): Promise<{ text: string; fileParts: Array<{ inline_data: { mime_type: string; data: string } }> }> {
  const result = { text: "", fileParts: [] as Array<{ inline_data: { mime_type: string; data: string } }> };
  const { data: assets } = await supabase
    .from("lesson_assets")
    .select("id, kind, storage_bucket, storage_path, mime_type")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .not("storage_path", "is", null);

  if (!assets || assets.length === 0) return result;

  const textMimes = ["text/plain", "application/json", "text/markdown", "text/csv"];
  const supportedFileMimes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.ms-powerpoint", // ppt
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/msword", // doc
  ];

  for (const asset of assets) {
    const bucket = asset.storage_bucket || "lesson-assets";
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(asset.storage_path);

    if (downloadError || !fileData) continue;

    const mime = (asset.mime_type || "").toLowerCase();
    const kind = (asset.kind || "").toLowerCase();

    // Text: append to result.text
    if (
      textMimes.includes(mime) ||
      kind === "notes" ||
      (kind === "other" && mime.startsWith("text/"))
    ) {
      try {
        const t = await fileData.text();
        if (t?.trim()) result.text += (result.text ? "\n\n" : "") + t.trim();
      } catch {
        /* skip */
      }
      continue;
    }

    // PDF, images, PPT(X): add as inline part for Gemini (max 10 files to avoid token overflow)
    if (supportedFileMimes.some((x) => mime === x || mime.startsWith("image/"))) {
      if (result.fileParts.length >= 10) continue;
      try {
        const arr = new Uint8Array(await fileData.arrayBuffer());
        let binary = "";
        const chunk = 8192;
        for (let i = 0; i < arr.length; i += chunk) {
          binary += String.fromCharCode(...arr.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);
        const safeMime = mime || "application/octet-stream";
        result.fileParts.push({
          inline_data: { mime_type: safeMime, data: base64 },
        });
      } catch {
        /* skip */
      }
    }
  }

  if (result.text.length > MAX_INPUT_CHARS) {
    result.text = result.text.substring(0, MAX_INPUT_CHARS) + "\n\n[Content truncated...]";
  }
  return result;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] lesson_generate_quiz request received`);

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

    const count = body.count !== undefined ? body.count : DEFAULT_QUESTIONS;
    if (typeof count !== "number" || count < MIN_QUESTIONS || count > MAX_QUESTIONS) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_COUNT",
            message: `count must be a number between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}`
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
    const cachedOutput = await checkCache(supabase, body.lesson_id, "quiz", sourceHash);
    
    if (cachedOutput) {
      console.log(`[${requestId}] Cache HIT - Returning cached quiz (id: ${cachedOutput.id})`);
      return new Response(
        JSON.stringify({
          ...cachedOutput,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Cache MISS - Generating new quiz`);

    // ========================================================================
    // 6. GET CONTENT TEXT FOR GENERATION (notes, transcript, or lesson_assets)
    // ========================================================================
    let contentText = getContentText(sourceInputs, MAX_INPUT_CHARS);
    let assetFileParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

    if (!contentText || contentText.trim().length === 0) {
      const fromAssets = await loadContentFromAssets(supabase, user.id, body.lesson_id);
      contentText = fromAssets.text || "";
      assetFileParts = fromAssets.fileParts || [];
    }

    if (
      (!contentText || contentText.trim().length === 0) &&
      (assetFileParts.length === 0)
    ) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "NO_CONTENT",
            message: "No content found for this lesson. Add notes, a transcript, or upload files (PDF, images, text, PPT) in Assets."
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Content: ${contentText.length} chars, ${assetFileParts.length} file(s) for multimodal`);

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
        type: "quiz",
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
    // 9. GENERATE QUIZ WITH GEMINI (text-only or multimodal with PDF/images)
    // ========================================================================
    const contentSection =
      contentText.trim().length > 0
        ? `CONTENT:\n${contentText}`
        : "CONTENT: The lesson materials are provided as attached documents/images below. Use them to create the quiz.";
    const prompt = `You are an expert educator creating a multiple-choice quiz from lesson content.

LESSON TITLE: ${lesson.title}

${contentSection}

Base your output ONLY on the lesson content above. Do not mention any app, platform, or product.

Create exactly ${count} multiple-choice questions that test understanding of this lesson.

Return ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "title": "Quiz title based on the lesson",
  "questions": [
    {
      "id": "q1",
      "question": "Clear, specific question text?",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer_index": 1,
      "explanation": "Why this answer is correct and others are wrong",
      "tags": ["topic1"],
      "difficulty": 2
    }
  ]
}

RULES:
- Create exactly ${count} questions
- Each question has exactly 4 choices
- answer_index is 0-3 (the correct answer position)
- Questions test UNDERSTANDING, not just memorization
- Explanations should be educational (2-3 sentences)
- Mix difficulty levels: easy (1), medium (2), hard (3)
- Wrong answers should be plausible but clearly incorrect
- Tags: 1-2 relevant topics per question
- Output ONLY valid JSON, no extra text`;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [{ text: prompt }];
    if (assetFileParts.length > 0) {
      for (const p of assetFileParts) {
        parts.push({ inline_data: p.inline_data });
      }
    }

    console.log(`[${requestId}] Calling Gemini API... (${parts.length} parts)`);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
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
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to generate quiz"
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
    let parsedContent: { title: string; questions: any[] };
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
    if (!parsedContent.title || !Array.isArray(parsedContent.questions) || parsedContent.questions.length === 0) {
      console.error(`[${requestId}] Invalid quiz structure`);
      
      await supabase
        .from("lesson_outputs")
        .update({ status: "failed" })
        .eq("id", processingRecord.id);

      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_INVALID_FORMAT",
            message: "AI returned invalid quiz format"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each question
    for (const q of parsedContent.questions) {
      if (!q.question || !Array.isArray(q.choices) || q.choices.length !== 4 || 
          typeof q.answer_index !== "number" || q.answer_index < 0 || q.answer_index > 3) {
        console.error(`[${requestId}] Invalid question format:`, q);
        
        await supabase
          .from("lesson_outputs")
          .update({ status: "failed" })
          .eq("id", processingRecord.id);

        return new Response(
          JSON.stringify({ 
            error: {
              code: "AI_INVALID_FORMAT",
              message: "AI returned invalid question format"
            }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[${requestId}] Parsed successfully: ${parsedContent.questions.length} questions`);

    // ========================================================================
    // 11. BUILD FINAL OUTPUT WITH METADATA
    // ========================================================================
    const quizOutput: QuizOutput = {
      title: parsedContent.title,
      questions: parsedContent.questions,
      metadata: {
        count: parsedContent.questions.length,
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
        content_json: quizOutput,
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
            message: "Failed to save quiz"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Quiz generation complete: ${finalRecord.id}`);

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
