# Podcast Navigation Implementation

## Overview

The podcast navigation system provides a hierarchical flow from the Home screen through courses to individual lesson podcasts, with proper mapping to the existing podcast player.

## Navigation Flow

```
Podcasts Tab (Bottom Nav)
    ↓
PodcastsScreen (Course List)
    ↓
CoursePodcastsScreen (Lessons with podcasts in selected course)
    ↓
PodcastPlayerScreen (Full podcast player)
```

## Entry Points

### 1. Podcasts Tab (Primary)
- **Path**: Bottom Navigation → Podcasts Tab
- **Screen**: `PodcastsScreen`
- **Shows**: List of courses that have podcasts
- **Navigation**: Tap a course → `CoursePodcastsScreen`

### 2. Lesson Hub (Secondary)
- **Path**: Home → Course → Lesson Hub → Podcast Action
- **Screen**: `LessonHubScreen` → `PodcastPlayerScreen`
- **Shows**: Direct access to podcast player from lesson
- **Condition**: Only shows "Podcast" button if `hasPodcast` is true

## Screen Details

### PodcastsScreen
**Location**: `src/screens/Podcasts/PodcastsScreen.tsx`

**Purpose**: Shows all courses that have podcasts

**Features**:
- Groups podcasts by course
- Shows course color indicator
- Displays podcast count per course
- Shows last podcast creation date
- Pull-to-refresh support

**Data Source**: `fetchCoursesWithPodcasts()` from `podcasts.repository.ts`

**Navigation**:
```typescript
navigation.navigate('Podcasts', {
  screen: 'CoursePodcasts',
  params: {
    courseId: course.id,
    courseTitle: course.title,
  },
});
```

### CoursePodcastsScreen
**Location**: `src/screens/Podcasts/CoursePodcastsScreen.tsx`

**Purpose**: Shows all lessons with podcasts for a specific course

**Features**:
- Lists all lessons in the course that have audio podcasts
- Shows lesson title, duration, and creation date
- Play button for quick access
- Back button to return to course list
- Pull-to-refresh support

**Data Source**: `fetchCoursePodcasts(courseId)` from `podcasts.repository.ts`

**Navigation**:
```typescript
navigation.navigate('PodcastPlayer', {
  lessonId: podcast.lessonId,
  lessonTitle: podcast.lessonTitle,
  podcastUrl: podcast.storageUrl,
  podcastAvailable: true,
});
```

### PodcastPlayerScreen
**Location**: `src/screens/Podcasts/PodcastPlayerScreen.tsx`

**Purpose**: Full-featured podcast player with playback controls

**Features** (already implemented):
- Play/pause control
- Seek bar with progress
- Playback speed control (1x - 2x)
- Transcript display
- Like/dislike feedback
- Download for offline
- Join mic for Q&A (future feature)

**Route Parameters**:
```typescript
{
  lessonId: string;
  lessonTitle: string;
  podcastUrl?: string;
  podcastAvailable?: boolean;
}
```

## Data Layer

### podcasts.repository.ts
**Location**: `src/data/podcasts.repository.ts`

**Functions**:

1. **fetchCoursesWithPodcasts()**
   - Returns courses that have at least one podcast
   - Includes podcast count and last podcast date
   - Sorted by most recent podcast

2. **fetchCoursePodcasts(courseId)**
   - Returns all lessons with podcasts for a specific course
   - Includes signed URLs for audio files (1 hour expiry)
   - Includes duration and metadata

3. **fetchAllPodcasts()**
   - Returns all podcasts across all courses
   - Includes full course and lesson metadata
   - Used for potential "All Podcasts" view

### lessons.repository.ts Updates
**Location**: `src/data/lessons.repository.ts`

**Changes**:
- Added `lesson_assets` to query
- Added `hasPodcast` to `LessonWithOutputs` interface
- Created `fetchLessonById()` function for single lesson queries

**Logic**:
```typescript
hasPodcast: assets.some((a: any) => a.kind === 'audio')
```

## Database Schema

### Podcast Storage

Podcasts are stored as **lesson_assets** with:
- `kind = 'audio'`
- `storage_bucket = 'lesson-assets'`
- `storage_path = 'lesson-assets/{user_id}/{lesson_id}/{filename}'`
- `mime_type = 'audio/*'` (mp3, m4a, wav, etc.)
- `duration_ms` (optional) for display

### Queries

