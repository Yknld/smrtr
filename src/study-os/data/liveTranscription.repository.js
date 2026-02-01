/**
 * Live transcription – study sessions, transcript persistence, notes.
 * Mirror: study-os-mobile LessonWorkspace + notes service + transcribe_start.
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase'
import { isValidUuid } from '../utils/uuid'

const DEMO_ID_MSG = 'This lesson is from demo data. Create a course and lesson in the app to use this feature.'

/**
 * Start a transcription session via Edge Function (returns session_id + AssemblyAI WS URL/token).
 */
export async function startTranscriptionSession(options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe_start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      language: options.language || 'en',
      provider: 'assemblyai',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `transcribe_start failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Create a study session for a lesson (for notes + live_transcript_segments).
 */
export async function createStudySession(lessonId) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      mode: 'live_transcribe',
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message || 'Failed to create study session')
  return data
}

/**
 * Insert a transcript segment into live_transcript_segments (for notes_commit).
 */
export async function insertTranscriptSegment(studySessionId, seq, text, language = 'en') {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase.from('live_transcript_segments').insert({
    user_id: user.id,
    study_session_id: studySessionId,
    seq,
    text: text || '',
    language,
  })
  if (error) throw new Error(error.message || 'Failed to insert segment')
}

/**
 * Commit notes from segments (Edge Function notes_commit_from_segments).
 */
export async function notesCommit(lessonId, studySessionId) {
  const { data, error } = await supabase.functions.invoke('notes_commit_from_segments', {
    body: { lesson_id: lessonId, study_session_id: studySessionId },
  })
  if (error) throw new Error(error.message || 'notes_commit failed')
  return data
}

/**
 * Get notes for a lesson (Edge Function notes_get).
 */
export async function notesGet(lessonId) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')
  const url = `${SUPABASE_URL}/functions/v1/notes_get?lesson_id=${encodeURIComponent(lessonId)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `notes_get failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Finalize notes (Edge Function notes_finalize).
 */
export async function notesFinalize(lessonId) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const { data, error } = await supabase.functions.invoke('notes_finalize', {
    body: { lesson_id: lessonId },
  })
  if (error) throw new Error(error.message || 'notes_finalize failed')
  return data ?? {}
}

/**
 * Set raw notes for a lesson (sync NOTES area with backend).
 * Upserts lesson_outputs (type='notes') with notes_raw_text.
 */
export async function notesSetRaw(lessonId, text) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: existing } = await supabase
    .from('lesson_outputs')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .eq('type', 'notes')
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('lesson_outputs')
      .update({
        notes_raw_text: text || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(error.message || 'Failed to save notes')
    return
  }

  const { error } = await supabase.from('lesson_outputs').insert({
    user_id: user.id,
    lesson_id: lessonId,
    type: 'notes',
    status: 'ready',
    notes_raw_text: text || '',
    content_json: {},
  })
  if (error) throw new Error(error.message || 'Failed to save notes')
}

/**
 * Persist final transcript to transcription_sessions/transcripts (Supabase tables).
 */
export async function persistTranscript(transcriptionSessionId, fullText) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return

  await supabase
    .from('transcripts')
    .update({ full_text: fullText, updated_at: new Date().toISOString() })
    .eq('session_id', transcriptionSessionId)

  await supabase
    .from('transcription_sessions')
    .update({ status: 'complete', updated_at: new Date().toISOString() })
    .eq('id', transcriptionSessionId)
}

/**
 * End study session (set status ended).
 */
export async function endStudySession(studySessionId) {
  if (!isValidUuid(studySessionId)) return
  await supabase
    .from('study_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', studySessionId)
}
