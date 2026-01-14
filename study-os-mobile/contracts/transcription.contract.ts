/**
 * Transcription Contracts
 * 
 * Defines types for pseudo-live transcription system with overlapping audio chunks.
 * Client records audio, splits into chunks with overlap, uploads to Supabase Storage,
 * then sends chunk metadata to backend for transcription.
 */

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Transcription session representing a single recording/transcription job
 */
export interface TranscriptionSession {
  /** Unique session identifier (UUID) */
  id: string;
  
  /** User who owns this session (UUID) */
  user_id: string;
  
  /** Source type of the audio */
  source_type: 'live_recording';
  
  /** Current status of the session */
  status: 'recording' | 'processing' | 'complete' | 'failed';
  
  /** Optional: Language code for transcription (e.g., 'en-US', 'es-ES') */
  language?: string;
  
  /** When the session was created */
  created_at: Date;
  
  /** When the session was last updated */
  updated_at: Date;
}

/**
 * Individual audio chunk within a transcription session
 */
export interface TranscriptionChunk {
  /** Unique chunk identifier (UUID) */
  id: string;
  
  /** Session this chunk belongs to (UUID) */
  session_id: string;
  
  /** Sequential index of this chunk (0, 1, 2, ...) */
  chunk_index: number;
  
  /** Supabase Storage path where audio file is stored */
  storage_path: string;
  
  /** Duration of this chunk in milliseconds */
  duration_ms: number;
  
  /** Overlap with previous chunk in milliseconds (0 for first chunk) */
  overlap_ms: number;
  
  /** Current processing status */
  status: 'uploaded' | 'transcribing' | 'done' | 'failed';
  
  /** Optional: Error message if status is 'failed' */
  error?: string;
  
  /** When the chunk was created */
  created_at: Date;
}

/**
 * Transcribed text segment from audio chunk(s)
 */
export interface TranscriptSegment {
  /** Unique segment identifier (UUID) */
  id: string;
  
  /** Session this segment belongs to (UUID) */
  session_id: string;
  
  /** Chunk index this segment came from */
  chunk_index: number;
  
  /** Transcribed text content */
  text: string;
  
  /** When the segment was created */
  created_at: Date;
  
  /** Optional: Start time in milliseconds relative to session start */
  start_ms?: number;
  
  /** Optional: End time in milliseconds relative to session start */
  end_ms?: number;
  
  /** Optional: Confidence score (0.0 - 1.0) from transcription service */
  confidence?: number;
}

// ============================================================================
// API Request/Response Payloads
// ============================================================================

/**
 * Request: Start a new transcription session
 */
export interface TranscribeStartRequest {
  /** Optional: Language code for transcription (e.g., 'en-US') */
  language?: string;
}

/**
 * Response: New session created
 */
export interface TranscribeStartResponse {
  /** Session ID to use for subsequent chunk uploads */
  session_id: string;
  
  /** Base path in Supabase Storage where chunks should be uploaded */
  upload_base_path: string;
}

/**
 * Request: Submit a transcribed chunk
 */
export interface TranscribeChunkRequest {
  /** Session ID from transcribe_start */
  session_id: string;
  
  /** Sequential chunk index (0, 1, 2, ...) */
  chunk_index: number;
  
  /** Supabase Storage path where audio chunk was uploaded */
  storage_path: string;
  
  /** Duration of this chunk in milliseconds */
  duration_ms: number;
  
  /** Overlap with previous chunk in milliseconds */
  overlap_ms: number;
}

/**
 * Response: Transcription segments for this chunk
 */
export interface TranscribeChunkResponse {
  /** New transcript segments added from this chunk */
  segments_added: TranscriptSegment[];
  
  /** Optional: Delta text (only new text after merging/trimming overlap) */
  merged_text_delta?: string;
  
  /** Optional: Full merged transcript text so far */
  merged_full_text?: string;
}

/**
 * Request: Poll for transcription updates
 */
export interface TranscribePollRequest {
  /** Session ID to poll */
  session_id: string;
  
  /** Optional: Only return segments after this chunk index */
  after_chunk_index?: number;
}

/**
 * Response: Current transcription status and segments
 */
export interface TranscribePollResponse {
  /** Current session status */
  status: TranscriptionSession['status'];
  
  /** Transcript segments (optionally filtered by after_chunk_index) */
  segments: TranscriptSegment[];
  
  /** Optional: Full merged transcript text */
  merged_full_text?: string;
  
  /** Optional: Latest chunk index processed */
  latest_chunk_index?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Session with related chunks and segments
 */
export interface TranscriptionSessionWithDetails extends TranscriptionSession {
  chunks: TranscriptionChunk[];
  segments: TranscriptSegment[];
}

/**
 * Chunk with transcription result
 */
export interface TranscriptionChunkWithSegments extends TranscriptionChunk {
  segments: TranscriptSegment[];
}

/**
 * Create session input (for database insert)
 */
export interface CreateTranscriptionSessionInput {
  user_id: string;
  source_type: 'live_recording';
  language?: string;
}

/**
 * Update session input (for database update)
 */
export interface UpdateTranscriptionSessionInput {
  status?: TranscriptionSession['status'];
  updated_at?: Date;
}

/**
 * Create chunk input (for database insert)
 */
export interface CreateTranscriptionChunkInput {
  session_id: string;
  chunk_index: number;
  storage_path: string;
  duration_ms: number;
  overlap_ms: number;
  status: TranscriptionChunk['status'];
}

/**
 * Update chunk input (for database update)
 */
export interface UpdateTranscriptionChunkInput {
  status?: TranscriptionChunk['status'];
  error?: string;
}

/**
 * Create segment input (for database insert)
 */
export interface CreateTranscriptSegmentInput {
  session_id: string;
  chunk_index: number;
  text: string;
  start_ms?: number;
  end_ms?: number;
  confidence?: number;
}
