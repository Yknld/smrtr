// ============================================================================
// Edge Function: notes_append_from_asset
// ============================================================================
//
// Purpose: When a new file is dropped into the lesson assets folder (web or
// mobile), extract all text from it (OCR-style via Gemini) and append that
// text to the lesson's single notes document (lesson_outputs type=notes).
// That notes file is then used by all generations (flashcards, quiz, podcast).
//
// - Text files: appended as-is (truncated if very long).
// - Images / PDF / Office: Gemini extracts text (preserve structure), then append.
// - PPTX: text extracted from slide XML (Gemini does not support PPTX MIME). Large PPTX chunked by slides, each chunk extracted the same way.
//
// Request:
//   POST /notes_append_from_asset
//   Headers: Authorization: Bearer <user_token> (required for images path)
//   Body (one of):
//     - { lesson_id, asset_id }: download asset from storage, extract text (or use Files API for PPTX).
//     - { lesson_id, images: [{ data: base64, mimeType }], display_name? }: extract from PNGs (e.g. PDF→PNG in app), append to notes.
//
// Response:
//   { ok: true, appended_length: number, notes_preview: string }
//   or { error: string }
//
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_CHARS = 28000;
/** Gemini has practical limits; large PDFs/images often fail. Cap at 3MB per inline file. */
const MAX_SUMMARIZE_BYTES = 3 * 1024 * 1024;
const BUCKET = "lesson-assets";

/** Office/slide formats we can split into smaller chunks (by slide/section/page) and summarize each. */
const CHUNKABLE_MIMES: Record<string, "pptx" | "docx" | "pdf"> = {
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/pdf": "pdf",
};
/** Target size per chunk so we stay under Gemini inline limit (theme/masters add overhead). */
const CHUNK_TARGET_BYTES = Math.floor(1.5 * 1024 * 1024);
/** Max slides per PPTX chunk to avoid oversized payloads. */
const MAX_SLIDES_PER_CHUNK = 12;

/** Gemini inline API does not support PPTX MIME; use Files API upload and fileData. */
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const GEMINI_UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";

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

/** Topic from first file: display name without extension, cleaned for readability. */
function topicFromDisplayName(displayName: string): string {
  const name = (displayName || "file").trim();
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  return base.replace(/[-_]+/g, " ").trim() || "Not specified";
}

/** Format a date for the header (YYYY-MM-DD or locale string). */
function formatHeaderDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Not specified";
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "Not specified";
    return d.toISOString().slice(0, 10);
  } catch {
    return "Not specified";
  }
}

/** Build the notes header: lesson name and created date only (one call per lesson). */
function buildNotesHeader(opts: { lessonTitle: string; date: string }): string {
  return `Topic: ${opts.lessonTitle}
Date: ${opts.date}`;
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

/**
 * Upload a file to Gemini Files API. Returns { uri, mimeType } for use in generateContent with fileData.
 * Required for PPTX because inline data does not support that MIME type.
 */
async function uploadFileToGemini(
  apiKey: string,
  blob: Uint8Array,
  mimeType: string,
  displayName: string
): Promise<{ uri: string; mimeType: string }> {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({ file: { display_name: displayName } })], {
      type: "application/json",
    })
  );
  form.append("file", new Blob([blob], { type: mimeType }), displayName || "part.pptx");

  const url = `${GEMINI_UPLOAD_URL}?uploadType=multipart&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini file upload failed ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    file?: { uri?: string; name?: string; mimeType?: string };
  };
  const file = json?.file;
  if (!file) throw new Error("Gemini upload response missing file");
  const uri =
    file.uri ||
    (file.name ? `https://generativelanguage.googleapis.com/v1beta/${file.name}` : null);
  if (!uri) throw new Error("Gemini upload response missing file.uri or file.name");
  return { uri, mimeType: file.mimeType || mimeType };
}

