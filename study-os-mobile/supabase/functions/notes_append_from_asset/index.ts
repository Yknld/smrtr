// ============================================================================
// Edge Function: notes_append_from_asset
// ============================================================================
//
// Purpose: When a new file is dropped into the lesson assets folder (web or
// mobile), summarize that file and append the summary to the lesson's single
// notes document (lesson_outputs type=notes). That notes file is then used
// by all generations (flashcards, quiz, podcast, etc.).
//
// Request:
//   POST /notes_append_from_asset
//   Headers: Authorization: Bearer <user_token> (optional – deploy with --no-verify-jwt)
//   Body: { lesson_id: string, asset_id: string }
//
// Response:
//   { ok: true, appended_length: number, notes_preview: string }
//   or { error: string }
//
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_CHARS = 28000;
/** Gemini has practical limits; large PDFs/images often fail. Cap at 3MB. */
const MAX_SUMMARIZE_BYTES = 3 * 1024 * 1024;
const BUCKET = "lesson-assets";

const TEXT_MIMES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

const SUMMARIZABLE_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

function filenameFromPath(storagePath: string): string {
  const parts = storagePath.split("/").filter(Boolean);
  return parts[parts.length - 1] || "file";
}

/** Shrink Gemini response: collapse newlines, strip code fences, trim. Keeps stored notes compact. */
function stripGeminiResponse(raw: string): string {
  if (typeof raw !== "string" || !raw.length) return "";
  let s = raw.trim();
  // Remove markdown code fences (optional language tag)
  s = s.replace(/^```[\w]*\s*\n?/gm, "").replace(/\n?```\s*$/gm, "").replace(/\n?```\s*\n/gm, "\n");
  // Collapse 3+ newlines to 2
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** Header shown once at the very top of the notes document (not repeated per asset). */
const NOTES_HEADER_ONCE = `Topic: Not specified
Date: Not specified
Duration: Not specified`;

/** Per-asset content format: no Topic/Date/Duration (those are only at the top once). Same structure as notes_finalize body. */
const ASSET_OUTPUT_FORMAT = `[Title of document or image content]

Key Takeaways

This content focused on [main idea or theme], explaining [why it matters or how it works]. [One cohesive paragraph summarizing the main points.]

Core Concepts

[Concept 1 — Title]

This concept introduces [brief plain-language explanation]. It helps explain [what the concept does or represents].

Key clarification: [important detail or nuance]

Example: [short example or scenario if present]

Why it matters: [reason this concept is important or commonly used]

[Concept 2 — Title]

[Additional concepts as needed, each with Key clarification, Example, Why it matters.]

Examples Explained

[Step-by-step explanation of examples from the content, if any.]

Common Mistakes

[If the content mentions errors or pitfalls:]
• [Mistake 1]
• [Mistake 2]

Definitions

[Term]: [clear, concise definition in simple language]

[Term]: [definition]

---RULES: Use plain text only (no markdown *, **, #). Key Takeaways = one paragraph. Omit sections with no relevant content. Write in the same language as the source.]`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] notes_append_from_asset invoked`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
      if (!error && user) userId = user.id;
    }

    const body = await req.json();
    const lesson_id = body?.lesson_id;
    const asset_id = body?.asset_id;

    if (!lesson_id || !asset_id) {
      return new Response(
        JSON.stringify({ error: "Missing lesson_id or asset_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lesson_id) || !uuidRegex.test(asset_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid lesson_id or asset_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: asset, error: assetError } = await supabaseAdmin
      .from("lesson_assets")
      .select("id, lesson_id, user_id, storage_bucket, storage_path, mime_type, kind")
      .eq("id", asset_id)
      .eq("lesson_id", lesson_id)
      .single();

    if (assetError || !asset) {
      console.error(`[${requestId}] Asset not found:`, assetError?.message);
      return new Response(
        JSON.stringify({ error: "Asset not found or does not belong to this lesson" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId && asset.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bucket = asset.storage_bucket || BUCKET;
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(asset.storage_path);

    if (downloadError || !fileData) {
      console.error(`[${requestId}] Failed to download asset:`, downloadError?.message);
      return new Response(
        JSON.stringify({ error: "Failed to download asset file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mime = (asset.mime_type || "").toLowerCase();
    const kind = (asset.kind || "").toLowerCase();
    const displayName = filenameFromPath(asset.storage_path);

    let textToAppend = "";

    const isText =
      TEXT_MIMES.includes(mime) ||
      kind === "notes" ||
      (kind === "other" && mime.startsWith("text/"));

    if (isText) {
      try {
        const raw = await fileData.text();
        const trimmed = raw?.trim() || "";
        if (trimmed.length > MAX_TEXT_CHARS) {
          textToAppend = trimmed.substring(0, MAX_TEXT_CHARS) + "\n\n[Content truncated for length.]";
        } else {
          textToAppend = trimmed;
        }
      } catch (e) {
        console.error(`[${requestId}] Failed to read text asset:`, e);
        return new Response(
          JSON.stringify({ error: "Failed to read file as text" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (
      SUMMARIZABLE_MIMES.some((x) => mime === x || mime.startsWith("image/"))
    ) {
      const arr = new Uint8Array(await fileData.arrayBuffer());
      const fileSize = arr.length;

      if (fileSize > MAX_SUMMARIZE_BYTES) {
        textToAppend = `[Content from ${displayName}: file too large to summarize (${(fileSize / 1024 / 1024).toFixed(1)}MB). Use a file under 3MB or add a text summary manually.]`;
      } else {
        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) {
          console.error(`[${requestId}] GEMINI_API_KEY not set`);
          textToAppend = `[Content from ${displayName}: AI summarization not configured (set GEMINI_API_KEY).]`;
        } else {
          let binary = "";
          const chunk = 8192;
          for (let i = 0; i < arr.length; i += chunk) {
            binary += String.fromCharCode(...arr.subarray(i, i + chunk));
          }
          const base64 = btoa(binary);
          const safeMime = mime || "application/octet-stream";

          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 3072,
            },
          });

          const prompt = `You are an expert study notes formatter. Convert this document or image into structured study notes that match the same format used for lecture transcription notes.

Output MUST follow this EXACT format (plain text only, no markdown *, **, #):

${ASSET_OUTPUT_FORMAT}

Extract content from the document/image and fill in each section. Omit any section that has no relevant content. Keep the content accurate to the source. Do not add a preamble like "Summary:" or "Here is the summary." — start directly with the title line.`;

          try {
            const result = await model.generateContent([
              { text: prompt },
              { inlineData: { mimeType: safeMime, data: base64 } },
            ]);
            const response = result.response;
            const rawText = response.text();
            const summary = stripGeminiResponse(typeof rawText === "string" ? rawText : "");
            if (!summary) {
              textToAppend = `[Content from ${displayName}: no text could be extracted.]`;
            } else {
              textToAppend = summary;
            }
          } catch (geminiErr: unknown) {
            const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
            console.error(`[${requestId}] Gemini summarization failed:`, errMsg);
            const hint = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("exhausted")
              ? " (quota or rate limit; try again later or use a smaller file)"
              : errMsg.includes("invalid") || errMsg.includes("400")
              ? " (file format or size may not be supported)"
              : "";
            textToAppend = `[Content from ${displayName}: summarization failed${hint}.]`;
          }
        }
      }
    } else {
      console.log(`[${requestId}] Unsupported asset type: ${mime} / ${kind}`);
      return new Response(
        JSON.stringify({ error: "Unsupported file type for notes. Use text, PDF, or images." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!textToAppend || !textToAppend.trim()) {
      return new Response(
        JSON.stringify({ error: "No content to append from this file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assetSection = `\n\n--- Content from ${displayName} ---\n\n${textToAppend.trim()}\n`;

    let { data: notes, error: notesError } = await supabaseAdmin
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

    if (!notes) {
      const initialContent = `${NOTES_HEADER_ONCE}\n\n--- Content from ${displayName} ---\n\n${textToAppend.trim()}\n`;
      const { data: newNotes, error: createError } = await supabaseAdmin
        .from("lesson_outputs")
        .insert({
          user_id: asset.user_id,
          lesson_id,
          type: "notes",
          status: "ready",
          content_json: {},
          notes_raw_text: initialContent,
          notes_final_text: null,
          last_committed_seq: 0,
        })
        .select("id, notes_raw_text")
        .single();

      if (createError || !newNotes) {
        console.error(`[${requestId}] Error creating notes:`, createError);
        return new Response(
          JSON.stringify({ error: "Failed to create notes document" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[${requestId}] Created notes with header and first asset for lesson ${lesson_id}`);
      return new Response(
        JSON.stringify({
          ok: true,
          appended_length: initialContent.length,
          notes_preview: initialContent.slice(-800),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentText = notes.notes_raw_text || "";
    const newText = currentText.trim() === ""
      ? `${NOTES_HEADER_ONCE}\n\n--- Content from ${displayName} ---\n\n${textToAppend.trim()}\n`
      : currentText + assetSection;

    const { error: updateError } = await supabaseAdmin
      .from("lesson_outputs")
      .update({
        notes_raw_text: newText,
        notes_final_text: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notes.id);

    if (updateError) {
      console.error(`[${requestId}] Error updating notes:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Appended ${assetSection.length} chars to notes for lesson ${lesson_id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        appended_length: assetSection.length,
        notes_preview: newText.slice(-800),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
