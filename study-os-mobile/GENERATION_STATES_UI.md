# Generation States UI Implementation

## Overview

Updated the Lesson Hub screen to show dynamic states for all generatable content (Flashcards, Quiz, Podcast, Video) with three distinct visual states:

1. **GENERATE** - Not yet generated (gray badge)
2. **GENERATING** - Currently generating (blue badge with blue border)
3. **GENERATED** - Successfully generated (green badge with green border)

## Visual States

### State 1: GENERATE (Default)
- **Badge Color**: Gray background (`colors.border`)
- **Text Color**: Gray (`colors.textSecondary`)
- **Meaning**: Content not yet created, click to generate
- **Interaction**: Enabled, clickable

### State 2: GENERATING (In Progress)
- **Badge Color**: Blue background with transparency `rgba(96, 165, 250, 0.2)`
- **Border**: Blue `#60A5FA` (1px)
- **Text Color**: Blue `#60A5FA`
- **Meaning**: Generation in progress (5-20 minutes for video)
- **Interaction**: Disabled, not clickable

### State 3: GENERATED (Complete)
- **Badge Color**: Green background with transparency `rgba(74, 222, 128, 0.2)`
- **Border**: Green `#4ADE80` (1px)
- **Text Color**: Green `#4ADE80`
- **Meaning**: Content ready to view
- **Interaction**: Enabled, clickable to open

## Files Changed

### 1. ActionTile Component
**File**: `apps/mobile/src/components/ActionTile/ActionTile.tsx`

**Changes**:
- Extended `badge` prop to support: `'Generate' | 'Generating' | 'Generated' | 'Open'`
- Added `getBadgeStyle()` and `getBadgeTextStyle()` helper functions
- Added three new style definitions:
  - `badgeGenerating` - Blue style
  - `badgeGenerated` - Green style
  - `badgeTextGenerating` - Blue text
  - `badgeTextGenerated` - Green text

**Key Code**:
```typescript
const getBadgeStyle = () => {
  if (badge === 'Generated') {
    return [styles.badge, styles.badgeGenerated];
  } else if (badge === 'Generating') {
    return [styles.badge, styles.badgeGenerating];
  }
  return styles.badge;
};
```

### 2. LessonHubScreen
**File**: `apps/mobile/src/screens/LessonHub/LessonHubScreen.tsx`

**Changes**:

#### A. Enhanced Data Loading
- Updated `loadLessonData()` to fetch:
  - All `lesson_outputs` with their `status` field
  - All `lesson_assets` to check for podcasts (audio) and videos
- Properly maps processing states (`status: 'processing'`)
- Sets `outputs` and `processing` state based on actual database data

**Key Code**:
```typescript
const { data: outputs } = await supabase
  .from('lesson_outputs')
  .select('type, status')
  .eq('lesson_id', lessonId);

const { data: assets } = await supabase
  .from('lesson_assets')
  .select('kind')
  .eq('lesson_id', lessonId);
```

#### B. Badge State Helper
- Added `getBadgeState()` helper function
- Determines badge based on:
  1. Is it currently processing? → "Generating"
  2. Is it already generated? → "Generated"
  3. Otherwise → "Generate"

**Key Code**:
```typescript
const getBadgeState = (contentType: 'flashcards' | 'quiz' | 'podcast' | 'video'): 'Generate' | 'Generating' | 'Generated' | undefined => {
  if (lessonData.processing.has(contentType)) {
    return 'Generating';
  }
  if (lessonData.outputs[contentType]) {
    return 'Generated';
  }
  return 'Generate';
};
```

#### C. Real-time Updates
- Added Supabase Realtime subscriptions for:
  - `lesson_outputs` table changes
  - `lesson_assets` table changes
- Automatically reloads data when content is generated
- Ensures UI updates without manual refresh

**Key Code**:
```typescript
const outputsChannel = supabase
  .channel(`lesson_outputs_${lessonId}`)
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'lesson_outputs', filter: `lesson_id=eq.${lessonId}` },
    () => loadLessonData()
  )
  .subscribe();
```

#### D. Improved Video Generation
- Sets `processing` state immediately when generation starts
- Doesn't remove from processing until Realtime confirms completion
- Removed intrusive alert messages
- Cleaner error handling

