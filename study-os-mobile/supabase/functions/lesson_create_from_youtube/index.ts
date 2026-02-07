// ============================================================================
// Edge Function: lesson_create_from_youtube
// ============================================================================
// 
// Purpose: Import a YouTube video as a lesson with transcript and AI summary
// 
// Request:
//   POST /lesson_create_from_youtube
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "course_id": uuid,
//     "youtube_url": string,
//     "lesson_title"?: string  // Optional, defaults to video title if available
//   }
// 
// Response:
//   {
//     "lesson_id": uuid,
//     "status": "ready" | "processing",
//     "message": string
//   }
// 
// Error Response:
//   {
//     "error": {
//       "code": string,
//       "message": string
//     }
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

console.log("lesson_create_from_youtube boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  course_id: string;
  youtube_url: string;
  lesson_title?: string;
}

interface YouTubeTranscript {
  text: string;
  duration: number;
  offset: number;
  lang: string;
}

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Fetch YouTube transcript using youtube-transcript library
// Note: This is a lightweight approach that doesn't require YouTube API
async function fetchYouTubeTranscript(videoId: string): Promise<{ transcript: string; language: string } | null> {
  try {
    // Use youtube-transcript npm package via esm.sh
    const { YoutubeTranscript } = await import("https://esm.sh/youtube-transcript@1.0.6");
    
    const transcriptData: YouTubeTranscript[] = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptData || transcriptData.length === 0) {
      return null;
    }

    // Concatenate all transcript segments
    const fullTranscript = transcriptData.map((item) => item.text).join(" ");
    const language = transcriptData[0]?.lang || "en";

    return {
      transcript: fullTranscript,
      language,
    };
  } catch (error) {
    console.error("Failed to fetch YouTube transcript:", error);
    return null;
  }
}

