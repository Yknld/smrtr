/**
 * Lessons – Supabase. Mirror: study-os-mobile/data/lessons.repository.ts
 */
import { supabase } from '../config/supabase'
import { isValidUuid } from '../utils/uuid'

const DEMO_ID_MSG = 'This item is from demo data. Create a course and lesson in the app to use this feature.'

function transformLesson(row) {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    title: row.title,
    sourceType: row.source_type || 'upload',
    status: row.status || 'draft',
    lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at) : null,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Fetch all lessons for a course with outputs metadata.
 * Returns [] if not authenticated.
 */
export async function fetchLessons(courseId) {
  if (!isValidUuid(courseId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `
      id,
      user_id,
      course_id,
      title,
      source_type,
      status,
      last_opened_at,
      created_at,
      lesson_outputs (
        id,
        type
      ),
      lesson_assets (
        id,
        kind
      )
    `
    )
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch lessons: ${error.message}`)

  return (data || []).map((row) => {
    const lesson = transformLesson(row)
    const outputs = row.lesson_outputs || []
    const assets = row.lesson_assets || []
    return {
      ...lesson,
      hasSummary: outputs.some((o) => o.type === 'summary'),
      hasFlashcards: outputs.some((o) => o.type === 'flashcards'),
      hasQuiz: outputs.some((o) => o.type === 'quiz'),
      hasPodcast: assets.some((a) => a.kind === 'audio'),
      hasVideo: assets.some((a) => a.kind === 'video'),
    }
  })
}

/**
 * Fetch a single lesson by ID. Returns null if not found or not authenticated.
 */
export async function fetchLessonById(lessonId) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `
      id,
      user_id,
      course_id,
      title,
      source_type,
      status,
      last_opened_at,
      created_at,
      lesson_outputs (
        id,
        type
      ),
      lesson_assets (
        id,
        kind
      )
    `
    )
    .eq('id', lessonId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch lesson: ${error.message}`)
  }
  if (!data) return null

  const base = transformLesson(data)
  const outputs = data.lesson_outputs || []
  const assets = data.lesson_assets || []
  return {
    ...base,
    hasSummary: outputs.some((o) => o.type === 'summary'),
    hasFlashcards: outputs.some((o) => o.type === 'flashcards'),
    hasQuiz: outputs.some((o) => o.type === 'quiz'),
    hasPodcast: assets.some((a) => a.kind === 'audio'),
    hasVideo: assets.some((a) => a.kind === 'video'),
  }
}

/**
 * Create a new lesson. Throws if not authenticated.
 */
export async function createLesson(courseId, title, sourceType = 'upload') {
  if (!isValidUuid(courseId)) throw new Error(DEMO_ID_MSG)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      user_id: user.id,
      course_id: courseId,
      title,
      source_type: sourceType,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create lesson: ${error.message}`)
  const lesson = transformLesson(data)
  return {
    ...lesson,
    hasSummary: false,
    hasFlashcards: false,
    hasQuiz: false,
    hasPodcast: false,
    hasVideo: false,
  }
}
