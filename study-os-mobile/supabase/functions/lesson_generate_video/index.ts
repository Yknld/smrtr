// ============================================================================
// Edge Function: lesson_generate_video
// ============================================================================
// 
// Purpose: Generate a 1–3 minute educational video visualization using Remotion
//          via OpenHand agent, with Gemini 3 Pro Preview as the video planner (no subtitles)
// 
// Request:
//   POST /lesson_generate_video
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     lesson_id: string,
//     aspect_ratios?: string[] (default: ["16:9"])
//   }
// 
// Response:
//   {
//     lesson_id: string,
//     video_id: string,
//     status: "generating" | "ready" | "failed",
//     storage_path?: string
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateVideoRequest {
  lesson_id: string;
  aspect_ratios?: string[];
}

interface StoryJSON {
  meta: {
    title: string;
    durationSec: number;
    fps: number;
    width?: number;
    height?: number;
  };
  scenes: Array<{
    type: string;
    seconds: number;
    content: Record<string, any>;
  }>;
}

interface OpenHandConversationResponse {
  conversation_id: string;
  status: string;
}

interface OpenHandStatusResponse {
  status: "in_progress" | "completed" | "failed";
  messages?: Array<{
    role: string;
    content: string;
  }>;
  artifacts?: Array<{
    type: string;
    url: string;
    path: string;
  }>;
  error?: string;
}

const MAX_CONTEXT_CHARS = 12000;
const OPENHAND_API_BASE = "https://app.all-hands.dev/api";
const MAX_POLL_ATTEMPTS = 120; // 120 attempts × 10s = 20 minutes max
const POLL_INTERVAL_MS = 10000; // Poll every 10 seconds

