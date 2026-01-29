// ============================================================================
// Edge Function: video_poll_github
// ============================================================================
//
// Purpose: Poll OpenHand conversations and GitHub for completed videos
//
// This function:
// 1. Checks for videos with storage_path = null (generating state)
// 2. Polls OpenHand to check if conversation is complete
// 3. If complete, checks GitHub for video artifact
// 4. Downloads and uploads to Supabase storage
//
// Triggered by: Frequent cron job (every 30-60 seconds recommended)
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

        // Step 4: Conversation is complete! Check GitHub for video
        console.log(`[${requestId}] ✓ Conversation complete! Checking GitHub...`);

        // Try multiple possible locations
        const possiblePaths = [
          `videos/${video.lesson_id}_${video.id}.mp4`,
          `videos/${video.id}.mp4`,
          `${video.lesson_id}/${video.id}.mp4`,
        ];

        let videoBlob: ArrayBuffer | null = null;
        let successPath: string | null = null;

        for (const path of possiblePaths) {
          const githubUrl = `https://raw.githubusercontent.com/Yknld/video-artifacts/main/${path}`;
          
          console.log(`[${requestId}] Trying: ${githubUrl}`);

          const headers: Record<string, string> = {};
          if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
          }

          const response = await fetch(githubUrl, { headers });
          
          if (response.ok) {
            videoBlob = await response.arrayBuffer();
            successPath = path;
            console.log(`[${requestId}] ✓ Found video at: ${path} (${videoBlob.byteLength} bytes)`);
            break;
          } else {
            console.log(`[${requestId}] Not found at: ${path} (${response.status})`);
          }
        }

        if (!videoBlob || !successPath) {
          console.warn(`[${requestId}] Conversation complete but video not in GitHub yet: ${video.id}`);
          console.warn(`[${requestId}] OpenHand may not have successfully uploaded. Will retry on next poll.`);
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
