/**
 * Lesson outputs – flashcards, quiz. Supabase + Edge Functions.
 * Mirror: study-os-mobile/apps/mobile/src/data/lessonOutputs.repository.ts
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase'

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
    stem: q.q ?? '',
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
 * Generate quiz (Edge Function lesson_generate_quiz)
 */
export async function generateQuiz(lessonId, count = 5) {
  if (!isValidUuid(lessonId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/lesson_generate_quiz`, {
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

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Generate quiz failed: ${response.status}`)
  }
  const data = await response.json()
  return data
}
