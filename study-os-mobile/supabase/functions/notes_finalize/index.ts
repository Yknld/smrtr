// ============================================================================
// Edge Function: notes_finalize
// ============================================================================
// 
// Purpose: Convert raw notes to structured, final study notes using Gemini
// 
// Request:
//   POST /notes_finalize
//   Headers: Authorization: Bearer <user_token>
//   Body: { lesson_id: string }
// 
// Response:
//   {
//     lesson_id: string,
//     notes_final_text: string,
//     input_chars: number,
//     truncated: boolean
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FinalizeRequest {
  lesson_id: string;
}

// Hard cap on input size
const MAX_INPUT_CHARS = 50000; // ~12.5k tokens

const SYSTEM_PROMPT = `You are an expert study notes formatter specializing in creating comprehensive lecture notes for students. Your task is to convert raw, unstructured notes from a lecture transcription into clean, well-organized study notes that follow a specific academic format.

You must strictly follow the output format template provided. Use plain text formatting only (no markdown syntax like *, **, #, etc.). Write in clear, accessible language that any student can understand.

Keep the content accurate to the original. Do not add information not present in the raw notes. Focus on clarity, organization, and exam readiness.`;

const USER_PROMPT_TEMPLATE = (rawNotes: string) => `Convert these raw lecture notes into clean, structured study notes following the EXACT format below:

---RAW NOTES---
${rawNotes}
---END RAW NOTES---

OUTPUT FORMAT (follow exactly):

[Lecture Title]

Topic: [Primary topic or subject area]
Date: [Lecture date or "Not specified"]
Duration: [Total length of lecture or "Not specified"]

Key Takeaways

This lecture focused on [main idea or theme], explaining [why it matters or how it works]. A key distinction was made between [Concept A] and [Concept B], helping clarify [what differentiates them]. Additionally, [important formula / rule / principle] was introduced, which is especially relevant for [exams, applications, or problem-solving].

Core Concepts

[Concept 1 — Title]

This concept introduces [brief plain-language explanation]. It helps explain [what the concept does or represents] and how it fits into the broader topic of the lecture.

Key clarification: [important detail or nuance]

Example: [short example or scenario]

Why it matters: [reason this concept is important or commonly used]

[Concept 2 — Title]

This concept builds on earlier ideas by explaining [what this concept adds or changes]. It is commonly used when [conditions or situations where it applies].

Supporting detail: [additional explanation]

Comparison: [how it differs from or relates to another concept]

Use case: [when or why it is applied]

Examples Explained

The following examples were used to demonstrate how the concepts apply in practice.

Example 1: [step-by-step explanation or summary of the example]

Example 2: [explanation of a more advanced or alternative example]

Common Mistakes

Students often make the following mistakes when working with this material:

• Confusing [Concept / Term X] with [Concept / Term Y]
• Applying [formula / rule] outside of [its valid conditions]

Avoiding these errors is important for [accuracy, exams, or real-world use].

Definitions

[Term]: [clear, concise definition in simple language]

[Term]: [definition]

[Term]: [definition]

---END FORMAT---

IMPORTANT RULES:
1. Follow the template structure EXACTLY
2. Use plain text only (NO markdown syntax: no *, **, #, etc.)
3. Key Takeaways must be a cohesive paragraph (not bullet points)
4. Include 2-5 Core Concepts, each with all sub-sections (Key clarification, Example, Why it matters, etc.)
5. Only include "Examples Explained" section if specific examples were given
6. Only include "Common Mistakes" section if errors/pitfalls were mentioned
7. Include all technical terms in the Definitions section
8. Omit any section that has no relevant content
9. Date and Duration can be "Not specified" if not mentioned in the notes
10. Write in the same language as the input notes`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] notes_finalize invoked`);

  try {
    // =========================================================================
    // 1. Validate JWT and get user
    // =========================================================================
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log(`[${requestId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for auth validation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error(`[${requestId}] Auth validation failed:`, authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated:`, user.email, user.id);

    // Create client for database operations (with user context for RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // =========================================================================
    // 2. Parse and validate request
    // =========================================================================
    
    const body: FinalizeRequest = await req.json();
    const { lesson_id } = body;

    if (!lesson_id) {
      console.log(`[${requestId}] Missing lesson_id`);
      return new Response(
        JSON.stringify({ error: "Missing required field: lesson_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lesson_id)) {
      console.log(`[${requestId}] Invalid UUID format`);
      return new Response(
        JSON.stringify({ error: "Invalid lesson_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Processing lesson:`, lesson_id);

    // =========================================================================
    // 3. Verify lesson exists and user owns it
    // =========================================================================
    
    const { data: lesson, error: lessonError } = await supabaseClient
      .from("lessons")
      .select("id, user_id")
      .eq("id", lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error(`[${requestId}] Lesson not found:`, lessonError);
      return new Response(
        JSON.stringify({ error: "Lesson not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Lesson verified`);

    // =========================================================================
    // 4. Load notes_raw_text
    // =========================================================================
    
    const { data: notes, error: notesError } = await supabaseClient
      .from("lesson_outputs")
      .select("id, notes_raw_text, notes_final_text")
      .eq("lesson_id", lesson_id)
      .eq("type", "notes")
      .maybeSingle();

    if (notesError) {
      console.error(`[${requestId}] Error loading notes:`, notesError);
      return new Response(
        JSON.stringify({ error: "Failed to load notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no notes exist, return error
    if (!notes || !notes.notes_raw_text) {
      console.log(`[${requestId}] No raw notes found`);
      return new Response(
        JSON.stringify({ error: "No raw notes found for this lesson. Record a session first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Raw notes loaded: ${notes.notes_raw_text.length} chars`);

    // =========================================================================
    // 5. Truncate if needed (hard cap at 50k chars)
    // =========================================================================
    
    let rawText = notes.notes_raw_text;
    let truncated = false;

    if (rawText.length > MAX_INPUT_CHARS) {
      console.log(`[${requestId}] Truncating from ${rawText.length} to ${MAX_INPUT_CHARS} chars`);
      rawText = rawText.slice(-MAX_INPUT_CHARS); // Keep last 50k chars
      truncated = true;
    }

    // =========================================================================
    // 6. Call Gemini to generate structured notes
    // =========================================================================
    
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Calling Gemini API...`);

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3, // More deterministic
        maxOutputTokens: 3072, // Increased for comprehensive format
      },
    });

    const prompt = `${SYSTEM_PROMPT}\n\n${USER_PROMPT_TEMPLATE(rawText)}`;

    let finalNotesText: string;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      finalNotesText = response.text();

      console.log(`[${requestId}] Gemini response received: ${finalNotesText.length} chars`);

      if (!finalNotesText || finalNotesText.trim().length === 0) {
        throw new Error("Empty response from Gemini");
      }
    } catch (geminiError) {
      console.error(`[${requestId}] Gemini API error:`, geminiError);
      
      // Fallback: return basic formatted version
      console.log(`[${requestId}] Using fallback: basic formatting`);
      finalNotesText = `Lecture Notes

Topic: Not specified
Date: Not specified
Duration: Not specified

Key Takeaways

This lecture covered the following content. Please note: These notes were automatically formatted without AI processing due to a temporary service issue.

Raw Notes

${rawText}`;
    }

    // =========================================================================
    // 7. Save to notes_final_text
    // =========================================================================
    
    const { error: updateError } = await supabaseClient
      .from("lesson_outputs")
      .update({
        notes_final_text: finalNotesText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notes.id);

    if (updateError) {
      console.error(`[${requestId}] Error saving final notes:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save final notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Final notes saved to lesson_outputs`);

    // =========================================================================
    // 8. Save notes as asset file to Supabase Storage
    // =========================================================================
    
    try {
      console.log(`[${requestId}] Uploading notes to storage...`);

      // Create filename: notes_[lesson_id]_[timestamp].txt
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `notes_${lesson_id}_${timestamp}.txt`;
      const storagePath = `${user.id}/${lesson_id}/${filename}`;

      // Convert text to Uint8Array for upload
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(finalNotesText);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('lesson-assets')
        .upload(storagePath, textBytes, {
          contentType: 'text/plain',
          upsert: true,
        });

      if (uploadError) {
        console.error(`[${requestId}] Storage upload error:`, uploadError);
        // Non-fatal - continue even if storage fails
      } else {
        console.log(`[${requestId}] Notes uploaded to storage: ${storagePath}`);

        // Create lesson_assets record
        const { error: assetError } = await supabaseClient
          .from('lesson_assets')
          .insert({
            lesson_id: lesson_id,
            user_id: user.id,
            kind: 'notes',
            storage_bucket: 'lesson-assets',
            storage_path: storagePath,
            mime_type: 'text/plain',
          });

        if (assetError) {
          console.error(`[${requestId}] Asset record creation error:`, assetError);
          // Non-fatal - notes are still in lesson_outputs
        } else {
          console.log(`[${requestId}] Asset record created for notes`);
        }
      }
    } catch (storageError) {
      console.error(`[${requestId}] Storage/asset error:`, storageError);
      // Non-fatal - primary save to lesson_outputs succeeded
    }

    // =========================================================================
    // 9. Return response
    // =========================================================================
    
    return new Response(
      JSON.stringify({
        lesson_id,
        notes_final_text: finalNotesText,
        input_chars: rawText.length,
        truncated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