/** Call Gemini generateContent via REST with a file reference (SDK may not support fileData). */
async function generateContentWithFileUri(
  apiKey: string,
  modelId: string,
  prompt: string,
  fileUri: string,
  mimeType: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { fileData: { fileUri, mimeType } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini generateContent failed ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return typeof text === "string" ? text : "";
}

// ---------------------------------------------------------------------------
// Chunking: split large office docs (PPTX, DOCX, PDF) into sub-files under 3MB
// so each chunk can be sent to Gemini with images/formatting preserved.
// ---------------------------------------------------------------------------

type ChunkableFormat = "pptx" | "docx" | "pdf";

interface OfficeChunk {
  blob: Uint8Array;
  mime: string;
  partLabel: string;
}

/**
 * Extract all text from a PPTX file by reading slide XML (a:t nodes).
 * Use this for PPTX instead of Gemini, since Gemini does not support PPTX MIME even via Files API.
 */
async function extractTextFromPptx(arr: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(arr);
  const slides = await getPptxSlideList(zip);
  const parts: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slidePath = slides[i].path;
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;
    const xml = await slideFile.async("string");
    // OOXML text runs: <a:t>text</a:t>
    const textRuns = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1].trim()).filter(Boolean);
    const slideText = textRuns.join(" ").trim();
    if (slideText) parts.push(slides.length > 1 ? `=== Slide ${i + 1} ===\n\n${slideText}` : slideText);
  }
  return parts.join("\n\n");
}

/** Returns ordered slide paths (e.g. ppt/slides/slide1.xml) and approximate byte size per slide. */
async function getPptxSlideList(
  zip: JSZip
): Promise<{ path: string; size: number }[]> {
  const presPath = "ppt/presentation.xml";
  const relsPath = "ppt/_rels/presentation.xml.rels";
  const presFile = zip.file(presPath);
  const relsFile = zip.file(relsPath);
  if (!presFile || !relsFile) return [];

  const presXml = await presFile.async("string");
  const relsXml = await relsFile.async("string");

  // Slide order: <p:sldId ... r:id="rId2"/> (order of rIds = order of slides)
  const rIdOrder = [...presXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]);

  // Map rId -> target path (normalize to no leading ./ or ../)
  const rIdToTarget = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\s+Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    let target = m[2].replace(/^\.\.\//, "").replace(/^\//, "");
    if (target.startsWith("slides/")) target = "ppt/" + target;
    rIdToTarget.set(m[1], target);
  }

  const slidePaths: string[] = [];
  for (const rId of rIdOrder) {
    const t = rIdToTarget.get(rId);
    if (t && /slides\/slide\d+\.xml$/i.test(t)) slidePaths.push(t);
  }

  const result: { path: string; size: number }[] = [];
  for (const path of slidePaths) {
    let size = 0;
    const slideFile = zip.file(path);
    if (slideFile) size += (await slideFile.async("uint8array")).length;
    const slideRelsPath = path + ".rels";
    const slideRels = zip.file(slideRelsPath);
    if (slideRels) size += (await slideRels.async("uint8array")).length;
    // Media referenced by this slide (slideN.xml.rels -> Target="../media/image1.png")
    if (slideRels) {
      const relsStr = await slideRels.async("string");
      for (const mm of relsStr.matchAll(/Target="([^"]+)"/g)) {
        let mediaPath = mm[1].replace(/^\.\.\//, "").replace(/^\//, "");
        if (mediaPath.startsWith("media/")) mediaPath = "ppt/" + mediaPath;
        const mediaFile = zip.file(mediaPath);
        if (mediaFile) size += (await mediaFile.async("uint8array")).length;
      }
    }
    result.push({ path, size });
  }
  return result;
}

/** Collect media paths referenced by the given slide paths (from their .rels). */
async function getMediaRefsForSlides(zip: JSZip, slidePaths: string[]): Promise<Set<string>> {
  const media = new Set<string>();
  for (const slidePath of slidePaths) {
    const relsPath = slidePath + ".rels";
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;
    const relsStr = await relsFile.async("string");
    for (const m of relsStr.matchAll(/Target="([^"]+)"/g)) {
      let p = m[1].replace(/^\.\.\//, "").replace(/^\//, "");
      if (p.startsWith("media/")) p = "ppt/" + p;
      if (p.startsWith("ppt/")) media.add(p);
    }
  }
  return media;
}

