// ============================================================================
// Notes Service
// ============================================================================
// 
// Purpose: Manage lesson notes (commit, get, finalize)
// 
// Features:
// - Auto-commit transcript segments to notes every 5 seconds
// - Fetch notes for display
// - Finalize notes using Gemini AI
// 
// ============================================================================

import { supabase } from '@/config/supabase';

interface NotesData {
  text: string;
  isFinal: boolean;
  lastSeq: number;
  updatedAt: string;
}

interface FinalizeResult {
  notesText: string;
  inputChars: number;
  truncated: boolean;
}

class NotesService {
  private commitInterval: NodeJS.Timeout | null = null;
  private currentLessonId: string | null = null;
  private currentSessionId: string | null = null;
  
  /**
   * Start auto-committing transcript segments to notes every 5 seconds
   */
  startAutoCommit(lessonId: string, sessionId: string) {
    console.log(`[NotesService] Starting auto-commit for lesson ${lessonId}`);
    
    this.currentLessonId = lessonId;
    this.currentSessionId = sessionId;
    
    // Do an immediate commit
    this.commitNow(lessonId, sessionId).catch(err => {
      console.error('[NotesService] Initial commit failed:', err);
    });
    
    // Set up interval for auto-commits
    this.commitInterval = setInterval(async () => {
      try {
        const result = await this.commitNow(lessonId, sessionId);
        
        if (result.appended > 0) {
          console.log(`[NotesService] Committed ${result.appended} segments (seq: ${result.lastSeq})`);
        }
      } catch (err) {
        console.error('[NotesService] Auto-commit error:', err);
        // Don't throw - will retry on next interval
      }
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Stop auto-committing
   */
  stopAutoCommit() {
    if (this.commitInterval) {
      console.log('[NotesService] Stopping auto-commit');
      clearInterval(this.commitInterval);
      this.commitInterval = null;
    }
    
    this.currentLessonId = null;
    this.currentSessionId = null;
  }
  
  /**
   * Check if auto-commit is active
   */
  isAutoCommitting(): boolean {
    return this.commitInterval !== null;
  }
  
  /**
   * Manual commit (use when stopping recording for final commit)
   */
  async commitNow(
    lessonId: string, 
    sessionId: string
  ): Promise<{ appended: number; lastSeq: number; preview: string }> {
    const { data, error } = await supabase.functions.invoke(
      'notes_commit_from_segments',
      {
        body: {
          lesson_id: lessonId,
          study_session_id: sessionId,
        },
      }
    );
    
    if (error) {
      throw new Error(`Failed to commit notes: ${error.message}`);
    }
    
    return {
      appended: data.appended,
      lastSeq: data.last_committed_seq,
      preview: data.notes_preview,
    };
  }
  
  /**
   * Get notes for a lesson
   * Returns final text if available, otherwise raw text
   */
  async getNotes(lessonId: string): Promise<NotesData> {
    // Get the Supabase URL and session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    // Construct URL with query parameter
    const supabaseUrl = supabase.supabaseUrl;
    const url = `${supabaseUrl}/functions/v1/notes_get?lesson_id=${lessonId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // If 404, notes don't exist yet - return empty
      if (response.status === 404) {
        return {
          text: '',
          isFinal: false,
          lastSeq: 0,
          updatedAt: new Date().toISOString(),
        };
      }
      throw new Error(`Failed to fetch notes: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Return appropriate text based on is_final flag
    return {
      text: data.is_final ? data.notes_final_text : data.notes_raw_text,
      isFinal: data.is_final,
      lastSeq: data.last_committed_seq,
      updatedAt: data.updated_at,
    };
  }
  
  /**
   * Finalize notes using Gemini AI
   * Call this after stopping recording
   */
  async finalizeNotes(lessonId: string): Promise<FinalizeResult> {
    console.log(`[NotesService] Finalizing notes for lesson ${lessonId}`);
    
    const { data, error } = await supabase.functions.invoke('notes_finalize', {
      body: { lesson_id: lessonId },
    });
    
    if (error) {
      throw new Error(`Failed to finalize notes: ${error.message}`);
    }
    
    console.log(`[NotesService] Notes finalized: ${data.notes_final_text.length} chars`);
    
    return {
      notesText: data.notes_final_text,
      inputChars: data.input_chars,
      truncated: data.truncated,
    };
  }
  
  /**
   * Check if notes exist for a lesson
   */
  async hasNotes(lessonId: string): Promise<boolean> {
    try {
      const notes = await this.getNotes(lessonId);
      return notes.text.length > 0;
    } catch (err) {
      return false;
    }
  }

  /**
   * Update notes (user edit). Writes to both notes_raw_text and notes_final_text
   * so the displayed value stays in sync with Supabase.
   */
  async updateNotes(lessonId: string, text: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const value = text ?? '';
    const { data: existing } = await supabase
      .from('lesson_outputs')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .eq('type', 'notes')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('lesson_outputs')
        .update({
          notes_raw_text: value,
          notes_final_text: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to save notes: ${error.message}`);
      }
      return;
    }

    const { error } = await supabase.from('lesson_outputs').insert({
      user_id: user.id,
      lesson_id: lessonId,
      type: 'notes',
      status: 'ready',
      notes_raw_text: value,
      notes_final_text: value,
      content_json: {},
    });

    if (error) {
      throw new Error(`Failed to save notes: ${error.message}`);
    }
  }
}

// Export singleton instance
export const notesService = new NotesService();
