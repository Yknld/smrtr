/**
 * Video – fetch signed URL for lesson video, trigger generation.
 * Mirrors study-os-mobile LessonHub handlePlayVideo / handleGenerateVideo.
 */
import { supabase, SUPABASE_URL } from '../config/supabase'

const VIDEO_BUCKET = 'lesson-assets'
const SIGNED_URL_EXPIRY_SEC = 3600

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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/lesson_generate_video`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: lessonId,
      aspect_ratios: ['16:9'],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error || 'Failed to generate video')
  }
  const body = await res.json()
  return { video_id: body.video_id }
}
