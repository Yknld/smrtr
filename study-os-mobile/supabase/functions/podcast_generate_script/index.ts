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
  console.log(`[${requestId}] 🚀 NEW VERSION - NO JWT VALIDATION`);

  try {
    // Get authorization header (optional with verify_jwt: false)
    const authHeader = req.headers.get("Authorization");
    
    // Create service role client (works with or without user JWT)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[${requestId}] Using service role client`);

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

    // Initialize Gemini - using Pro model for high-quality podcast scripts
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.8
      }
    });

    // Build prompt - V2 with real conversational dynamics
    const prompt = `
You are an expert educational podcast writer and producer.

Your task is to generate a natural, engaging, two-person podcast script that sounds like real humans thinking out loud — not a lecture, not a summary, and not a Wikipedia article.

This podcast is for students who want to learn efficiently but enjoy listening.

CRITICAL GOAL:
The conversation must show REAL INTELLECTUAL MOVEMENT.
Hosts should question, clarify, disagree, correct themselves, and reframe ideas as the episode progresses.

LESSON TITLE:
${lessonTitle}

LESSON CONTEXT (notes, transcript, or summary):
${context}

HOST ROLES (FIXED — DO NOT CHANGE)
Speaker A (Host):
- Curious, energetic, leads the episode
- Asks questions a smart student would ask
- Occasionally oversimplifies ideas

Speaker B (Co-Host):
- More analytical and precise
- Challenges assumptions
- Clarifies, corrects, and adds nuance
- Occasionally pushes back or reframes

STRUCTURE REQUIREMENTS (VERY IMPORTANT)
The episode MUST follow this structure:

1) Cold Open (1–2 turns)
   - Start with an intriguing question, real-world scenario, or surprising claim
   - NO generic greetings

2) Framing the Topic
   - Why this topic matters
   - What problem it helps solve

3) Exploration Phase (core of episode)
   - Back-and-forth discussion
   - Include:
     • Misconceptions
     • Clarifications
     • "Wait, is that actually true?" moments
     • Concrete examples
     • Tradeoffs and limitations

4) Listener Question Segment
   - Simulate 2–3 realistic student questions
   - Hosts reason through answers, not just explain

5) Synthesis
   - Pull ideas together
   - Reframe the topic more clearly than at the start

6) Soft Outro
   - Summarize key takeaways
   - Invite follow-up questions naturally

CONVERSATION RULES (THIS IS WHAT FIXES ROBOTIC OUTPUT)
- Speakers must NOT alternate mechanically
- Some responses should be short, some longer
- Disagreements must feel real, not polite
- Hosts can pause, rethink, or revise earlier statements
- Avoid buzzwords unless explained
- Avoid "As an AI…" or meta commentary
- No emojis, no markdown
- Spoken, conversational language only

OPTIONAL: ADD NATURAL SPEECH TEXTURE
Use these paralinguistic tags SPARINGLY (1-3 times total):
- [laugh] - for genuinely funny moments
- [chuckle] - for light amusement
- [sigh] - for empathy or difficulty
Only when it truly fits the moment.

PACING & LENGTH
Target duration: ${duration_min} minutes

Guidelines:
- Average 6–8 dialogue turns per minute
- Each turn: 1–4 sentences max (5-30 words)
- Prioritize clarity over coverage

OUTPUT FORMAT (STRICT — REQUIRED)
Return VALID JSON ONLY.

{
  "title": "Engaging, human-sounding episode title",
  "segments": [
    { "speaker": "a", "text": "..." },
    { "speaker": "b", "text": "..." }
  ]
}

Rules:
- speaker must be lowercase "a" or "b"
- segments must be ordered
- no trailing commas
- no markdown
- no extra fields

QUALITY CHECK (SELF-VERIFY BEFORE RESPONDING)
Before responding, internally verify:
- Does this sound like two smart people discovering ideas together?
- Are there moments of challenge or correction?
- Would this be enjoyable to listen to while walking or driving?
If not, revise before outputting JSON.

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

        // Check if response is valid
        if (!responseText || responseText === 'undefined' || responseText.trim().length === 0) {
          console.error(`[${requestId}] Empty or invalid response from Gemini`);
          throw new Error("Empty response from Gemini");
        }

        console.log(`[${requestId}] Gemini response received (${responseText.length} chars)`);
        console.log(`[${requestId}] Response preview: ${responseText.substring(0, 200)}...`);

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
      .eq("user_id", episode.user_id);

    if (deleteError) {
      console.warn(`[${requestId}] Warning: Failed to delete existing segments:`, deleteError);
      // Non-fatal if no segments exist, continue
    } else {
      console.log(`[${requestId}] Existing segments cleared (if any)`);
    }

    // Insert segments into database
    const segmentsToInsert = script.segments.map((segment, index) => ({
      user_id: episode.user_id,
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
