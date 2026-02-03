// ============================================================================
// Edge Function: lesson_youtube_recs
// ============================================================================
// 
// Purpose: Find top YouTube videos relevant to a lesson using AI
// 
// Request:
//   POST /lesson_youtube_recs
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "lesson_id": uuid,
//     "count"?: number (default 3),
//     "regionCode"?: string (default "CA"),
//     "relevanceLanguage"?: string (default "en"),
//     "force"?: boolean (default false, bypass cache)
//   }
// 
// Response:
//   {
//     "cached": boolean,
//     "results": [
//       {
//         "video_id": string,
//         "title": string,
//         "url": string,
//         "thumbnail_url": string,
//         "channel": string,
//         "duration_seconds": number,
//         "view_count": number,
//         "reason": string
//       }
//     ]
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

console.log("lesson_youtube_recs boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;
const MAX_CONTEXT_CHARS = 10000;
const DEFAULT_COUNT = 3;

interface RequestBody {
  lesson_id: string;
  count?: number;
  regionCode?: string;
  relevanceLanguage?: string;
  force?: boolean;
}

interface GeminiQuerySchema {
  queries: string[];
  must_include_topics: string[];
  avoid_topics: string[];
  target_level: "intro" | "intermediate" | "exam";
  intent: string;
  preferred_duration_min: [number, number];
  allowed_duration_min: [number, number];
}

interface YouTubeVideo {
  video_id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  channel: string;
  duration_seconds?: number;
  view_count?: number;
  reason?: string;
  score?: number;
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Gather lesson context from various sources
async function getLessonContext(supabase: any, lessonId: string, userId: string): Promise<string> {
  // Try lesson_outputs summary first
  const { data: outputs } = await supabase
    .from("lesson_outputs")
    .select("content_json")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .eq("type", "summary")
    .eq("status", "ready")
    .single();

  if (outputs?.content_json?.summary) {
    return outputs.content_json.summary.substring(0, MAX_CONTEXT_CHARS);
  }

  // Try transcript from live_transcript_segments
  const { data: segments } = await supabase
    .from("live_transcript_segments")
    .select("text")
    .eq("user_id", userId)
    .in("study_session_id", 
      supabase
        .from("study_sessions")
        .select("id")
        .eq("lesson_id", lessonId)
        .eq("user_id", userId)
    )
    .order("seq");

  if (segments && segments.length > 0) {
    const transcript = segments.map((s: any) => s.text).join(" ");
    return transcript.substring(0, MAX_CONTEXT_CHARS);
  }

  // Fallback to lesson title
  const { data: lesson } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .single();

  return lesson?.title || "General study topic";
}

// Generate search queries using Gemini
async function generateSearchQueries(
  context: string,
  geminiApiKey: string
): Promise<GeminiQuerySchema> {
  const prompt = `You are a helpful study assistant. Given this lesson content, generate YouTube search queries that would find the BEST study videos.

Lesson context:
${context}

Generate 3-6 search queries that would find:
- Clear, direct explanations (not long lectures)
- Review videos and crash courses
- Practice problems and walkthroughs
- Exam prep content

Prefer videos that are:
- 6-18 minutes (ideal for focused study)
- From educational channels
- Have "review", "crash course", "explained", "in 10 minutes", "summary" in title

Return JSON matching this schema:
{
  "queries": ["query1", "query2", ...],
  "must_include_topics": ["key topic 1", "key topic 2", ...],
  "avoid_topics": ["unrelated topic 1", ...],
  "target_level": "intro" | "intermediate" | "exam",
  "intent": "direct_review",
  "preferred_duration_min": [6, 18],
  "allowed_duration_min": [2, 45]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!jsonText) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(jsonText);
}

// Search YouTube for videos
async function searchYouTube(
  query: string,
  youtubeApiKey: string,
  regionCode: string,
  relevanceLanguage: string,
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("safeSearch", "moderate");
  searchUrl.searchParams.set("maxResults", maxResults.toString());
  searchUrl.searchParams.set("regionCode", regionCode);
  searchUrl.searchParams.set("relevanceLanguage", relevanceLanguage);
  searchUrl.searchParams.set("key", youtubeApiKey);

  const response = await fetch(searchUrl.toString());
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YouTube API error: ${error.error?.message || response.status}`);
  }

  const data = await response.json();
  
  return (data.items || []).map((item: any) => ({
    video_id: item.id.videoId,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    thumbnail_url: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    channel: item.snippet.channelTitle,
  }));
}

