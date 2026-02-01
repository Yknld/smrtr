/**
 * Podcasts data layer – Supabase (courses with podcasts, course podcasts, episode/segments).
 * Mirrors study-os-mobile apps/mobile/src/data/podcasts.repository.ts
 */
import { supabase, SUPABASE_URL } from '../config/supabase'

/**
 * @typedef {'queued'|'scripting'|'voicing'|'ready'|'failed'} PodcastStatus
 * @typedef {{ id: string, title: string, color?: string, podcastCount: number, lastPodcastAt: Date }} CourseWithPodcasts
 * @typedef {{ id: string, lessonId: string, lessonTitle: string, storageUrl: string, durationMs?: number, createdAt: Date }} LessonPodcast
 * @typedef {{ id: string, userId: string, lessonId: string, status: PodcastStatus, title: string|null, totalSegments: number, error: string|null, createdAt: Date, updatedAt: Date }} PodcastEpisode
 * @typedef {{ id: string, episodeId: string, seq: number, speaker: 'a'|'b', text: string, ttsStatus: string, audioBucket: string|null, audioPath: string|null, durationMs: number|null, signedUrl?: string }} PodcastSegment
 */

/**
 * Fetch all courses that have at least one ready podcast episode.
 * @returns {Promise<CourseWithPodcasts[]>}
 */
export async function fetchCoursesWithPodcasts() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      color,
      lessons!inner (
        id,
        podcast_episodes!inner (
          id,
          status,
          created_at
        )
      )
    `)
    .eq('user_id', user.id)
    .filter('lessons.podcast_episodes', 'status', 'eq', 'ready')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch courses with podcasts: ${error.message}`)
  if (!data || data.length === 0) return []

  const coursesMap = new Map()
  for (const course of data) {
    if (!coursesMap.has(course.id)) {
      const lessons = course.lessons || []
      let podcastCount = 0
      let latestDate = null
      for (const lesson of lessons) {
        const episodes = lesson.podcast_episodes || []
        podcastCount += episodes.length
        for (const ep of episodes) {
          const d = new Date(ep.created_at)
          if (!latestDate || d > latestDate) latestDate = d
        }
      }
      if (podcastCount > 0 && latestDate) {
        coursesMap.set(course.id, {
          id: course.id,
          title: course.title,
          color: course.color,
          podcastCount,
          lastPodcastAt: latestDate,
        })
      }
    }
  }
  return Array.from(coursesMap.values()).sort((a, b) => b.lastPodcastAt.getTime() - a.lastPodcastAt.getTime())
}

/**
 * Fetch all lessons with ready podcast episodes for a course.
 * @param {string} courseId
 * @returns {Promise<LessonPodcast[]>}
 */
export async function fetchCoursePodcasts(courseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      podcast_episodes!inner (
        id,
        status,
        created_at
      )
    `)
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('podcast_episodes.status', 'ready')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch course podcasts: ${error.message}`)
  if (!data || data.length === 0) return []

  const podcasts = []
  for (const lesson of data) {
    const episodes = lesson.podcast_episodes || []
    for (const ep of episodes) {
      podcasts.push({
        id: ep.id,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        storageUrl: '',
        durationMs: undefined,
        createdAt: new Date(ep.created_at),
      })
    }
  }
  return podcasts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Create a new podcast episode (Edge Function).
 * @param {string} lessonId
 * @returns {Promise<{ episodeId: string, status: string }>}
 */
export async function createPodcastEpisode(lessonId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/podcast_create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lesson_id: lessonId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to create podcast: ${res.status}`)
  }
  const body = await res.json()
  return { episodeId: body.episode_id, status: body.status }
}

/**
 * Generate podcast script (Edge Function).
 * @param {string} episodeId
 * @returns {Promise<{ episodeId: string, title: string, totalSegments: number }>}
 */
export async function generatePodcastScript(episodeId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/podcast_generate_script`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ episode_id: episodeId, duration_min: 8, style: 'direct_review' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to generate podcast script')
  }
  const body = await res.json()
  return { episodeId: body.episode_id, title: body.title, totalSegments: body.total_segments }
}

/**
 * Generate podcast audio (Edge Function).
 * @param {string} episodeId
 * @returns {Promise<{ episodeId: string, processed: number, failed: number, status: string }>}
 */
export async function generatePodcastAudio(episodeId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/podcast_generate_audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ episode_id: episodeId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to generate podcast audio')
  }
  const body = await res.json()
  return { episodeId: body.episode_id, processed: body.processed, failed: body.failed, status: body.status }
}

/**
 * Fetch podcast episode for a lesson (most recent).
 * @param {string} lessonId
 * @returns {Promise<PodcastEpisode|null>}
 */
export async function fetchPodcastEpisode(lessonId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch podcast episode: ${error.message}`)
  }
  return {
    id: data.id,
    userId: data.user_id,
    lessonId: data.lesson_id,
    status: data.status,
    title: data.title,
    totalSegments: data.total_segments,
    error: data.error,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

/**
 * Fetch podcast segments for an episode with signed/public URLs.
 * @param {string} episodeId
 * @returns {Promise<PodcastSegment[]>}
 */
export async function fetchPodcastSegments(episodeId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('podcast_segments')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('user_id', user.id)
    .order('seq', { ascending: true })

  if (error) throw new Error(`Failed to fetch podcast segments: ${error.message}`)
  if (!data || data.length === 0) return []

  const segments = []
  for (const seg of data) {
    let signedUrl
    if (seg.audio_bucket && seg.audio_path && seg.tts_status === 'ready') {
      const { data: publicUrlData } = supabase.storage.from(seg.audio_bucket).getPublicUrl(seg.audio_path)
      if (publicUrlData?.publicUrl) {
        signedUrl = publicUrlData.publicUrl
      } else {
        const { data: urlData } = await supabase.storage.from(seg.audio_bucket).createSignedUrl(seg.audio_path, 7200)
        signedUrl = urlData?.signedUrl
      }
    }
    segments.push({
      id: seg.id,
      episodeId: seg.episode_id,
      seq: seg.seq,
      speaker: seg.speaker,
      text: seg.text,
      ttsStatus: seg.tts_status,
      audioBucket: seg.audio_bucket,
      audioPath: seg.audio_path,
      durationMs: seg.duration_ms,
      signedUrl,
    })
  }
  return segments
}
