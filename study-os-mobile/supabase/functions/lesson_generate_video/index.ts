// ============================================================================
// Edge Function: lesson_generate_video
// ============================================================================
// 
// Purpose: Generate a 30-second educational video visualization using Remotion
//          via OpenHand agent, with Gemini 3 Pro Preview as the video planner
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        
        // Update asset record to mark as ready
        await supabaseAdmin
          .from("lesson_assets")
          .update({
            storage_path: storagePath,
            mime_type: "video/mp4",
            duration_ms: 30000,
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

// Helper: Get lesson context (summary, transcript, or title)
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

  // 1. Try to get summary from lesson_outputs
  const { data: summaryOutput } = await supabaseClient
    .from("lesson_outputs")
    .select("content_json")
    .eq("lesson_id", lessonId)
    .eq("type", "summary")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (summaryOutput?.content_json?.summary) {
    console.log(`[${requestId}] Using lesson summary as context`);
    return {
      context: summaryOutput.content_json.summary,
      contextSource: "summary",
      lessonTitle,
    };
  }

  // 2. If no summary, try live transcript segments
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

  // 3. Fallback to just the lesson title
  console.log(`[${requestId}] Using lesson title as context (no other content available)`);
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

  const prompt = `You are a video storyboard planner. Generate a detailed storyboard JSON for a 30-second educational explainer video.

LESSON TITLE: ${lessonTitle}

LESSON CONTENT:
${context}

REQUIREMENTS:
1. Create a storyboard with exactly 30 seconds total duration
2. Break it into 3-5 scenes, each with clear visual and narrative content
3. Each scene should have: type (e.g., "title", "explanation", "example", "recap"), seconds (duration), and content (text, bullets, equations, etc.)
4. Make it visually engaging with mathematical/technical concepts if applicable
5. Ensure smooth transitions between scenes

OUTPUT FORMAT (valid JSON only):
{
  "meta": {
    "title": "Short engaging title",
    "durationSec": 30,
    "fps": 30
  },
  "scenes": [
    {
      "type": "title",
      "seconds": 3,
      "content": {
        "text": "Main title text",
        "subtitle": "Optional subtitle"
      }
    },
    {
      "type": "explanation",
      "seconds": 12,
      "content": {
        "text": "Main explanation",
        "bullets": ["Key point 1", "Key point 2"]
      }
    },
    {
      "type": "example",
      "seconds": 10,
      "content": {
        "text": "Example or visualization",
        "equation": "Optional equation if math-related"
      }
    },
    {
      "type": "recap",
      "seconds": 5,
      "content": {
        "text": "Summary and key takeaway"
      }
    }
  ]
}

IMPORTANT:
- Total seconds must equal exactly 30
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

  // Validate and normalize duration
  const totalSeconds = storyJSON.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  if (totalSeconds !== 30) {
    console.log(`[${requestId}] Adjusting scene durations to total 30 seconds (was ${totalSeconds})`);
    const scale = 30 / totalSeconds;
    storyJSON.scenes.forEach((scene) => {
      scene.seconds = Math.round(scene.seconds * scale);
    });
    // Ensure exact 30 seconds
    const newTotal = storyJSON.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    const diff = 30 - newTotal;
    if (diff !== 0 && storyJSON.scenes.length > 0) {
      storyJSON.scenes[storyJSON.scenes.length - 1].seconds += diff;
    }
  }

  storyJSON.meta.durationSec = 30;
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
  lessonId: string,
  videoId: string,
  githubToken?: string
): string {
  // Read the prompt template (we'll embed it since we can't read files in Deno edge functions easily)
  // In production, you might want to store this in a database or environment variable
  const promptTemplate = `ROLE
You are OpenHands, a coding + execution agent. You have:
- Web/page-reading ability (open & read docs/pages)
- Shell access (create files, run npm, run node/python, render video)
- Ability to call external APIs using curl/node (Gemini)

PRIMARY GOAL
Generate a COMPLETE Remotion project that:
1) Produces a 30-second narrated explainer video (MP4) from a Story JSON plan
2) Uses Gemini to generate:
   - a narration script that matches the story plan
   - text subtitles timed to the narration
   - TTS audio for narration
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
- Total duration: about 30 seconds
- FPS: 30
- Default resolution (16:9): 1280x720
- If 9:16 enabled: 1080x1920
- If 1:1 enabled: 1080x1080
- Visual aesthetic: 3blueOnebrown style, minimalist,vector animation, smooth motion, clean typography .
- No external assets (no remote fonts/images). Avatar may be inlined (download and embed locally) if provided.

