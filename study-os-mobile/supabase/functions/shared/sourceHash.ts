/**
 * Source Hash Utility
 * 
 * Creates consistent hash of lesson inputs to enable caching across devices.
 * If source_hash is unchanged and output exists with status=ready, return cached.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface SourceHashInputs {
  lesson_id: string;
  notes_final_text?: string | null;
  notes_raw_text?: string | null;
  transcript_text?: string | null;
  assets?: Array<{ filename: string; updated_at: string }>;
  youtube_transcript?: string | null;
}

/**
 * Generate a consistent hash from lesson inputs
 * 
 * @param inputs - Object containing all source inputs
 * @returns SHA-256 hash as hex string
 */
export async function generateSourceHash(inputs: SourceHashInputs): Promise<string> {
  // Build a deterministic string representation of all inputs
  const parts: string[] = [];
  
  // Notes (prefer final over raw)
  if (inputs.notes_final_text) {
    parts.push(`notes:${inputs.notes_final_text}`);
  } else if (inputs.notes_raw_text) {
    parts.push(`notes:${inputs.notes_raw_text}`);
  }
  
  // Transcript
  if (inputs.transcript_text) {
    parts.push(`transcript:${inputs.transcript_text}`);
  }
  
  // YouTube transcript
  if (inputs.youtube_transcript) {
    parts.push(`youtube:${inputs.youtube_transcript}`);
  }
  
  // Assets (sorted by filename for consistency)
  if (inputs.assets && inputs.assets.length > 0) {
    const sortedAssets = [...inputs.assets].sort((a, b) => 
      a.filename.localeCompare(b.filename)
    );
    parts.push(
      `assets:${sortedAssets.map(a => `${a.filename}:${a.updated_at}`).join(',')}`
    );
  }
  
  // If no content at all, return a special marker
  if (parts.length === 0) {
    return "empty";
  }
  
  // Join all parts and create hash
  const content = parts.join('|');
  
  // Use Web Crypto API to generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Gather lesson content for source hash generation
 * 
 * @param supabase - Supabase client (with user context for RLS)
 * @param lesson_id - Lesson UUID
 * @returns Source hash inputs object
 */
export async function gatherSourceInputs(
  supabase: SupabaseClient,
  lesson_id: string
): Promise<SourceHashInputs> {
  const inputs: SourceHashInputs = { lesson_id };
  
  // 1. Get notes from lesson_outputs (type='notes') – include any row with content, not only status=ready
  const { data: notesOutput } = await supabase
    .from('lesson_outputs')
    .select('notes_final_text, notes_raw_text')
    .eq('lesson_id', lesson_id)
    .eq('type', 'notes')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (notesOutput) {
    inputs.notes_final_text = notesOutput.notes_final_text;
    inputs.notes_raw_text = notesOutput.notes_raw_text;
  }
  
  // 2. Get transcript from most recent study session
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('lesson_id', lesson_id)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (sessions && sessions.length > 0) {
    const { data: segments } = await supabase
      .from('live_transcript_segments')
      .select('text')
      .eq('study_session_id', sessions[0].id)
      .order('seq', { ascending: true });
    
    if (segments && segments.length > 0) {
      inputs.transcript_text = segments.map(s => s.text).join(' ');
    }
  }
  
  // 3. Get assets metadata (filename + updated_at)
  const { data: assets } = await supabase
    .from('lesson_assets')
    .select('filename, updated_at')
    .eq('lesson_id', lesson_id)
    .order('filename', { ascending: true });
  
  if (assets && assets.length > 0) {
    inputs.assets = assets.map(a => ({
      filename: a.filename,
      updated_at: a.updated_at
    }));
  }
  
  // 4. Get YouTube transcript if exists
  const { data: youtubeResources } = await supabase
    .from('youtube_lesson_resources')
    .select('transcript_text')
    .eq('lesson_id', lesson_id)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (youtubeResources && youtubeResources.length > 0 && youtubeResources[0].transcript_text) {
    inputs.youtube_transcript = youtubeResources[0].transcript_text;
  }
  
  return inputs;
}

/**
 * Check for cached output with matching source hash
 * 
 * @param supabase - Supabase client
 * @param lesson_id - Lesson UUID
 * @param type - Output type (flashcards, quiz, etc.)
 * @param source_hash - Source hash to match
 * @returns Cached output if found, null otherwise
 */
export async function checkCache(
  supabase: SupabaseClient,
  lesson_id: string,
  type: string,
  source_hash: string
): Promise<any | null> {
  if (!source_hash || source_hash === "empty") {
    return null;
  }
  
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lesson_id)
    .eq('type', type)
    .eq('source_hash', source_hash)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

/**
 * Get text content from lesson for AI generation
 * (Separate from hash inputs to handle length limits differently)
 * 
 * @param inputs - Source hash inputs
 * @param maxLength - Maximum total length in characters
 * @returns Concatenated text content, truncated if needed
 */
export function getContentText(
  inputs: SourceHashInputs,
  maxLength: number = 12000
): string {
  const parts: string[] = [];
  
  // Priority: notes_final > notes_raw > transcript > youtube
  if (inputs.notes_final_text) {
    parts.push(inputs.notes_final_text);
  } else if (inputs.notes_raw_text) {
    parts.push(inputs.notes_raw_text);
  }
  
  if (inputs.transcript_text) {
    parts.push(inputs.transcript_text);
  }
  
  if (inputs.youtube_transcript) {
    parts.push(inputs.youtube_transcript);
  }
  
  const fullText = parts.join('\n\n');
  
  if (fullText.length > maxLength) {
    return fullText.substring(0, maxLength) + '\n\n[Content truncated for length...]';
  }
  
  return fullText;
}