// Fetch video details (duration, views)
async function fetchVideoDetails(
  videoIds: string[],
  youtubeApiKey: string
): Promise<Map<string, { duration: number; views: number }>> {
  if (videoIds.length === 0) return new Map();

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "contentDetails,statistics");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", youtubeApiKey);

  const response = await fetch(detailsUrl.toString());
  
  if (!response.ok) {
    console.warn("Failed to fetch video details, continuing without them");
    return new Map();
  }

  const data = await response.json();
  const detailsMap = new Map();

  for (const item of data.items || []) {
    const duration = parseDuration(item.contentDetails.duration);
    const views = parseInt(item.statistics.viewCount || "0");
    detailsMap.set(item.id, { duration, views });
  }

  return detailsMap;
}

// Score and rank videos based on study preferences
function scoreVideo(
  video: YouTubeVideo,
  querySchema: GeminiQuerySchema
): number {
  let score = 100;

  const title = video.title.toLowerCase();
  const durationMin = (video.duration_seconds || 0) / 60;

  // Duration scoring (strongly prefer 6-18 min)
  const [prefMin, prefMax] = querySchema.preferred_duration_min;
  const [allowMin, allowMax] = querySchema.allowed_duration_min;

  if (durationMin >= prefMin && durationMin <= prefMax) {
    score += 50; // Perfect duration
  } else if (durationMin >= allowMin && durationMin <= allowMax) {
    score += 25; // Acceptable duration
  } else if (durationMin < 2 || durationMin > 60) {
    score -= 40; // Too short or too long
  }

  // Title keyword scoring (study-focused content)
  const studyKeywords = [
    "review", "crash course", "exam", "practice", 
    "in 10 minutes", "in 15 minutes", "summary", 
    "explained", "problems", "walkthrough", "tutorial",
    "lecture", "lesson", "guide", "introduction"
  ];

  for (const keyword of studyKeywords) {
    if (title.includes(keyword)) {
      score += 20;
    }
  }

  // Topic relevance
  for (const topic of querySchema.must_include_topics) {
    if (title.includes(topic.toLowerCase())) {
      score += 15;
    }
  }

  // Avoid topics
  for (const topic of querySchema.avoid_topics) {
    if (title.includes(topic.toLowerCase())) {
      score -= 30;
    }
  }

  // View count bonus (popular content tends to be good)
  if (video.view_count) {
    if (video.view_count > 1000000) score += 10;
    else if (video.view_count > 100000) score += 5;
  }

  // Channel name scoring (educational channels)
  const channel = video.channel.toLowerCase();
  const eduChannels = [
    "khan", "crash course", "mit", "stanford", "harvard",
    "3blue1brown", "professor", "academy", "education"
  ];
  
  for (const edu of eduChannels) {
    if (channel.includes(edu)) {
      score += 15;
      break;
    }
  }

  return score;
}