// Generate summary using Gemini API
async function generateSummary(transcript: string, videoTitle: string, geminiApiKey: string): Promise<string | null> {
  try {
    const prompt = `You are a helpful study assistant. Please create a comprehensive summary of this YouTube video transcript.

Video Title: ${videoTitle}

Transcript:
${transcript.substring(0, 50000)} ${transcript.length > 50000 ? "... (truncated)" : ""}

Please provide:
1. A brief overview (2-3 sentences)
2. Key topics covered
3. Main takeaways or conclusions

Format your response as structured markdown.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return summary || null;
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate request ID for debugging
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received`);

  try {
    // Get Authorization header
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

    // Extract JWT token
    const jwt = authHeader.replace("Bearer ", "");

    // Create Supabase client with the user's JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify the JWT and get user
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

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (parseError) {
      console.log(`[${requestId}] Failed to parse request body`);
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

    // Validate input
    if (!body.course_id || typeof body.course_id !== "string") {
      console.log(`[${requestId}] Missing or invalid course_id`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_COURSE_ID",
            message: "course_id is required and must be a valid UUID"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.youtube_url || typeof body.youtube_url !== "string") {
      console.log(`[${requestId}] Missing or invalid youtube_url`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_URL",
            message: "youtube_url is required and must be a valid string"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify course exists and user owns it
    console.log(`[${requestId}] Verifying course ownership: ${body.course_id}`);
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("id", body.course_id)
      .eq("user_id", user.id)
      .single();

    if (courseError || !course) {
      console.log(`[${requestId}] Course not found or access denied`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or access denied"
          }
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(body.youtube_url);
    if (!videoId) {
      console.log(`[${requestId}] Invalid YouTube URL format`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_YOUTUBE_URL",
            message: "Invalid YouTube URL format. Please provide a valid YouTube video URL."
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Extracted video ID: ${videoId}`);

    // Fetch transcript (MVP: best effort, don't fail if unavailable)
    let transcriptText: string | null = null;
    let transcriptLanguage = "en";
    let videoTitle = body.lesson_title || `YouTube Import: ${videoId}`;

    console.log(`[${requestId}] Attempting to fetch YouTube transcript...`);
    const transcriptResult = await fetchYouTubeTranscript(videoId);
    
    if (transcriptResult) {
      transcriptText = transcriptResult.transcript;
      transcriptLanguage = transcriptResult.language;
      console.log(`[${requestId}] Transcript fetched successfully (${transcriptText.length} chars, language: ${transcriptLanguage})`);
    } else {
      console.log(`[${requestId}] Transcript not available - proceeding without it`);
    }

    // Use lesson_title if provided, otherwise use video ID as fallback
    if (!body.lesson_title) {
      videoTitle = `YouTube: ${videoId}`;
    }

    // Create lesson
    console.log(`[${requestId}] Creating lesson: ${videoTitle}`);
    const lessonData = {
      user_id: user.id,
      course_id: body.course_id,
      title: videoTitle,
      source_type: "import",
      status: transcriptText ? "processing" : "ready", // processing if we have transcript to summarize
    };

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .insert(lessonData)
      .select()
      .single();

    if (lessonError || !lesson) {
      console.error(`[${requestId}] Error creating lesson:`, lessonError);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "CREATE_LESSON_FAILED",
            message: lessonError?.message || "Failed to create lesson"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Lesson created: ${lesson.id}`);

    // Create lesson asset for the YouTube URL
    console.log(`[${requestId}] Creating lesson asset for YouTube URL`);
    const assetData = {
      lesson_id: lesson.id,
      user_id: user.id,
      kind: "other",
      storage_bucket: "external",
      storage_path: body.youtube_url,
      mime_type: "text/uri-list",
    };

    const { error: assetError } = await supabase
      .from("lesson_assets")
      .insert(assetData);

    if (assetError) {
      console.error(`[${requestId}] Error creating asset:`, assetError);
      // Non-fatal - continue
    }

    // If we have a transcript, store it and generate summary
    if (transcriptText) {
      // Store transcript in lesson_outputs as a 'summary' type (we can add transcript type later)
      // For MVP, we'll generate a summary using Gemini
      
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
      let summary: string | null = null;

      if (geminiApiKey) {
        console.log(`[${requestId}] Generating AI summary...`);
        summary = await generateSummary(transcriptText, videoTitle, geminiApiKey);
        
        if (summary) {
          console.log(`[${requestId}] Summary generated successfully`);
        } else {
          console.log(`[${requestId}] Failed to generate summary`);
        }
      } else {
        console.warn(`[${requestId}] GEMINI_API_KEY not configured - skipping summary generation`);
      }

      // Store summary as lesson_output
      if (summary) {
        const outputData = {
          user_id: user.id,
          lesson_id: lesson.id,
          type: "summary",
          status: "ready",
          content_json: {
            summary: summary,
            transcript: transcriptText,
            language: transcriptLanguage,
            source: "youtube",
            video_id: videoId,
          },
        };

        const { error: outputError } = await supabase
          .from("lesson_outputs")
          .insert(outputData);

        if (outputError) {
          console.error(`[${requestId}] Error creating lesson output:`, outputError);
          // Non-fatal - continue
        } else {
          console.log(`[${requestId}] Summary stored in lesson_outputs`);
        }
      }

      // Update lesson status to ready
      const { error: updateError } = await supabase
        .from("lessons")
        .update({ status: "ready" })
        .eq("id", lesson.id)
        .eq("user_id", user.id);

      if (updateError) {
        console.error(`[${requestId}] Error updating lesson status:`, updateError);
        // Non-fatal - continue
      }
    }

    // Return success response
    const responseData = {
      lesson_id: lesson.id,
      status: transcriptText ? "ready" : "ready",
      message: transcriptText 
        ? "Lesson created successfully with transcript and summary" 
        : "Lesson created successfully (transcript not available for this video)",
    };

    console.log(`[${requestId}] Success:`, responseData);

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Log full error details for debugging
    console.error(`[${requestId}] Unexpected error:`, {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Don't leak internal error details to client
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
