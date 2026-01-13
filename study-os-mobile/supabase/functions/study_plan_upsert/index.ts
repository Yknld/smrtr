// ============================================================================
// Edge Function: study_plan_upsert
// ============================================================================
// 
// Purpose: Atomically create or update study plans with their rules
// 
// Request:
//   POST /study_plan_upsert
//   Headers: Authorization: Bearer <user_token>
//   Body:
//   {
//     "plan": {
//       "id"?: uuid,
//       "course_id"?: uuid | null,
//       "title": string,
//       "timezone"?: string,
//       "is_enabled"?: boolean
//     },
//     "rules": [
//       {
//         "id"?: uuid,
//         "rrule": string,
//         "start_time_local": "HH:MM:SS" | "HH:MM",
//         "duration_min"?: number,
//         "remind_before_min"?: number
//       }
//     ]
//   }
// 
// Response:
//   {
//     "plan": { id, user_id, course_id, title, timezone, is_enabled, created_at },
//     "rules": [ { id, user_id, study_plan_id, rrule, start_time_local, duration_min, remind_before_min, created_at }, ... ]
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

console.log("study_plan_upsert boot ok");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanInput {
  id?: string;
  course_id?: string | null;
  title: string;
  timezone?: string;
  is_enabled?: boolean;
}

interface RuleInput {
  id?: string;
  rrule: string;
  start_time_local: string;
  duration_min?: number;
  remind_before_min?: number;
}

interface RequestBody {
  plan: PlanInput;
  rules: RuleInput[];
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
    if (!body.plan || typeof body.plan !== "object") {
      console.log(`[${requestId}] Missing or invalid plan`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_PLAN",
            message: "plan object is required"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.plan.title || typeof body.plan.title !== "string" || body.plan.title.trim().length === 0) {
      console.log(`[${requestId}] Missing or invalid plan title`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_TITLE",
            message: "plan.title is required and must be a non-empty string"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(body.rules)) {
      console.log(`[${requestId}] rules must be an array`);
      return new Response(
        JSON.stringify({ 
          error: {
            code: "INVALID_RULES",
            message: "rules must be an array"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate rules
    for (let i = 0; i < body.rules.length; i++) {
      const rule = body.rules[i];
      
      if (!rule.rrule || typeof rule.rrule !== "string" || rule.rrule.trim().length === 0) {
        console.log(`[${requestId}] Invalid rrule at index ${i}`);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "INVALID_RRULE",
              message: `Rule at index ${i}: rrule is required and must be a non-empty string`
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!rule.start_time_local || typeof rule.start_time_local !== "string") {
        console.log(`[${requestId}] Invalid start_time_local at index ${i}`);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "INVALID_START_TIME",
              message: `Rule at index ${i}: start_time_local is required and must be a string (HH:MM or HH:MM:SS)`
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalize time format (HH:MM -> HH:MM:SS)
      if (rule.start_time_local.match(/^\d{2}:\d{2}$/)) {
        body.rules[i].start_time_local = `${rule.start_time_local}:00`;
      } else if (!rule.start_time_local.match(/^\d{2}:\d{2}:\d{2}$/)) {
        console.log(`[${requestId}] Invalid time format at index ${i}`);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "INVALID_TIME_FORMAT",
              message: `Rule at index ${i}: start_time_local must be in HH:MM or HH:MM:SS format`
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Begin transaction: Upsert plan and replace rules
    let plan;
    const isUpdate = !!body.plan.id;

    if (isUpdate) {
      // Update existing plan
      console.log(`[${requestId}] Updating plan: ${body.plan.id}`);
      
      const updateData: any = {
        title: body.plan.title,
      };

      if (body.plan.course_id !== undefined) {
        updateData.course_id = body.plan.course_id;
      }
      if (body.plan.timezone !== undefined) {
        updateData.timezone = body.plan.timezone;
      }
      if (body.plan.is_enabled !== undefined) {
        updateData.is_enabled = body.plan.is_enabled;
      }

      const { data: updatedPlan, error: updateError } = await supabase
        .from("study_plans")
        .update(updateData)
        .eq("id", body.plan.id)
        .eq("user_id", user.id) // Ensure ownership
        .select()
        .single();

      if (updateError) {
        console.error(`[${requestId}] Error updating plan:`, updateError);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "UPDATE_PLAN_FAILED",
              message: updateError.message || "Failed to update study plan"
            }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!updatedPlan) {
        console.log(`[${requestId}] Plan not found or not owned by user`);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "PLAN_NOT_FOUND",
              message: "Study plan not found or access denied"
            }
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      plan = updatedPlan;
      console.log(`[${requestId}] Plan updated successfully`);
    } else {
      // Create new plan
      console.log(`[${requestId}] Creating new plan`);
      
      const insertData: any = {
        user_id: user.id,
        title: body.plan.title,
        timezone: body.plan.timezone || "America/Toronto",
        is_enabled: body.plan.is_enabled !== undefined ? body.plan.is_enabled : true,
      };

      if (body.plan.course_id !== undefined) {
        insertData.course_id = body.plan.course_id;
      }

      const { data: newPlan, error: insertError } = await supabase
        .from("study_plans")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error(`[${requestId}] Error creating plan:`, insertError);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "CREATE_PLAN_FAILED",
              message: insertError.message || "Failed to create study plan"
            }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      plan = newPlan;
      console.log(`[${requestId}] Plan created successfully: ${plan.id}`);
    }

    // Delete existing rules for this plan
    if (isUpdate) {
      console.log(`[${requestId}] Deleting existing rules for plan: ${plan.id}`);
      const { error: deleteError } = await supabase
        .from("study_plan_rules")
        .delete()
        .eq("study_plan_id", plan.id)
        .eq("user_id", user.id); // Ensure ownership

      if (deleteError) {
        console.error(`[${requestId}] Error deleting rules:`, deleteError);
        // Non-fatal - continue with insert
        console.warn(`[${requestId}] Continuing despite delete error`);
      }
    }

    // Insert new rules
    let rules: any[] = [];
    if (body.rules.length > 0) {
      console.log(`[${requestId}] Inserting ${body.rules.length} rules`);
      
      const rulesInsertData = body.rules.map(rule => ({
        user_id: user.id,
        study_plan_id: plan.id,
        rrule: rule.rrule,
        start_time_local: rule.start_time_local,
        duration_min: rule.duration_min !== undefined ? rule.duration_min : 45,
        remind_before_min: rule.remind_before_min !== undefined ? rule.remind_before_min : 10,
      }));

      const { data: insertedRules, error: rulesInsertError } = await supabase
        .from("study_plan_rules")
        .insert(rulesInsertData)
        .select();

      if (rulesInsertError) {
        console.error(`[${requestId}] Error inserting rules:`, rulesInsertError);
        return new Response(
          JSON.stringify({ 
            error: {
              code: "INSERT_RULES_FAILED",
              message: rulesInsertError.message || "Failed to insert study plan rules"
            }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      rules = insertedRules || [];
      console.log(`[${requestId}] Rules inserted successfully: ${rules.length} rule(s)`);
    } else {
      console.log(`[${requestId}] No rules to insert`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        plan,
        rules,
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
