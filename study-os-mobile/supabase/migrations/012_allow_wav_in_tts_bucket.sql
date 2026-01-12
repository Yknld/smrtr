-- Migration 012: Allow WAV files in tts_audio bucket
-- Gemini TTS returns PCM audio which we convert to WAV format
-- Update the bucket to accept audio/wav MIME type

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav'
]
WHERE id = 'tts_audio';
