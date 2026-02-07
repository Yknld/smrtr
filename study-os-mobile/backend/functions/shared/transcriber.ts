// ============================================================================
// Transcriber Wrapper
// ============================================================================
// 
// Purpose: Abstract transcription service (currently Gemini)
// Allows swapping providers without changing edge function code
// 
// ============================================================================

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

/**
 * Transcribe audio buffer to text
 * 
 * @param audioBuffer - Audio file as ArrayBuffer
 * @param language - Optional language hint (e.g., 'en-US', 'es-ES')
 * @returns TranscriptionResult
 */
export async function transcribe(
  audioBuffer: ArrayBuffer,
  language?: string | null
): Promise<TranscriptionResult> {
  try {
    // Currently using Gemini - can swap to OpenAI Whisper, AssemblyAI, etc.
    return await transcribeWithGemini(audioBuffer, language);
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transcription error",
    };
  }
}

/**
 * Transcribe using Google Gemini
 * 
 * @private
 */
async function transcribeWithGemini(
  audioBuffer: ArrayBuffer,
  language?: string | null
): Promise<TranscriptionResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-3-flash-preview for fast audio transcription (repo standard: only gemini-3-flash-preview / gemini-3-pro-preview)
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  // Convert ArrayBuffer to base64
  const uint8Array = new Uint8Array(audioBuffer);
  const base64Audio = btoa(String.fromCharCode(...uint8Array));

  // Build prompt following docs/backend/ai/gemini/prompts.transcription.md
  let prompt = `Transcribe this audio to text. Output ONLY the transcript text with no commentary or labels.

Rules:
- Minimal punctuation (periods, commas only when needed)
- Preserve exact wording, including filler words and false starts
- Use [inaudible] for unclear audio
- Do not add introductions, summaries, or explanations`;

  if (language) {
    const languageHint = language.split("-")[0]; // Extract base language (en, es, etc.)
    prompt += `\n- Language: ${languageHint}`;
  }

  // Note: Gemini's audio transcription API is still evolving
  // This is a placeholder implementation - adjust based on actual Gemini audio API
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/mp4", // Adjust based on actual audio format
        data: base64Audio,
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: "Empty transcription result",
    };
  }

  // Clean up the text (remove any metadata or formatting)
  const cleanText = text
    .trim()
    .replace(/^(Transcript:|Transcription:)\s*/i, "") // Remove labels
    .replace(/\n+/g, " ") // Normalize newlines to spaces
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();

  return {
    success: true,
    text: cleanText,
    confidence: 0.9, // Gemini doesn't provide confidence scores, use default
  };
}

/**
 * Alternative: Transcribe using OpenAI Whisper (commented out)
 * 
 * Uncomment and modify to swap providers:
 * 
 * async function transcribeWithWhisper(
 *   audioBuffer: ArrayBuffer,
 *   language?: string | null
 * ): Promise<TranscriptionResult> {
 *   const apiKey = Deno.env.get("OPENAI_API_KEY");
 *   if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
 *   
 *   const formData = new FormData();
 *   formData.append("file", new Blob([audioBuffer]), "audio.m4a");
 *   formData.append("model", "whisper-1");
 *   if (language) formData.append("language", language.split("-")[0]);
 *   
 *   const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
 *     method: "POST",
 *     headers: { "Authorization": `Bearer ${apiKey}` },
 *     body: formData,
 *   });
 *   
 *   if (!response.ok) {
 *     return { success: false, error: `Whisper API error: ${response.status}` };
 *   }
 *   
 *   const data = await response.json();
 *   return {
 *     success: true,
 *     text: data.text,
 *     confidence: 0.95,
 *   };
 * }
 */
