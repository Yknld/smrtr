// ============================================================================
// generate_youtube_recommendations - Edge Function
// ============================================================================
// 
// Purpose: Generate AI-recommended YouTube videos for a lesson
// 
// Flow:
//   1. Get lesson content (notes + transcript)
//   2. Use Gemini to generate 3-5 search queries
//   3. Call YouTube Data API for each query
//   4. Use Gemini to rank results by relevance
//   5. Store top 3 videos in database
// 
// Request:
//   POST /generate_youtube_recommendations
//   Body: { "lesson_id": "uuid" }
// 
// Response:
//   {
//     "videos": [
//       { "video_id", "title", "channel_name", "duration_seconds", "thumbnail_url", "description" }
//     ],
//     "search_queries": ["query1", "query2", ...],
//     "cached": boolean
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { 
  gatherSourceInputs, 
  getContentText,
  generateSourceHash 
} from "../shared/sourceHash.ts";

const MODEL = "gemini-3-flash-preview";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_INPUT_CHARS = 50000;
const MAX_VIDEOS_PER_QUERY = 5;
const FINAL_VIDEO_COUNT = 3;

interface YouTubeSearchResult {
  video_id: string;
  title: string;
  channel_name: string;
  duration_seconds: number;
  thumbnail_url: string;
  description: string;
  view_count?: number;
  published_at?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] YouTube recommendations request received`);

  try {
    // ========================================================================
    // 1. AUTHENTICATE USER
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "NO_AUTH",
            message: "No authorization header"
          }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.log(`[${requestId}] Auth failed:`, userError?.message);
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
    // 2. VALIDATE REQUEST BODY
    // ========================================================================
    const body = await req.json();
    
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

    console.log(`[${requestId}] Generating YouTube recommendations for lesson: ${body.lesson_id}`);

    // ========================================================================
    // 3. VERIFY LESSON OWNERSHIP
    // ========================================================================
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, user_id, title")
      .eq("id", body.lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error(`[${requestId}] Lesson not found:`, lessonError?.message);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "LESSON_NOT_FOUND",
            message: "Lesson not found or you don't have access"
          }
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lesson.user_id !== user.id) {
      console.error(`[${requestId}] Access denied: lesson belongs to different user`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "FORBIDDEN",
            message: "You don't have access to this lesson"
          }
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 4. GET LESSON CONTENT
    // ========================================================================
    const sourceInputs = await gatherSourceInputs(supabase, body.lesson_id);
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
    // 5. VERIFY API KEYS
    // ========================================================================
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "CONFIG_ERROR",
            message: "AI service not configured"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!youtubeApiKey) {
      console.error(`[${requestId}] YOUTUBE_API_KEY not configured`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "CONFIG_ERROR",
            message: "YouTube API not configured"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 6. GENERATE SEARCH QUERIES WITH GEMINI
    // ========================================================================
    console.log(`[${requestId}] Generating search queries...`);

    const queryPrompt = `Based on this lesson content, generate 3-5 YouTube search queries that would find the BEST educational videos to supplement this learning material.

LESSON CONTENT:
${contentText.substring(0, 10000)}

REQUIREMENTS:
- Queries should be specific and educational
- Focus on key concepts, not general topics
- Include relevant academic/technical terms
- Queries should find videos that EXPLAIN or DEMONSTRATE concepts
- Avoid overly broad or generic searches

Return ONLY a JSON array of strings:
["query 1", "query 2", "query 3", ...]

No markdown, no explanations, just the JSON array.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: queryPrompt }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[${requestId}] Gemini API error:`, errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const queryText = geminiData.candidates[0]?.content?.parts[0]?.text?.trim();
    
    let searchQueries: string[];
    try {
      const cleanedText = queryText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      searchQueries = JSON.parse(cleanedText);
      
      if (!Array.isArray(searchQueries) || searchQueries.length === 0) {
        throw new Error("Invalid search queries format");
      }
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse search queries:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "AI_PARSE_ERROR",
            message: "Failed to generate valid search queries"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Generated ${searchQueries.length} search queries:`, searchQueries);

    // ========================================================================
    // 7. SEARCH YOUTUBE FOR EACH QUERY
    // ========================================================================
    console.log(`[${requestId}] Searching YouTube...`);
    
    const allVideos: YouTubeSearchResult[] = [];
    const seenVideoIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.append("part", "snippet");
        searchUrl.searchParams.append("q", query);
        searchUrl.searchParams.append("type", "video");
        searchUrl.searchParams.append("maxResults", String(MAX_VIDEOS_PER_QUERY));
        searchUrl.searchParams.append("key", youtubeApiKey);
        searchUrl.searchParams.append("videoDuration", "medium"); // 4-20 minutes
        searchUrl.searchParams.append("relevanceLanguage", "en");

        const searchResponse = await fetch(searchUrl.toString());
        const searchData = await searchResponse.json();

        if (searchData.items) {
          for (const item of searchData.items) {
            const videoId = item.id.videoId;
            
            // Skip duplicates
            if (seenVideoIds.has(videoId)) continue;
            seenVideoIds.add(videoId);

            // Get video details (duration, etc.)
            const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
            detailsUrl.searchParams.append("part", "contentDetails,statistics");
            detailsUrl.searchParams.append("id", videoId);
            detailsUrl.searchParams.append("key", youtubeApiKey);

            const detailsResponse = await fetch(detailsUrl.toString());
            const detailsData = await detailsResponse.json();

            if (detailsData.items && detailsData.items.length > 0) {
              const details = detailsData.items[0];
              const duration = parseDuration(details.contentDetails.duration);

              allVideos.push({
                video_id: videoId,
                title: item.snippet.title,
                channel_name: item.snippet.channelTitle,
                duration_seconds: duration,
                thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                description: item.snippet.description,
                view_count: parseInt(details.statistics.viewCount || "0"),
                published_at: item.snippet.publishedAt,
              });
            }
          }
        }
      } catch (error) {
        console.error(`[${requestId}] YouTube search failed for query "${query}":`, error);
        // Continue with other queries
      }
    }

    console.log(`[${requestId}] Found ${allVideos.length} unique videos`);

    if (allVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: "NO_RESULTS",
            message: "No YouTube videos found for this lesson content"
          }
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 8. RANK VIDEOS WITH GEMINI
    // ========================================================================
    console.log(`[${requestId}] Ranking videos...`);

    const rankingPrompt = `You are helping select the BEST YouTube videos to supplement a lesson.

LESSON CONTENT:
${contentText.substring(0, 5000)}

CANDIDATE VIDEOS:
${allVideos.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel_name}
   Duration: ${Math.floor(v.duration_seconds / 60)}min
   Description: ${v.description.substring(0, 200)}...`).join('\n\n')}

