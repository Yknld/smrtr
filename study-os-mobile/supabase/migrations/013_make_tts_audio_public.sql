-- Migration 013: Make tts_audio bucket public for podcast playback
-- This allows mobile apps to directly access podcast audio files without authentication

UPDATE storage.buckets
SET public = true
WHERE id = 'tts_audio';
