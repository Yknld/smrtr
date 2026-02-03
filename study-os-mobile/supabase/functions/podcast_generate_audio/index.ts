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
  language: string,
  apiKey: string,
  requestId: string
): Promise<string> {
  const runUrl = `${RUNPOD_BASE_URL}/run`;
  console.log(`[${requestId}] Submitting TTS job to RunPod: ${runUrl} (lang: ${language}, voice: ${voice}, key: ${apiKey ? "set" : "MISSING"})`);
  const submitResponse = await fetch(runUrl, {
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
        language,
        exaggeration: 0.7,
      }
    })
  });

  const responseText = await submitResponse.text();
  if (!submitResponse.ok) {
    console.error(`[${requestId}] RunPod submit failed: ${submitResponse.status} - ${responseText}`);
    throw new Error(`RunPod submit failed: ${submitResponse.status} - ${responseText}`);
  }

  let submitData: RunPodJobResponse;
  try {
    submitData = JSON.parse(responseText) as RunPodJobResponse;
  } catch {
    console.error(`[${requestId}] RunPod response not JSON: ${responseText.slice(0, 200)}`);
    throw new Error(`RunPod returned invalid JSON`);
  }
  console.log(`[${requestId}] Job submitted: ${submitData.id}`);
  return submitData.id;
}

