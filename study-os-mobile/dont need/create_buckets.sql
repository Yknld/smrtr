-- Create storage buckets for lesson assets
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

-- Create bucket for TTS audio
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
