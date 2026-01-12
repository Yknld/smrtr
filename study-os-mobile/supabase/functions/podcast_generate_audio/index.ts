import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateAudioRequest {
  episode_id: string;
}

interface RunPodJobResponse {
  id: string;
  status: string;
}

interface RunPodStatusResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: {
    audio_base64: string;
    mimetype: string;
    duration_ms: number;
    cache_hit: boolean;
  };
  error?: string;
}

// Helper function to SUBMIT a TTS job to RunPod (returns job ID)
async function submitRunPodJob(
  text: string,
  speed: number,
  voice: string | null,
  apiKey: string,
  requestId: string
): Promise<string> {
  console.log(`[${requestId}] Submitting TTS job to RunPod (voice: ${voice})...`);
  const submitResponse = await fetch(`${RUNPOD_BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        text,
        format: 'mp3',
        speed,
        voice,
      }
    })
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`RunPod submit failed: ${submitResponse.status} - ${errorText}`);
  }

  const submitData: RunPodJobResponse = await submitResponse.json();
  console.log(`[${requestId}] Job submitted: ${submitData.id}`);
  return submitData.id;
}

// Helper function to POLL a RunPod job until completion
async function pollRunPodJob(
  jobId: string,
  apiKey: string,
  requestId: string,
  segmentSeq: number
): Promise<Uint8Array> {
  let pollAttempts = 0;
  const MAX_POLL_ATTEMPTS = 60; // 60 attempts × 2s = 2 minutes max
  
  while (pollAttempts < MAX_POLL_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    pollAttempts++;

    const statusResponse = await fetch(`${RUNPOD_BASE_URL}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    if (!statusResponse.ok) {
      throw new Error(`RunPod status check failed: ${statusResponse.status}`);
    }

    const statusData: RunPodStatusResponse = await statusResponse.json();
    
    if (pollAttempts % 5 === 0) { // Log every 5 attempts (10 seconds)
      console.log(`[${requestId}] Seg ${segmentSeq} job ${jobId}: ${statusData.status} (${pollAttempts * 2}s)`);
    }

    if (statusData.status === 'COMPLETED' && statusData.output) {
      // Decode base64 audio
      const audioBase64 = statusData.output.audio_base64;
      const binaryAudio = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      console.log(`[${requestId}] ✓ Seg ${segmentSeq} complete: ${binaryAudio.length} bytes`);
      return binaryAudio;
    } else if (statusData.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${statusData.error || 'Unknown error'}`);
    }
    
    // Continue polling if IN_QUEUE or IN_PROGRESS
  }

  throw new Error(`RunPod job timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

// RunPod Chatterbox TTS Configuration
const RUNPOD_ENDPOINT_ID = "70sq2akye030kh";
const RUNPOD_BASE_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;

// Voice configurations for speakers
const VOICE_CONFIG = {
  a: {
    speed: 1.0,                      // Normal speed for host
    voice: "/app/runpod/host_voice.flac",  // Custom host voice from user sample
    description: "Host (Speaker A - Custom Voice)"
  },
  b: {
    speed: 1.05,                     // Slightly faster for co-host
    voice: "/app/runpod/male_en.flac",    // Reference audio for male voice
    description: "Co-host (Speaker B - Male)"
  },
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] podcast_generate_audio invoked`);

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for auth validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const runpodApiKey = Deno.env.get("RUNPOD_API_KEY") ?? "";

    if (!runpodApiKey) {
      console.error(`[${requestId}] Missing RUNPOD_API_KEY`);
      return new Response(
        JSON.stringify({ error: "RunPod TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Using RunPod Chatterbox TTS (Endpoint: ${RUNPOD_ENDPOINT_ID})`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    // Create client for database operations (with user context for RLS)
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse request body
    const body: GenerateAudioRequest = await req.json();
    const { episode_id } = body;

    if (!episode_id) {
      return new Response(
        JSON.stringify({ error: "episode_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Generating audio for episode: ${episode_id}`);

    // Verify episode exists and belongs to user
    const { data: episode, error: episodeError } = await supabaseClient
      .from("podcast_episodes")
      .select("id, user_id, status, total_segments")
      .eq("id", episode_id)
      .eq("user_id", user.id)
      .single();

    if (episodeError || !episode) {
      console.error(`[${requestId}] Episode not found:`, episodeError);
      return new Response(
        JSON.stringify({ error: "Episode not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (episode.status !== "voicing") {
      console.error(`[${requestId}] Episode not in voicing state: ${episode.status}`);
      return new Response(
        JSON.stringify({ error: `Episode must be in 'voicing' state, currently: ${episode.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all queued segments for this episode
    const { data: segments, error: segmentsError } = await supabaseClient
      .from("podcast_segments")
      .select("id, seq, speaker, text, tts_status")
      .eq("episode_id", episode_id)
      .eq("user_id", user.id)
      .eq("tts_status", "queued")
      .order("seq", { ascending: true });

    if (segmentsError) {
      console.error(`[${requestId}] Failed to fetch segments:`, segmentsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch segments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!segments || segments.length === 0) {
      console.log(`[${requestId}] No queued segments found`);
      return new Response(
        JSON.stringify({ error: "No queued segments found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Found ${segments.length} segments to process`);


    console.log(`[${requestId}] ===== PHASE 1: Submitting ALL ${segments.length} jobs to RunPod =====`);
    console.log(`[${requestId}] This ensures jobs are distributed across workers`);

    // PHASE 1: Submit ALL jobs to RunPod at once and collect job IDs
    const jobSubmissions = await Promise.allSettled(segments.map(async (segment) => {
      try {
        // Update segment status to generating
        await supabaseClient
          .from("podcast_segments")
          .update({ tts_status: "generating" })
          .eq("id", segment.id);

        // Get voice config for this speaker
        const voiceConfig = VOICE_CONFIG[segment.speaker as 'a' | 'b'];

        // Submit job to RunPod (doesn't wait for completion)
        const jobId = await submitRunPodJob(
          segment.text,
          voiceConfig.speed,
          voiceConfig.voice,
          runpodApiKey,
          requestId
        );

        console.log(`[${requestId}] ✓ Seg ${segment.seq} submitted as job ${jobId}`);
        
        return {
          segment,
          jobId,
          voiceConfig
        };
      } catch (error: any) {
        console.error(`[${requestId}] ✗ Failed to submit seg ${segment.seq}:`, error.message);
        await supabaseClient
          .from("podcast_segments")
          .update({ tts_status: "failed", error: error.message })
          .eq("id", segment.id);
        throw error;
      }
    }));

    const successfulSubmissions = jobSubmissions
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);
    
    const failedSubmissions = jobSubmissions.filter(r => r.status === 'rejected').length;
    
    console.log(`[${requestId}] ===== PHASE 1 COMPLETE =====`);
    console.log(`[${requestId}] ✓ Submitted: ${successfulSubmissions.length}`);
    console.log(`[${requestId}] ✗ Failed: ${failedSubmissions}`);
    console.log(`[${requestId}] All ${successfulSubmissions.length} jobs are now in RunPod's queue`);
    console.log(`[${requestId}] Workers will process them in parallel`);
    console.log('');
    console.log(`[${requestId}] ===== PHASE 2: Polling for completion =====`);

    // PHASE 2: Poll ALL jobs in parallel
    const segmentPromises = successfulSubmissions.map(async ({ segment, jobId, voiceConfig }) => {
      try {
        // Poll until complete
        const binaryAudio = await pollRunPodJob(
          jobId,
          runpodApiKey,
          requestId,
          segment.seq
        );

        // RunPod Chatterbox TTS returns MP3 format
        console.log(`[${requestId}] Step 4: Preparing MP3 audio for upload...`);
        const fileExt = 'mp3';
        const uploadContentType = 'audio/mpeg';
        
        console.log(`[${requestId}] Step 4: ✓ Format: ${fileExt}, Size: ${binaryAudio.length} bytes`);
        
        // Upload to storage with explicit contentType
        const audioPath = `podcasts/${user.id}/${episode_id}/seg_${segment.seq}_${segment.speaker}.${fileExt}`;
        console.log(`[${requestId}] Step 5: Uploading to storage...`);
        console.log(`[${requestId}] Upload path: ${audioPath}`);
        console.log(`[${requestId}] Content type: ${uploadContentType}`);
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tts_audio")
          .upload(audioPath, binaryAudio, {
            contentType: uploadContentType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`[${requestId}] ✗ Upload error for segment ${segment.seq}:`, uploadError);
          console.error(`[${requestId}] Upload error message:`, uploadError.message);
          console.error(`[${requestId}] Upload error details:`, JSON.stringify(uploadError));
          
          await supabaseClient
            .from("podcast_segments")
            .update({ tts_status: "failed" })
            .eq("id", segment.id);
          
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        console.log(`[${requestId}] Step 5: ✓ Upload successful`);

        // Update segment with audio info and mark as ready
        console.log(`[${requestId}] Step 6: Updating segment status to 'ready'...`);
        await supabaseClient
          .from("podcast_segments")
          .update({
            tts_status: "ready",
            audio_bucket: "tts_audio",
            audio_path: audioPath,
            duration_ms: Math.floor(segment.text.length * 50), // Rough estimate: 50ms per char
          })
          .eq("id", segment.id);
        console.log(`[${requestId}] Step 6: ✓ Segment marked as ready`);

        console.log(`[${requestId}] ===== ✓ Successfully processed segment ${segment.seq} =====`);
        return { success: true, seq: segment.seq };

      } catch (segmentError) {
        console.error(`[${requestId}] ✗ Error processing segment ${segment.seq}:`, segmentError);
        console.error(`[${requestId}] Segment error message:`, segmentError.message);
        console.error(`[${requestId}] Segment error stack:`, segmentError.stack);
        
        await supabaseClient
          .from("podcast_segments")
          .update({ tts_status: "failed" })
          .eq("id", segment.id);
        
        return { success: false, seq: segment.seq };
      }
    });

    // Wait for all segments to complete (or fail)
    console.log(`[${requestId}] Waiting for all ${segments.length} segments to process...`);
    const results = await Promise.allSettled(segmentPromises);
    
    // Count successes and failures
    const processedCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`[${requestId}] ===== Segment processing complete =====`);
    console.log(`[${requestId}] Processed: ${processedCount}, Failed: ${failedCount}`);

    // Check if all segments are now ready
    console.log(`[${requestId}] Checking final status of all segments...`);
    const { data: allSegments } = await supabaseClient
      .from("podcast_segments")
      .select("tts_status")
      .eq("episode_id", episode_id)
      .eq("user_id", user.id);

    console.log(`[${requestId}] Total segments: ${allSegments?.length || 0}`);
    const statusCounts = allSegments?.reduce((acc, s) => {
      acc[s.tts_status] = (acc[s.tts_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[${requestId}] Status breakdown:`, statusCounts);

    const allReady = allSegments?.every(s => s.tts_status === "ready") ?? false;

    if (allReady) {
      // Update episode status to ready
      console.log(`[${requestId}] All segments ready! Marking episode as ready...`);
      await supabaseClient
        .from("podcast_episodes")
        .update({ status: "ready" })
        .eq("id", episode_id);

      console.log(`[${requestId}] ✓ Episode marked as ready`);
    } else {
      const stillQueued = allSegments?.filter(s => s.tts_status === "queued").length ?? 0;
      console.log(`[${requestId}] Still queued: ${stillQueued}`);
      
      if (stillQueued === 0) {
        // No more queued segments, but not all ready (some failed)
        console.error(`[${requestId}] No more queued segments but not all ready - marking episode as failed`);
        await supabaseClient
          .from("podcast_episodes")
          .update({ status: "failed", error: `${failedCount} segments failed to generate` })
          .eq("id", episode_id);
        console.error(`[${requestId}] Episode marked as failed`);
      }
    }

    return new Response(
      JSON.stringify({
        episode_id,
        processed: processedCount,
        failed: failedCount,
        status: allReady ? "ready" : "processing",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
