# Flashcards Screen

A lightweight flashcard review interface with card flip animations, progress tracking, and spaced repetition support.

## Features

### 1. Card Flip Animation
- Smooth 3D flip animation using React Native Animated API
- Spring physics for natural feel (friction: 8, tension: 10)
- Dual-sided card rendering (front/back)
- Tap anywhere on card to flip

### 2. Progress Indicator
- Numeric counter: "X / Total"
- Linear progress bar
- Real-time updates as you progress through the deck

### 3. Know / Don't Know Buttons
- Two action buttons appear after flipping to answer
- "Know" - marks card as understood
- "Don't Know" - marks card for review
- Minimal design with icons + text

### 4. End-of-Deck Summary
- Shows completion status
- Statistics grid:
  - Cards marked as "Known"
  - Cards marked for "Review Again"
  - Accuracy percentage
- Actions:
  - "Review Again" - resets deck
  - "Done" - returns to lesson hub

### 5. Empty State
- Clean empty state with icon
- "Generate flashcards" CTA button
- Descriptive subtitle text
- Triggers flashcard generation API

### 6. Loading States
- Initial loading spinner
- Generating flashcards state with message
- Prevents interaction during generation

## Design Principles

Following the premium gray theme:
- Muted colors from design tokens
- Flat surfaces (no heavy shadows)
- Minimal borders (borderDark)
- Clean typography (no emojis)
- Subdued interactions
- Low contrast for comfort

## Navigation

**Route:** `Flashcards`

**Params:**
```typescript
{
  lessonId: string;
  lessonTitle: string;
}
```

**Entry Point:** LessonHub Screen → "Flashcards" action tile

## Data Structure

### Flashcard Format
```typescript
interface Flashcard {
  front: string;  // Question or prompt
  back: string;   // Answer or explanation
}
```

### API Integration Points

1. **Load Flashcards**: `GET /api/lessons/${lessonId}/outputs/flashcards`
2. **Generate Flashcards**: `POST /api/generate-flashcards`
   ```json
   {
     "lesson_id": "uuid",
     "count": 15
   }
   ```

Expected response structure:
```json
{
  "flashcards": {
    "type": "flashcards",
    "status": "ready",
    "content_json": {
      "cards": [
        {"front": "Question", "back": "Answer"}
      ]
    }
  }
}
```

## State Management

### Local State
- `loading`: Initial data fetch
- `generating`: Flashcard generation in progress
- `flashcards`: Array of flashcard objects
- `currentIndex`: Current card position
- `isFlipped`: Card flip state
- `stats`: { known, unknown } counters
- `showSummary`: End-of-deck summary view

### Animation State
- `flipAnimation`: Animated.Value for card flip transform

## User Flow

1. User taps "Flashcards" from LessonHub
2. Screen checks if flashcards exist
   - **No cards**: Shows empty state with "Generate" button
   - **Has cards**: Shows first card
3. User taps card to flip and reveal answer
4. User selects "Know" or "Don't Know"
5. Next card appears (flip animation resets)
6. After last card, summary screen shows:
   - Total cards reviewed
   - Known vs. Unknown counts
   - Accuracy percentage
7. User can review again or exit

## Component Structure

```
FlashcardsScreen
├── Header (back button + title)
├── Progress Container (counter + bar)
├── Card Container
│   ├── Front Card (Animated.View)
│   └── Back Card (Animated.View)
├── Actions Container (Know/Don't Know)
└── Summary View (on completion)
```

## TODO / Future Enhancements

- [ ] Connect to actual API endpoints
- [ ] Add keyboard shortcuts (space to flip, arrows to navigate)
- [ ] Swipe gestures for Know/Don't Know
- [ ] Spaced repetition algorithm (SRS)
- [ ] Study session history/analytics
- [ ] Filter to review only "Don't Know" cards
- [ ] Shuffle deck option
- [ ] Export/import flashcard decks
- [ ] Dark/light mode support (if needed)
- [ ] Audio pronunciation for language learning
- [ ] Image support in flashcards

## File Location

`/src/screens/Flashcards/FlashcardsScreen.tsx`

## Dependencies

- `react-native`: Core framework
- `@expo/vector-icons`: Icons (Ionicons)
- `react-native/Animated`: Card flip animation
- Design tokens: `../../ui/tokens`