## User Experience Flow

### Example: Video Generation

1. **Initial State**
   - Badge shows "GENERATE" in gray
   - Subtitle: "30s explainer"
   - User taps card

2. **Generation Starts**
   - Edge function called
   - Badge immediately changes to "GENERATING" in blue
   - Card becomes disabled (can't click again)
   - No alert popup - UI speaks for itself

3. **Generation Complete (5-20 minutes later)**
   - Edge function uploads video to storage
   - Database updates `lesson_assets` table
   - Realtime subscription detects change
   - `loadLessonData()` automatically called
   - Badge changes to "GENERATED" in green
   - Card becomes enabled again
   - User can now tap to view video

## Technical Notes

### Processing State Management

The `processing` Set tracks actively generating content:
- Added when generation starts
- Removed automatically by Realtime when complete
- Used by `getBadgeState()` to show "Generating"

### Database Schema Dependencies

**Requires**:
- `lesson_outputs.status` field with values: `'draft' | 'processing' | 'ready' | 'failed'`
- `lesson_assets.kind` field with values including: `'audio' | 'video'`

**Current Implementation**:
- Flashcards/Quiz: Check `lesson_outputs` table
- Podcast: Check for `kind='audio'` in `lesson_assets`
- Video: Check for `kind='video'` in `lesson_assets`

### Color Palette

Colors chosen for accessibility and clarity:
- **Blue** (#60A5FA): Standard "in progress" indicator
- **Green** (#4ADE80): Universal "success/complete" indicator
- **Transparency**: 0.2 (20%) for subtle backgrounds
- **Border**: 1px to add definition against dark backgrounds

## Testing

### Manual Testing Steps

1. **Test Generate State**
   - Open a lesson with no generated content
   - All badges should show "GENERATE" in gray
   - All cards should be clickable

2. **Test Generating State**
   - Tap "Video" card to start generation
   - Badge should immediately change to "GENERATING" in blue
   - Card should become disabled
   - Should stay in this state for 5-20 minutes

3. **Test Generated State**
   - Wait for video generation to complete (check logs)
   - Badge should automatically change to "GENERATED" in green
   - Card should become enabled again
   - Tapping should open the video

4. **Test Real-time Updates**
   - Generate video from one device/browser
   - Open same lesson on another device
   - Second device should show "GENERATED" when complete
   - No manual refresh needed

### Database Verification

Check processing states:
```sql
-- Check what's currently processing
SELECT lesson_id, type, status 
FROM lesson_outputs 
WHERE status = 'processing';

-- Check generated videos
SELECT lesson_id, kind, storage_path, created_at
FROM lesson_assets 
WHERE kind = 'video'
ORDER BY created_at DESC;
```

## Future Enhancements

### 1. Progress Indicators
- Show percentage complete for long operations
- Add animated spinner during "Generating" state
- Show estimated time remaining

### 2. Error States
- Add "FAILED" state (red badge)
- Show error message in tooltip
- Add retry button

### 3. Queue Management
- Show position in queue for queued generations
- Allow cancellation of queued items
- Show multiple items generating simultaneously

### 4. Notifications
- Push notification when generation completes
- Local notification with sound
- Badge count on app icon

### 5. Batch Operations
- "Generate All" button
- Generate multiple items in parallel
- Show overall progress

## Accessibility

### Screen Reader Support
- Badge states announced as "Generate", "Generating...", "Generated"
- Disabled state announced when generating
- Success announced when complete

### Visual Indicators
- Color is not the only indicator (text changes too)
- Sufficient contrast ratios (WCAG AA compliant)
- Clear border distinguishes states

### Interaction Feedback
- Disabled state prevents accidental taps during generation
- Visual feedback on tap
- Clear call-to-action text

## Summary

This implementation provides:
- ✅ Clear visual feedback for all generation states
- ✅ Real-time updates without manual refresh
- ✅ Consistent UX across all generatable content
- ✅ Accessible, color-coded states
- ✅ No intrusive alerts or popups
- ✅ Automatic state management
- ✅ Database-driven, not hardcoded

Users can now clearly see what's available, what's generating, and what's ready - all at a glance.
