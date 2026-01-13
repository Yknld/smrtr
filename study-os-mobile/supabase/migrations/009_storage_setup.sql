-- Migration 009: Storage Buckets and Policies
-- Create storage buckets for lesson assets and TTS audio with RLS-style policies

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Bucket for lesson assets (PDFs, audio files, images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson_assets',
  'lesson_assets',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/m4a',
    'audio/x-m4a',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/json'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for TTS audio (live sessions + podcast episodes)
-- Paths:
--   - Live sessions: tts/{user_id}/{study_session_id}/{target_lang}/chunk_{seq}.mp3
--   - Podcasts: podcasts/{user_id}/{episode_id}/seg_{seq}_{speaker}.mp3
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts_audio',
  'tts_audio',
  false,
  10485760, -- 10MB limit per chunk
  ARRAY[
    'audio/mpeg',
    'audio/mp3'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES FOR LESSON_ASSETS
-- =============================================================================

-- Policy: Users can SELECT (read) their own lesson assets
-- Path format: lesson-assets/{user_id}/{lesson_id}/{filename}
CREATE POLICY "Users can read own lesson assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can INSERT (upload) to their own lesson assets folder
CREATE POLICY "Users can upload own lesson assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can UPDATE (replace) their own lesson assets
CREATE POLICY "Users can update own lesson assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lesson_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can DELETE their own lesson assets
CREATE POLICY "Users can delete own lesson assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- STORAGE POLICIES FOR TTS_AUDIO
-- =============================================================================

-- Policy: Users can SELECT (read) their own TTS audio
-- Path formats:
--   - Live sessions: tts/{user_id}/{study_session_id}/{target_lang}/chunk_{seq}.mp3
--   - Podcasts: podcasts/{user_id}/{episode_id}/seg_{seq}_{speaker}.mp3
CREATE POLICY "Users can read own tts audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tts_audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can INSERT (upload) to their own TTS audio folder
CREATE POLICY "Users can upload own tts audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tts_audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can UPDATE (replace) their own TTS audio
CREATE POLICY "Users can update own tts audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tts_audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'tts_audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can DELETE their own TTS audio
CREATE POLICY "Users can delete own tts audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tts_audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