STORY PLAN CONTRACT
- STORY_JSON is the source of truth.
- It must include, at minimum:
  - meta: { title, durationSec (must be 30), fps (30), width/height optional }
  - scenes: array with ordered scenes
  - Each scene includes: type, seconds, and content fields (text, bullets, equation, etc.)
- If STORY_JSON durationSec != 30 or seconds don't sum to 30:
  - Fix it by minimally adjusting per-scene seconds while keeping scene order.
  - Write the corrected version to storyboard.final.json and use that for everything.

GEMINI USAGE RULES (IMPORTANT)
- NEVER hardcode API keys in source files.
- Use GEMINI_API_KEY via environment variable in scripts:
  - export GEMINI_API_KEY="..."
- ALWAYS use gemini-3-flash-preview model for all Gemini API calls:
  - For narration script generation: use model "gemini-3-flash-preview"
  - For subtitle generation: use model "gemini-3-flash-preview"
- For TTS audio: use Gemini TTS API via cli
- Use Gemini for:
  1) Narration script generation (short, clear, fits within 30s)
  2) Subtitle lines with timestamps OR per-line durations
  3) TTS audio for each subtitle chunk (or per scene)
- Handle rate limits robustly:
  - Implement retries with exponential backoff
  - Cache responses to disk so reruns don't re-call Gemini unnecessarily

TTS REQUIREMENTS (IMPORTANT)
- Generate audio with Gemini TTS (or the most appropriate Gemini TTS endpoint available).
- If Gemini returns raw PCM or non-standard wav:
  - Correctly wrap/convert to a standard WAV (PCM 16-bit, 24kHz mono is fine).
- Merge all narration audio into one track (preferred) OR sequence clips precisely by timing.
- Final MP4 MUST contain audible narration.

SUBTITLES REQUIREMENTS
- Always burn-in subtitles as on-screen text overlays (bottom centered).
- Avoid clipping:
  - Use safe margins (at least 6% from edges)
  - Use max-width and wrap lines
  - Use a translucent background pill/box for readability.
- Subtitles must align with audio timing.

MOBILE/DESKTOP RESPONSIVENESS
- If OUTPUT_ASPECTS contains multiple ratios:
  - Create separate Compositions:
    - DerivativesVideo_16x9
    - DerivativesVideo_9x16
    - DerivativesVideo_1x1
  - Use the same storyboard + audio timing.
  - Adjust layout only (stacking, font size, graph position).
  - Do NOT change the storyline or timing.

WEB READING / DOCS (DO THIS FIRST)
Open and read:
1) https://www.remotion.dev/docs/studio
2) https://www.remotion.dev/docs/render
3) https://www.remotion.dev/docs/player (if needed for layout guidance)
Summarize in storyboard.md the key commands/APIs used for rendering and sequencing.