/** Build a sub-PPTX zip containing only the given slide paths (preserves images and layout). */
async function buildPptxChunk(
  originalZip: JSZip,
  slidePathsToKeep: string[]
): Promise<Uint8Array> {
  const keepSet = new Set(slidePathsToKeep);
  const mediaToKeep = await getMediaRefsForSlides(originalZip, slidePathsToKeep);
  const newZip = new JSZip();

  const presPath = "ppt/presentation.xml";
  const relsPath = "ppt/_rels/presentation.xml.rels";
  const contentTypesPath = "[Content_Types].xml";

  type ZipEntry = { dir?: boolean; async: (format: string) => Promise<Uint8Array> };
  for (const [path, file] of Object.entries(originalZip.files) as [string, ZipEntry][]) {
    if (file.dir) continue;
    if (path === presPath || path === relsPath || path === contentTypesPath) continue;
    const isSlide = /^ppt\/slides\/slide\d+\.xml$/i.test(path);
    const isSlideRels = /^ppt\/slides\/slide\d+\.xml\.rels$/i.test(path);
    const slideNum = path.match(/slide(\d+)\.xml/)?.[1];
    const slidePath = slideNum ? `ppt/slides/slide${slideNum}.xml` : "";
    const keepSlide = slidePath && keepSet.has(slidePath);
    if (isSlide && !keepSet.has(path)) continue;
    if (isSlideRels && !keepSlide) continue;
    if (path.startsWith("ppt/media/") && !mediaToKeep.has(path)) continue;
    newZip.file(path, file.async("uint8array"), { binary: true });
  }

  // Rewrite presentation.xml: keep only sldId entries for kept slides
  const presFile = originalZip.file(presPath);
  const relsFile = originalZip.file(relsPath);
  const ctFile = originalZip.file(contentTypesPath);
  if (!presFile || !relsFile || !ctFile) throw new Error("Missing PPTX core files");

  const presXml = await presFile.async("string");
  const relsXml = await relsFile.async("string");
  const ctXml = await ctFile.async("string");

  // rIds for kept slides (from presentation.xml.rels: Target slides/slideN.xml)
  const rIdsToKeep = new Set<string>();
  for (const m of relsXml.matchAll(/<Relationship\s+Id="([^"]+)"[^>]*Target="[^"]*slides\/slide(\d+)\.xml"/gi)) {
    const slidePath = `ppt/slides/slide${m[2]}.xml`;
    if (keepSet.has(slidePath)) rIdsToKeep.add(m[1]);
  }

  const newPres = presXml.replace(
    /<p:sldId\b[^>]*\br:id="([^"]+)"[^>]*\/>/g,
    (match, rId) => (rIdsToKeep.has(rId) ? match : "")
  ).replace(/(\s*\n){3,}/g, "\n\n");
  newZip.file(presPath, newPres);

  // Rewrite rels: keep non-slide rels + rels for kept slides
  const relLines = relsXml.split(/\r?\n/);
  const newRelsLines = relLines.filter((line) => {
    const idMatch = line.match(/Id="([^"]+)"/);
    const targetMatch = line.match(/Target="([^"]+)"/);
    if (!targetMatch) return true;
    const target = targetMatch[1];
    if (!/slides\/slide\d+\.xml$/i.test(target)) return true;
    const rId = idMatch?.[1];
    return rId && rIdsToKeep.has(rId);
  });
  newZip.file(relsPath, newRelsLines.join("\n"));

  // Content_Types: remove Override for slides we dropped
  const newCt = ctXml.replace(
    /<Override\s+PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>\s*/gi,
    (match) => {
      const partMatch = match.match(/PartName="\/ppt\/slides\/slide(\d+)\.xml"/i);
      const slidePath = partMatch ? `ppt/slides/slide${partMatch[1]}.xml` : "";
      return keepSet.has(slidePath) ? match : "";
    }
  );
  newZip.file(contentTypesPath, newCt.replace(/\n\n+/g, "\n"));

  return new Uint8Array(await newZip.generateAsync({ type: "uint8array" }));
}

