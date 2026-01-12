/**
 * Transcription Provider Abstraction
 * 
 * This interface allows swapping STT providers without changing business logic.
 * Current implementation: Whisper (OpenAI)
 * Future considerations: Gemini (for summaries/Q&A), Assembly AI, etc.
 */

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 code, e.g., "en"
  chunkIndex?: number; // For logging/debugging
  sessionId?: string; // For logging/debugging
}

export interface TranscriptionResult {
  text: string;
  confidence?: number; // 0-1 range if available from provider
  language?: string; // Detected language if auto-detect used
  duration?: number; // Audio duration in seconds if available
}

export interface Transcriber {
  /**
   * Transcribe audio buffer to text
   * @param audioBuffer - Raw audio file bytes (m4a, wav, etc.)
   * @param options - Transcription options
   * @returns Transcription result with text and optional metadata
   * @throws Error if transcription fails
   */
  transcribeAudio(
    audioBuffer: Uint8Array,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
}