// Check RunPod job status ONCE (no blocking loop). Returns audio if done, null if still in progress.
// Client/cron calls the Edge Function every ~15s; each invocation checks all in-flight jobs once and
// collects any that are done, so we stay under the ~60s Edge Function timeout.
async function checkRunPodJobOnce(
  jobId: string,
  apiKey: string,
  requestId: string,
  segmentSeq: number
): Promise<{ audio: Uint8Array } | { failed: string } | null> {
  const statusResponse = await fetch(`${RUNPOD_BASE_URL}/status/${jobId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!statusResponse.ok) {
    console.error(`[${requestId}] RunPod status failed: ${statusResponse.status}`);
    return null;
  }

  const statusData: RunPodStatusResponse = await statusResponse.json();

  if (statusData.status === 'COMPLETED' && statusData.output?.audio_base64) {
    const binaryAudio = Uint8Array.from(atob(statusData.output.audio_base64), c => c.charCodeAt(0));
    console.log(`[${requestId}] ✓ Seg ${segmentSeq} job ${jobId} complete: ${binaryAudio.length} bytes`);
    return { audio: binaryAudio };
  }
  if (statusData.status === 'FAILED') {
    const msg = statusData.error || 'Unknown error';
    console.error(`[${requestId}] Seg ${segmentSeq} job ${jobId} failed: ${msg}`);
    return { failed: msg };
  }
  // IN_QUEUE or IN_PROGRESS: leave for next invocation
  return null;
}

// RunPod Chatterbox Multilingual TTS Configuration
const RUNPOD_ENDPOINT_ID = "f1hyps48e61yf7"; // Multilingual model (23 languages)
const RUNPOD_BASE_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;

/** Submit up to this many queued segments to RunPod per invocation (no wait). Workers process in parallel. */
const SUBMIT_BATCH = 10;
/** Check up to this many in-flight jobs per invocation (one status request each; no blocking). Keeps invocation under ~60s. */
const CHECK_BATCH = 10;

// Voice configurations for speakers
// Using natural human voices (8s samples)
const VOICE_CONFIG = {
  a: {
    speed: 1.0,                      // Normal speed for host
    voice: "/app/runpod/male_en.flac",  // Male voice (8.9s)
    description: "Host (Speaker A - Male Voice)"
  },
  b: {
    speed: 1.0,                      // Normal speed for co-host
    voice: "/app/runpod/female_en.flac",  // Female voice (8.0s)
    description: "Co-host (Speaker B - Female Voice)"
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

    console.log(`[${requestId}] Using RunPod Chatterbox Multilingual TTS (Endpoint: ${RUNPOD_ENDPOINT_ID})`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Try to validate JWT and get user (optional - service keys will fail)
    const jwt = authHeader.replace("Bearer ", "");
    let user = null;
    let isServiceCall = false;
    
    // Check if it's a service role key
    if (jwt === supabaseServiceKey) {
      console.log(`[${requestId}] Service-to-service call detected`);
      isServiceCall = true;
    } else {
      // Try to validate as user JWT
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
      if (userData?.user) {
        user = userData.user;
        console.log(`[${requestId}] Authenticated user: ${user.id}`);
      } else {
        console.error(`[${requestId}] Auth validation failed:`, authError?.message);
        return new Response(
          JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create client for database operations
    // Use admin client for service calls, user client for user calls
    const supabaseClient = isServiceCall 
      ? supabaseAdmin
      : createClient(
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

    // Verify episode exists (and belongs to user if not service call)
    let episodeQuery = supabaseClient
      .from("podcast_episodes")
      .select("id, user_id, status, total_segments, language")
      .eq("id", episode_id);
    
    // Only filter by user_id if this is a user call (not service-to-service)
    if (!isServiceCall && user) {
      episodeQuery = episodeQuery.eq("user_id", user.id);
    }
    
    const { data: episode, error: episodeError } = await episodeQuery.single();

    if (episodeError || !episode) {
      console.error(`[${requestId}] Episode not found:`, episodeError);
      return new Response(
        JSON.stringify({ error: "Episode not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check episode status (skip for service calls - they can add segments to ready episodes)
    if (!isServiceCall && episode.status !== "voicing") {
      console.error(`[${requestId}] Episode not in voicing state: ${episode.status}`);
      return new Response(
        JSON.stringify({ error: `Episode must be in 'voicing' state, currently: ${episode.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isServiceCall) {
      console.log(`[${requestId}] Service call - allowing TTS for episode in '${episode.status}' state`);
    }

    let processedCount = 0;
    let failedCount = 0;
    let submittedCount = 0;

    // ----- PHASE 1: Poll in-flight jobs (up to POLL_BATCH) and upload when complete -----
    const { data: generatingSegments } = await supabaseAdmin
      .from("podcast_segments")
      .select("id, seq, speaker, text, runpod_job_id")
      .eq("episode_id", episode_id)
      .eq("user_id", episode.user_id)
      .eq("tts_status", "generating")
      .not("runpod_job_id", "is", null)
      .order("seq", { ascending: true })
      .limit(CHECK_BATCH);

    if (generatingSegments && generatingSegments.length > 0) {
      console.log(`[${requestId}] ===== PHASE 1: Checking ${generatingSegments.length} in-flight jobs (one status check each) =====`);
      const checkResults = await Promise.all(
        generatingSegments.map(async (seg: { id: string; seq: number; speaker: string; text: string; runpod_job_id: string }) => {
          const result = await checkRunPodJobOnce(
            seg.runpod_job_id,
            runpodApiKey,
            requestId,
            seg.seq
          );
          if (result === null) return { status: "pending" as const };
          if ("failed" in result) {
            await supabaseAdmin
              .from("podcast_segments")
              .update({ tts_status: "failed", runpod_job_id: null })
              .eq("id", seg.id);
            return { status: "failed" as const };
          }
          const audioPath = `podcasts/${episode.user_id}/${episode_id}/seg_${seg.seq}_${seg.speaker}.mp3`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("tts_audio")
            .upload(audioPath, result.audio, { contentType: "audio/mpeg", upsert: true });
          if (uploadError) {
            await supabaseAdmin
              .from("podcast_segments")
              .update({ tts_status: "failed", runpod_job_id: null })
              .eq("id", seg.id);
            return { status: "failed" as const };
          }
          await supabaseAdmin
            .from("podcast_segments")
            .update({
              tts_status: "ready",
              audio_bucket: "tts_audio",
              audio_path: audioPath,
              duration_ms: Math.floor(seg.text.length * 50),
              runpod_job_id: null,
            })
            .eq("id", seg.id);
          return { status: "ready" as const };
        })
      );
      processedCount = checkResults.filter((r) => r.status === "ready").length;
      failedCount = checkResults.filter((r) => r.status === "failed").length;
      console.log(`[${requestId}] Check phase: ${processedCount} ready, ${failedCount} failed, ${checkResults.filter((r) => r.status === "pending").length} still in progress`);
    }

    // ----- PHASE 2: Submit queued segments to RunPod (no wait; workers process in parallel) -----
    const { data: queuedSegments, error: segmentsError } = await supabaseAdmin
      .from("podcast_segments")
      .select("id, seq, speaker, text, tts_status")
      .eq("episode_id", episode_id)
      .eq("user_id", episode.user_id)
      .eq("tts_status", "queued")
      .order("seq", { ascending: true })
      .limit(SUBMIT_BATCH);

    if (segmentsError) {
      console.error(`[${requestId}] Failed to fetch segments:`, segmentsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch segments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (queuedSegments && queuedSegments.length > 0) {
      console.log(`[${requestId}] ===== PHASE 2: Submitting ${queuedSegments.length} segments to RunPod (parallel workers) =====`);
      const submitResults = await Promise.allSettled(
        queuedSegments.map(async (segment: { id: string; seq: number; speaker: string; text: string }) => {
          const voiceConfig = VOICE_CONFIG[segment.speaker as "a" | "b"];
          const jobId = await submitRunPodJob(
            segment.text,
            voiceConfig.speed,
            voiceConfig.voice,
            episode.language || "en",
            runpodApiKey,
            requestId
          );
          await supabaseAdmin
            .from("podcast_segments")
            .update({ tts_status: "generating", runpod_job_id: jobId })
            .eq("id", segment.id);
          return jobId;
        })
      );
      submittedCount = submitResults.filter((r) => r.status === "fulfilled").length;
      for (let i = 0; i < submitResults.length; i++) {
        const seg = queuedSegments[i];
        if (submitResults[i].status === "rejected" && seg) {
          await supabaseAdmin
            .from("podcast_segments")
            .update({ tts_status: "failed", runpod_job_id: null })
            .eq("id", seg.id);
          failedCount += 1;
        }
      }
      console.log(`[${requestId}] Submit phase: ${submittedCount} sent to RunPod`);
    }

    if (processedCount === 0 && submittedCount === 0 && (!queuedSegments || queuedSegments.length === 0)) {
      const { count: totalSegments } = await supabaseAdmin
        .from("podcast_segments")
        .select("id", { count: "exact", head: true })
        .eq("episode_id", episode_id)
        .eq("user_id", episode.user_id);
      console.log(`[${requestId}] No queued or in-flight segments (episode has ${totalSegments ?? 0} total)`);
      // Fall through to episode status check
    }

    // Check if all segments are now ready (or if more queued = client should call again)
    const { data: allSegments } = await supabaseAdmin
      .from("podcast_segments")
      .select("tts_status")
      .eq("episode_id", episode_id)
      .eq("user_id", episode.user_id);

    const totalCount = allSegments?.length ?? 0;
    const readyCount = allSegments?.filter(s => s.tts_status === "ready").length ?? 0;
    const queuedCount = allSegments?.filter(s => s.tts_status === "queued").length ?? 0;
    const generatingCount = allSegments?.filter(s => s.tts_status === "generating").length ?? 0;
    const allReady = totalCount > 0 && (allSegments?.every(s => s.tts_status === "ready") ?? false);

    console.log(`[${requestId}] Segment status: ${readyCount} ready, ${queuedCount} queued, ${generatingCount} generating, ${totalCount} total`);

    if (allReady) {
      console.log(`[${requestId}] All segments ready! Marking episode as ready...`);
      await supabaseAdmin
        .from("podcast_episodes")
        .update({ status: "ready" })
        .eq("id", episode_id);
      console.log(`[${requestId}] ✓ Episode marked as ready`);
    } else if (queuedCount === 0 && generatingCount === 0 && readyCount < totalCount) {
      // Only mark failed when nothing is in progress (no queued, no generating) and some segments failed
      const failedCountTotal = totalCount - readyCount;
      console.error(`[${requestId}] No queued or generating segments but not all ready - marking episode as failed`);
      await supabaseAdmin
        .from("podcast_episodes")
        .update({ status: "failed", error: `${failedCountTotal} segments failed to generate` })
        .eq("id", episode_id);
    }

    return new Response(
      JSON.stringify({
        episode_id,
        processed: processedCount,
        submitted: submittedCount,
        failed: failedCount,
        status: allReady ? "ready" : "voicing",
        more_work: queuedCount > 0 || generatingCount > 0,
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
