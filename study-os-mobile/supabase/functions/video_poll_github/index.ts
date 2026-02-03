// ============================================================================
// Edge Function: video_poll_github
// ============================================================================
//
// Purpose: Poll OpenHand conversations; get video from artifacts and upload to Supabase.
//
// This function:
// 1. Finds lesson_assets with kind=video, storage_path=null, conversation_id set
// 2. Polls OpenHand for conversation status
// 3. When complete: gets video from OpenHand artifacts (primary); falls back to GitHub if needed
// 4. Uploads video to Supabase storage and updates lesson_assets
//
// Triggered by: Cron (e.g. every 30–60 seconds)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingVideo {
  id: string;
  lesson_id: string;
  user_id: string;
  created_at: string;
  conversation_id: string | null;
  metadata: {
    github_path?: string;
    github_url?: string;
    started_at?: string;
  } | null;
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

const OPENHAND_API_BASE = "https://app.all-hands.dev/api";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] video_poll_github invoked`);

  try {
    // Create service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const githubToken = Deno.env.get("GITHUB_TOKEN") ?? "";
    const openhandApiKey = Deno.env.get("OPENHAND_API_KEY") ?? "";

    if (!openhandApiKey) {
      console.error(`[${requestId}] OPENHAND_API_KEY not set!`);
      return new Response(
        JSON.stringify({ error: "OPENHAND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!githubToken) {
      console.warn(`[${requestId}] GITHUB_TOKEN not set, using public access`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all videos in "generating" state (storage_path is null)
    // Note: conversation_id and metadata columns may not exist in older schemas
    let videos: PendingVideo[] | null = null;
    let queryError: any = null;

    try {
      const result = await supabase
        .from('lesson_assets')
        .select('id, lesson_id, user_id, created_at, conversation_id, metadata')
        .eq('kind', 'video')
        .is('storage_path', null)
        .not('conversation_id', 'is', null) // Only check videos with conversation IDs
        .order('created_at', { ascending: false })
        .limit(10); // Check up to 10 pending videos

      videos = result.data as PendingVideo[] | null;
      queryError = result.error;
    } catch (selectError) {
      // Columns might not exist, try fallback query
      console.warn(`[${requestId}] Full query failed, trying basic query:`, selectError);
      
      const result = await supabase
        .from('lesson_assets')
        .select('id, lesson_id, user_id, created_at')
        .eq('kind', 'video')
        .is('storage_path', null)
        .order('created_at', { ascending: false })
        .limit(10);

      videos = (result.data as any[] || []).map((v: any) => ({
        ...v,
        conversation_id: null,
        metadata: null,
      })) as PendingVideo[];
      queryError = result.error;
    }

    if (queryError) {
      console.error(`[${requestId}] Query error:`, queryError);
      throw new Error(JSON.stringify(queryError));
    }

    console.log(`[${requestId}] Found ${videos?.length || 0} videos in generating state`);

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No pending videos",
          checked: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let found = 0;
    let failed = 0;
    let stillGenerating = 0;

    for (const video of videos as PendingVideo[]) {
      try {
        console.log(`[${requestId}] Checking video: ${video.id}`);
        console.log(`[${requestId}] Conversation ID: ${video.conversation_id}`);

        // Skip if no conversation ID
        if (!video.conversation_id) {
          console.warn(`[${requestId}] Video ${video.id} has no conversation_id, skipping`);
          continue;
        }

        // Step 1: Check OpenHand conversation status
        const conversationUrl = `${OPENHAND_API_BASE}/conversations/${video.conversation_id}`;
        
        console.log(`[${requestId}] Checking OpenHand status...`);

        const openhandResponse = await fetch(conversationUrl, {
          headers: {
            'Authorization': `Bearer ${openhandApiKey}`,
          },
        });

        if (!openhandResponse.ok) {
          console.error(`[${requestId}] OpenHand API error for ${video.id}: ${openhandResponse.status}`);
          failed++;
          continue;
        }

        const status: OpenHandStatusResponse = await openhandResponse.json();
        
        console.log(`[${requestId}] OpenHand status: ${status.status}`);

        // Step 2: If still generating, skip to next video
        if (status.status === "in_progress") {
          console.log(`[${requestId}] Video ${video.id} still generating...`);
          stillGenerating++;
          continue;
        }

        // Step 3: If failed, mark as failed
        if (status.status === "failed") {
          console.error(`[${requestId}] OpenHand conversation failed for ${video.id}:`, status.error);
          
          // Update database with error
          await supabase
            .from('lesson_assets')
            .update({
              mime_type: `error: ${(status.error || 'Unknown error').substring(0, 100)}`,
            })
            .eq('id', video.id);
          
          failed++;
          continue;
        }

        // Step 4: Conversation complete — get video from OpenHand artifacts first (direct to Supabase)
        console.log(`[${requestId}] ✓ Conversation complete! Checking OpenHand artifacts...`);

        let videoBlob: ArrayBuffer | null = null;

        if (status.artifacts && status.artifacts.length > 0) {
          const videoArtifact = status.artifacts.find(
            (a: { type?: string; url?: string; path?: string }) =>
              (a.type === "file" || a.type === "video" || !a.type) &&
              (a.path?.includes("video.mp4") || a.path?.includes(".mp4") || a.url?.includes(".mp4") || a.path?.includes("/out/"))
          );
          if (videoArtifact?.url) {
            const artRes = await fetch(videoArtifact.url);
            if (artRes.ok) {
              const contentType = artRes.headers.get("content-type");
              const buf = await artRes.arrayBuffer();
              const bytes = new Uint8Array(buf);
              const isMp4 = bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
              if (contentType?.includes("video") || contentType?.includes("mp4") || contentType?.includes("octet-stream") || isMp4 || bytes.length > 100000) {
                videoBlob = buf;
                console.log(`[${requestId}] ✓ Got video from OpenHand artifacts (${bytes.length} bytes)`);
              }
            }
          }
          if (!videoBlob) {
            for (const a of status.artifacts) {
              if (!a.url) continue;
              const artRes = await fetch(a.url);
              if (!artRes.ok) continue;
              const buf = await artRes.arrayBuffer();
              const bytes = new Uint8Array(buf);
              if (bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
                videoBlob = buf;
                console.log(`[${requestId}] ✓ Got video from artifact ${a.path} (${bytes.length} bytes)`);
                break;
              }
              if (bytes.length > 100000 && (artRes.headers.get("content-type")?.includes("video") || a.path?.endsWith(".mp4"))) {
                videoBlob = buf;
                break;
              }
            }
          }
        }

        // Fallback: GitHub (if agent uploaded there)
        if (!videoBlob && githubToken) {
          const possiblePaths = [
            `videos/${video.lesson_id}_${video.id}.mp4`,
            `videos/${video.id}.mp4`,
            `${video.lesson_id}/${video.id}.mp4`,
          ];
          for (const path of possiblePaths) {
            const githubUrl = `https://raw.githubusercontent.com/Yknld/video-artifacts/main/${path}`;
            const response = await fetch(githubUrl, { headers: { Authorization: `token ${githubToken}` } });
            if (response.ok) {
              videoBlob = await response.arrayBuffer();
              console.log(`[${requestId}] ✓ Got video from GitHub: ${path}`);
              break;
            }
          }
        }

        if (!videoBlob) {
          console.warn(`[${requestId}] Conversation complete but no video in artifacts or GitHub: ${video.id}. Will retry.`);
          continue;
        }

        found++;

        // Step 5: Upload to Supabase storage
        const storagePath = `${video.user_id}/${video.lesson_id}/${video.id}.mp4`;
        
        console.log(`[${requestId}] Uploading to storage: ${storagePath}`);

        const { error: uploadError } = await supabase.storage
          .from('lesson-assets')
          .upload(storagePath, videoBlob, {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (uploadError) {
          console.error(`[${requestId}] Upload error for ${video.id}:`, uploadError);
          failed++;
          continue;
        }

        // Step 6: Update database record
        const { error: updateError } = await supabase
          .from('lesson_assets')
          .update({
            storage_path: storagePath,
            mime_type: 'video/mp4',
            duration_ms: 30000,
          })
          .eq('id', video.id);

        if (updateError) {
          console.error(`[${requestId}] Database update error for ${video.id}:`, updateError);
          failed++;
          continue;
        }

        console.log(`[${requestId}] ✓ Video ${video.id} successfully processed`);
        processed++;

      } catch (error) {
        console.error(`[${requestId}] Error processing video ${video.id}:`, error);
        failed++;
      }
    }

    const result = {
      checked: videos.length,
      stillGenerating,
      found,
      processed,
      failed,
      timestamp: new Date().toISOString(),
    };

    console.log(`[${requestId}] Poll complete:`, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
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