// Background processing function (runs asynchronously)
async function processVideoAsync(
  conversationId: string,
  videoId: string,
  storagePath: string,
  userId: string,
  lessonId: string,
  openhandApiKey: string,
  supabaseAdmin: any,
  requestId: string
): Promise<void> {
  try {
    console.log(`[${requestId}] Starting background video processing...`);

    // Poll OpenHand conversation
    const status = await pollOpenHandConversation(
      conversationId,
      openhandApiKey,
      requestId
    );

    if (status.artifacts && status.artifacts.length > 0) {
      console.log(`[${requestId}] Artifacts received:`, JSON.stringify(status.artifacts, null, 2));
      
      // Download video
      const videoData = await downloadVideoFromArtifacts(status.artifacts, requestId);

      if (videoData) {
        // Upload to Supabase storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("lesson-assets")
          .upload(storagePath, videoData, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          console.error(`[${requestId}] Upload error:`, uploadError);
          await supabaseAdmin
            .from("lesson_assets")
            .update({
              kind: "video",
              // Store error in a way that can be retrieved - might need a separate error field
            })
            .eq("id", videoId);
          throw uploadError;
        }

        console.log(`[${requestId}] Video uploaded successfully: ${storagePath}`);
        
        // Update asset record to mark as ready (keep existing duration_ms from story plan)
        await supabaseAdmin
          .from("lesson_assets")
          .update({
            storage_path: storagePath,
            mime_type: "video/mp4",
          })
          .eq("id", videoId);

        console.log(`[${requestId}] Video processing complete`);
      } else {
        throw new Error("No video data downloaded from OpenHand artifacts");
      }
    } else {
      throw new Error("No artifacts returned from OpenHand");
    }
  } catch (error) {
    console.error(`[${requestId}] ✗ Error in background processing:`, error);
    console.error(`[${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Try to update asset record to mark as failed
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await supabaseAdmin
        .from("lesson_assets")
        .update({
          // Store error in storage_path temporarily (or add error field to schema)
          storage_path: null,
          mime_type: `error: ${errorMessage.substring(0, 100)}`
        })
        .eq("id", videoId);
      console.log(`[${requestId}] Updated asset record with error status`);
    } catch (updateError) {
      console.error(`[${requestId}] Failed to update error status:`, updateError);
    }
    
    throw error;
  }
}

// Helper: Get lesson context (notes, summary, transcript, or title)
async function getLessonContext(
  supabaseClient: any,
  lessonId: string,
  requestId: string
): Promise<{ context: string; contextSource: string; lessonTitle: string }> {
  // Get lesson title
  const { data: lesson } = await supabaseClient
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .single();

  const lessonTitle = lesson?.title || "Lesson";

  // 1. Prefer lesson notes (single source of truth for generations)
  const { data: notesOutput } = await supabaseClient
    .from("lesson_outputs")
    .select("notes_final_text, notes_raw_text")
    .eq("lesson_id", lessonId)
    .eq("type", "notes")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const notesText = notesOutput?.notes_final_text ?? notesOutput?.notes_raw_text ?? "";
  if (notesText && notesText.trim().length > 0) {
    const context = notesText.length > MAX_CONTEXT_CHARS
      ? notesText.slice(0, MAX_CONTEXT_CHARS) + "\n\n[Content truncated for video context.]"
      : notesText.trim();
    console.log(`[${requestId}] Using lesson notes as context (${context.length} chars)`);
    return {
      context,
      contextSource: "notes",
      lessonTitle,
    };
  }

  // 2. Try summary from lesson_outputs
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
    console.log(`[${requestId}] Using lesson summary as context`);
    return {
      context: summaryOutput.content_json.summary,
      contextSource: "summary",
      lessonTitle,
    };
  }

  // 3. If no notes/summary, try live transcript segments
  const { data: sessions } = await supabaseClient
    .from("study_sessions")
    .select("id")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessions && sessions.length > 0) {
    const { data: segments } = await supabaseClient
      .from("live_transcript_segments")
      .select("text")
      .eq("study_session_id", sessions[0].id)
      .order("seq", { ascending: true });

    if (segments && segments.length > 0) {
      const context = segments.map((s: any) => s.text).join(" ");
      console.log(`[${requestId}] Using transcript segments as context (${segments.length} segments)`);
      return {
        context,
        contextSource: "transcript",
        lessonTitle,
      };
    }
  }

  // 4. Fallback to just the lesson title
  console.log(`[${requestId}] Using lesson title as context (no notes/summary/transcript available)`);
  return {
    context: `This lesson is about: ${lessonTitle}`,
    contextSource: "title_only",
    lessonTitle,
  };
}

// Helper: Generate STORY_JSON using Gemini 3 Pro Preview
async function generateStoryPlan(
  context: string,
  lessonTitle: string,
  geminiApiKey: string,
  requestId: string
): Promise<StoryJSON> {
  console.log(`[${requestId}] Generating story plan with Gemini 3 Pro Preview...`);

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  // Use gemini-3-pro-preview for high-quality story planning
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-preview", // Latest preview model for story planning
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  });

  const prompt = `You are a video storyboard planner. Generate a detailed storyboard JSON for an educational explainer video between 1 and 3 minutes (60–180 seconds).

LESSON TITLE: ${lessonTitle}

LESSON CONTENT:
${context}

REQUIREMENTS:
1. Create a storyboard with total duration between 60 and 180 seconds (1–3 minutes). Choose a natural length for the content; do not force exact timing.
2. Break it into 5–12 scenes, each with clear visual and narrative content
3. Each scene should have: type (e.g., "title", "explanation", "example", "recap"), seconds (duration), and content (text, bullets, equations, etc.)
4. Make it visually engaging with mathematical/technical concepts if applicable
5. Ensure smooth transitions between scenes
6. No subtitles or burn-in on-screen text for narration.

OUTPUT FORMAT (valid JSON only):
{
  "meta": {
    "title": "Short engaging title",
    "durationSec": 120,
    "fps": 30
  },
  "scenes": [
    {
      "type": "title",
      "seconds": 5,
      "content": {
        "text": "Main title text"
      }
    },
    {
      "type": "explanation",
      "seconds": 25,
      "content": {
        "text": "Main explanation",
        "bullets": ["Key point 1", "Key point 2"]
      }
    },
    {
      "type": "example",
      "seconds": 40,
      "content": {
        "text": "Example or visualization",
        "equation": "Optional equation if math-related"
      }
    },
    {
      "type": "recap",
      "seconds": 10,
      "content": {
        "text": "Summary and key takeaway"
      }
    }
  ]
}

IMPORTANT:
- Total duration between 60 and 180 seconds (1–3 minutes). Do not add subtitles.
- Return ONLY valid JSON, no markdown code blocks
- Make content educational and clear
- Include visual descriptions in content fields`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let responseText = response.text();

  // Clean up response (remove markdown code blocks if present)
  responseText = responseText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const storyJSON: StoryJSON = JSON.parse(responseText);

  // Normalize duration only if outside 1–3 min. Allow 60–180s as-is.
  const totalSeconds = storyJSON.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const minSec = 60;
  const maxSec = 180;
  const targetSec = totalSeconds < minSec || totalSeconds > maxSec ? 120 : totalSeconds;
  if (totalSeconds < minSec || totalSeconds > maxSec) {
    const scale = targetSec / totalSeconds;
    storyJSON.scenes.forEach((scene) => {
      scene.seconds = Math.max(1, Math.round(scene.seconds * scale));
    });
    const newTotal = storyJSON.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    const diff = targetSec - newTotal;
    if (diff !== 0 && storyJSON.scenes.length > 0) {
      storyJSON.scenes[storyJSON.scenes.length - 1].seconds = Math.max(1, storyJSON.scenes[storyJSON.scenes.length - 1].seconds + diff);
    }
    storyJSON.meta.durationSec = targetSec;
  } else {
    storyJSON.meta.durationSec = totalSeconds;
  }
  storyJSON.meta.fps = 30;

  console.log(`[${requestId}] Story plan generated: ${storyJSON.scenes.length} scenes`);
  return storyJSON;
}

// Helper: Load remotion prompt template
function loadRemotionPrompt(
  storyJSON: StoryJSON,
  geminiApiKey: string,
  userAvatar: string,
  aspectRatios: string[],
  _lessonId: string,
  _videoId: string,
  uploadUrl?: string,
  uploadToken?: string
): string {
  const hasAvatar = typeof userAvatar === "string" && userAvatar.trim().length > 0;
  const hasDirectUpload = typeof uploadUrl === "string" && uploadUrl.length > 0 && typeof uploadToken === "string" && uploadToken.length > 0;
  const uploadSection = hasDirectUpload
    ? `
UPLOAD TO LESSON (REQUIRED — run after out/video.mp4 exists)
Upload the video directly to the lesson with this exact command (run from workspace root; no API key needed):
curl -X POST -H "X-Upload-Token: ${uploadToken}" -H "Content-Type: video/mp4" --data-binary @out/video.mp4 "${uploadUrl}"
You MUST run this curl after rendering. The video will not appear in the lesson until you do.`
    : `
DELIVERY
When rendering is complete, ensure out/video.mp4 exists. Our system will retrieve it via OpenHand artifacts and upload it to the lesson.`;
  const avatarSection = hasAvatar
    ? `
AVATAR (only because USER_AVATAR is provided):
- USER_AVATAR = "${userAvatar}"
- Download this URL once and save as public/avatar.png (or .jpg). Do not fetch any other remote assets.
- Show avatar in a small circle badge near the title scene and final recap.`
    : `
NO AVATAR:
- USER_AVATAR is empty. Do not download or reference any avatar. Do not fetch any remote URLs.
- Use a simple placeholder circle with initials "U" for any speaker/host badge if needed.`;

  const promptTemplate = `ROLE
You are OpenHands, a coding + execution agent. You have:
- Web/page-reading ability (open & read docs/pages)
- Shell access (create files, run npm, run node/python, render video)
- Ability to call external APIs using curl/node (Gemini)

PRIMARY GOAL
Generate a COMPLETE Remotion project that:
1) Produces a narrated explainer video (MP4) from a Story JSON plan — 1 to 3 minutes (60–180 seconds). No subtitles or burn-in text.
2) Uses Gemini for text and Gemini 2.5 Flash for TTS:
   - Narration script only (no subtitles): use a Gemini text model (e.g. gemini-3-flash-preview)
   - TTS (speech) audio: use Gemini 2.5 Flash only — TTS capability is on Gemini 2.5 Flash; no other Gemini model does TTS
3) Renders outputs headlessly and writes final artifacts to /out
4) Optionally produces alternate aspect ratios for mobile vs desktop.

INPUT SLOTS (FILL THESE IN AT RUNTIME)
- GEMINI_API_KEY = "${geminiApiKey}"
- STORY_JSON = ${JSON.stringify(storyJSON)}
- USER_AVATAR = "${userAvatar}"
- OUTPUT_ASPECTS = ${JSON.stringify(aspectRatios)}

NON-NEGOTIABLE OUTPUTS (must exist)
- out/video.mp4  (H.264 MP4, with audio narration)
- out/still.png  (representative mid-video frame)
- out/frames/frame-10.png, frame-30.png, frame-50.png, frame-70.png, frame-90.png
- out/render-report.json  (pass/fail checks, fps, duration, composition(s) rendered)
- README.md (exact commands to reproduce, including API key env var usage)

VIDEO SPEC
- Total duration: 1 to 3 minutes (60–180 seconds). Do not force exact length by whacking audio.
- FPS: 30
- Default resolution (16:9): 1280x720
- If 9:16 enabled: 1080x1920
- If 1:1 enabled: 1080x1080
- Visual aesthetic: 3blueOnebrown style, minimalist, vector animation, smooth motion, clean typography.
- No subtitles: do not burn in any on-screen captions or subtitle text.
- No external assets except: only if USER_AVATAR is non-empty, download that single URL to public/avatar and use it. Otherwise do not fetch any remote URLs.
${avatarSection}

