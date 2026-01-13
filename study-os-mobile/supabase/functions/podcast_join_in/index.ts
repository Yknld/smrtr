// ============================================================================
// Edge Function: podcast_join_in
// ============================================================================
// 
// Purpose: Interactive Q&A during podcast playback - generates AI response
//          to user questions while maintaining context
// 
// Request:
//   POST /podcast_join_in
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     episode_id: string,
//     current_segment_index: number,  // Where user is in podcast
//     user_input: string,              // User's question/comment
//     lesson_id: string                // For lesson content context
//   }
// 
// Response:
//   {
//     join_in_segments: Array<{
//       id: string,
//       seq: number,
//       speaker: "a" | "b",
//       text: string,
//       tts_status: string
//     }>
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JoinInRequest {
  episode_id: string;
  current_segment_index: number;
  user_input: string;
  lesson_id: string;
}

interface JoinInScript {
  segments: Array<{
    speaker: "a" | "b";
    text: string;
  }>;
}

const MAX_CONTEXT_CHARS = 8000;
const MAX_USER_INPUT_CHARS = 500;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] 🎤 Join-in request received`);

  try {
    // Parse request
    const { episode_id, current_segment_index, user_input, lesson_id }: JoinInRequest = await req.json();

    if (!episode_id || !lesson_id || !user_input) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: episode_id, lesson_id, user_input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and truncate user input
    const sanitizedInput = user_input.trim().slice(0, MAX_USER_INPUT_CHARS);
    if (!sanitizedInput) {
      return new Response(
        JSON.stringify({ error: "User input cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Episode: ${episode_id}, Current index: ${current_segment_index}`);
    console.log(`[${requestId}] User input: "${sanitizedInput}"`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch episode details
    const { data: episode, error: episodeError } = await supabaseClient
      .from("podcast_episodes")
      .select("*")
      .eq("id", episode_id)
      .single();

    if (episodeError || !episode) {
      console.error(`[${requestId}] Episode not found:`, episodeError);
      return new Response(
        JSON.stringify({ error: "Episode not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch previous podcast segments (up to current point)
    const { data: previousSegments, error: segmentsError } = await supabaseClient
      .from("podcast_segments")
      .select("seq, speaker, text")
      .eq("episode_id", episode_id)
      .lte("seq", current_segment_index)
      .order("seq", { ascending: true });

    if (segmentsError) {
      console.error(`[${requestId}] Failed to fetch segments:`, segmentsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch podcast context" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation history
    const conversationHistory = previousSegments
      ?.map(seg => `${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join("\n") || "";

    console.log(`[${requestId}] Loaded ${previousSegments?.length || 0} previous segments`);

    // 3. Fetch lesson title and optionally generated summary
    console.log(`[${requestId}] Fetching lesson with ID: ${lesson_id}`);
    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("title, user_id")
      .eq("id", lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error(`[${requestId}] Lesson not found:`, lessonError);
      console.error(`[${requestId}] Tried to fetch lesson_id: ${lesson_id}`);
      console.error(`[${requestId}] Error details:`, JSON.stringify(lessonError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: "Lesson not found",
          lesson_id: lesson_id,
          details: lessonError?.message || "No lesson with this ID"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify user owns this lesson
    if (lesson.user_id !== episode.user_id) {
      console.error(`[${requestId}] User mismatch: lesson.user_id=${lesson.user_id}, episode.user_id=${episode.user_id}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: lesson does not belong to user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to fetch lesson summary from outputs
    const { data: summaryOutput } = await supabaseClient
      .from("lesson_outputs")
      .select("content_json")
      .eq("lesson_id", lesson_id)
      .eq("type", "summary")
      .eq("status", "ready")
      .single();

    let summaryText = "";
    if (summaryOutput?.content_json) {
      // Extract text from summary JSON (format may vary)
      const content = summaryOutput.content_json as any;
      summaryText = content.text || content.summary || JSON.stringify(content);
    }

    // Build lesson context using title and any available summary
    const lessonContext = [
      `Lesson: ${lesson.title}`,
      summaryText ? `Summary: ${summaryText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MAX_CONTEXT_CHARS);

    console.log(`[${requestId}] Lesson context: ${lessonContext.length} chars`);

    // 4. Generate join-in response with Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 800,  // Keep responses concise
      },
    });

    const prompt = `
You are generating an INTERACTIVE PODCAST RESPONSE for Study OS.

A listener just joined the conversation to ask a question during a two-host educational podcast.

Your task: Generate a SHORT, NATURAL response where the hosts ADDRESS THE LISTENER'S QUESTION, then smoothly transition back to the main episode.

LESSON TITLE:
${lesson.title}

LESSON CONTEXT:
${lessonContext}

PODCAST CONVERSATION SO FAR:
${conversationHistory}

LISTENER'S QUESTION/COMMENT:
"${sanitizedInput}"

HOST ROLES (MUST STAY CONSISTENT):
Speaker A (Host):
- Curious, energetic, welcoming
- Often clarifies for the listener

Speaker B (Co-Host):
- More analytical and precise  
- Provides detailed explanations

CRITICAL REQUIREMENTS:
1. **Acknowledge the listener warmly** (e.g., "Great question!", "Oh that's interesting...")
2. **Answer concisely** - 2-4 dialogue turns MAX
3. **Stay in character** - both hosts should respond naturally
4. **Use paralinguistic tags sparingly** for texture:
   - [laugh] - genuine amusement
   - [chuckle] - light humor
   - [sigh] - empathetic or thoughtful
   - [gasp] - surprise or realization
   (Use ONLY when natural - max 1-2 per response)
5. **Keep segments SHORT** - each turn should be 1-3 sentences (10-40 words)
6. **End with a bridge back** (e.g., "Alright, let's get back to..." or "Now where were we...")
7. **NO meta commentary** ("As an AI", "This is a podcast", etc.)
8. **Spoken language only** - no markdown, no emojis

STYLE:
- Warm and conversational
- Educational but approachable
- Natural pacing (not robotic ping-pong)

OUTPUT FORMAT (STRICT):
Return VALID JSON ONLY.

{
  "segments": [
    { "speaker": "a", "text": "Great question! [chuckle] So here's the thing..." },
    { "speaker": "b", "text": "Exactly. To add to that..." },
    { "speaker": "a", "text": "Perfect. Alright, let's pick up where we left off..." }
  ]
}

Rules:
- speaker must be lowercase "a" or "b"
- segments must be ordered
- no trailing commas
- no markdown
- 2-4 segments MAX (keep it brief!)

Generate the join-in response now:
`;

    console.log(`[${requestId}] 🤖 Calling Gemini...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log(`[${requestId}] 📥 Gemini response: ${responseText.slice(0, 200)}...`);

    // Parse response
    let joinInScript: JoinInScript;
    try {
      // Clean response (remove markdown code blocks if present)
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      joinInScript = JSON.parse(cleanedResponse);
      
      if (!joinInScript.segments || !Array.isArray(joinInScript.segments)) {
        throw new Error("Invalid script format: missing segments array");
      }
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse Gemini response:`, parseError);
      console.error(`[${requestId}] Raw response:`, responseText);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", details: parseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] ✅ Parsed ${joinInScript.segments.length} join-in segments`);

    // 5. Find the highest seq number to append after
    const { data: lastSegment } = await supabaseClient
      .from("podcast_segments")
      .select("seq")
      .eq("episode_id", episode_id)
      .order("seq", { ascending: false })
      .limit(1)
      .single();

    const startingSeq = (lastSegment?.seq || 0) + 1000; // Use offset to mark as "join-in" segments

    // 6. Insert join-in segments into database
    const joinInSegmentsToInsert = joinInScript.segments.map((segment, index) => ({
      user_id: episode.user_id,
      episode_id: episode_id,
      seq: startingSeq + index,
      speaker: segment.speaker,
      text: segment.text,
      tts_status: "queued",
      audio_bucket: null,
      audio_path: null,
      duration_ms: null,
    }));

    const { data: insertedSegments, error: insertError } = await supabaseClient
      .from("podcast_segments")
      .insert(joinInSegmentsToInsert)
      .select("id, seq, speaker, text, tts_status");

    if (insertError) {
      console.error(`[${requestId}] Failed to insert join-in segments:`, insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save join-in segments", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] ✅ Inserted ${insertedSegments.length} join-in segments`);

    // 7. Trigger TTS generation for the episode (will process new segments)
    console.log(`[${requestId}] Triggering TTS for episode with ${insertedSegments.length} new segments...`);
    console.log(`[${requestId}] Episode ID: ${episode_id}`);
    console.log(`[${requestId}] Target URL: ${supabaseUrl}/functions/v1/podcast_generate_audio`);
    
    try {
      const ttsResponse = await fetch(`${supabaseUrl}/functions/v1/podcast_generate_audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          episode_id: episode_id,
        }),
      });

      console.log(`[${requestId}] TTS response status: ${ttsResponse.status}`);
      
      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error(`[${requestId}] ❌ TTS generation failed (${ttsResponse.status}):`, errorText);
        // Don't fail the whole join-in request - segments are created, TTS will retry
        console.error(`[${requestId}] Segments created but TTS failed - manual retry needed`);
      } else {
        const ttsResult = await ttsResponse.json();
        console.log(`[${requestId}] ✅ TTS generation started successfully`);
        console.log(`[${requestId}] TTS result:`, JSON.stringify(ttsResult));
      }
    } catch (ttsError) {
      console.error(`[${requestId}] ❌ TTS error (exception):`, ttsError);
      console.error(`[${requestId}] Error message:`, ttsError.message);
      console.error(`[${requestId}] Error stack:`, ttsError.stack);
    }

    console.log(`[${requestId}] 🎉 Join-in response generated successfully`);

    return new Response(
      JSON.stringify({
        join_in_segments: insertedSegments,
        message: "Join-in response generated. Audio generation in progress.",
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
