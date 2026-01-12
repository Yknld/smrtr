# lesson_youtube_resource_add

Add YouTube videos as supplementary learning resources to lessons - like creating a helpful "playlist" for each topic.

## Overview

This function allows users to build a collection of helpful YouTube videos for each lesson. Think of it as curating a "learning playlist" where users can add videos that help explain difficult concepts, provide alternative explanations, or supplement the main lesson content.

### Use Cases

- Student struggling with recursion → adds 3 helpful YouTube videos to that lesson
- Medical student needs visual anatomy explanations → adds Khan Academy videos
- Language learner wants pronunciation help → adds native speaker videos
- Physics student confused about quantum mechanics → adds PBS SpaceTime explainers

## API Specification

### Endpoint

```
POST /lesson_youtube_resource_add
```

### Authentication

Requires JWT authentication via `Authorization` header.

### Request Body

```json
{
  "lesson_id": "uuid",
  "youtube_url": "string",
  "title": "string",
  "notes": "string (optional)",
  "topic": "string (optional)",
  "is_recommended": "boolean (optional)"
}
```

**Parameters:**

- `lesson_id` (required): UUID of the lesson to add the resource to
- `youtube_url` (required): YouTube video URL or video ID
- `title` (required): User's custom title for this resource (e.g., "Best Recursion Explanation")
- `notes` (optional): Why this video is helpful (e.g., "Watch this first!", "Good visual diagrams")
- `topic` (optional): Specific concept this helps with (e.g., "Binary Search", "Photosynthesis")
- `is_recommended` (optional): Mark as a top pick (default: false)

### Success Response

**Status Code:** `200 OK`

```json
{
  "resource_id": "uuid",
  "youtube_video_id": "uuid",
  "video_id": "dQw4w9WgXcQ",
  "title": "Best Recursion Explanation",
  "notes": "Watch this first!",
  "topic": "Recursion",
  "is_recommended": true,
  "display_order": 0,
  "thumbnail_url": "https://i.ytimg.com/vi/...",
  "duration_seconds": 600,
  "message": "Resource added successfully"
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "error": {
    "code": "INVALID_TITLE",
    "message": "title is required and must not be empty"
  }
}
```

**Error Codes:**
- `INVALID_REQUEST` - Invalid JSON
- `INVALID_LESSON_ID` - Missing lesson_id
- `INVALID_URL` - Missing youtube_url
- `INVALID_TITLE` - Missing or empty title
- `INVALID_YOUTUBE_URL` - URL format not recognized

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Lesson not found or access denied"
  }
}
```

## Database Schema

### New Tables

#### `youtube_videos` (Cache Table)

Shared cache of YouTube video metadata across all users:

```sql
CREATE TABLE youtube_videos (
  id uuid PRIMARY KEY,
  video_id text UNIQUE,           -- YouTube video ID
  title text,                     -- Fetched from YouTube
  description text,
  channel_name text,
  duration_seconds int,
  thumbnail_url text,
  published_at timestamptz,
  last_fetched_at timestamptz,
  metadata_stale boolean,
  created_at timestamptz,
  updated_at timestamptz
);
```

#### `lesson_youtube_resources` (User's Playlists)

Links YouTube videos to lessons as learning resources:

```sql
CREATE TABLE lesson_youtube_resources (
  id uuid PRIMARY KEY,
  user_id uuid,                   -- Owner
  lesson_id uuid,                 -- Which lesson
  youtube_video_id uuid,          -- Links to youtube_videos
  title text,                     -- User's custom title
  notes text,                     -- User's notes
  topic text,                     -- What concept this helps with
  display_order int,              -- Playlist order
  is_recommended boolean,         -- User's top picks
  times_watched int,              -- Usage tracking
  last_watched_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

## Features

### ✅ Smart Caching

- YouTube metadata cached in `youtube_videos` table
- Shared across all users (reduces API calls)
- Automatic cache updates when stale

### ✅ User-Specific Playlists

- Each user can add different videos to same lesson
- Custom titles and notes per user
- Personal organization and ordering

### ✅ Rich Metadata

- Video titles and thumbnails
- Duration information
- Channel names
- Custom topics and tags

### ✅ Organization

- `display_order`: Arrange videos in preferred sequence
- `is_recommended`: Mark must-watch videos
- `topic`: Group by concepts (e.g., all "Binary Search" videos)

### ✅ Usage Tracking

- `times_watched`: Track how often you watch each video
- `last_watched_at`: See recently used resources

## Usage Examples

### Example 1: Add a Helpful Tutorial

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_resource_add" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Clear Explanation of Recursion",
    "notes": "Watch this first! Very beginner-friendly",
    "topic": "Recursion Basics",
    "is_recommended": true
  }'
```

### Example 2: Add Multiple Videos for Same Topic

```bash
# Video 1: Introduction
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_resource_add" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
    "youtube_url": "https://youtu.be/VIDEO_ID_1",
    "title": "Binary Search - Introduction",
    "topic": "Binary Search"
  }'

# Video 2: Advanced concepts
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_resource_add" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
    "youtube_url": "https://youtu.be/VIDEO_ID_2",
    "title": "Binary Search - Advanced Applications",
    "topic": "Binary Search",
    "notes": "Watch after the intro video"
  }'
```

### Example 3: Quick Add with Just Essentials

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_youtube_resource_add" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
    "youtube_url": "dQw4w9WgXcQ",
    "title": "Quick Reference Video"
  }'
```

## Querying Resources

### Get All Resources for a Lesson

