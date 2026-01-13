/**
 * API Contracts
 * 
 * Defines all API endpoints, request/response shapes, and error types.
 * No implementation - contracts only.
 */

import {
  TranscribeStartRequest,
  TranscribeStartResponse,
  TranscribeChunkRequest,
  TranscribeChunkResponse,
  TranscribePollRequest,
  TranscribePollResponse,
} from './transcription.contract';

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * All available API endpoints
 */
export const API_ENDPOINTS = {
  // Transcription endpoints
  TRANSCRIBE_START: '/api/transcribe/start',
  TRANSCRIBE_CHUNK: '/api/transcribe/chunk',
  TRANSCRIBE_POLL: '/api/transcribe/poll',
} as const;

// ============================================================================
// Transcription API
// ============================================================================

/**
 * POST /api/transcribe/start
 * 
 * Start a new transcription session.
 * 
 * Flow:
 * 1. Client calls this endpoint to initialize session
 * 2. Backend creates TranscriptionSession record
 * 3. Backend returns session_id and upload_base_path
 * 4. Client uses upload_base_path to upload audio chunks to Supabase Storage
 * 
 * @returns Session ID and storage path for uploading chunks
 */
export interface TranscribeStartEndpoint {
  method: 'POST';
  path: typeof API_ENDPOINTS.TRANSCRIBE_START;
  request: TranscribeStartRequest;
  response: TranscribeStartResponse;
}

/**
 * POST /api/transcribe/chunk
 * 
 * Submit an audio chunk for transcription.
 * 
 * Flow:
 * 1. Client records audio chunk (e.g., 5 seconds)
 * 2. Client uploads chunk to Supabase Storage at upload_base_path
 * 3. Client calls this endpoint with storage_path
 * 4. Backend transcribes audio using external service (e.g., OpenAI Whisper)
 * 5. Backend merges with previous chunks, handling overlap
 * 6. Backend returns new segments and merged text
 * 
 * Overlap Handling:
 * - Chunks overlap by ~0.5-1.0 seconds (overlap_ms)
 * - Backend compares text from overlap region with previous chunk
 * - Backend trims repeated/duplicate text from overlap
 * - Backend may revise last 1-2 lines from previous chunk (live caption behavior)
 * 
 * @returns New transcript segments and merged text
 */
export interface TranscribeChunkEndpoint {
  method: 'POST';
  path: typeof API_ENDPOINTS.TRANSCRIBE_CHUNK;
  request: TranscribeChunkRequest;
  response: TranscribeChunkResponse;
}

/**
 * GET /api/transcribe/poll
 * 
 * Poll for transcription updates.
 * 
 * Flow:
 * 1. Client calls this endpoint periodically (e.g., every 2 seconds)
 * 2. Backend returns current session status
 * 3. Backend returns new segments since last poll (after_chunk_index)
 * 4. Client updates UI with new transcript text
 * 
 * Use Cases:
 * - Real-time display of transcription as it arrives
 * - Checking if transcription is complete
 * - Recovering from network interruptions
 * 
 * @returns Session status and transcript segments
 */
export interface TranscribePollEndpoint {
  method: 'GET';
  path: typeof API_ENDPOINTS.TRANSCRIBE_POLL;
  request: TranscribePollRequest;  // Query params
  response: TranscribePollResponse;
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface APIError {
  /** Error code (e.g., 'SESSION_NOT_FOUND', 'INVALID_CHUNK_INDEX') */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Optional: Additional error details */
  details?: Record<string, any>;
  
  /** HTTP status code */
  status: number;
}

/**
 * Transcription-specific error codes
 */
export const TRANSCRIPTION_ERROR_CODES = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ALREADY_COMPLETE: 'SESSION_ALREADY_COMPLETE',
  SESSION_FAILED: 'SESSION_FAILED',
  INVALID_CHUNK_INDEX: 'INVALID_CHUNK_INDEX',
  CHUNK_ALREADY_EXISTS: 'CHUNK_ALREADY_EXISTS',
  STORAGE_PATH_INVALID: 'STORAGE_PATH_INVALID',
  TRANSCRIPTION_SERVICE_ERROR: 'TRANSCRIPTION_SERVICE_ERROR',
  AUDIO_FORMAT_UNSUPPORTED: 'AUDIO_FORMAT_UNSUPPORTED',
  LANGUAGE_NOT_SUPPORTED: 'LANGUAGE_NOT_SUPPORTED',
} as const;

export type TranscriptionErrorCode = typeof TRANSCRIPTION_ERROR_CODES[keyof typeof TRANSCRIPTION_ERROR_CODES];

/**
 * Transcription error response
 */
export interface TranscriptionError extends APIError {
  code: TranscriptionErrorCode;
}

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Union of all API endpoint types
 */
export type APIEndpoint =
  | TranscribeStartEndpoint
  | TranscribeChunkEndpoint
  | TranscribePollEndpoint;

/**
 * Extract request type from endpoint
 */
export type APIRequest<T extends APIEndpoint> = T['request'];

/**
 * Extract response type from endpoint
 */
export type APIResponse<T extends APIEndpoint> = T['response'];