**Courses with podcasts**:
```sql
SELECT courses.*, COUNT(lesson_assets.id) as podcast_count
FROM courses
INNER JOIN lessons ON lessons.course_id = courses.id
INNER JOIN lesson_assets ON lesson_assets.lesson_id = lessons.id
WHERE lesson_assets.kind = 'audio'
  AND courses.user_id = auth.uid()
GROUP BY courses.id
```

**Lessons with podcasts in a course**:
```sql
SELECT lessons.*, lesson_assets.*
FROM lessons
INNER JOIN lesson_assets ON lesson_assets.lesson_id = lessons.id
WHERE lessons.course_id = :courseId
  AND lessons.user_id = auth.uid()
  AND lesson_assets.kind = 'audio'
```

## Navigation Types

### PodcastsStackParamList
**Location**: `src/types/navigation.ts`

```typescript
export type PodcastsStackParamList = {
  PodcastsMain: undefined;
  CoursePodcasts: {
    courseId: string;
    courseTitle: string;
  };
  PodcastPlayer: {
    lessonId: string;
    lessonTitle: string;
    podcastUrl?: string;
    podcastAvailable?: boolean;
  };
};
```

### AppNavigator Setup
**Location**: `src/navigation/AppNavigator.tsx`

**Stack Definition**:
```typescript
const PodcastsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PodcastsMain" component={PodcastsScreen} />
      <Stack.Screen name="CoursePodcasts" component={CoursePodcastsScreen} />
      <Stack.Screen name="PodcastPlayer" component={PodcastPlayerScreen} />
    </Stack.Navigator>
  );
};
```

## Conditional Display

### LessonHub Podcast Button
The podcast action tile in the Lesson Hub screen only appears if the lesson has a podcast:

```typescript
// In LessonHubScreen
const lesson = await fetchLessonById(lessonId);

// Update lessonData
setLessonData({
  ...lessonData,
  outputs: {
    flashcards: lesson.hasFlashcards,
    quiz: lesson.hasQuiz,
    podcast: lesson.hasPodcast, // Only true if audio asset exists
  },
});
```

The action tile shows:
- **Badge "Generate"**: If `hasPodcast = false`
- **Badge "Open"**: If `hasPodcast = true`
- **Disabled**: If podcast generation is in progress

## Design Principles

Following the app's design guidelines:
- ✅ Clean, minimal interface
- ✅ Subtle elevation (not heavy shadows)
- ✅ Muted color palette
- ✅ Clear typography hierarchy
- ✅ No centered hero empty states
- ✅ No saturated accent colors
- ✅ No gradients or marketing copy

## Future Enhancements

1. **Podcast Generation**
   - AI-generated audio summaries from lesson content
   - Integration with TTS services
   - Background processing queue

2. **Enhanced Playback**
   - Remember playback position per lesson
   - Auto-resume from last position
   - Offline playback support

3. **Social Features**
   - Share podcasts with other users
   - Collaborative listening sessions
   - Comments and timestamps

4. **Analytics**
   - Track listening time
   - Popular lessons
   - Completion rates

## Testing the Flow

To test the podcast navigation:

1. **Start from Podcasts Tab**:
   - Open app → Tap Podcasts tab (bottom nav)
   - Should see list of courses with podcasts
   - Tap a course
   - Should see list of lessons with podcasts
   - Tap a lesson or play button
   - Should open podcast player

2. **Start from Lesson Hub**:
   - Open app → Home → Select course → Select lesson
   - If lesson has podcast, should see "Podcast" action tile
   - Tap podcast tile
   - Should open podcast player

3. **Empty States**:
   - If no podcasts exist, should see appropriate empty state
   - "No podcasts yet" message with helpful subtitle

## Files Changed/Created

### New Files
- `src/data/podcasts.repository.ts` - Podcast data fetching
- `src/screens/Podcasts/CoursePodcastsScreen.tsx` - Course podcasts list
- `PODCAST_NAVIGATION.md` - This documentation

### Modified Files
- `src/screens/Podcasts/PodcastsScreen.tsx` - Updated to show courses
- `src/navigation/AppNavigator.tsx` - Added PodcastsStack
- `src/types/navigation.ts` - Added PodcastsStackParamList
- `src/types/lesson.ts` - Added hasPodcast to LessonWithOutputs
- `src/data/lessons.repository.ts` - Added lesson_assets query and fetchLessonById

## Notes

- Podcast URLs are signed URLs with 1-hour expiry
- Podcasts must be explicitly created as audio assets
- The system doesn't auto-generate podcasts (future feature)
- Only audio files with `kind='audio'` are considered podcasts
