# Podcast Screen Fix - Display Issue Resolution

## Issue Summary

The podcast home screen was not displaying podcasts even after they were successfully generated and marked as "ready" in the database. Users could generate podcasts, but they would not appear in:
- The Podcasts tab home screen (list of courses with podcasts)
- The course-specific podcast list screen

## Root Cause

The podcast display queries were looking for podcasts in the **wrong database table**:

### What Was Wrong
- **Queries searched**: `lesson_assets` table with `kind = 'audio'`
- **Actual storage**: Podcasts are stored in the `podcast_episodes` and `podcast_segments` tables
- **Architecture mismatch**: The podcast generation system uses a segment-based architecture (multiple audio files per episode), not a single consolidated audio file in `lesson_assets`

### Why This Happened
When the podcast system was built, it used a modern segment-based architecture:
1. `podcast_episodes` table stores episode metadata and status
2. `podcast_segments` table stores individual dialogue segments with audio files in `tts_audio` bucket
3. The `PodcastPlayerScreen` loads and plays these segments sequentially

However, the podcast listing screens (`PodcastsScreen` and `CoursePodcastsScreen`) were querying the older `lesson_assets` table, which is used for other asset types (PDFs, images, etc.) but not for podcasts.

## Solution Implemented

### Files Modified
- `/study-os-mobile/apps/mobile/src/data/podcasts.repository.ts`

### Changes Made

#### 1. `fetchCoursesWithPodcasts()` Function
**Before**: Queried `lesson_assets` for `kind = 'audio'`
```typescript
.from('courses')
.select(`
  id,
  title,
  color,
  lessons!inner (
    id,
    lesson_assets!inner (
      id,
      kind,
      created_at
    )
  )
`)
.eq('lessons.lesson_assets.kind', 'audio')
```

**After**: Queries `podcast_episodes` for `status = 'ready'`
```typescript
.from('courses')
.select(`
  id,
  title,
  color,
  lessons!inner (
    id,
    podcast_episodes!inner (
      id,
      status,
      created_at
    )
  )
`)
.eq('lessons.podcast_episodes.status', 'ready')
```

#### 2. `fetchCoursePodcasts()` Function
**Before**: Queried `lesson_assets` for audio files and generated signed URLs
```typescript
.from('lessons')
.select(`
  id,
  title,
  lesson_assets!inner (
    id,
    kind,
    storage_bucket,
    storage_path,
    duration_ms,
    created_at
  )
`)
.eq('lesson_assets.kind', 'audio')
```

**After**: Queries `podcast_episodes` for ready episodes
```typescript
.from('lessons')
.select(`
  id,
  title,
  podcast_episodes!inner (
    id,
    status,
    created_at
  )
`)
.eq('podcast_episodes.status', 'ready')
```

## How It Works Now

### User Flow
1. **Generate Podcast**: User generates a podcast from a lesson
   - Creates `podcast_episodes` record with `status = 'queued'`
   - Generates script and creates `podcast_segments` records
   - Generates audio for each segment via TTS API
   - Updates episode `status = 'ready'` when all segments complete

2. **View Podcasts**: User navigates to Podcasts tab
   - `fetchCoursesWithPodcasts()` queries for courses with ready podcast episodes
   - Displays courses grouped by podcast count and last update date

3. **Select Course**: User taps a course
   - `fetchCoursePodcasts(courseId)` queries for all ready episodes in that course
   - Displays list of lessons with available podcasts

4. **Play Podcast**: User taps a lesson
   - Navigates to `PodcastPlayerScreen` with `lessonId`
   - Player loads episode and segments from `podcast_episodes` and `podcast_segments`
   - Plays segments sequentially for seamless audio experience

### Navigation Paths

#### Path 1: Podcasts Tab → Course → Lesson → Player
```
PodcastsScreen (courses with podcasts)
  ↓
CoursePodcastsScreen (lessons in course)
  ↓
PodcastPlayerScreen (plays segments)
```

#### Path 2: Lesson Hub → Player
```
LessonHubScreen (lesson actions)
  ↓
PodcastPlayerScreen (plays segments)
```

## Database Schema Reference

### podcast_episodes Table
- `id` (uuid): Episode identifier
- `user_id` (uuid): Owner
- `lesson_id` (uuid): Associated lesson
- `status` (text): 'queued' | 'scripting' | 'voicing' | 'ready' | 'failed'
- `title` (text): Episode title
- `created_at` (timestamptz): Creation timestamp

### podcast_segments Table
- `id` (uuid): Segment identifier
- `episode_id` (uuid): Parent episode
- `seq` (int): Playback sequence number
- `speaker` (text): 'a' | 'b' (host/co-host)
- `text` (text): Dialogue text
- `tts_status` (text): 'queued' | 'generating' | 'ready' | 'failed'
- `audio_bucket` (text): Storage bucket (usually 'tts_audio')
- `audio_path` (text): Path to audio file
- `duration_ms` (int): Segment duration in milliseconds

## Testing Checklist

- [ ] Generate a new podcast for a lesson
- [ ] Verify it appears in the Podcasts tab home screen
- [ ] Tap the course to see the lesson list
- [ ] Verify the lesson with the podcast appears
- [ ] Tap the lesson to play the podcast
- [ ] Verify audio plays correctly
- [ ] Test navigation from Lesson Hub → Podcast Player
- [ ] Verify pull-to-refresh updates the lists

## Notes

- The `storageUrl` field in `LessonPodcast` interface is now empty because podcasts use segments, not single files
- The `PodcastPlayerScreen` already handles segment-based playback correctly
- No changes needed to the player logic
- The fix only updates the query logic in the repository functions
- RLS policies ensure users only see their own podcasts

## Future Improvements

Consider these enhancements:
1. Cache total podcast duration in `podcast_episodes` table for better UX
2. Add thumbnail/artwork generation for podcast episodes
3. Implement offline download by bundling all segments
4. Add podcast sharing functionality
5. Track listening progress and resume playback

## Related Files

- `/study-os-mobile/apps/mobile/src/screens/Podcasts/PodcastsScreen.tsx`
- `/study-os-mobile/apps/mobile/src/screens/Podcasts/CoursePodcastsScreen.tsx`
- `/study-os-mobile/apps/mobile/src/screens/Podcasts/PodcastPlayerScreen.tsx`
- `/study-os-mobile/apps/mobile/src/screens/LessonHub/LessonHubScreen.tsx`
- `/study-os-mobile/supabase/migrations/011_create_podcast_tables.sql`
- `/study-os-mobile/supabase/functions/podcast_create/index.ts`
- `/study-os-mobile/supabase/functions/podcast_generate_script/index.ts`
- `/study-os-mobile/supabase/functions/podcast_generate_audio/index.ts`