STORY PLAN CONTRACT
- STORY_JSON is the source of truth.
- It must include meta (title, durationSec, fps) and scenes (type, seconds, content).
- durationSec must be between 60 and 180 (1–3 minutes).
- If scenes exist, write storyboard.final.json from STORY_JSON and use it for rendering. Do not post-process audio to hit an exact duration.

GEMINI USAGE RULES (IMPORTANT)
- NEVER hardcode API keys in source files.
- Use GEMINI_API_KEY via environment variable in scripts: export GEMINI_API_KEY="..."
- For narration script generation only (no subtitles): use gemini-3-flash-preview (or another text-capable model).
- For TTS (speech) you MUST use Gemini 2.5 Flash. TTS is only available on Gemini 2.5 Flash; do not assume other Gemini models can do TTS. Use model "gemini-2.5-flash" (or the exact 2.5 Flash model id from the Gemini API docs) for any generate-audio / TTS calls.
- Handle rate limits: retries with exponential backoff; cache responses to disk.

TTS REQUIREMENTS (IMPORTANT)
- TTS capability applies to Gemini 2.5 Flash only. Use Gemini 2.5 Flash for all narration audio; no other model.
- Generate audio with Gemini 2.5 Flash TTS. If the API returns raw PCM or non-standard wav, wrap to standard WAV (PCM 16-bit, 24kHz mono).
- Merge narration into one track or sequence by timing. Final MP4 MUST have audible narration.
- Control length upstream via script/scene design; do not stretch or trim audio after the fact to hit an exact duration.

NO SUBTITLES
- Do not add subtitles, captions, or any burn-in on-screen text for the narration. Video and audio only.

MOBILE/DESKTOP RESPONSIVENESS
- If OUTPUT_ASPECTS has multiple ratios, create separate Compositions (DerivativesVideo_16x9, etc.). Same storyboard + audio; adjust layout only.

WEB READING / DOCS (DO THIS FIRST)
Open and read: Remotion docs (studio, render, player). Summarize in storyboard.md.

