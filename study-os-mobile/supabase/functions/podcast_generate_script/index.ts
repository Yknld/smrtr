// ============================================================================
// Edge Function: podcast_generate_script
// ============================================================================
// 
// Purpose: Generate AI-powered podcast dialogue script for an episode
// 
// Request:
//   POST /podcast_generate_script
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     episode_id: string,
//     duration_min?: number (default: 8),
//     style?: "direct_review" | "friendly" | "exam" (default: "direct_review")
//   }
// 
// Response:
//   {
//     episode_id: string,
//     title: string,
//     total_segments: number
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

interface GenerateScriptRequest {
  episode_id: string;
  duration_min?: number;
  style?: "direct_review" | "friendly" | "exam";
}

interface PodcastScript {
  title: string;
  segments: Array<{
    speaker: "a" | "b";
    text: string;
  }>;
}

const MAX_CONTEXT_CHARS = 12000;

const STYLE_PROMPTS = {
  direct_review: "faster pace, minimal fluff, more checkpoints",
  friendly: "warmer, light humor, more analogies",
  exam: "highlight definitions, common traps, and mini-questions",
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

    // Validate JWT and get user
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
    const body: GenerateScriptRequest = await req.json();
    const { 
      episode_id, 
      duration_min = 8,
      style = "direct_review"
    } = body;

    if (!episode_id) {
      return new Response(
        JSON.stringify({ error: "episode_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Generating script for episode:`, episode_id);

    // Fetch episode and verify ownership
    const { data: episode, error: episodeError } = await supabaseClient
      .from("podcast_episodes")
      .select("id, lesson_id, user_id, status, title")
      .eq("id", episode_id)
      .single();

    if (episodeError || !episode) {
      console.error(`[${requestId}] Episode not found:`, episodeError?.message);
      return new Response(
        JSON.stringify({ error: "Episode not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Episode verified, lesson_id:`, episode.lesson_id);
    console.log(`[${requestId}] Current episode status:`, episode.status);

    // Check if episode is already being processed
    if (episode.status === "scripting") {
      console.warn(`[${requestId}] Episode is already being scripted, continuing anyway...`);
    }

    // Update episode status to 'scripting' and clear any previous error
    await supabaseClient
      .from("podcast_episodes")
      .update({ 
        status: "scripting",
        error: null 
      })
      .eq("id", episode_id);

    // Gather lesson context
    let context = "";
    let contextSource = "";
    let lessonTitle = "";

    // Get lesson title
    const { data: lesson } = await supabaseClient
      .from("lessons")
      .select("title")
      .eq("id", episode.lesson_id)
      .single();

    lessonTitle = lesson?.title || "Lesson";

    // 1. Try to get summary from lesson_outputs
    const { data: summaryOutput } = await supabaseClient
      .from("lesson_outputs")
      .select("content_json")
      .eq("lesson_id", episode.lesson_id)
      .eq("type", "summary")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (summaryOutput?.content_json?.summary) {
      context = summaryOutput.content_json.summary;
      contextSource = "summary";
      console.log(`[${requestId}] Using lesson summary as context`);
    }

    // 2. If no summary, try live transcript segments
    if (!context) {
      const { data: sessions } = await supabaseClient
        .from("study_sessions")
        .select("id")
        .eq("lesson_id", episode.lesson_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const { data: segments } = await supabaseClient
          .from("live_transcript_segments")
          .select("text")
          .eq("study_session_id", sessions[0].id)
          .order("seq", { ascending: true });

        if (segments && segments.length > 0) {
          context = segments.map(s => s.text).join(" ");
          contextSource = "transcript";
          console.log(`[${requestId}] Using transcript segments as context (${segments.length} segments)`);
        }
      }
    }

    // 3. Fallback to just the lesson title
    if (!context) {
      context = `This lesson is about: ${lessonTitle}`;
      contextSource = "title_only";
      console.log(`[${requestId}] Using lesson title as context (no other content available)`);
    }

    // Cap context length
    if (context.length > MAX_CONTEXT_CHARS) {
      console.log(`[${requestId}] Context truncated from ${context.length} to ${MAX_CONTEXT_CHARS} chars`);
      context = context.substring(0, MAX_CONTEXT_CHARS) + "...";
    }

    console.log(`[${requestId}] Context loaded (${context.length} chars from ${contextSource})`);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      
      // Update episode to failed status
      await supabaseClient
        .from("podcast_episodes")
        .update({ 
          status: "failed",
          error: "Service configuration error"
        })
        .eq("id", episode_id);

      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Gemini - trying experimental 2.0 flash with JSON mode
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192, // Ensure we have enough tokens for full response
        temperature: 0.8 // Lower temperature for more controlled, natural output
      }
    });

    // Build prompt with improved structure
    const styleInstruction = STYLE_PROMPTS[style];

    const prompt = `
You are writing a spoken, engaging, two-host educational podcast script.
This must sound like real people talking, not like a textbook.

LESSON TITLE:
${lessonTitle}

SOURCE MATERIAL (may be messy):
${context}

STYLE MODE:
${styleInstruction}

GOAL:
Generate an ${duration_min}-minute episode that is:
- energetic, varied, and natural to listen to
- highly educational but NOT robotic
- optimized for audio (short lines, contractions, rhythm)

HOST ROLES (must be distinct):
- Speaker A: structured teacher, keeps the thread, drives the outline.
- Speaker B: relatable explainer, gives analogies, real-world examples, checks understanding, occasionally jokes lightly.

HARD CONSTRAINTS:
- Output MUST be valid JSON (no markdown).
- Total length should match ~${duration_min} minutes of spoken audio.
- Avoid long monologues: max 2 turns in a row per speaker.
- Each line must be 6–22 words. (Short, spoken.)
- Use contractions (we're, it's, don't).
- No corporate tone. No "In conclusion" unless it's a quick recap.
- Do NOT repeat the lesson title more than once.
- Do NOT say "As an AI".

REQUIRED EPISODE STRUCTURE:
1) Cold open hook (15–25 seconds): surprising fact, question, or relatable scenario.
2) Why it matters (20–40 seconds).
3) Main explanation in 3–5 sections, each with:
   - a crisp explanation
   - a concrete example or analogy
   - a 1-question checkpoint ("Quick check: ...") with the other host answering
4) Final recap (30–45 seconds): 3 bullet takeaways spoken out loud.
5) Outro: "If you've got a question, ask—otherwise let's jump back in."

STYLE MODES:
- direct_review: ${styleInstruction}
- friendly: ${styleInstruction}
- exam: ${styleInstruction}

OUTPUT JSON SCHEMA:
{
  "title": string,
  "segments": [
    {
      "speaker": "a" | "b",
      "text": string
    }
  ]
}

QUALITY CHECK BEFORE YOU RETURN:
- Does it sound like humans talking?
- Does every section have at least one example?
- Are there checkpoints every ~90–120 seconds?
- Are lines short and speakable?

Return ONLY the JSON with no markdown code blocks.`;

    console.log(`[${requestId}] Calling Gemini API...`);

    // Call Gemini with retry logic for incomplete JSON
    let script: PodcastScript | null = null;
    let lastError: Error | null = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES && !script; attempt++) {
      try {
        console.log(`[${requestId}] Attempt ${attempt}/${MAX_RETRIES}...`);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let responseText = response.text();

        console.log(`[${requestId}] Gemini response received (${responseText.length} chars)`);

        // Clean up response (remove markdown code blocks if present)
        responseText = responseText
          .trim()
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        // Check if JSON looks complete (basic validation)
        if (!responseText.endsWith('}') && !responseText.endsWith(']')) {
          console.warn(`[${requestId}] Response appears truncated, will retry`);
          throw new Error("Response appears truncated - missing closing brace");
        }

        // Parse JSON response
        script = JSON.parse(responseText);
        
        // Validate structure
        if (!script.title || !Array.isArray(script.segments) || script.segments.length === 0) {
          console.warn(`[${requestId}] Invalid structure, will retry`);
          script = null;
          throw new Error("Invalid script structure");
        }
        
        console.log(`[${requestId}] Successfully parsed script with ${script.segments.length} segments`);
        
      } catch (error) {
        lastError = error as Error;
        console.error(`[${requestId}] Attempt ${attempt} failed:`, error);
        
        if (attempt < MAX_RETRIES) {
          console.log(`[${requestId}] Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // If all retries failed
    if (!script) {
      console.error(`[${requestId}] All ${MAX_RETRIES} attempts failed`);
      
      // Update episode to failed status
      await supabaseClient
        .from("podcast_episodes")
        .update({ 
          status: "failed",
          error: `Failed to generate valid script after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
        })
        .eq("id", episode_id);

      return new Response(
        JSON.stringify({ error: "Failed to generate valid script after multiple attempts. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Script is now validated - additional segment validation
    for (const segment of script.segments) {
      if (!segment.speaker || !segment.text || !["a", "b"].includes(segment.speaker)) {
        console.error(`[${requestId}] Invalid segment:`, segment);
        
        await supabaseClient
          .from("podcast_episodes")
          .update({ 
            status: "failed",
            error: "Generated script has invalid segments"
          })
          .eq("id", episode_id);

        return new Response(
          JSON.stringify({ error: "Generated script has invalid segments. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[${requestId}] Script validated: ${script.segments.length} segments`);

    // Delete any existing segments for this episode (in case of regeneration)
    console.log(`[${requestId}] Checking for existing segments...`);
    const { error: deleteError } = await supabaseClient
      .from("podcast_segments")
      .delete()
      .eq("episode_id", episode_id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.warn(`[${requestId}] Warning: Failed to delete existing segments:`, deleteError);
      // Non-fatal if no segments exist, continue
    } else {
      console.log(`[${requestId}] Existing segments cleared (if any)`);
    }

    // Insert segments into database
    const segmentsToInsert = script.segments.map((segment, index) => ({
      user_id: user.id,
      episode_id: episode_id,
      seq: index + 1,
      speaker: segment.speaker,
      text: segment.text,
      tts_status: "queued",
    }));

    const { error: insertError } = await supabaseClient
      .from("podcast_segments")
      .insert(segmentsToInsert);

    if (insertError) {
      console.error(`[${requestId}] Failed to insert segments:`, insertError);
      
      await supabaseClient
        .from("podcast_episodes")
        .update({ 
          status: "failed",
          error: "Failed to save script segments"
        })
        .eq("id", episode_id);

      return new Response(
        JSON.stringify({ error: "Failed to save script segments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Segments inserted successfully`);

    // Update episode with title, total_segments, and status
    await supabaseClient
      .from("podcast_episodes")
      .update({
        title: script.title,
        total_segments: script.segments.length,
        status: "voicing",
      })
      .eq("id", episode_id);

    console.log(`[${requestId}] Episode updated to voicing status`);

    // Return success response
    return new Response(
      JSON.stringify({
        episode_id: episode_id,
        title: script.title,
        total_segments: script.segments.length,
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
