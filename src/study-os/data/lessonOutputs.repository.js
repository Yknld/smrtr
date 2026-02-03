/**
 * Lesson outputs – flashcards, quiz. Supabase + Edge Functions.
 * Mirror: study-os-mobile/apps/mobile/src/data/lessonOutputs.repository.ts
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isValidUuid(str) {
  return typeof str === 'string' && UUID_REGEX.test(str)
}
const DEMO_ID_MSG = 'This item is from demo data. Create a course and lesson in the app to use this feature.'

/**
 * Fetch a lesson output by type
 */
export async function fetchLessonOutput(lessonId, type) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch lesson output: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    lessonId: data.lesson_id,
    type: data.type,
    status: data.status,
    contentJson: data.content_json,
    error: data.error,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

/**
 * Fetch flashcards for a lesson. Returns array of { front, back } or null.
 */
export async function fetchFlashcards(lessonId) {
  const output = await fetchLessonOutput(lessonId, 'flashcards')
  if (!output || output.status !== 'ready' || !output.contentJson?.cards) return null
  const cards = output.contentJson.cards
  return Array.isArray(cards)
    ? cards.map((c, i) => ({ id: `f${i}`, front: c.front ?? '', back: c.back ?? '' }))
    : null
}

/**
 * Fetch quiz for a lesson. Returns array of { stem, options, correctIndex } or null.
 */
export async function fetchQuiz(lessonId) {
  const output = await fetchLessonOutput(lessonId, 'quiz')
  if (!output || output.status !== 'ready' || !output.contentJson?.questions) return null
  const questions = output.contentJson.questions
  if (!Array.isArray(questions)) return null
  return questions.map((q, i) => ({
    id: `q${i}`,
    stem: q.question ?? q.q ?? '',
    options: q.choices ?? [],
    correctIndex: q.answer_index ?? 0,
  }))
}

/**
 * Generate flashcards (Edge Function lesson_generate_flashcards)
 */
export async function generateFlashcards(lessonId, count = 10) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/lesson_generate_flashcards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      lesson_id: lessonId,
      count: Math.max(10, Math.min(25, count)),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Generate flashcards failed: ${response.status}`)
  }
  const data = await response.json()
  return data
}

/**
 * Generate interactive module (Edge Function lesson_generate_interactive).
 * @param {string} lessonId
 * @returns {Promise<{ lesson_id: string, status: string }>}
 */
export async function generateInteractive(lessonId) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/lesson_generate_interactive`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ lesson_id: lessonId }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `Generate interactive failed: ${res.status}`)
  return body
}

/**
 * Reset interactive generation when stuck (Edge Function lesson_generate_interactive_reset).
 * @param {string} lessonId
 * @returns {Promise<{ lesson_id: string, status: string }>}
 */
export async function resetInteractive(lessonId) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/lesson_generate_interactive_reset`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ lesson_id: lessonId }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `Reset failed: ${res.status}`)
  return body
}

/**
 * Generate quiz (Edge Function lesson_generate_quiz).
 * Refreshes the session first so the Edge Function receives a valid JWT.
 */
export async function generateQuiz(lessonId, count = 5) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) throw new Error('Session expired. Please sign out and sign in again.')
  if (!session) throw new Error('User not authenticated')

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/lesson_generate_quiz`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      lesson_id: lessonId,
      count: Math.max(5, Math.min(15, count)),
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      body?.error?.message ||
      body?.message ||
      (typeof body?.error === 'string' ? body.error : null) ||
      `Generate quiz failed (${res.status})`
    throw new Error(msg)
  }
  return body
}

/** Map output/status to hub badge: 'generate' | 'generating' | 'generated' */
function outputToBadge(output, hasContent) {
  if (!output) return 'generate'
  if (output.status === 'processing') return 'generating'
  if (output.status === 'ready' && hasContent) return 'generated'
  return 'generate'
}

/**
 * Fetch action tile statuses for Lesson Hub (honest Generate / Generating / Generated).
 * @param {string} lessonId
 * @returns {Promise<{ flashcards: string, quiz: string, interactive: string, podcast: string, video: string } | null>} each 'generate'|'generating'|'generated', or null if not authenticated
 */
export async function fetchActionStatuses(lessonId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const types = ['flashcards', 'quiz', 'interactive_pages']
  const { data: outputRows, error: outError } = await supabase
    .from('lesson_outputs')
    .select('type, status, content_json')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .in('type', types)
    .order('created_at', { ascending: false })

  const latestByType = {}
  if (!outError && outputRows?.length) {
    for (const row of outputRows) {
      if (latestByType[row.type] === undefined) {
        latestByType[row.type] = { status: row.status, contentJson: row.content_json }
      }
    }
  }

  const flashcards = outputToBadge(latestByType.flashcards, Array.isArray(latestByType.flashcards?.contentJson?.cards) && latestByType.flashcards.contentJson.cards.length > 0)
  const quiz = outputToBadge(latestByType.quiz, Array.isArray(latestByType.quiz?.contentJson?.questions) && latestByType.quiz.contentJson.questions.length > 0)
  const interactive = outputToBadge(latestByType.interactive_pages, !!latestByType.interactive_pages?.contentJson)

  let podcast = 'generate'
  try {
    const { fetchPodcastEpisode } = await import('./podcasts.repository.js')
    const ep = await fetchPodcastEpisode(lessonId)
    if (ep) {
      if (ep.status === 'ready') podcast = 'generated'
      else if (['queued', 'scripting', 'voicing'].includes(ep.status)) podcast = 'generating'
    }
  } catch (_) {
    // leave podcast as 'generate'
  }

  let video = 'generate'
  try {
    const { fetchVideoStatus } = await import('./video.repository.js')
    video = await fetchVideoStatus(lessonId)
  } catch (_) {
    // leave video as 'generate'
  }

  return { flashcards, quiz, interactive, podcast, video }
}
