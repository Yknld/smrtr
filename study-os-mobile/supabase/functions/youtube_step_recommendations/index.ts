// ============================================================================
// youtube_step_recommendations - Edge Function
// ============================================================================
//
// Purpose: Return YouTube videos relevant to a single homework step.
// Used by TheGeminiLoop "Feeling stuck?" button. Uses Gemini to generate
// search queries from the step context, then YouTube Data API to fetch
// and optionally Gemini to rank results.
//
// Request:
//   POST /youtube_step_recommendations
//   Headers: Authorization: Bearer <supabase_anon_key>, apikey: <supabase_anon_key>
//   Body: {
//     topic: string,           // step explanation or step summary
//     contentContext?: string,  // problem text for context
//     count?: number,           // max videos to return (default 3)
//     preferredDurationMin?: [number, number]  // e.g. [5, 20] for 5–20 min
//   }
//
// Response:
//   { videos: [{ video_id, title, channel_name, duration_seconds, thumbnail_url, description? }] }
//
// Secrets: GEMINI_API_KEY, YOUTUBE_API_KEY
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MODEL = "gemini-3-flash-preview";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_VIDEOS_PER_QUERY = 8;

interface YouTubeVideo {
  video_id: string;
  title: string;
  channel_name: string;
  duration_seconds: number;
  thumbnail_url: string;
  description?: string;
}

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] youtube_step_recommendations request`);

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not set`);
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!youtubeApiKey) {
      console.error(`[${requestId}] YOUTUBE_API_KEY not set`);
      return new Response(
        JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const contentContext = typeof body.contentContext === "string" ? body.contentContext.trim() : "";
    const count = typeof body.count === "number" && body.count > 0 ? Math.min(body.count, 10) : 3;
    const preferredDurationMin = Array.isArray(body.preferredDurationMin) && body.preferredDurationMin.length >= 2
      ? body.preferredDurationMin
      : [3, 25];

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextSnippet = contentContext ? contentContext.substring(0, 2500) : "";

    // 1) Gemini: one search query only (100 quota units per "Feeling stuck?" click)
    const queryPrompt = `A student is stuck on this step. Give ONE YouTube search query that will find the best short educational video for this exact step.

QUESTION: ${contextSnippet || "(none)"}

STEP: ${topic}

Return ONLY a JSON array with one string. Short and specific. No markdown.
Example: ["solving linear equation isolate x step by step"]`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: queryPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error(`[${requestId}] Gemini error:`, errText);
      return new Response(
        JSON.stringify({ error: "Failed to generate search queries" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    let searchQueries: string[] = [];
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      searchQueries = JSON.parse(cleaned);
      if (!Array.isArray(searchQueries) || searchQueries.length === 0) throw new Error("empty");
      searchQueries = searchQueries.slice(0, 1);
    } catch {
      searchQueries = [topic.substring(0, 80)];
    }

    console.log(`[${requestId}] Search query:`, searchQueries[0] ?? topic.substring(0, 50));

    // 2) YouTube Data API: one search (100 units) to stay under quota
    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set<string>();

    for (const query of searchQueries) {
      if (allVideos.length >= count) break;
      try {
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("maxResults", String(MAX_VIDEOS_PER_QUERY));
        searchUrl.searchParams.set("key", youtubeApiKey);
        searchUrl.searchParams.set("relevanceLanguage", "en");

        const searchRes = await fetch(searchUrl.toString());
        const searchData = await searchRes.json();

        if (searchData.error) {
          console.error(`[${requestId}] YouTube API error:`, searchData.error.code, searchData.error.message);
          continue;
        }

        const items = searchData.items || [];
        if (items.length === 0) continue;

        const videoIds = items.map((i: { id?: { videoId?: string } }) => i.id?.videoId).filter(Boolean);
        if (videoIds.length === 0) continue;

        let detailsItems: Array<{ id: string; contentDetails?: { duration?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } }; description?: string } }> = [];

        try {
          const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
          detailsUrl.searchParams.set("part", "contentDetails,snippet");
          detailsUrl.searchParams.set("id", videoIds.join(","));
          detailsUrl.searchParams.set("key", youtubeApiKey);
          const detailsRes = await fetch(detailsUrl.toString());
          const detailsData = await detailsRes.json();
          if (detailsData.error) {
            console.warn(`[${requestId}] YouTube videos API error:`, detailsData.error.message);
          } else {
            detailsItems = detailsData.items || [];
          }
        } catch (detailsErr) {
          console.warn(`[${requestId}] YouTube details fetch failed:`, detailsErr);
        }

        for (const searchItem of items) {
          const videoId = searchItem.id?.videoId;
          if (!videoId || seenIds.has(videoId)) continue;
          seenIds.add(videoId);

          const detailsItem = detailsItems.find((d: { id: string }) => d.id === videoId);
          const snippet = detailsItem?.snippet ?? searchItem.snippet;
          const duration = detailsItem?.contentDetails?.duration
            ? parseDuration(detailsItem.contentDetails.duration)
            : 0;

          allVideos.push({
            video_id: videoId,
            title: snippet?.title ?? "Untitled",
            channel_name: snippet?.channelTitle ?? "",
            duration_seconds: duration,
            thumbnail_url: snippet?.thumbnails?.high?.url ?? snippet?.thumbnails?.default?.url ?? "",
            description: snippet?.description?.substring(0, 300),
          });
        }
      } catch (e) {
        console.warn(`[${requestId}] YouTube search failed for "${query}":`, e);
      }
    }

    if (allVideos.length === 0) {
      console.warn(`[${requestId}] No videos; if 403, quota exceeded (resets daily) or check API key.`);
    }

    const selected = allVideos.slice(0, count);
    console.log(`[${requestId}] Returning ${selected.length} videos`);

    return new Response(JSON.stringify({ videos: selected }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
