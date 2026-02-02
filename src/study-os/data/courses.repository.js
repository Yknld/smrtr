/**
 * Courses – Supabase. Mirror: study-os-mobile/data/courses.repository.ts
 */
import { supabase } from '../config/supabase'

function transformCourse(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    term: row.term ?? null,
    color: row.color ?? null,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Fetch all courses for the current user with metadata.
 * Returns [] if not authenticated.
 */
export async function fetchCourses() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('courses')
    .select(
      `
      id,
      user_id,
      title,
      term,
      color,
      created_at,
      lessons (
        id,
        status,
        last_opened_at
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch courses: ${error.message}`)

  return (data || []).map((row) => {
    const course = transformCourse(row)
    const lessons = row.lessons || []
    const lessonCount = lessons.length
    const lastOpenedTimes = lessons
      .map((l) => l.last_opened_at)
      .filter(Boolean)
      .map((t) => new Date(t))
    const lastOpenedAt =
      lastOpenedTimes.length > 0
        ? new Date(Math.max(...lastOpenedTimes.map((d) => d.getTime())))
        : null
    const hasActiveLessons = lessons.some((l) => l.status === 'ready')
    const isCompleted =
      lessons.length > 0 && lessons.every((l) => l.status === 'ready')
    return {
      ...course,
      lessonCount,
      lastOpenedAt,
      hasActiveLessons,
      isCompleted,
    }
  })
}

/**
 * Create a new course. Throws if not authenticated.
 */
export async function createCourse(input) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: user.id,
      title: input.title,
      term: input.term || null,
      color: input.color || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create course: ${error.message}`)
  return transformCourse(data)
}

export function searchCourses(courses, query) {
  if (!query.trim()) return courses
  const q = query.trim().toLowerCase()
  return courses.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      (c.term && c.term.toLowerCase().includes(q))
  )
}

/**
 * Delete a course and its lessons (cascade). Throws if not authenticated or not found.
 */
async function deleteCourse(id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase.from('courses').delete().eq('id', id).eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete course: ${error.message}`)
}

export { deleteCourse }
