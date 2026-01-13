-- Migration 010: Create YouTube Resource Tables
-- Support adding YouTube videos as supplementary learning resources for lessons

-- =============================================================================
-- YOUTUBE_VIDEOS (Cache Table)
-- =============================================================================
-- Cache YouTube video metadata to avoid repeated API calls
-- Shared across all users (public YouTube data)
CREATE TABLE youtube_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- YouTube video ID (unique identifier from YouTube URL)
  video_id text NOT NULL UNIQUE,
  
  -- Video metadata (fetched from YouTube)
  title text NULL,
  description text NULL,
  channel_name text NULL,
  duration_seconds int NULL,
  thumbnail_url text NULL,
  published_at timestamptz NULL,
  
  -- Cache metadata
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  metadata_stale boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE youtube_videos IS 'Cached YouTube video metadata (shared across all users)';
COMMENT ON COLUMN youtube_videos.video_id IS 'YouTube video ID (11 characters, e.g., dQw4w9WgXcQ)';
COMMENT ON COLUMN youtube_videos.title IS 'Video title from YouTube';
COMMENT ON COLUMN youtube_videos.duration_seconds IS 'Video length in seconds';
COMMENT ON COLUMN youtube_videos.thumbnail_url IS 'URL to video thumbnail image';
COMMENT ON COLUMN youtube_videos.last_fetched_at IS 'Last time metadata was refreshed from YouTube';
COMMENT ON COLUMN youtube_videos.metadata_stale IS 'True if metadata should be refreshed (video deleted, etc.)';

-- =============================================================================
-- LESSON_YOUTUBE_RESOURCES (Junction Table)
-- =============================================================================
-- Links YouTube videos to lessons as supplementary learning resources
-- Think of it as a "help playlist" for each lesson/topic
CREATE TABLE lesson_youtube_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  youtube_video_id uuid NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
  
  -- Resource metadata
  title text NOT NULL,  -- User can customize title
  notes text NULL,      -- User's notes about why this video is helpful
  topic text NULL,      -- Which topic/concept this helps with
  
  -- Ordering and organization
  display_order int NOT NULL DEFAULT 0,
  is_recommended boolean NOT NULL DEFAULT false,  -- User's top picks
  
  -- Usage tracking
  times_watched int NOT NULL DEFAULT 0,
  last_watched_at timestamptz NULL,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lesson_youtube_resources IS 'YouTube videos linked to lessons as supplementary learning resources';
COMMENT ON COLUMN lesson_youtube_resources.title IS 'User-customizable title for this resource';
COMMENT ON COLUMN lesson_youtube_resources.notes IS 'User notes: "Good explanation of recursion" or "Watch this first"';
COMMENT ON COLUMN lesson_youtube_resources.topic IS 'Specific topic this helps with (e.g., "Binary Search", "Photosynthesis")';
COMMENT ON COLUMN lesson_youtube_resources.display_order IS 'Order to display in playlist (lower = first)';
COMMENT ON COLUMN lesson_youtube_resources.is_recommended IS 'User marked as especially helpful';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- YouTube videos table
CREATE INDEX idx_youtube_videos_video_id ON youtube_videos(video_id);
CREATE INDEX idx_youtube_videos_stale ON youtube_videos(metadata_stale) WHERE metadata_stale = true;

-- Lesson YouTube resources table
CREATE INDEX idx_lesson_youtube_resources_lesson ON lesson_youtube_resources(lesson_id, display_order);
CREATE INDEX idx_lesson_youtube_resources_user_lesson ON lesson_youtube_resources(user_id, lesson_id);
CREATE INDEX idx_lesson_youtube_resources_video ON lesson_youtube_resources(youtube_video_id);
CREATE INDEX idx_lesson_youtube_resources_recommended ON lesson_youtube_resources(lesson_id, is_recommended) WHERE is_recommended = true;
CREATE INDEX idx_lesson_youtube_resources_topic ON lesson_youtube_resources(lesson_id, topic) WHERE topic IS NOT NULL;

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Apply the existing update_updated_at_column function
CREATE TRIGGER update_youtube_videos_updated_at
  BEFORE UPDATE ON youtube_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_youtube_resources_updated_at
  BEFORE UPDATE ON lesson_youtube_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_youtube_resources ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- YOUTUBE_VIDEOS POLICIES (Cache table - shared data)
-- -----------------------------------------------------------------------------