PROJECT REQUIREMENTS
Create this structure:
- package.json
- tsconfig.json
- src/index.tsx
- src/Root.tsx
- src/compositions/MainVideo.tsx
- src/scenes/* (scene components, named based on STORY_JSON scene types)
- src/ui/* (subtitle component, avatar badge, graph primitives)
- public/avatar.(png|jpg) (optional, if user avatar provided and downloadable)
- scripts/
   - generate-narration.mjs   (calls Gemini; outputs narration.json)
   - generate-tts.mjs         (calls Gemini TTS; outputs public/audio/narration.wav)
   - extract-frames.sh        (ffmpeg to extract 10/30/50/70/90% frames)
   - render-still.mjs or npm script
   - render-mp4.mjs or npm script
- out/ (final artifacts)
- storyboard.md
- storyboard.final.json
- narration.json (Gemini output, cached)
- README.md

NPM SCRIPTS (must exist)
- npm run typecheck
- npm run build (if needed)
- npm run render:mp4
- npm run render:still
- npm run frames
- npm run all (runs full pipeline in correct order)

FULL PIPELINE ORDER (npm run all must do this)
1) Validate/normalize STORY_JSON -> write storyboard.final.json
2) Generate narration.json using Gemini (if not cached)
3) Generate narration.wav using Gemini TTS (if not cached)
4) npm run typecheck
5) Render MP4 for each requested aspect ratio
   - If multiple aspects, output:
     - out/video_16x9.mp4, out/video_9x16.mp4, out/video_1x1.mp4
   - Also create out/video.mp4 as the default (first aspect in OUTPUT_ASPECTS)
6) Render still.png from the default composition
7) Extract frames from the default MP4 into out/frames/
8) Write out/render-report.json with:
   - success true/false
   - aspects rendered
   - fps, durationSec, frames
   - file sizes
   - any warnings (subtitle overflow, missing avatar, etc.)

RENDERING METHOD
Use Remotion CLI or @remotion/renderer. Choose whichever is most reliable for headless automation.
The render must not require a GUI.

IMPORTANT QUALITY CHECKS (MUST IMPLEMENT)
After render:
- Confirm MP4 has an audio track (ffprobe or equivalent).
- Confirm duration is ~30.0 seconds (tolerance ±0.2s).
- Confirm files exist and are non-empty.

AVATAR USAGE
Show avatar in a small circle badge near the title scene + final recap.
If avatar missing, show a placeholder circle with initials "U".

EXECUTION REQUIREMENT
You MUST actually run commands to completion:
- npm install
- npm run all
If anything fails:
- read the error
- fix it
- rerun until success

FINAL RESPONSE FORMAT
At the end print:
1) One-paragraph summary of what was built
2) Exact commands to rerun
3) Output files list with sizes
4) Confirm:
   - "Audio present: YES"
   - "Duration: 30s: YES"
   - "Frames extracted: YES"
   - "All requested aspects rendered: YES"

SECURITY RULES
- Do not print the API key in logs or final output.
- Do not commit or store API keys in files.
- narration.json can be stored but must not contain secrets.

FINAL STEP - UPLOAD TO GITHUB (CRITICAL):
After successfully rendering the video, you MUST upload it to GitHub:

Run this bash script:

#!/bin/bash
VIDEO_ID="${videoId}"
LESSON_ID="${lessonId}"
GITHUB_TOKEN="${githubToken || 'GITHUB_TOKEN_NOT_SET'}"

# 1. Install GitHub CLI (if not present)
if ! command -v gh &> /dev/null; then
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
  sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update
  sudo apt install gh -y
fi

# 2. Authenticate
echo "\$GITHUB_TOKEN" | gh auth login --with-token

# 3. Clone/update repo
if [ -d "video-artifacts" ]; then
  cd video-artifacts && git pull
else
  gh repo clone Yknld/video-artifacts
  cd video-artifacts
fi

# 4. Create videos directory
mkdir -p videos

# 5. Copy video (use the primary output)
cp /workspace/out/video.mp4 ./videos/\${LESSON_ID}_\${VIDEO_ID}.mp4
   
# 6. Create metadata file
cat > ./videos/\${LESSON_ID}_\${VIDEO_ID}.json <<EOF
{
  "lesson_id": "\${LESSON_ID}",
  "video_id": "\${VIDEO_ID}",
  "generated_at": "\$(date -Iseconds)",
  "duration_sec": 30,
  "format": "mp4",
  "resolution": "1280x720",
  "file_size": \$(stat -f%z ./videos/\${LESSON_ID}_\${VIDEO_ID}.mp4 2>/dev/null || stat -c%s ./videos/\${LESSON_ID}_\${VIDEO_ID}.mp4)
}
EOF

# 7. Commit and push
git config user.name "OpenHands"
git config user.email "openhand@smrtr.ai"
git add videos/\${LESSON_ID}_\${VIDEO_ID}.*
git commit -m "Add video for lesson \${LESSON_ID} (video \${VIDEO_ID})"
git push

# 8. Verify upload
echo ""
echo "✓✓✓ VIDEO UPLOADED TO GITHUB ✓✓✓"
echo "Video ID: \${VIDEO_ID}"
echo "Lesson ID: \${LESSON_ID}"
echo "GitHub Path: videos/\${LESSON_ID}_\${VIDEO_ID}.mp4"
echo "Raw URL: https://raw.githubusercontent.com/Yknld/video-artifacts/main/videos/\${LESSON_ID}_\${VIDEO_ID}.mp4"
echo ""

IMPORTANT: The video MUST be uploaded to GitHub before you finish. This is not optional.

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] lesson_generate_video invoked`);

  try {
    // Create service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // Step 2b: Generate video ID upfront (needed for GitHub upload)
    const videoId = crypto.randomUUID();
    
    // Step 2c: Get GitHub token for video uploads
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      console.warn(`[${requestId}] GITHUB_TOKEN not set - video upload to GitHub will fail`);
    }

    // Step 3: Build OpenHand prompt (includes GitHub upload instructions)
    const remotionPrompt = loadRemotionPrompt(
      storyJSON,
      geminiApiKey,
      userAvatar,
      aspect_ratios,
      lesson_id,
      videoId,
      githubToken
    );

    // Step 4: Start OpenHand conversation
    const conversationId = await startOpenHandConversation(
      remotionPrompt,
      openhandApiKey,
      requestId
    );

    // Step 5: Create video record in database (status: generating)
    // Note: storage_path is NULL initially, will be set by polling service
    const githubPath = `videos/${lesson_id}_${videoId}.mp4`;
    
    const { error: insertError } = await supabaseAdmin
      .from("lesson_assets")
      .insert({
        id: videoId,
        lesson_id: lesson_id,
        user_id: user.id,
        kind: "video",
        storage_bucket: "lesson-assets",
        storage_path: null, // Will be set by video_poll_github function
        mime_type: "video/mp4",
        duration_ms: 30000, // 30 seconds
        conversation_id: conversationId, // For polling OpenHand status
        metadata: {
          github_path: githubPath,
          github_url: `https://raw.githubusercontent.com/Yknld/video-artifacts/main/${githubPath}`,
          started_at: new Date().toISOString(),
        },
      });

    if (insertError) {
      console.error(`[${requestId}] Failed to create video record:`, insertError);
      // Continue anyway - we'll try to create it later
    }

    // Step 6: Return immediately - polling service will handle the rest
    // The video_poll_github edge function will check OpenHand status and GitHub
    // When conversation is complete and video is found, it will download and upload to Supabase storage
    console.log(`[${requestId}] Video generation started successfully`);
    console.log(`[${requestId}] OpenHand will upload to: ${githubPath}`);
    console.log(`[${requestId}] Polling service will check OpenHand status and GitHub`);

    // Return immediately with generating status
    return new Response(
      JSON.stringify({
        lesson_id: lesson_id,
        video_id: videoId,
        status: "generating",
        conversation_id: conversationId,
        github_path: githubPath,
        github_url: `https://raw.githubusercontent.com/Yknld/video-artifacts/main/${githubPath}`,
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
