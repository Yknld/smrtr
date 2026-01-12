// ============================================================================
// Edge Function: push_token_upsert
// ============================================================================
// 
// Purpose: Register or update device push notification tokens
// 
// Request:
//   POST /push_token_upsert
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "platform": "ios" | "android",
//     "push_token": string
//   }
// 
// Response:
//   {
//     "ok": true,
//     "id": "<row uuid>",
//     "user_id": "<auth uid>"
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

console.log("push_token_upsert boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushTokenRequest {
  platform: "ios" | "android";
  push_token: string;
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
    // This ensures RLS policies are enforced
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
    let body: PushTokenRequest;
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
    if (!body.platform || !["ios", "android"].includes(body.platform)) {
      console.log(`[${requestId}] Invalid platform: ${body.platform}`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_PLATFORM",
            message: "platform must be 'ios' or 'android'"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.push_token || typeof body.push_token !== "string" || body.push_token.trim().length === 0) {
      console.log(`[${requestId}] Invalid push_token`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_TOKEN",
            message: "push_token is required and must be a non-empty string"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token already exists (for this user or another user)
    const { data: existingToken, error: selectError } = await supabase
      .from("device_push_tokens")
      .select("id, user_id")
      .eq("push_token", body.push_token)
      .maybeSingle();

    if (selectError) {
      console.error(`[${requestId}] Error checking existing token:`, selectError);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to check existing token"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resultId: string;

    if (existingToken) {
      // Token exists - update it
      console.log(`[${requestId}] Token exists, updating: ${existingToken.id}`);
      
      // If token belongs to a different user, transfer it
      if (existingToken.user_id !== user.id) {
        console.log(`[${requestId}] Transferring token from ${existingToken.user_id} to ${user.id}`);
      }

      const { data: updateData, error: updateError } = await supabase
        .from("device_push_tokens")
        .update({
          user_id: user.id, // Transfer to current user if needed
          platform: body.platform,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq("push_token", body.push_token)
        .select("id")
        .single();

      if (updateError) {
        console.error(`[${requestId}] Error updating token:`, updateError);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "UPDATE_FAILED",
              message: "Failed to update push token"
            }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resultId = updateData.id;
      console.log(`[${requestId}] Token updated successfully: ${resultId}`);
    } else {
      // Token doesn't exist - insert it
      console.log(`[${requestId}] Creating new token for user: ${user.id}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from("device_push_tokens")
        .insert({
          user_id: user.id,
          platform: body.platform,
          push_token: body.push_token,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`[${requestId}] Error inserting token:`, insertError);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "INSERT_FAILED",
              message: "Failed to insert push token"
            }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resultId = insertData.id;
      console.log(`[${requestId}] Token created successfully: ${resultId}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        ok: true,
        id: resultId,
        user_id: user.id,
      }),
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