-- Policy: Anyone can read YouTube videos (they're public data)
CREATE POLICY "YouTube videos are publicly readable"
  ON youtube_videos
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert new videos
CREATE POLICY "Authenticated users can insert YouTube videos"
  ON youtube_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update videos
-- (To refresh stale metadata)
CREATE POLICY "Authenticated users can update YouTube videos"
  ON youtube_videos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- No DELETE policy - we keep YouTube data cached indefinitely

-- -----------------------------------------------------------------------------
-- LESSON_YOUTUBE_RESOURCES POLICIES (User's personal playlists)
-- -----------------------------------------------------------------------------

-- Policy: Users can view their own YouTube resources
CREATE POLICY "Users can view their own YouTube resources"
  ON lesson_youtube_resources
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can add YouTube resources to their lessons
CREATE POLICY "Users can add YouTube resources to their lessons"
  ON lesson_youtube_resources
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_youtube_resources.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own YouTube resources
CREATE POLICY "Users can update their own YouTube resources"
  ON lesson_youtube_resources
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own YouTube resources
CREATE POLICY "Users can delete their own YouTube resources"
  ON lesson_youtube_resources
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Find or create YouTube video in cache
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_or_create_youtube_video(
  p_video_id text,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_channel_name text DEFAULT NULL,
  p_duration_seconds int DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Try to find existing video in cache
  SELECT id INTO v_id
  FROM youtube_videos
  WHERE video_id = p_video_id;
  
  -- If found, update metadata if provided and currently NULL
  IF v_id IS NOT NULL THEN
    UPDATE youtube_videos
    SET 
      last_fetched_at = now(),
      metadata_stale = false,
      -- Only update if we have new data and field is currently NULL
      title = COALESCE(title, p_title),
      description = COALESCE(description, p_description),
      channel_name = COALESCE(channel_name, p_channel_name),
      duration_seconds = COALESCE(duration_seconds, p_duration_seconds),
      thumbnail_url = COALESCE(thumbnail_url, p_thumbnail_url)
    WHERE id = v_id;
    
    RETURN v_id;
  END IF;
  
  -- If not found, create new cache entry
  INSERT INTO youtube_videos (
    video_id,
    title,
    description,
    channel_name,
    duration_seconds,
    thumbnail_url
  )
  VALUES (
    p_video_id,
    p_title,
    p_description,
    p_channel_name,
    p_duration_seconds,
    p_thumbnail_url
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION find_or_create_youtube_video IS 'Find or create YouTube video in cache, returns UUID';

-- -----------------------------------------------------------------------------
-- Add YouTube resource to lesson
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_youtube_resource_to_lesson(
  p_user_id uuid,
  p_lesson_id uuid,
  p_video_id text,
  p_title text,
  p_notes text DEFAULT NULL,
  p_topic text DEFAULT NULL,
  p_is_recommended boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_youtube_video_id uuid;
  v_resource_id uuid;
  v_max_order int;
BEGIN
  -- Verify user owns the lesson
  IF NOT EXISTS (
    SELECT 1 FROM lessons
    WHERE id = p_lesson_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Lesson not found or access denied';
  END IF;
  
  -- Find or create YouTube video in cache
  v_youtube_video_id := find_or_create_youtube_video(p_video_id, p_title);
  
  -- Get max display_order for this lesson
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order
  FROM lesson_youtube_resources
  WHERE lesson_id = p_lesson_id AND user_id = p_user_id;
  
  -- Create the resource link
  INSERT INTO lesson_youtube_resources (
    user_id,
    lesson_id,
    youtube_video_id,
    title,
    notes,
    topic,
    is_recommended,
    display_order
  )
  VALUES (
    p_user_id,
    p_lesson_id,
    v_youtube_video_id,
    p_title,
    p_notes,
    p_topic,
    p_is_recommended,
    v_max_order + 1
  )
  RETURNING id INTO v_resource_id;
  
  RETURN v_resource_id;
END;
$$;

COMMENT ON FUNCTION add_youtube_resource_to_lesson IS 'Add a YouTube video as a learning resource for a lesson';

-- -----------------------------------------------------------------------------
-- Increment watch count for a resource
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_youtube_resource_watch_count(
  p_resource_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lesson_youtube_resources
  SET 
    times_watched = times_watched + 1,
    last_watched_at = now()
  WHERE id = p_resource_id AND user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION increment_youtube_resource_watch_count IS 'Increment watch count when user watches a resource video';
