/**
 * Lesson assets – list and display metadata from Supabase lesson_assets.
 * Synced with app and Supabase; same data as study-os-mobile.
 * When a new asset is uploaded, the notes_append_from_asset edge function
 * is invoked so the lesson's single notes file is updated for all generations.
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isValidUuid(str) {
  return typeof str === 'string' && UUID_REGEX.test(str)
}

function displayTitle(storagePath, kind) {
  if (!storagePath || typeof storagePath !== 'string') return kind ? `${kind} asset` : 'Untitled'
  const segment = storagePath.split('/').filter(Boolean).pop()
  return segment || kind || 'Untitled'
}

function displaySize(row) {
  if (row.duration_ms != null && (row.kind === 'audio' || row.kind === 'video')) {
    const s = Math.floor(row.duration_ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }
  return row.kind || '—'
}

/**
 * Fetch all assets for a lesson. Returns [] if not authenticated or invalid lessonId.
 * Each item: { id, title, type (kind), size, storageBucket, storagePath } for optional signed URL later.
 */
export async function fetchLessonAssets(lessonId) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  if (!isValidUuid(lessonId)) return []

  const { data, error } = await supabase
    .from('lesson_assets')
    .select('id, kind, storage_bucket, storage_path, duration_ms, created_at')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch lesson assets:', error.message)
    return []
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: displayTitle(row.storage_path, row.kind),
    type: row.kind || 'other',
    size: displaySize(row),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
  }))
}

/** Must match storage bucket id and RLS: lesson-assets (hyphen). See 013_fix_storage_buckets. */
const BUCKET = 'lesson-assets'

function kindFromMime(mime) {
  if (!mime) return 'other'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('text/')) return 'notes'
  return 'other'
}

function safeFilename(name) {
  const base = (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : ''
  const stem = ext ? base.slice(0, base.length - ext.length) : base
  return stem + ext || 'file'
}

/**
 * Upload a file as a lesson asset. Returns the new asset row or throws.
 */
export async function uploadLessonAsset(lessonId, file) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  if (!isValidUuid(lessonId)) throw new Error('Invalid lesson')

  const mime = file.type || 'application/octet-stream'
  const kind = kindFromMime(mime)
  const unique = `${Date.now()}-${safeFilename(file.name)}`
  const storagePath = `${user.id}/${lessonId}/${unique}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: mime, upsert: false })

  if (uploadError) throw new Error(uploadError.message)

  const { data: row, error: insertError } = await supabase
    .from('lesson_assets')
    .insert({
      lesson_id: lessonId,
      user_id: user.id,
      kind,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: mime,
      duration_ms: null,
    })
    .select('id, kind, storage_bucket, storage_path, duration_ms, created_at')
    .single()

  if (insertError) throw new Error(insertError.message)

  // Append this asset's content to the lesson notes (fire-and-forget)
  const { data: { session } } = await supabase.auth.getSession()
  const functionsUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/notes_append_from_asset`
  fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ lesson_id: lessonId, asset_id: row.id }),
  }).catch((err) => console.warn('notes_append_from_asset:', err.message))

  return {
    id: row.id,
    title: displayTitle(row.storage_path, row.kind),
    type: row.kind || 'other',
    size: displaySize(row),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
  }
}