PROJECT REQUIREMENTS
- package.json, tsconfig.json, src/index.tsx, src/Root.tsx, src/compositions/MainVideo.tsx
- src/scenes/* (from STORY_JSON), src/ui/* (${hasAvatar ? "avatar badge," : ""} graph primitives only — no subtitle component)
${hasAvatar ? "- public/avatar.(png|jpg) from USER_AVATAR download (only this one remote fetch)" : "- No public/avatar; no remote fetches"}
- scripts: generate-narration.mjs, generate-tts.mjs, extract-frames.sh, render-*.mjs
- out/ (final artifacts), storyboard.md, storyboard.final.json, narration.json, README.md

NPM SCRIPTS: typecheck, build (if needed), render:mp4, render:still, frames, all (full pipeline in order).

FULL PIPELINE ORDER (npm run all)
1) Validate STORY_JSON -> storyboard.final.json
2) Generate narration.json (Gemini text model) then narration.wav (Gemini 2.5 Flash TTS only)
3) typecheck, render MP4(s), still.png, frames, render-report.json

RENDERING METHOD
Use Remotion CLI or @remotion/renderer. Headless only; no GUI.

QUALITY CHECKS
- MP4 has audio track; duration 60–180s (1–3 min); files non-empty; no subtitles.

EXECUTION REQUIREMENT
Run: npm install, npm run all. If something fails, fix and rerun until success.

FINAL RESPONSE FORMAT
At the end print: summary, exact commands to rerun, output files with sizes, and confirm Audio present / Duration 1–3 min / No subtitles / Frames extracted / Aspects rendered.

SECURITY RULES
- Do not print or store API keys. narration.json must not contain secrets.
${uploadSection}

BEGIN NOW.`;

  return promptTemplate;
}

// Helper: Start OpenHand conversation
async function startOpenHandConversation(
  prompt: string,
  openhandApiKey: string,
  requestId: string
): Promise<string> {
  console.log(`[${requestId}] Starting OpenHand conversation...`);

  const response = await fetch(`${OPENHAND_API_BASE}/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openhandApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      initial_user_msg: prompt,
      repository: "", // OpenHand may need a repo, but we're using it for video generation
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenHand API error: ${response.status} - ${errorText}`);
  }

  const data: OpenHandConversationResponse = await response.json();
  console.log(`[${requestId}] OpenHand conversation started: ${data.conversation_id}`);
  return data.conversation_id;
}

// Helper: Poll OpenHand conversation until completion
async function pollOpenHandConversation(
  conversationId: string,
  openhandApiKey: string,
  requestId: string
): Promise<OpenHandStatusResponse> {
  let pollAttempts = 0;

  while (pollAttempts < MAX_POLL_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    pollAttempts++;

    const response = await fetch(
      `${OPENHAND_API_BASE}/conversations/${conversationId}`,
      {
        headers: {
          Authorization: `Bearer ${openhandApiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenHand status check failed: ${response.status}`);
    }

    const status: OpenHandStatusResponse = await response.json();

    if (pollAttempts % 6 === 0) {
      // Log every minute
      console.log(
        `[${requestId}] Polling... (${pollAttempts * (POLL_INTERVAL_MS / 1000)}s) - Status: ${status.status}`
      );
    }

    if (status.status === "completed") {
      console.log(`[${requestId}] ✓ OpenHand conversation completed!`);
      console.log(`[${requestId}] Status response:`, JSON.stringify({
        status: status.status,
        artifactCount: status.artifacts?.length || 0,
        messageCount: status.messages?.length || 0
      }));
      return status;
    } else if (status.status === "failed") {
      console.error(`[${requestId}] OpenHand conversation failed:`, status.error);
      throw new Error(`OpenHand conversation failed: ${status.error || "Unknown error"}`);
    }

    // Continue polling if in_progress
  }

  throw new Error(`OpenHand conversation timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

// Helper: Download video from OpenHand artifacts
async function downloadVideoFromArtifacts(
  artifacts: Array<{ type: string; url: string; path: string }>,
  requestId: string
): Promise<Uint8Array | null> {
  console.log(`[${requestId}] Searching for video in ${artifacts.length} artifacts`);
  
  // Look for video artifacts - OpenHand might return artifacts in different formats
  // Try multiple patterns
  const videoArtifact = artifacts.find(
    (a) =>
      (a.type === "file" || a.type === "video" || !a.type) &&
      (a.path?.includes("video.mp4") ||
        a.path?.includes(".mp4") ||
        a.url?.includes(".mp4") ||
        a.path?.includes("/out/"))
  );

  if (!videoArtifact) {
    console.warn(`[${requestId}] No video artifact found using primary patterns.`);
    console.warn(`[${requestId}] Available artifacts:`, JSON.stringify(artifacts, null, 2));
    
    // Try to find any artifact that might be a video - be more aggressive
    for (const artifact of artifacts) {
      if (!artifact.url) {
        console.log(`[${requestId}] Skipping artifact without URL:`, artifact);
        continue;
      }
      
      console.log(`[${requestId}] Attempting to download from: ${artifact.url} (path: ${artifact.path})`);
      try {
        const response = await fetch(artifact.url);
        console.log(`[${requestId}] Response status: ${response.status}, content-type: ${response.headers.get("content-type")}`);
        
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          const contentLength = response.headers.get("content-length");
          console.log(`[${requestId}] Artifact content-type: ${contentType}, size: ${contentLength}`);
          
          // Try to download if it looks like a video OR if it's a large binary file
          if (contentType?.includes("video") || 
              contentType?.includes("mp4") || 
              contentType?.includes("octet-stream") ||
              artifact.path?.endsWith(".mp4")) {
            const videoBuffer = await response.arrayBuffer();
            console.log(`[${requestId}] Downloaded artifact: ${videoBuffer.byteLength} bytes`);
            
            // Check if it looks like a video file (MP4 magic bytes: 0x66747970 at offset 4)
            const bytes = new Uint8Array(videoBuffer);
            if (bytes.length > 12) {
              const signature = String.fromCharCode(...bytes.slice(4, 8));
              console.log(`[${requestId}] File signature at offset 4: ${signature}`);
              if (signature === 'ftyp') {
                console.log(`[${requestId}] ✓ Valid MP4 file detected`);
                return new Uint8Array(videoBuffer);
              }
            }
            
            // If it's large enough, assume it's the video even without magic bytes
            if (bytes.length > 100000) {
              console.log(`[${requestId}] Large file detected (${bytes.length} bytes), assuming video`);
              return new Uint8Array(videoBuffer);
            }
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Failed to download artifact:`, error);
      }
    }
    
    console.error(`[${requestId}] Could not find valid video in any artifact`);
    return null;
  }

  console.log(`[${requestId}] Found video artifact - downloading from: ${videoArtifact.url}`);
  const videoResponse = await fetch(videoArtifact.url);

  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }

  const videoBuffer = await videoResponse.arrayBuffer();
  console.log(`[${requestId}] Video downloaded: ${videoBuffer.byteLength} bytes`);
  return new Uint8Array(videoBuffer);
}

serve(async (req: Request) => {
  // Handle CORS preflight – must return 2xx so browser allows the actual request
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] lesson_generate_video invoked`);

  try {
    // Create service role client (single declaration to avoid duplicate-identifier after bundling)
    const supabaseBaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const openhandApiKey = Deno.env.get("OPENHAND_API_KEY") ?? "";
    const requireAuth = Deno.env.get("REQUIRE_AUTH") !== "false"; // Default to true

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!openhandApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENHAND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseBaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    let user: any;

    if (requireAuth) {
      // Require authentication
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing Authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate JWT and get user
      const jwt = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
      if (!userData?.user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user = userData.user;
      console.log(`[${requestId}] Authenticated user: ${user.id}`);
    } else {
      // Auth disabled - for testing only
      console.log(`[${requestId}] ⚠️  Authentication disabled (REQUIRE_AUTH=false)`);
      
      if (authHeader) {
        // Try to get user from JWT if provided
        try {
          const jwt = authHeader.replace("Bearer ", "");
          const { data: userData } = await supabaseAdmin.auth.getUser(jwt);
          if (userData?.user) {
            user = userData.user;
            console.log(`[${requestId}] Using authenticated user: ${user.id}`);
          }
        } catch (err) {
          console.log(`[${requestId}] Failed to validate JWT, will use fallback user`);
        }
      }

      if (!user) {
        // Use default user ID from environment or a test user
        const defaultUserId = Deno.env.get("DEFAULT_USER_ID");
        if (defaultUserId) {
          user = { id: defaultUserId };
          console.log(`[${requestId}] Using default user: ${user.id}`);
        } else {
          return new Response(
            JSON.stringify({ 
              error: "DEFAULT_USER_ID must be set when REQUIRE_AUTH=false" 
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Parse request body
    const body: GenerateVideoRequest = await req.json();
    const { lesson_id, aspect_ratios = ["16:9"] } = body;

    if (!lesson_id) {
      return new Response(
        JSON.stringify({ error: "lesson_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify lesson exists and belongs to user
    let lessonQuery = supabaseAdmin
      .from("lessons")
      .select("id, user_id, title")
      .eq("id", lesson_id);
    
    // Only check user_id if auth is required
    if (requireAuth) {
      lessonQuery = lessonQuery.eq("user_id", user.id);
    }
    
    const { data: lesson, error: lessonError } = await lessonQuery.single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ 
          error: requireAuth 
            ? "Lesson not found or unauthorized" 
            : "Lesson not found" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use lesson's user_id if auth is disabled
    if (!requireAuth && !user.id) {
      user = { id: lesson.user_id };
      console.log(`[${requestId}] Using lesson owner as user: ${user.id}`);
    }

    console.log(`[${requestId}] Generating video for lesson: ${lesson.title}`);

    // Get lesson context
    const { context, contextSource, lessonTitle } = await getLessonContext(
      supabaseAdmin,
      lesson_id,
      requestId
    );

    // Cap context length
    const truncatedContext =
      context.length > MAX_CONTEXT_CHARS
        ? context.substring(0, MAX_CONTEXT_CHARS) + "..."
        : context;

    console.log(`[${requestId}] Context loaded (${truncatedContext.length} chars from ${contextSource})`);

    // Step 1: Generate story plan with Gemini 3 Pro Preview
    const storyJSON = await generateStoryPlan(
      truncatedContext,
      lessonTitle,
      geminiApiKey,
      requestId
    );

    // Step 2: Get user avatar (optional - check auth.users metadata)
    // Note: Avatar might be stored in auth.users.raw_user_meta_data or a separate profiles table
    // For now, we'll use empty string and let OpenHand generate a placeholder
    const userAvatar = "";

    // Step 2b: Generate video ID and one-time upload token (for CLI upload; no anon key in prompt)
    const videoId = crypto.randomUUID();
    const uploadToken = crypto.randomUUID();
    const uploadUrl = supabaseBaseUrl.replace(/\/$/, "") + "/functions/v1/lesson_video_upload";

    // Step 3: Build OpenHand prompt (includes curl to upload video directly to lesson)
    const remotionPrompt = loadRemotionPrompt(
      storyJSON,
      geminiApiKey,
      userAvatar,
      aspect_ratios,
      lesson_id,
      videoId,
      uploadUrl,
      uploadToken
    );

    // Step 4: Start OpenHand conversation
    const conversationId = await startOpenHandConversation(
      remotionPrompt,
      openhandApiKey,
      requestId
    );

    // Step 5: Create video record with upload token (agent will POST to lesson_video_upload when done)
    const durationMs = Math.round((storyJSON.meta.durationSec ?? 120) * 1000);
    const { error: insertError } = await supabaseAdmin
      .from("lesson_assets")
      .insert({
        id: videoId,
        lesson_id: lesson_id,
        user_id: user.id,
        kind: "video",
        storage_bucket: "lesson-assets",
        storage_path: null,
        mime_type: "video/mp4",
        duration_ms: durationMs,
        conversation_id: conversationId,
        metadata: {
          upload_token: uploadToken,
          started_at: new Date().toISOString(),
        },
      });

    if (insertError) {
      console.error(`[${requestId}] Failed to create video record:`, insertError);
      // Continue anyway - we'll try to create it later
    }

    // Step 6: Return immediately; agent will upload via curl to lesson_video_upload when done; poller is fallback
    console.log(`[${requestId}] Video generation started successfully`);
    console.log(`[${requestId}] Agent will upload to lesson via lesson_video_upload when render completes; poller is fallback`);

    // Return immediately with generating status
    return new Response(
      JSON.stringify({
        lesson_id: lesson_id,
        video_id: videoId,
        status: "generating",
        conversation_id: conversationId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] Error message:`, errorMessage);
    if (errorStack) {
      console.error(`[${requestId}] Error stack:`, errorStack);
    }
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
        request_id: requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