/** Split a PPTX into chunks under CHUNK_TARGET_BYTES. */
async function chunkPptx(arr: Uint8Array): Promise<OfficeChunk[]> {
  const zip = await JSZip.loadAsync(arr);
  const slides = await getPptxSlideList(zip);
  if (slides.length === 0) return [];

  const chunks: OfficeChunk[] = [];
  let batch: string[] = [];
  let batchSize = 0;
  let slideStart = 1;

  for (const { path, size } of slides) {
    const wouldExceedBytes = batch.length > 0 && batchSize + size > CHUNK_TARGET_BYTES;
    const wouldExceedSlides = batch.length >= MAX_SLIDES_PER_CHUNK;
    if (batch.length > 0 && (wouldExceedBytes || wouldExceedSlides)) {
      const blob = await buildPptxChunk(zip, batch);
      if (blob.length <= MAX_SUMMARIZE_BYTES) {
        chunks.push({
          blob,
          mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          partLabel: `slides ${slideStart}-${slideStart + batch.length - 1}`,
        });
      } else {
        const half = Math.ceil(batch.length / 2);
        const [b1, b2] = [batch.slice(0, half), batch.slice(half)];
        for (const b of [b1, b2].filter((x) => x.length > 0)) {
          const subBlob = await buildPptxChunk(zip, b);
          if (subBlob.length <= MAX_SUMMARIZE_BYTES) {
            chunks.push({
              blob: subBlob,
              mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              partLabel: `slides ${slideStart}-${slideStart + b.length - 1}`,
            });
          }
          slideStart += b.length;
        }
      }
      if (blob.length <= MAX_SUMMARIZE_BYTES) slideStart += batch.length;
      batch = [];
      batchSize = 0;
    }
    batch.push(path);
    batchSize += size;
  }
  if (batch.length > 0) {
    const blob = await buildPptxChunk(zip, batch);
    if (blob.length <= MAX_SUMMARIZE_BYTES) {
      chunks.push({
        blob,
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        partLabel: `slides ${slideStart}-${slideStart + batch.length - 1}`,
      });
    } else {
      const half = Math.ceil(batch.length / 2);
      const [b1, b2] = [batch.slice(0, half), batch.slice(half)];
      for (const b of [b1, b2].filter((x) => x.length > 0)) {
        const subBlob = await buildPptxChunk(zip, b);
        if (subBlob.length <= MAX_SUMMARIZE_BYTES) {
          chunks.push({
            blob: subBlob,
            mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            partLabel: `slides ${slideStart}-${slideStart + b.length - 1}`,
          });
        }
        slideStart += b.length;
      }
    }
  }
  return chunks;
}

/** Split DOCX into chunks (e.g. by section or fixed page count). TODO: implement via unzip + split word/document.xml + rebuild. */
async function chunkDocx(_arr: Uint8Array): Promise<OfficeChunk[]> {
  return [];
}

/** Split PDF into chunks by page range. TODO: implement via pdf-lib or similar to extract page ranges. */
async function chunkPdf(_arr: Uint8Array): Promise<OfficeChunk[]> {
  return [];
}

async function chunkOfficeFile(
  arr: Uint8Array,
  format: ChunkableFormat
): Promise<OfficeChunk[]> {
  switch (format) {
    case "pptx":
      return chunkPptx(arr);
    case "docx":
      return chunkDocx(arr);
    case "pdf":
      return chunkPdf(arr);
    default:
      return [];
  }
}

/** Default header when lesson fetch fails. */
const NOTES_HEADER_FALLBACK = buildNotesHeader({
  lessonTitle: "Not specified",
  date: "Not specified",
});

/** OCR-style extraction: get all text from the asset for use in notes, flashcards, quiz, etc. */
const EXTRACT_TEXT_PROMPT = `Extract all text from this document or image exactly as it appears. Preserve structure, line breaks, and reading order. Include headings, bullet points, and body text. Output plain text only—no markdown, no commentary, no "Here is the text:" preamble. If it is one part of a larger document, extract only this part's text.`;

/** Same instruction for a single full file (not a chunk). */
const EXTRACT_TEXT_PROMPT_SINGLE = `Extract all text from this document or image exactly as it appears. Preserve structure, line breaks, and reading order. Include headings, bullet points, and body text. Output plain text only—no markdown, no commentary, no preamble.`;

/** Turn raw slide transcript (e.g. from PPTX XML) into proper study notes. */
const CONVERT_TO_STUDY_NOTES_PROMPT = `You are given raw text extracted from presentation slides (often with "=== Slide N ===" headers). Convert it into clear, structured study notes.

- Remove slide numbers and "Slide N" headers.
- Merge fragmented sentences and bullet points into coherent paragraphs or bullet lists where appropriate.
- Keep key concepts, definitions, steps, and conclusions. Use headings or bold for main ideas if it helps clarity.
- Do not add filler or commentary. Output concise notes suitable for studying and for generating flashcards/quiz later.
- Plain text only; no markdown code blocks or "Here are the notes:" preamble.`;

