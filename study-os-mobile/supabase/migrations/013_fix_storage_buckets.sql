-- Fix storage bucket names to match what the app expects
-- The app uses 'lesson-assets' with a hyphen, not 'lesson_assets' with underscore

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-assets',
  'lesson-assets',
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

-- Also create tts_audio bucket
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

-- Add RLS policies for lesson-assets (with hyphen)
CREATE POLICY IF NOT EXISTS "Users can read own lesson assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can upload own lesson assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can update own lesson assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lesson-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can delete own lesson assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
