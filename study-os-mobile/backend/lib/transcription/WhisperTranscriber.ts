/**
 * Whisper Transcription Provider
 * 
 * Uses OpenAI's Whisper API for speech-to-text transcription.
 * Optimized for chunk-based transcription (not live streaming).
 * 
 * Docs: https://platform.openai.com/docs/api-reference/audio/createTranscription
 */

import { Transcriber, TranscriptionOptions, TranscriptionResult } from './Transcriber.ts';

export class WhisperTranscriber implements Transcriber {
  private apiKey: string;
  private apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  private model = 'whisper-1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for WhisperTranscriber');
    }
    this.apiKey = apiKey;
  }

  async transcribeAudio(
    audioBuffer: Uint8Array,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    try {
      // Log request (but never log the actual audio buffer)
      console.log('[WhisperTranscriber] Starting transcription:', {
        sessionId: options?.sessionId,
        chunkIndex: options?.chunkIndex,
        bufferSize: audioBuffer.length,
        language: options?.language || 'auto',
      });

      // Validate buffer size (Whisper max is 25MB, we cap at 10MB for safety)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (audioBuffer.length > maxSize) {
        throw new Error(`Audio buffer too large: ${audioBuffer.length} bytes (max: ${maxSize})`);
      }

      // Create multipart form data
      const formData = new FormData();
      
      // Create a Blob from the buffer
      const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });
      formData.append('file', audioBlob, 'audio.m4a');
      formData.append('model', this.model);
      
      // Set language if specified (helps accuracy and speed)
      if (options?.language) {
        formData.append('language', options.language);
      }
      
      // Request verbose JSON response to get confidence/timing if available
      formData.append('response_format', 'verbose_json');

      // Call Whisper API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WhisperTranscriber] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          sessionId: options?.sessionId,
          chunkIndex: options?.chunkIndex,
        });
        
        throw new Error(
          `Whisper API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      
      const duration = Date.now() - startTime;
      
      console.log('[WhisperTranscriber] Transcription successful:', {
        sessionId: options?.sessionId,
        chunkIndex: options?.chunkIndex,
        textLength: result.text?.length || 0,
        duration: `${duration}ms`,
        detectedLanguage: result.language,
      });

      // Extract result
      // Verbose JSON response includes: text, language, duration, segments
      // We primarily need text, but log the rest for debugging
      return {
        text: result.text || '',
        language: result.language,
        duration: result.duration, // Audio duration in seconds
        // Note: Whisper doesn't provide per-transcript confidence in verbose_json
        // but we could calculate from segment avg_logprobs if needed
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('[WhisperTranscriber] Transcription failed:', {
        sessionId: options?.sessionId,
        chunkIndex: options?.chunkIndex,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }
}