/** Max chars of raw transcript to send to Gemini for notes conversion (avoid token limits). */
const MAX_RAW_FOR_NOTES_CONVERSION = 24000;

/**
 * Call Gemini to convert raw slide/document transcript into study notes. Returns converted text, or raw on failure.
 */
async function convertTranscriptToStudyNotes(
  apiKey: string,
  rawText: string,
  requestId: string
): Promise<string> {
  const text = rawText.trim();
  if (!text) return rawText;
  const toSend = text.length > MAX_RAW_FOR_NOTES_CONVERSION
    ? text.slice(0, MAX_RAW_FOR_NOTES_CONVERSION) + "\n\n[Content truncated for length.]"
    : text;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    });
    const result = await model.generateContent([
      { text: CONVERT_TO_STUDY_NOTES_PROMPT },
      { text: `Raw content:\n\n${toSend}` },
    ]);
    const out = result.response.text();
    const notes = stripGeminiResponse(typeof out === "string" ? out : "");
    return notes || rawText;
  } catch (e) {
    console.error(`[${requestId}] Convert to study notes failed:`, e);
    return rawText;
  }
}

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
    const imagesPayload = Array.isArray(body?.images) ? body.images : null;
    const displayNameFromBody = typeof body?.display_name === "string" ? body.display_name.trim() : "document";

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // --- Path 1: images[] (e.g. PNGs from PDF/slides converted in app) ---
    if (imagesPayload?.length > 0) {
      if (!lesson_id || !uuidRegex.test(lesson_id)) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid lesson_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const authHeaderForImages = req.headers.get("Authorization");
      const jwtForImages = authHeaderForImages?.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwtForImages ?? "");
      if (userError || !user?.id) {
        return new Response(
          JSON.stringify({ error: "Authorization required for images upload" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: lesson } = await supabaseAdmin.from("lessons").select("title, created_at").eq("id", lesson_id).single();
      const lessonTitle = lesson?.title?.trim() || "Not specified";
      const lessonCreatedDate = formatHeaderDate(lesson?.created_at);
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) {
        return new Response(
          JSON.stringify({ error: "GEMINI_API_KEY not set" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      });
      const extractPrompt = "Extract all text from this image exactly as it appears. Preserve line breaks and structure. Output plain text only, no markdown or commentary.";
      const parts: string[] = [];
      for (let i = 0; i < imagesPayload.length; i++) {
        const item = imagesPayload[i];
        const data = item?.data;
        const mimeType = (item?.mimeType || "image/png").toLowerCase();
        if (!data || typeof data !== "string") continue;
        try {
          const result = await model.generateContent([
            { text: imagesPayload.length > 1 ? `${extractPrompt} (This is page ${i + 1} of ${imagesPayload.length}.)` : extractPrompt },
            { inlineData: { mimeType, data } },
          ]);
          const raw = result.response.text();
          const text = stripGeminiResponse(typeof raw === "string" ? raw : "");
          if (text) parts.push(imagesPayload.length > 1 ? `=== Page ${i + 1} ===\n\n${text}` : text);
        } catch (err) {
          console.error(`[${requestId}] Image ${i + 1} extraction failed:`, err);
          parts.push(`[Page ${i + 1}: extraction failed.]`);
        }
      }
      const textToAppend = parts.join("\n\n");
      if (!textToAppend.trim()) {
        return new Response(
          JSON.stringify({ error: "No text could be extracted from the images" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const displayName = displayNameFromBody || "document";
      const assetSection = `\n\n--- Content from ${displayName} ---\n\n${textToAppend.trim()}\n`;
      let { data: notes, error: notesError } = await supabaseAdmin
        .from("lesson_outputs")
        .select("id, notes_raw_text")
        .eq("lesson_id", lesson_id)
        .eq("type", "notes")
        .maybeSingle();
      if (notesError) {
        return new Response(JSON.stringify({ error: "Failed to load notes" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!notes) {
        const header = buildNotesHeader({ lessonTitle, date: lessonCreatedDate });
        const initialContent = `${header}${assetSection}`;
        const { error: createError } = await supabaseAdmin.from("lesson_outputs").insert({
          user_id: user.id,
          lesson_id,
          type: "notes",
          status: "ready",
          content_json: {},
          notes_raw_text: initialContent,
          notes_final_text: null,
          last_committed_seq: 0,
        });
        if (createError) {
          return new Response(JSON.stringify({ error: "Failed to create notes" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ ok: true, appended_length: initialContent.length, notes_preview: initialContent.slice(-800) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const currentText = notes.notes_raw_text || "";
      const headerForEmpty = buildNotesHeader({ lessonTitle, date: lessonCreatedDate });
      const newText = currentText.trim() === "" ? `${headerForEmpty}${assetSection}` : currentText + assetSection;
      const { error: updateError } = await supabaseAdmin.from("lesson_outputs").update({
        notes_raw_text: newText,
        notes_final_text: null,
        updated_at: new Date().toISOString(),
      }).eq("id", notes.id);
      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update notes" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, appended_length: assetSection.length, notes_preview: newText.slice(-800) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Path 2: asset_id (download file from storage, then extract/summarize) ---
    if (!lesson_id || !asset_id) {
      return new Response(
        JSON.stringify({ error: "Missing lesson_id or asset_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!uuidRegex.test(lesson_id) || !uuidRegex.test(asset_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid lesson_id or asset_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lessonForAsset } = await supabaseAdmin.from("lessons").select("title, created_at").eq("id", lesson_id).single();
    const lessonTitleAsset = lessonForAsset?.title?.trim() || "Not specified";
    const lessonCreatedDateAsset = formatHeaderDate(lessonForAsset?.created_at);

    const { data: asset, error: assetError } = await supabaseAdmin
      .from("lesson_assets")
      .select("id, lesson_id, user_id, storage_bucket, storage_path, mime_type, kind, created_at")
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
      const geminiKey = Deno.env.get("GEMINI_API_KEY");

      const format = CHUNKABLE_MIMES[mime];
      const isOverLimit = fileSize > MAX_SUMMARIZE_BYTES;
      const canChunk = isOverLimit && format && geminiKey;

      if (canChunk) {
        try {
          const officeChunks = await chunkOfficeFile(arr, format);
          if (officeChunks.length > 0) {
            console.log(`[${requestId}] Chunked ${displayName} into ${officeChunks.length} parts`);
            const parts: string[] = [];
            const usePptxXmlExtract = format === "pptx"; // Gemini does not support PPTX MIME; extract text from slide XML
            if (usePptxXmlExtract) {
              for (let i = 0; i < officeChunks.length; i++) {
                const { blob, partLabel } = officeChunks[i];
                try {
                  const chunkText = await extractTextFromPptx(blob);
                  if (chunkText) parts.push(`[Part: ${partLabel}]\n\n${chunkText}`);
                  else parts.push(`[Part: ${partLabel} — no text in slides.]`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  console.error(`[${requestId}] Chunk ${i + 1} (${partLabel}) PPTX extract failed:`, msg);
                  parts.push(`[Part: ${partLabel} — extraction failed.]`);
                }
              }
              const rawChunked = parts.join("\n\n");
              textToAppend = geminiKey
                ? await convertTranscriptToStudyNotes(geminiKey, rawChunked, requestId)
                : rawChunked;
            } else {
              const genAI = new GoogleGenerativeAI(geminiKey!);
              const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
              });
              const prompt = `${EXTRACT_TEXT_PROMPT} (This is one part of ${displayName}.)`;
              for (let i = 0; i < officeChunks.length; i++) {
                const { blob, mime: chunkMime, partLabel } = officeChunks[i];
                try {
                  if (blob.length > MAX_SUMMARIZE_BYTES) {
                    console.error(`[${requestId}] Chunk ${i + 1} (${partLabel}) over size limit: ${(blob.length / 1024 / 1024).toFixed(2)}MB`);
                    parts.push(`[Part: ${partLabel} — skipped: chunk over 3MB.]`);
                  } else {
                    let binary = "";
                    const step = 8192;
                    for (let j = 0; j < blob.length; j += step) {
                      binary += String.fromCharCode(...blob.subarray(j, j + step));
                    }
                    const base64 = btoa(binary);
                    const result = await model.generateContent([
                      { text: prompt },
                      { inlineData: { mimeType: chunkMime, data: base64 } },
                    ]);
                    const rawText = result.response.text();
                    const summary = stripGeminiResponse(typeof rawText === "string" ? rawText : "");
                    if (summary) parts.push(`[Part: ${partLabel}]\n\n${summary}`);
                    else parts.push(`[Part: ${partLabel} — no content extracted.]`);
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  console.error(`[${requestId}] Chunk ${i + 1} (${partLabel}) summarization failed:`, msg);
                  const hint = msg.includes("429") || msg.includes("quota") ? " (rate limit)" : msg.includes("413") || msg.includes("too large") ? " (too large)" : "";
                  parts.push(`[Part: ${partLabel} — summarization failed${hint}.]`);
                }
              }
              textToAppend = parts.join("\n\n");
            }
          }
        } catch (chunkErr) {
          console.error(`[${requestId}] Chunking failed:`, chunkErr);
        }
      }

      if (!textToAppend && isOverLimit) {
        textToAppend = `[Content from ${displayName}: file too large to summarize (${(fileSize / 1024 / 1024).toFixed(1)}MB). Use a file under 3MB or add a text summary manually.]`;
      }

      if (!textToAppend) {
        const isPptx = mime === PPTX_MIME || mime === "application/vnd.ms-powerpoint";
        if (isPptx) {
          try {
            let raw = await extractTextFromPptx(arr);
            if (!raw?.trim()) {
              textToAppend = `[Content from ${displayName}: no text found in slides.]`;
            } else {
              const geminiKeyPptx = Deno.env.get("GEMINI_API_KEY");
              textToAppend = geminiKeyPptx
                ? await convertTranscriptToStudyNotes(geminiKeyPptx, raw, requestId)
                : raw;
            }
          } catch (e) {
            console.error(`[${requestId}] PPTX text extraction failed:`, e);
            textToAppend = `[Content from ${displayName}: failed to extract text from presentation.]`;
          }
        } else {
          const geminiKeyForSingle = Deno.env.get("GEMINI_API_KEY");
          if (!geminiKeyForSingle) {
            console.error(`[${requestId}] GEMINI_API_KEY not set`);
            textToAppend = `[Content from ${displayName}: AI extraction not configured (set GEMINI_API_KEY).]`;
          } else {
            const prompt = EXTRACT_TEXT_PROMPT_SINGLE;
            try {
              let binary = "";
              const chunk = 8192;
              for (let i = 0; i < arr.length; i += chunk) {
                binary += String.fromCharCode(...arr.subarray(i, i + chunk));
              }
              const base64 = btoa(binary);
              const safeMime = mime || "application/octet-stream";
              const genAI = new GoogleGenerativeAI(geminiKeyForSingle);
              const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
              });
              const result = await model.generateContent([
                { text: prompt },
                { inlineData: { mimeType: safeMime, data: base64 } },
              ]);
              const rawText = result.response.text();
              const summary = stripGeminiResponse(typeof rawText === "string" ? rawText : "");
              if (!summary) {
                textToAppend = `[Content from ${displayName}: no text could be extracted.]`;
              } else {
                textToAppend = summary;
              }
            } catch (geminiErr: unknown) {
            const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
            console.error(`[${requestId}] Gemini extraction failed:`, errMsg);
            const hint = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("exhausted")
              ? " (quota or rate limit; try again later)"
              : errMsg.includes("invalid") || errMsg.includes("400") || errMsg.includes("Unsupported MIME")
              ? " (file format may not be supported inline; try smaller file)"
              : "";
            textToAppend = `[Content from ${displayName}: extraction failed${hint}.]`;
          }
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
      const header = buildNotesHeader({ lessonTitle: lessonTitleAsset, date: lessonCreatedDateAsset });
      const initialContent = `${header}\n\n--- Content from ${displayName} ---\n\n${textToAppend.trim()}\n`;
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
    const headerForEmpty = buildNotesHeader({ lessonTitle: lessonTitleAsset, date: lessonCreatedDateAsset });
    const newText = currentText.trim() === ""
      ? `${headerForEmpty}\n\n--- Content from ${displayName} ---\n\n${textToAppend.trim()}\n`
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
