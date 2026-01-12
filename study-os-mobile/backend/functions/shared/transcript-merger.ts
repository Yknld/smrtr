// ============================================================================
// Transcript Merger
// ============================================================================
// 
// Purpose: Merge new transcription text with existing transcript
// Implements overlap-dedupe algorithm from prompts.transcription.md
// 
// ============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface MergeResult {
  success: boolean;
  fullText: string;
  error?: string;
}

/**
 * Merge new chunk transcript with existing full transcript
 * 
 * Algorithm:
 * 1. Normalize whitespace and case
 * 2. Find largest overlap between old tail and new prefix
 * 3. Trim overlap and append
 * 4. Support live captions style (allow revision of last 1-2 lines)
 * 
 * @param client - Supabase client (service role)
 * @param sessionId - Session ID
 * @param newText - New transcription text to merge
 * @returns MergeResult
 */
export async function mergeTranscript(
  client: SupabaseClient,
  sessionId: string,
  newText: string
): Promise<MergeResult> {
  try {
    // Fetch existing transcript
    const { data: transcript, error: fetchError } = await client
      .from("transcripts")
      .select("full_text")
      .eq("session_id", sessionId)
      .single();

    if (fetchError) {
      console.error("Error fetching transcript:", fetchError);
      return {
        success: false,
        fullText: "",
        error: "Failed to fetch existing transcript",
      };
    }

    const existingText = transcript?.full_text || "";

    // If no existing text, just use new text
    if (existingText.length === 0) {
      const { error: updateError } = await client
        .from("transcripts")
        .update({ full_text: newText })
        .eq("session_id", sessionId);

      if (updateError) {
        console.error("Error updating transcript:", updateError);
        return {
          success: false,
          fullText: newText,
          error: "Failed to update transcript",
        };
      }

      return {
        success: true,
        fullText: newText,
      };
    }

    // Merge with overlap detection
    const mergedText = mergeWithOverlap(existingText, newText);

    // Update transcript
    const { error: updateError } = await client
      .from("transcripts")
      .update({ full_text: mergedText })
      .eq("session_id", sessionId);

    if (updateError) {
      console.error("Error updating transcript:", updateError);
      return {
        success: false,
        fullText: mergedText,
        error: "Failed to update transcript",
      };
    }

    return {
      success: true,
      fullText: mergedText,
    };
  } catch (error) {
    console.error("Merge error:", error);
    return {
      success: false,
      fullText: "",
      error: error instanceof Error ? error.message : "Unknown merge error",
    };
  }
}

/**
 * Merge two text strings with overlap detection
 * 
 * @param oldText - Existing transcript text
 * @param newText - New chunk transcript text
 * @returns Merged text
 */
function mergeWithOverlap(oldText: string, newText: string): string {
  // Normalize both texts
  const oldNorm = normalize(oldText);
  const newNorm = normalize(newText);

  // Split into tokens for overlap detection
  const oldTokens = oldNorm.split(/\s+/).filter(t => t.length > 0);
  const newTokens = newNorm.split(/\s+/).filter(t => t.length > 0);

  if (oldTokens.length === 0) return newText;
  if (newTokens.length === 0) return oldText;

  // Find largest overlap between old tail and new prefix
  const overlapLength = findLargestOverlap(oldTokens, newTokens);

  if (overlapLength === 0) {
    // No overlap found, just append with space
    return oldText + " " + newText;
  }

  // Allow "live captions style" revision of last 1-2 lines (~20 tokens)
  const revisionWindow = Math.min(20, oldTokens.length);
  const effectiveOverlap = Math.max(overlapLength, revisionWindow);

  // Trim overlap from old text (keep everything except the overlap)
  const trimmedOldTokens = oldTokens.slice(0, -effectiveOverlap);
  
  // Reconstruct trimmed old text (preserve original spacing/case)
  const trimmedOldText = reconstructText(oldText, trimmedOldTokens);

  // Append full new text
  return trimmedOldText + " " + newText;
}

/**
 * Find largest overlap between tail of old and prefix of new
 * 
 * @param oldTokens - Tokens from old text
 * @param newTokens - Tokens from new text
 * @returns Number of overlapping tokens
 */
function findLargestOverlap(oldTokens: string[], newTokens: string[]): number {
  const maxOverlap = Math.min(oldTokens.length, newTokens.length);

  // Try from largest possible overlap down to 1
  for (let overlap = maxOverlap; overlap >= 3; overlap--) {
    const oldTail = oldTokens.slice(-overlap);
    const newPrefix = newTokens.slice(0, overlap);

    // Check if they match (fuzzy match - allow 1-2 token differences for live captions)
    const matches = oldTail.filter((token, i) => token === newPrefix[i]).length;
    const similarity = matches / overlap;

    if (similarity >= 0.8) { // 80% similarity threshold
      return overlap;
    }
  }

  return 0; // No significant overlap found
}

/**
 * Normalize text for comparison
 * - Lowercase
 * - Collapse whitespace
 * - Remove punctuation (optional)
 * 
 * @param text - Text to normalize
 * @returns Normalized text
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Reconstruct original text from tokens (preserving case/spacing)
 * 
 * @param originalText - Original text with case/punctuation
 * @param targetTokens - Tokens to keep
 * @returns Reconstructed text
 */
function reconstructText(originalText: string, targetTokens: string[]): string {
  if (targetTokens.length === 0) return "";

  // Simple reconstruction: find approximate position in original text
  const normalized = normalize(originalText);
  const targetNormalized = targetTokens.join(" ");

  const endIndex = normalized.indexOf(targetNormalized);
  if (endIndex !== -1) {
    // Find corresponding position in original text
    let charCount = 0;
    let origCharCount = 0;
    for (let i = 0; i < originalText.length; i++) {
      if (originalText[i].match(/\S/)) {
        if (charCount === endIndex + targetNormalized.length) {
          origCharCount = i;
          break;
        }
        if (!originalText[i].match(/[.,!?;:'"]/)) {
          charCount++;
        }
      }
    }
    return originalText.slice(0, origCharCount).trim();
  }

  // Fallback: just reconstruct from tokens (loses original formatting)
  return targetTokens.join(" ");
}
