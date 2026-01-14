# Course Detail Screen - Implementation Summary

## Overview
The Course Detail screen displays all lessons within a selected course. It follows the same flat, NotebookLM-inspired design aesthetic as the Home screen.

## Architecture

### Files Created
1. **`src/types/lesson.ts`** - Lesson type definitions
   - `Lesson` interface
   - `LessonWithOutputs` interface (includes summary/flashcard/quiz flags)
   - Status types and colors
   - Transform functions for Supabase data

2. **`src/data/lessons.repository.ts`** - Data access layer
   - `fetchLessons(courseId)` - Loads lessons with outputs metadata
   - `filterLessons(lessons, filter)` - Client-side filtering
   - `createLesson()` - Placeholder for lesson creation

3. **`src/components/LessonCard/LessonCard.tsx`** - Lesson card component
   - Displays lesson title, status pill, last opened time
   - Shows output icons (summary, flashcards, quiz) if available
   - Handles tap and long-press interactions

4. **`src/screens/CourseDetail/CourseDetailScreen.tsx`** - Main screen
   - Header with back button, course title, overflow menu
   - Filter chips (All, Draft, Ready, Processing)
   - Lessons list with pull-to-refresh
   - Empty states

5. **`src/types/navigation.ts`** - Navigation types
   - `HomeStackParamList` with CourseDetail route params

## Screen Layout

```
┌─────────────────────────────────────┐
│ ← Course Title              ⋯       │  Header
├─────────────────────────────────────┤
│ [All] [Draft] [Ready] [Processing]  │  Filters
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Lesson Title          [Ready]   │ │
│ │ Last opened 2h ago              │ │  Lesson Cards
│ │ 📄 📚 ❓                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Another Lesson     [Processing] │ │
│ │ Last opened 1d ago              │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

## Features Implemented

### ✅ Navigation
- Nested stack navigator inside Home tab
- Pass courseId and courseTitle as route params
- Back button returns to Home screen

### ✅ Header
- Back button (left)
- Course title (center, ellipsized)
- Overflow menu button (right) → opens bottom sheet
  - "Rename Course" (placeholder)
  - "Archive Course" (placeholder)

### ✅ Filters
- Horizontal scrollable filter chips
- States: All (default), Draft, Ready, Processing
- Client-side filtering for instant results
- Active filter highlighted

### ✅ Lessons List
- Vertical scrolling list
- Pull-to-refresh
- Each card shows:
  - Lesson title
  - Status pill with color coding:
    - Draft: Gray (#8A8A8A)
    - Ready: Green (#4ADE80)
    - Processing: Blue (#60A5FA)
    - Failed: Red (#F87171)
  - "Last opened X ago" with smart formatting
  - Output icons (document, layers, quiz) if generated

### ✅ Interactions
- Tap lesson → Navigate to Lesson Hub (placeholder)
- Long press lesson → Show rename/delete options (placeholder)

### ✅ States
- Skeleton loading (5 cards)
- Empty state with contextual message
  - "No lessons yet" (all filter)
  - "No [status] lessons" (specific filter)
- Error handling in repository

## Data Flow

1. **Screen mounts** → `loadLessons()`
2. **Repository** → Fetches from `lessons` table
   - Joins with `lesson_outputs` to get metadata
   - Filters by courseId and userId
3. **Transform data** → Converts snake_case to camelCase
4. **Apply filters** → Client-side filtering
5. **Render cards** → Display in list

## Design Tokens Used

### Colors
- Background: `#0A0A0A`
- Surface: `#171717`
- Border: `#292929`
- Text Primary: `#FFFFFF`
- Text Secondary: `#A3A3A3`
- Text Tertiary: `#737373`

### Spacing
- Card gap: 16px
- Horizontal padding: 20px
- Vertical padding: 16px

### Typography
- Title: 20px, weight 600
- Card title: 16px, weight 500
- Subtitle: 13px, regular

## Database Schema

### `lessons` table
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- course_id (uuid, FK)
- title (text)
- source_type (enum: upload, live_session, import)
- status (enum: draft, ready, processing, failed)
- last_opened_at (timestamp)
- created_at (timestamp)
```

### `lesson_outputs` table
```sql
- id (uuid, PK)
- lesson_id (uuid, FK)
- output_type (enum: summary, flashcards, quiz)
- content (jsonb)
- created_at (timestamp)
```

## Next Steps (Not Yet Implemented)

### 1. Overflow Menu Actions
- Implement rename course modal
- Implement archive course with confirmation
- Update course in Supabase

### 2. Lesson Actions
- Implement long-press menu (rename, delete)
- Add lesson creation flows (blank, upload, YouTube)
- Connect to actual creation endpoints

### 3. Lesson Hub Screen
- Build screen that shows lesson details
- Display transcript, summary, flashcards, quiz
- Navigate on lesson card tap

### 4. FAB Integration
- Connect center tab button to open bottom sheet
- Actions:
  - New blank lesson → create in current course
  - Upload assets → create lesson with files
  - Import YouTube → create lesson from video

### 5. Status Updates
- Handle processing → ready transitions
- Show loading indicators for processing lessons
- Error state handling for failed lessons

### 6. Offline Support
- Cache lesson list locally
- Sync on reconnect
- Optimistic updates for actions

## Testing Checklist

- [ ] Navigate from Home → Course Detail
- [ ] Back button returns to Home
- [ ] Filter chips work correctly
- [ ] Empty state shows when no lessons
- [ ] Skeleton loading displays
- [ ] Pull-to-refresh works
- [ ] Lesson cards display all data
- [ ] Status pills show correct colors
- [ ] Output icons appear when outputs exist
- [ ] Tap lesson logs to console
- [ ] Long press lesson logs to console
- [ ] Overflow menu opens bottom sheet

## Dependencies

```json
{
  "@react-navigation/native": "^6.1.18",
  "@react-navigation/native-stack": "^6.11.0",
  "@react-navigation/bottom-tabs": "^6.6.1",
  "@expo/vector-icons": "^15.0.3",
  "react-native-gesture-handler": "~2.14.0",
  "react-native-safe-area-context": "4.8.2",
  "react-native-screens": "~3.29.0"
}
```

All dependencies already installed ✓
