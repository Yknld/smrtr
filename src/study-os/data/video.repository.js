/**
 * Video – fetch signed URL for lesson video, trigger generation.
 * Mirrors study-os-mobile LessonHub handlePlayVideo / handleGenerateVideo.
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase'

const VIDEO_BUCKET = 'lesson-assets'
const SIGNED_URL_EXPIRY_SEC = 3600

/**
 * Status for hub tile: 'generate' | 'generating' | 'generated'
 * @param {string} lessonId
 * @returns {Promise<'generate'|'generating'|'generated'>}
 */
export async function fetchVideoStatus(lessonId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'generate'

  const { data: rows, error } = await supabase
    .from('lesson_assets')
    .select('storage_path')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .eq('kind', 'video')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !rows || rows.length === 0) return 'generate'
  return rows[0].storage_path ? 'generated' : 'generating'
}

/**
 * Fetch the most recent video asset for a lesson and return a signed playback URL.
 * @param {string} lessonId
 * @returns {Promise<{ videoUrl: string } | null>}
 */
export async function fetchVideoForLesson(lessonId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: videos, error } = await supabase
    .from('lesson_assets')
    .select('id, storage_path, storage_bucket')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .eq('kind', 'video')
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to fetch video: ${error.message}`)
  if (!videos || videos.length === 0) return null

  const video = videos[0]
  const bucket = video.storage_bucket || VIDEO_BUCKET
  const { data: urlData, error: urlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(video.storage_path, SIGNED_URL_EXPIRY_SEC)

  if (urlError || !urlData?.signedUrl) throw new Error('Failed to get video URL')
  return { videoUrl: urlData.signedUrl }
}

/**
 * Trigger video generation for a lesson (Edge Function).
 * @param {string} lessonId
 * @returns {Promise<{ video_id: string }>}
 */
export async function generateVideo(lessonId) {
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) throw new Error('Session expired. Please sign out and sign in again.')
  if (!session) throw new Error('User not authenticated')

  // In dev, use Vite proxy to avoid CORS (browser → same-origin → proxy → Supabase).
  const base =
    typeof import.meta.env.DEV !== 'undefined' && import.meta.env.DEV && typeof window !== 'undefined'
      ? `${window.location.origin}/supabase-functions`
      : `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`
  const url = `${base}/lesson_generate_video`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      lesson_id: lessonId,
      aspect_ratios: ['16:9'],
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      body?.error?.message ??
      (typeof body?.error === 'string' ? body.error : null) ??
      body?.message ??
      `Failed to generate video (${res.status})`
    throw new Error(msg)
  }
  return { video_id: body.video_id }
}