```sql
SELECT 
  lyr.id,
  lyr.title,
  lyr.notes,
  lyr.topic,
  lyr.is_recommended,
  lyr.display_order,
  lyr.times_watched,
  yv.video_id,
  yv.title as youtube_title,
  yv.thumbnail_url,
  yv.duration_seconds,
  yv.channel_name
FROM lesson_youtube_resources lyr
JOIN youtube_videos yv ON yv.id = lyr.youtube_video_id
WHERE lyr.lesson_id = 'your-lesson-id'
  AND lyr.user_id = auth.uid()
ORDER BY lyr.display_order;
```

### Get Recommended Videos Only

```sql
SELECT *
FROM lesson_youtube_resources lyr
JOIN youtube_videos yv ON yv.id = lyr.youtube_video_id
WHERE lyr.lesson_id = 'your-lesson-id'
  AND lyr.user_id = auth.uid()
  AND lyr.is_recommended = true
ORDER BY lyr.display_order;
```

### Get Videos by Topic

```sql
SELECT *
FROM lesson_youtube_resources lyr
JOIN youtube_videos yv ON yv.id = lyr.youtube_video_id
WHERE lyr.lesson_id = 'your-lesson-id'
  AND lyr.user_id = auth.uid()
  AND lyr.topic = 'Binary Search'
ORDER BY lyr.display_order;
```

### Get Most Watched Resources

```sql
SELECT *
FROM lesson_youtube_resources lyr
JOIN youtube_videos yv ON yv.id = lyr.youtube_video_id
WHERE lyr.lesson_id = 'your-lesson-id'
  AND lyr.user_id = auth.uid()
ORDER BY lyr.times_watched DESC
LIMIT 5;
```

## Frontend Integration

### React Native / TypeScript Example

```typescript
// Add a YouTube resource
const addYouTubeResource = async (
  lessonId: string,
  youtubeUrl: string,
  title: string,
  notes?: string,
  topic?: string,
  isRecommended?: boolean
) => {
  const { data, error } = await supabase.functions.invoke(
    'lesson_youtube_resource_add',
    {
      body: {
        lesson_id: lessonId,
        youtube_url: youtubeUrl,
        title,
        notes,
        topic,
        is_recommended: isRecommended,
      },
    }
  );

  if (error) throw error;
  return data;
};

// Fetch resources for a lesson
const getLessonResources = async (lessonId: string) => {
  const { data, error } = await supabase
    .from('lesson_youtube_resources')
    .select(`
      *,
      youtube_videos (
        video_id,
        title,
        thumbnail_url,
        duration_seconds,
        channel_name
      )
    `)
    .eq('lesson_id', lessonId)
    .order('display_order');

  if (error) throw error;
  return data;
};

// Increment watch count
const markVideoWatched = async (resourceId: string) => {
  const { error } = await supabase.rpc(
    'increment_youtube_resource_watch_count',
    {
      p_resource_id: resourceId,
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
    }
  );

  if (error) throw error;
};

// Usage in a component
const LessonScreen = ({ lessonId }: { lessonId: string }) => {
  const [resources, setResources] = useState([]);

  const handleAddResource = async () => {
    try {
      await addYouTubeResource(
        lessonId,
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'Helpful Explanation',
        'Watch this for better understanding',
        'Core Concepts',
        true
      );
      
      // Refresh list
      const updated = await getLessonResources(lessonId);
      setResources(updated);
      
      Alert.alert('Success', 'Resource added!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <Button title="Add YouTube Resource" onPress={handleAddResource} />
      <FlatList
        data={resources}
        renderItem={({ item }) => (
          <VideoResourceCard
            resource={item}
            onWatch={() => markVideoWatched(item.id)}
          />
        )}
      />
    </View>
  );
};
```

## Helper Functions

### Add Resource (used by Edge Function)

```sql
SELECT add_youtube_resource_to_lesson(
  p_user_id := auth.uid(),
  p_lesson_id := 'lesson-uuid',
  p_video_id := 'dQw4w9WgXcQ',
  p_title := 'Helpful Video',
  p_notes := 'Great explanation',
  p_topic := 'Recursion',
  p_is_recommended := true
);
```

### Increment Watch Count

```sql
SELECT increment_youtube_resource_watch_count(
  p_resource_id := 'resource-uuid',
  p_user_id := auth.uid()
);
```

### Find or Create YouTube Video

```sql
SELECT find_or_create_youtube_video(
  p_video_id := 'dQw4w9WgXcQ',
  p_title := 'Video Title',
  p_description := 'Description',
  p_channel_name := 'Channel Name',
  p_duration_seconds := 600,
  p_thumbnail_url := 'https://...'
);
```

## Security

### RLS Policies

#### `youtube_videos` (Public Cache)
- ✅ Anyone can read (public YouTube data)
- ✅ Authenticated users can insert new videos
- ✅ Authenticated users can update stale metadata
- ❌ No delete (cache persists)

#### `lesson_youtube_resources` (Private Playlists)
- ✅ Users can only see their own resources
- ✅ Users can only add resources to their own lessons
- ✅ Users can only update/delete their own resources

## Deployment

```bash
cd supabase/migrations
supabase db push

cd ../functions/lesson_youtube_resource_add
supabase functions deploy lesson_youtube_resource_add
```

## Related Functions

- `lesson_create_from_youtube` - Import YouTube video as primary lesson content
- Future: `lesson_youtube_resource_update` - Update resource metadata
- Future: `lesson_youtube_resource_delete` - Remove resource
- Future: `lesson_youtube_resource_reorder` - Change playlist order

## Future Enhancements

- [ ] Batch add multiple videos at once
- [ ] Fetch video metadata from YouTube API
- [ ] Auto-generate topics using AI
- [ ] Share playlists with other users
- [ ] Import entire YouTube playlists
- [ ] Video timestamps/bookmarks within resources
- [ ] Rating system for resources
- [ ] Comments on resources

## Support

See migration file: `supabase/migrations/010_create_youtube_videos.sql`
