// ============================================================================
// Edge Function: podcast_join_in_acknowledge
// ============================================================================
// 
// Purpose: Generate IMMEDIATE acknowledgment when user asks a question
//          Uses TURBO TTS for instant playback (1-2 seconds)
// 
// Request:
//   POST /podcast_join_in_acknowledge
//   Body: { 
//     episode_id: string,
//     current_segment_index: number,
//     user_input: string
//   }
// 
// Response:
//   {
//     acknowledgment_segment: {
//       id: string,
//       seq: number,
//       speaker: "a",
//       text: string,
//       signedUrl: string  // Ready to play immediately
//     }
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcknowledgeRequest {
  episode_id: string;
  current_segment_index: number;
  user_input: string;
}

const MAX_USER_INPUT_CHARS = 500;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] 🎤 Acknowledgment request received`);

  try {
    // Parse request
    const { episode_id, current_segment_index, user_input }: AcknowledgeRequest = await req.json();

    if (!episode_id || !user_input) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: episode_id, user_input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize user input
    const sanitizedInput = user_input.trim().slice(0, MAX_USER_INPUT_CHARS);
    console.log(`[${requestId}] User input: "${sanitizedInput.substring(0, 50)}..."`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch episode details
    const { data: episode, error: episodeError } = await supabaseClient
      .from("podcast_episodes")
      .select("*")
      .eq("id", episode_id)
      .single();

    if (episodeError || !episode) {
      console.error(`[${requestId}] Episode not found:`, episodeError);
      return new Response(
        JSON.stringify({ error: "Episode not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use PRE-RECORDED generic acknowledgment (plays instantly!)
    console.log(`[${requestId}] 🎙️ Using pre-recorded acknowledgment...`);
    
    // Generic pre-recorded audio: "Oh, we just got a call from a listener! Interesting question. Let me think about this for a moment..."
    // This should be ~5-8 seconds to buy time for AI response generation
    const prerecordedAudioPath = "system/join_in_acknowledgment.mp3";
    
    // Check if pre-recorded audio exists, if not return without it
    const { data: audioExists } = await supabaseClient.storage
      .from("tts_audio")
      .list("system", {
        search: "join_in_acknowledgment.mp3"
      });

    if (!audioExists || audioExists.length === 0) {
      console.warn(`[${requestId}] Pre-recorded acknowledgment not found, skipping`);
      return new Response(
        JSON.stringify({
          acknowledgment_segment: null,
          message: "Pre-recorded acknowledgment not available"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate signed URL for pre-recorded audio
    const { data: signedUrlData } = await supabaseClient.storage
      .from("tts_audio")
      .createSignedUrl(prerecordedAudioPath, 3600);

    if (!signedUrlData?.signedUrl) {
      console.error(`[${requestId}] Failed to generate signed URL`);
      return new Response(
        JSON.stringify({ error: "Failed to access acknowledgment audio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] ✅ Pre-recorded acknowledgment ready to play instantly!`);

    return new Response(
      JSON.stringify({
        acknowledgment_segment: {
          id: "prerecorded-ack",
          seq: -1, // Special marker for pre-recorded
          speaker: "a",
          text: "Oh, we just got a call from a listener! Interesting question. Let me think about this for a moment...",
          signedUrl: signedUrlData.signedUrl,
          duration_ms: 7000, // Approximate duration
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
