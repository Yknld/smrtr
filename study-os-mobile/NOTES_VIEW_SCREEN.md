# Notes View Screen Implementation

## Overview
Added a dedicated full-screen view for reading complete notes, accessible from the NotesPreview card in LessonHub.

## User Flow

```
LessonHub
  ↓ (tap on NotesPreview card)
NotesView Screen (full notes displayed)
  ↓ (tap back button)
Return to LessonHub
```

## Files Created

### `/apps/mobile/src/screens/Notes/NotesViewScreen.tsx`
New screen component that:
- Displays full notes content in a clean, readable format
- Shows lesson title in header for context
- Loads notes from `lesson_outputs` table (prioritizes `notes_final_text` over `notes_raw_text`)
- Handles loading and empty states
- Simple back button navigation

## Files Modified

### `/apps/mobile/src/navigation/AppNavigator.tsx`
- Added import for `NotesViewScreen`
- Added route to HomeStack: `<Stack.Screen name="NotesView" component={NotesViewScreen} />`

### `/apps/mobile/src/screens/LessonHub/LessonHubScreen.tsx`
- Updated `handleOpenNotes()` to navigate to NotesView screen
- Passes `lessonId` and `lessonTitle` as navigation params

### `/apps/mobile/src/components/NotesPreview/NotesPreview.tsx` (from previous change)
- Shows compact 3-line preview
- Displays "Read more" indicator when content is longer
- Entire card is tappable to navigate to full view

## UI Design

### NotesPreview (LessonHub)
- Compact card with 3 lines max
- Preview truncated to 150 chars
- "Read more" indicator at bottom
- Clean, minimal design

### NotesView Screen
- Full-screen layout
- Header with:
  - Back button (left)
  - Lesson title (subtitle)
  - "Notes" title
- Scrollable content area
- Notes displayed in card with proper spacing
- Empty state when no notes exist

## Screen States

### Loading State
```
┌─────────────────────┐
│  ← [Lesson Title]   │
│     Notes           │
├─────────────────────┤
│                     │
│   [Loading spinner] │
│                     │
└─────────────────────┘
```

### With Notes
```
┌─────────────────────┐
│  ← [Lesson Title]   │
│     Notes           │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ • Note point 1  │ │
│ │ • Note point 2  │ │
│ │ • Note point 3  │ │
│ │ ...             │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘
```

### Empty State
```
┌─────────────────────┐
│  ← [Lesson Title]   │
│     Notes           │
├─────────────────────┤
│                     │
│    [Document Icon]  │
│   No notes yet      │
│  Start a trans...   │
│                     │
└─────────────────────┘
```

## Navigation Parameters

```typescript
navigation.navigate('NotesView', {
  lessonId: string,      // UUID of the lesson
  lessonTitle: string    // Display name of the lesson
});
```

## Database Query

```typescript
const { data } = await supabase
  .from('lesson_outputs')
  .select('notes_final_text, notes_raw_text')
  .eq('lesson_id', lessonId)
  .eq('type', 'notes')
  .single();

// Priority: notes_final_text > notes_raw_text
const notes = data.notes_final_text || data.notes_raw_text || '';
```

## Styling Guidelines

Following the app's design system:
- **Background**: `colors.background` (dark)
- **Surface**: `colors.surfaceElevated` (cards)
- **Text**: `colors.textPrimary`, `colors.textSecondary`, `colors.textTertiary`
- **Borders**: `colors.border`
- **Spacing**: `spacing.md`, `spacing.lg`, `spacing.xl`
- **Border Radius**: `borderRadius.md`

## Key Features

1. ✅ **Simple & Clean**: No clutter, just readable notes
2. ✅ **Context Aware**: Shows lesson title for reference
3. ✅ **Responsive**: Handles long notes with smooth scrolling
4. ✅ **Graceful Fallbacks**: Proper loading and empty states
5. ✅ **Navigation**: Easy back button to return

## Testing Checklist

- [ ] Navigate from LessonHub NotesPreview to NotesView
- [ ] Verify lesson title appears in header
- [ ] Verify notes content displays correctly
- [ ] Test scrolling with long notes
- [ ] Test empty state (lesson with no notes)
- [ ] Test loading state
- [ ] Test back button navigation
- [ ] Verify works after recording new notes

## Future Enhancements

Potential additions (not implemented):
- Share button to export notes
- Edit functionality
- Search within notes
- Export to PDF/markdown
- Copy to clipboard button
- Print functionality
- Dark/light mode toggle
- Font size adjustment
- Text-to-speech playback

## Design Decisions

### Why a dedicated screen?
- Notes can be long (hundreds of lines)
- Reading requires focus and space
- Card preview in LessonHub provides quick glance
- Full screen provides immersive reading experience

### Why simple layout?
- Primary goal is readability
- Avoid UI clutter
- Fast load time
- Minimal cognitive load

### Why show lesson title?
- User needs context when viewing notes
- Easy to know which lesson's notes they're reading
- Consistent with other screens in the app
