// ============================================================================
// Edge Function: lesson_generate_summary
// ============================================================================
// 
// Purpose: Generate AI-powered summary for a lesson using Gemini
// 
// Request:
//   POST /lesson_generate_summary
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     lesson_id: string,
//     tone?: "casual" | "exam" | "deep",
//     length?: "short" | "medium" | "long"
//   }
// 
// Response:
//   {
//     output_id: string,
//     summary: string,
//     key_concepts: string[],
//     example_questions: string[]
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateSummaryRequest {
  lesson_id: string;
  tone?: "casual" | "exam" | "deep";
  length?: "short" | "medium" | "long";
}

interface SummaryOutput {
  summary: string;
  key_concepts: string[];
  example_questions: string[];
}

// Token limits for cost control
const MAX_INPUT_CHARS = 50000; // ~12.5k tokens
const TONE_PROMPTS = {
  casual: "Use a friendly, conversational tone as if explaining to a peer.",
  exam: "Use a formal, structured tone focused on exam preparation and key facts.",
  deep: "Use an academic, detailed tone with thorough explanations and context.",
};

const LENGTH_PROMPTS = {
  short: "Keep the summary concise (2-3 paragraphs). Provide 5-8 key concepts and 3 example questions.",
  medium: "Provide a moderate summary (4-5 paragraphs). Provide 8-10 key concepts and 5 example questions.",
  long: "Provide a comprehensive summary (6-8 paragraphs). Provide 10-12 key concepts and 5-7 example questions.",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received`);

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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
      console.error(`[${requestId}] Auth validation failed:`, authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated user:`, user.id);

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

    // Parse request body
    const body: GenerateSummaryRequest = await req.json();
    const { lesson_id, tone = "casual", length = "medium" } = body;

    if (!lesson_id) {
      return new Response(
        JSON.stringify({ error: "lesson_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Generating summary for lesson:`, lesson_id);

    // Verify lesson belongs to user
    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id, title, user_id")
      .eq("id", lesson_id)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      console.error(`[${requestId}] Lesson not found or unauthorized:`, lessonError?.message);
      return new Response(
        JSON.stringify({ error: "Lesson not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Lesson verified:`, lesson.title);

    // Load content from various sources
    let content = "";
    let contentSource = "";

    // 1. Try to get transcript from live sessions
    const { data: sessions } = await supabaseClient
      .from("study_sessions")
      .select("id")
      .eq("lesson_id", lesson_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const sessionId = sessions[0].id;
      
      // Try live_transcript_segments
      const { data: segments } = await supabaseClient
        .from("live_transcript_segments")
        .select("text, seq")
        .eq("study_session_id", sessionId)
        .order("seq", { ascending: true });

      if (segments && segments.length > 0) {
        content = segments.map(s => s.text).join(" ");
        contentSource = "live_transcript";
        console.log(`[${requestId}] Loaded ${segments.length} transcript segments`);
      }
    }

    // 2. If no transcript, try transcription_sessions
    if (!content) {
      const { data: transcriptData } = await supabaseClient
        .from("transcripts")
        .select("full_text, session_id")
        .eq("session_id", lesson_id)
        .single();

      if (transcriptData?.full_text) {
        content = transcriptData.full_text;
        contentSource = "transcription";
        console.log(`[${requestId}] Loaded transcription text`);
      }
    }

    // 3. If no transcript, try lesson_assets (text/notes)
    if (!content) {
      const { data: assets } = await supabaseClient
        .from("lesson_assets")
        .select("id, kind, storage_bucket, storage_path, mime_type")
        .eq("lesson_id", lesson_id)
        .eq("user_id", user.id)
        .in("kind", ["notes", "other"])
        .in("mime_type", ["text/plain", "application/json"]);

      if (assets && assets.length > 0) {
        const asset = assets[0];
        
        // Download text file from storage
        const { data: fileData, error: downloadError } = await supabaseClient.storage
          .from(asset.storage_bucket)
          .download(asset.storage_path);

        if (!downloadError && fileData) {
          content = await fileData.text();
          contentSource = "text_asset";
          console.log(`[${requestId}] Loaded text asset`);
        }
      }
    }

    // 4. Check for PDF assets (MVP: return unsupported for now)
    if (!content) {
      const { data: pdfAssets } = await supabaseClient
        .from("lesson_assets")
        .select("id")
        .eq("lesson_id", lesson_id)
        .eq("user_id", user.id)
        .eq("kind", "pdf")
        .limit(1);

      if (pdfAssets && pdfAssets.length > 0) {
        console.log(`[${requestId}] PDF asset found but extraction not supported yet`);
        return new Response(
          JSON.stringify({ 
            error: "PDF extraction not yet supported. Please use text or audio lessons.",
            error_code: "UNSUPPORTED_CONTENT_TYPE"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If no content found, return error
    if (!content || content.trim().length === 0) {
      console.log(`[${requestId}] No content available for lesson`);
      return new Response(
        JSON.stringify({ 
          error: "No content available for this lesson. Please add text, audio, or transcript first.",
          error_code: "NO_CONTENT_AVAILABLE"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate content if too long
    if (content.length > MAX_INPUT_CHARS) {
      console.log(`[${requestId}] Content truncated from ${content.length} to ${MAX_INPUT_CHARS} chars`);
      content = content.substring(0, MAX_INPUT_CHARS) + "...";
    }

    console.log(`[${requestId}] Content loaded (${content.length} chars) from ${contentSource}`);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build prompt
    const toneInstruction = TONE_PROMPTS[tone];
    const lengthInstruction = LENGTH_PROMPTS[length];

    const prompt = `You are an expert educational assistant. Analyze the following lesson content and generate a structured summary.

LESSON TITLE: ${lesson.title}

CONTENT:
${content}

INSTRUCTIONS:
${toneInstruction}
${lengthInstruction}

OUTPUT FORMAT (JSON):
{
  "summary": "A clear, well-structured summary of the main content",
  "key_concepts": ["concept 1", "concept 2", ...],
  "example_questions": ["question 1?", "question 2?", ...]
}

RULES:
- Output ONLY valid JSON with no markdown formatting or code blocks
- Summary should capture the main ideas and important details
- Key concepts should be specific terms, theories, or ideas from the content
- Example questions should test understanding and application of the material
- Questions should vary in difficulty (recall, comprehension, application)
- Ensure all JSON strings are properly escaped`;

    console.log(`[${requestId}] Calling Gemini API...`);

    // Call Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    console.log(`[${requestId}] Gemini response received`);

    // Clean up response (remove markdown code blocks if present)
    responseText = responseText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Parse JSON response
    let summaryOutput: SummaryOutput;
    try {
      summaryOutput = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse Gemini response:`, parseError);
      console.error(`[${requestId}] Raw response:`, responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to generate valid summary. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate output structure
    if (!summaryOutput.summary || !Array.isArray(summaryOutput.key_concepts) || !Array.isArray(summaryOutput.example_questions)) {
      console.error(`[${requestId}] Invalid summary structure:`, summaryOutput);
      return new Response(
        JSON.stringify({ error: "Generated summary has invalid structure. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Summary generated successfully`);

    // Save to lesson_outputs
    const { data: output, error: outputError } = await supabaseClient
      .from("lesson_outputs")
      .insert({
        user_id: user.id,
        lesson_id: lesson_id,
        type: "summary",
        status: "ready",
        content_json: summaryOutput,
      })
      .select("id")
      .single();

    if (outputError) {
      console.error(`[${requestId}] Failed to save output:`, outputError);
      return new Response(
        JSON.stringify({ error: "Failed to save summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Summary saved with ID:`, output.id);

    // Return success response
    return new Response(
      JSON.stringify({
        output_id: output.id,
        ...summaryOutput,
        metadata: {
          content_source: contentSource,
          content_length: content.length,
          tone,
          length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        request_id: requestId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
