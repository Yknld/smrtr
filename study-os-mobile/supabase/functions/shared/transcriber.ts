// ============================================================================
// Transcriber Wrapper
// ============================================================================
// 
// Purpose: Abstract transcription service (OpenAI Whisper)
// Allows swapping providers without changing edge function code
// 
// ============================================================================

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
    // Use OpenAI Whisper for audio file transcription
    return await transcribeWithWhisper(audioBuffer, language);
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transcription error",
    };
  }
}

/**
 * Transcribe using OpenAI Whisper API
 * 
 * @private
 */
async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  language?: string | null
): Promise<TranscriptionResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured in Supabase secrets");
  }

  // Create FormData for multipart upload
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: "audio/m4a" });
  formData.append("file", audioBlob, "audio.m4a");
  formData.append("model", "whisper-1");
  
  // Optional language hint
  if (language) {
    const languageCode = language.split("-")[0]; // Extract 'en' from 'en-US'
    formData.append("language", languageCode);
  }

  // Optional: Add prompt for better transcription
  formData.append("prompt", "Transcribe the following audio with minimal punctuation. Preserve exact wording including filler words.");

  // Call OpenAI Whisper API
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.text || data.text.trim().length === 0) {
    return {
      success: false,
      error: "Empty transcription result from Whisper",
    };
  }

  // Clean up the text
  const cleanText = data.text
    .trim()
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();

  return {
    success: true,
    text: cleanText,
    confidence: 0.95, // Whisper is highly accurate
  };
}

/**
 * Alternative: Transcribe using Google Gemini (commented out for now)
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