Select the TOP ${FINAL_VIDEO_COUNT} videos that would BEST help students understand this lesson. Consider:
- Relevance to key concepts
- Educational quality (clear explanations)
- Appropriate depth/complexity
- Trustworthy channels
- Good duration (not too short/long)

Return ONLY a JSON array of video indices (1-based):
[3, 1, 7]

No markdown, no explanations, just the JSON array of ${FINAL_VIDEO_COUNT} numbers.`;

    const rankingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: rankingPrompt }]
          }]
        })
      }
    );

    let selectedIndices: number[];

    if (!rankingResponse.ok) {
      console.error(`[${requestId}] Gemini ranking API error - using fallback`);
      // Fallback: just take first N videos
      selectedIndices = allVideos.slice(0, FINAL_VIDEO_COUNT).map((_, i) => i + 1);
    } else {

      const rankingData = await rankingResponse.json();
      const rankingText = rankingData.candidates[0]?.content?.parts[0]?.text?.trim();
      
      try {
        const cleanedText = rankingText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        selectedIndices = JSON.parse(cleanedText);
        
        if (!Array.isArray(selectedIndices) || selectedIndices.length === 0) {
          throw new Error("Invalid ranking format");
        }
      } catch (parseError) {
        console.error(`[${requestId}] Failed to parse ranking:`, parseError);
        // Fallback: take first N videos
        selectedIndices = allVideos.slice(0, FINAL_VIDEO_COUNT).map((_, i) => i + 1);
      }
    }

    const selectedVideos = selectedIndices
      .map(idx => allVideos[idx - 1])
      .filter(v => v !== undefined)
      .slice(0, FINAL_VIDEO_COUNT);

    console.log(`[${requestId}] Selected ${selectedVideos.length} top videos`);

    // ========================================================================
    // 9. STORE VIDEOS IN DATABASE
    // ========================================================================
    console.log(`[${requestId}] Storing videos in database...`);

    // First, insert videos into youtube_videos table (upsert)
    for (const video of selectedVideos) {
      const { error: videoError } = await supabase
        .from("youtube_videos")
        .upsert({
          video_id: video.video_id,
          title: video.title,
          channel_name: video.channel_name,
          duration_seconds: video.duration_seconds,
          thumbnail_url: video.thumbnail_url,
          description: video.description,
        }, {
          onConflict: "video_id",
          ignoreDuplicates: false,
        });

      if (videoError) {
        console.error(`[${requestId}] Failed to insert video ${video.video_id}:`, videoError);
      }
    }

    // Then, link videos to lesson
    for (let i = 0; i < selectedVideos.length; i++) {
      const video = selectedVideos[i];
      const { error: linkError } = await supabase
        .from("youtube_lesson_resources")
        .upsert({
          lesson_id: body.lesson_id,
          video_id: video.video_id,
          is_primary: i === 0, // First video is primary
        }, {
          onConflict: "lesson_id,video_id",
          ignoreDuplicates: false,
        });

      if (linkError) {
        console.error(`[${requestId}] Failed to link video ${video.video_id}:`, linkError);
      }
    }

    // ========================================================================
    // 10. RETURN SUCCESS
    // ========================================================================
    console.log(`[${requestId}] YouTube recommendations generation complete`);

    return new Response(
      JSON.stringify({
        videos: selectedVideos,
        search_queries: searchQueries,
        cached: false,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred"
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to parse ISO 8601 duration (PT15M33S -> 933 seconds)
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  
  return hours * 3600 + minutes * 60 + seconds;
}
