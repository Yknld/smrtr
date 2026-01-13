/**
 * ============================================================================
 * Shared Helper: getLessonText
 * ============================================================================
 * 
 * Retrieves lesson text content from various sources:
 * 1. live_transcript_segments (from study sessions)
 * 2. transcripts (from transcription sessions)
 * 
 * Returns the aggregated text or null if no text is found.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface LessonTextResult {
  text: string;
  source: "live_transcript" | "transcript";
  word_count: number;
}

/**
 * Get lesson text content by lesson_id
 * 
 * @param supabase - Supabase client instance (with user JWT for RLS)
 * @param lessonId - UUID of the lesson
 * @returns LessonTextResult or null if no text found
 */
export async function getLessonText(
  supabase: SupabaseClient,
  lessonId: string
): Promise<LessonTextResult | null> {
  // First, try to get text from live_transcript_segments
  // via study_sessions linked to this lesson
  const { data: studySessions } = await supabase
    .from("study_sessions")
    .select("id")
    .eq("lesson_id", lessonId)
    .order("started_at", { ascending: false })
    .limit(1);

  if (studySessions && studySessions.length > 0) {
    const sessionId = studySessions[0].id;
    
    const { data: segments } = await supabase
      .from("live_transcript_segments")
      .select("text")
      .eq("study_session_id", sessionId)
      .order("seq", { ascending: true });

    if (segments && segments.length > 0) {
      const text = segments.map(s => s.text).join(" ");
      return {
        text,
        source: "live_transcript",
        word_count: text.split(/\s+/).length,
      };
    }
  }

  // If no live transcript, try to find linked transcription session
  // Note: This assumes there's some way to link lessons to transcription_sessions
  // For now, we'll return null and require live transcript data
  
  return null;
}