// Generate reason for recommendation
function generateReason(video: YouTubeVideo, querySchema: GeminiQuerySchema): string {
  const durationMin = Math.round((video.duration_seconds || 0) / 60);
  const reasons = [];

  if (durationMin >= 6 && durationMin <= 18) {
    reasons.push(`ideal ${durationMin}min length`);
  }

  const title = video.title.toLowerCase();
  if (title.includes("crash course")) reasons.push("crash course format");
  else if (title.includes("review")) reasons.push("review content");
  else if (title.includes("explained")) reasons.push("clear explanation");
  else if (title.includes("exam")) reasons.push("exam prep");
  else if (title.includes("practice")) reasons.push("practice problems");

  for (const topic of querySchema.must_include_topics.slice(0, 2)) {
    if (title.includes(topic.toLowerCase())) {
      reasons.push(`covers ${topic}`);
      break;
    }
  }

  return reasons.length > 0 
    ? reasons.join(", ") 
    : "relevant to lesson topic";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received`);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authorization required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: { code: "INVALID_REQUEST", message: "Invalid JSON" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.lesson_id) {
      return new Response(
        JSON.stringify({ error: { code: "INVALID_LESSON_ID", message: "lesson_id required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = Math.min(body.count || DEFAULT_COUNT, 10);
    const regionCode = body.regionCode || "CA";
    const relevanceLanguage = body.relevanceLanguage || "en";
    const force = body.force || false;

    // Verify lesson ownership
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, title")
      .eq("id", body.lesson_id)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Processing lesson: ${lesson.title}`);

    // Check cache (unless force=true)
    if (!force) {
      const { data: cached } = await supabase
        .from("lesson_outputs")
        .select("content_json, created_at")
        .eq("lesson_id", body.lesson_id)
        .eq("user_id", user.id)
        .eq("type", "youtube_recs")
        .eq("status", "ready")
        .single();

      if (cached) {
        const age = Date.now() - new Date(cached.created_at).getTime();
        const ageHours = age / (1000 * 60 * 60);

        if (ageHours < CACHE_TTL_HOURS) {
          console.log(`[${requestId}] Returning cached results (${Math.round(ageHours)}h old)`);
          return new Response(
            JSON.stringify({
              cached: true,
              results: cached.content_json.results || []
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get API keys
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: { code: "CONFIG_ERROR", message: "YouTube API key not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gather lesson context
    console.log(`[${requestId}] Gathering lesson context...`);
    const context = await getLessonContext(supabase, body.lesson_id, user.id);

    // Generate search queries with Gemini (or fallback)
    let querySchema: GeminiQuerySchema;
    
    if (geminiApiKey) {
      try {
        console.log(`[${requestId}] Generating queries with Gemini...`);
        querySchema = await generateSearchQueries(context, geminiApiKey);
        console.log(`[${requestId}] Generated ${querySchema.queries.length} queries`);
      } catch (error) {
        console.warn(`[${requestId}] Gemini failed, using fallback:`, error);
        querySchema = {
          queries: [`${lesson.title} tutorial`, `${lesson.title} explained`, `${lesson.title} review`],
          must_include_topics: [lesson.title],
          avoid_topics: [],
          target_level: "intro",
          intent: "direct_review",
          preferred_duration_min: [6, 18],
          allowed_duration_min: [2, 45],
        };
      }
    } else {
      querySchema = {
        queries: [`${lesson.title} tutorial`, `${lesson.title} explained`],
        must_include_topics: [lesson.title],
        avoid_topics: [],
        target_level: "intro",
        intent: "direct_review",
        preferred_duration_min: [6, 18],
        allowed_duration_min: [2, 45],
      };
    }

    // Search YouTube with each query
    console.log(`[${requestId}] Searching YouTube...`);
    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set<string>();

    for (const query of querySchema.queries) {
      try {
        const videos = await searchYouTube(query, youtubeApiKey, regionCode, relevanceLanguage);
        
        for (const video of videos) {
          if (!seenIds.has(video.video_id)) {
            seenIds.add(video.video_id);
            allVideos.push(video);
          }
        }
      } catch (error) {
        console.warn(`[${requestId}] Query failed: ${query}`, error);
      }
    }

    console.log(`[${requestId}] Found ${allVideos.length} unique videos`);

    if (allVideos.length === 0) {
      return new Response(
        JSON.stringify({ error: { code: "NO_RESULTS", message: "No videos found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch video details (duration, views)
    const videoIds = allVideos.map(v => v.video_id);
    const details = await fetchVideoDetails(videoIds, youtubeApiKey);

    for (const video of allVideos) {
      const detail = details.get(video.video_id);
      if (detail) {
        video.duration_seconds = detail.duration;
        video.view_count = detail.views;
      }
    }

    // Score and rank videos
    for (const video of allVideos) {
      video.score = scoreVideo(video, querySchema);
      video.reason = generateReason(video, querySchema);
    }

    allVideos.sort((a, b) => (b.score || 0) - (a.score || 0));

    const topVideos = allVideos.slice(0, count).map(v => ({
      video_id: v.video_id,
      title: v.title,
      url: v.url,
      thumbnail_url: v.thumbnail_url,
      channel: v.channel,
      duration_seconds: v.duration_seconds,
      view_count: v.view_count,
      reason: v.reason,
    }));

    console.log(`[${requestId}] Returning top ${topVideos.length} videos`);

    // Save to lesson_outputs
    const outputData = {
      user_id: user.id,
      lesson_id: body.lesson_id,
      type: "youtube_recs",
      status: "ready",
      content_json: {
        queries_used: querySchema.queries,
        results: topVideos,
        generated_at: new Date().toISOString(),
      },
    };

    // Upsert (delete old, insert new)
    await supabase
      .from("lesson_outputs")
      .delete()
      .eq("lesson_id", body.lesson_id)
      .eq("user_id", user.id)
      .eq("type", "youtube_recs");

    await supabase.from("lesson_outputs").insert(outputData);

    return new Response(
      JSON.stringify({
        cached: false,
        results: topVideos
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An error occurred" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
