-- Store RunPod job ID on segments so we can submit many jobs then poll in a later invocation.
ALTER TABLE podcast_segments
  ADD COLUMN IF NOT EXISTS runpod_job_id text;

COMMENT ON COLUMN podcast_segments.runpod_job_id IS 'RunPod TTS job ID while tts_status=generating; cleared when ready or failed';
