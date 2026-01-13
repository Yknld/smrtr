-- ============================================================================
-- Migration: Create YouTube Integration Tables
-- ============================================================================
-- 
-- Purpose: Store YouTube video metadata and link videos to lessons
-- 
-- Tables:
--   - youtube_videos: Stores YouTube video metadata
--   - youtube_lesson_resources: Links videos to lessons
-- 
-- ============================================================================

-- Create youtube_videos table
CREATE TABLE IF NOT EXISTS youtube_videos (
  video_id text PRIMARY KEY,
  title text NOT NULL,
  channel_name text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  thumbnail_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE youtube_videos IS 'Stores YouTube video metadata';
COMMENT ON COLUMN youtube_videos.video_id IS 'YouTube video ID (e.g., dQw4w9WgXcQ)';
COMMENT ON COLUMN youtube_videos.duration_seconds IS 'Video duration in seconds';

-- Create youtube_lesson_resources table  
CREATE TABLE IF NOT EXISTS youtube_lesson_resources (
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  video_id text NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, video_id)
);

COMMENT ON TABLE youtube_lesson_resources IS 'Links YouTube videos to lessons';
COMMENT ON COLUMN youtube_lesson_resources.is_primary IS 'Whether this is the primary/featured video for the lesson';

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_youtube_lesson_resources_lesson_id 
  ON youtube_lesson_resources(lesson_id);
  
CREATE INDEX IF NOT EXISTS idx_youtube_lesson_resources_video_id 
  ON youtube_lesson_resources(video_id);
  
CREATE INDEX IF NOT EXISTS idx_youtube_lesson_resources_added_at 
  ON youtube_lesson_resources(added_at DESC);

-- Enable Row Level Security
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_lesson_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for youtube_videos (public read, authenticated write)
DROP POLICY IF EXISTS "Anyone can read youtube videos" ON youtube_videos;
CREATE POLICY "Anyone can read youtube videos"
  ON youtube_videos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert youtube videos" ON youtube_videos;
CREATE POLICY "Authenticated users can insert youtube videos"
  ON youtube_videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update youtube videos" ON youtube_videos;
CREATE POLICY "Authenticated users can update youtube videos"
  ON youtube_videos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for youtube_lesson_resources (user owns lesson)
DROP POLICY IF EXISTS "Users can read their lesson youtube resources" ON youtube_lesson_resources;
CREATE POLICY "Users can read their lesson youtube resources"
  ON youtube_lesson_resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = youtube_lesson_resources.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert youtube resources for their lessons" ON youtube_lesson_resources;
CREATE POLICY "Users can insert youtube resources for their lessons"
  ON youtube_lesson_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = youtube_lesson_resources.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update youtube resources for their lessons" ON youtube_lesson_resources;
CREATE POLICY "Users can update youtube resources for their lessons"
  ON youtube_lesson_resources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = youtube_lesson_resources.lesson_id
        AND lessons.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = youtube_lesson_resources.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete youtube resources for their lessons" ON youtube_lesson_resources;
CREATE POLICY "Users can delete youtube resources for their lessons"
  ON youtube_lesson_resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = youtube_lesson_resources.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );
