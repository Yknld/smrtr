# Flashcards Screen - Quick Reference

## What Was Built

A complete flashcard review screen with:
- ✅ Card flip animation (3D transform with spring physics)
- ✅ Progress indicator (counter + progress bar)
- ✅ Know / Don't Know buttons
- ✅ End-of-deck summary with statistics
- ✅ Empty state with "Generate flashcards" CTA
- ✅ Loading & generating states

## Files Changed

### New Files
- `/src/screens/Flashcards/FlashcardsScreen.tsx` - Main flashcard review component
- `/src/screens/Flashcards/FLASHCARDS_SCREEN.md` - Detailed documentation
- `/src/screens/Flashcards/QUICK_REFERENCE.md` - This file

### Modified Files
- `/src/types/navigation.ts` - Added Flashcards route type
- `/src/navigation/AppNavigator.tsx` - Added Flashcards screen to HomeStack
- `/src/screens/LessonHub/LessonHubScreen.tsx` - Updated handleFlashcards to navigate

## How to Access

From LessonHub screen → Tap "Flashcards" action tile

## Design Notes

Follows premium gray theme:
- Background: `#1F1F1F`
- Surface: `#252525`
- Text: Muted grays (`#C5C5C5`, `#8A8A8A`, `#5A5A5A`)
- Borders: Subtle (`#2A2A2A`, `#333333`)
- No heavy shadows, no gradients, no emojis
- Clean typography with negative letter spacing

## Key Interactions

1. **Tap card** - Flips to reveal answer
2. **Tap Know** - Records as understood, moves to next
3. **Tap Don't Know** - Records for review, moves to next
4. **Review Again** (summary) - Resets deck from start
5. **Done** (summary) - Returns to lesson hub
6. **Generate Flashcards** (empty state) - Triggers generation

## Integration Points (TODO)

The screen has placeholder API calls that need to be connected:

```typescript
// Load existing flashcards
GET /api/lessons/${lessonId}/outputs/flashcards

// Generate new flashcards
POST /api/generate-flashcards
Body: { lesson_id: string, count?: number }
```

## Next Steps

1. Connect to Supabase backend
2. Fetch flashcards from `lesson_outputs` table where `type='flashcards'`
3. Call `lesson_generate_flashcards` edge function for generation
4. Parse `content_json.cards` array
5. Test with real lesson data

## Animation Details

Card flip uses `Animated.Value` with:
- Front face: rotateY from 0° to 180°
- Back face: rotateY from 180° to 360°
- Opacity crossfade at 90° (midpoint)
- Spring animation (friction: 8, tension: 10)
- `backfaceVisibility: 'hidden'` for clean flip

## Component Hierarchy

```
FlashcardsScreen
├── SafeAreaView
│   ├── StatusBar
│   └── View (container)
│       ├── Header (back + title)
│       ├── Progress (counter + bar)
│       ├── CardContainer
│       │   ├── Animated.View (front)
│       │   └── Animated.View (back)
│       └── Actions (Know / Don't Know)
│       
└── Summary View (shown when complete)
    ├── Stats Grid
    └── Action Buttons
```
