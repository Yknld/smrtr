# Generation State Flow Diagram

Visual representation of how content generation states transition.

## State Transition Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     GENERATION LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   GENERATE   │  ← Initial State
    │   (Gray)     │
    └──────┬───────┘
           │
           │ User taps card
           │
           ▼
    ┌──────────────┐
    │  GENERATING  │  ← Processing State
    │   (Blue)     │     • Card disabled
    └──────┬───────┘     • Can't tap again
           │             • 5-20 min for video
           │
           │ Realtime event: Video uploaded
           │
           ▼
    ┌──────────────┐
    │  GENERATED   │  ← Complete State
    │   (Green)    │     • Card enabled
    └──────────────┘     • Tap to open/view


Error Path:
    
    GENERATING ──────┐
        │            │
        │ Error      │ Timeout/Failure
        │            │
        ▼            ▼
    [Reset to GENERATE]
    [Show error alert]
```

## State Properties

### State 1: GENERATE

```
┌─────────────────────────┐
│      GENERATE           │ ← Badge (gray, top-right)
│                         │
│        📹               │ ← Icon (center)
│                         │
│       Video             │ ← Label (center)
│    30s explainer        │ ← Subtitle (center)
│                         │
└─────────────────────────┘
```

**Properties:**
- `disabled: false`
- `badge: 'Generate'`
- `processing: false`
- `outputs.video: false`
- **Action:** Tappable → starts generation

---

### State 2: GENERATING

```
┌─────────────────────────┐
│    ┌──────────────┐     │
│    │ GENERATING   │     │ ← Badge (blue bg, blue border, blue text)
│    └──────────────┘     │
│                         │
│        📹               │ ← Icon (dimmed)
│                         │
│       Video             │ ← Label (dimmed)
│    30s explainer        │ ← Subtitle (dimmed)
│                         │
└─────────────────────────┘
       (50% opacity)
```

**Properties:**
- `disabled: true`
- `badge: 'Generating'`
- `processing: true` (has 'video' in Set)
- `outputs.video: false` (not ready yet)
- **Action:** Not tappable (disabled)

---

### State 3: GENERATED

```
┌─────────────────────────┐
│    ┌──────────────┐     │
│    │  GENERATED   │     │ ← Badge (green bg, green border, green text)
│    └──────────────┘     │
│                         │
│        📹               │ ← Icon (normal)
│                         │
│       Video             │ ← Label (normal)
│    30s explainer        │ ← Subtitle (normal)
│                         │
└─────────────────────────┘
```

**Properties:**
- `disabled: false`
- `badge: 'Generated'`
- `processing: false`
- `outputs.video: true`
- **Action:** Tappable → opens video player

---

## Timeline View

```
Time: 0s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State: GENERATE (Gray)
Action: [User taps card]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Time: 0.1s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State: GENERATING (Blue)
Process: 
  1. API call to edge function
  2. Edge function calls OpenHand
  3. OpenHand generates Remotion video
  4. Video renders (5-20 min)
  5. OpenHand uploads to storage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Time: 5-20 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event: Realtime subscription detects new video
Action: loadLessonData() called automatically
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Time: 5-20 minutes + 0.5s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State: GENERATED (Green)
Action: [User can now tap to view]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Multi-Content View

Showing all 4 generation cards at once:

```
┌─────────────────┬─────────────────┐
│  FLASHCARDS     │      QUIZ       │
│   GENERATED     │    GENERATE     │
│    (Green)      │     (Gray)      │
├─────────────────┼─────────────────┤
│    PODCAST      │     VIDEO       │
│   GENERATING    │    GENERATE     │
│    (Blue)       │     (Gray)      │
└─────────────────┴─────────────────┘
```

**Interpretation:**
- **Flashcards**: Already generated, tap to practice
- **Quiz**: Not yet generated, tap to start
- **Podcast**: Currently generating (wait 5-20 min)
- **Video**: Not yet generated, tap to start

## User Interaction Flow

### Happy Path

1. **User enters Lesson Hub**
   ```
   → All cards show "GENERATE" (gray)
   → User sees 4 actions available
   ```

2. **User taps Video card**
   ```
   → Badge changes to "GENERATING" (blue)
   → Card becomes disabled (50% opacity)
   → API call sent in background
   → User can still use other cards
   ```

3. **User leaves and comes back**
   ```
   → Video still shows "GENERATING" (blue)
   → State persisted in database
   → User knows it's still processing
   ```

4. **Video completes (5-20 min later)**
   ```
   → Realtime subscription fires
   → loadLessonData() called
   → Badge changes to "GENERATED" (green)
   → Card becomes enabled
   → No manual refresh needed!
   ```

5. **User taps Video card again**
   ```
   → Opens video player
   → Shows 30s video
   → User can watch their generated content
   ```

### Error Path

1. **User taps Video card**
   ```
   → Badge changes to "GENERATING" (blue)
   → Card disabled
   ```

2. **Generation fails**
   ```
   → Error thrown in edge function
   → Badge resets to "GENERATE" (gray)
   → Alert shown with error message
   → User can try again
   ```

## Database State Mapping

### Flashcards & Quiz (lesson_outputs)

```sql
SELECT type, status FROM lesson_outputs 
WHERE lesson_id = 'xxx';

-- Results:
type: 'flashcards', status: null        → GENERATE
type: 'flashcards', status: 'processing' → GENERATING
type: 'flashcards', status: 'ready'      → GENERATED
type: 'flashcards', status: 'failed'     → GENERATE (with error)
```

### Podcast & Video (lesson_assets)

```sql
SELECT kind FROM lesson_assets 
WHERE lesson_id = 'xxx';

-- Results:
(no row)                → GENERATE
kind: 'audio'           → GENERATED (for Podcast)
kind: 'video'           → GENERATED (for Video)
```

**Note:** For assets, there's no "processing" state in DB. The `processing` Set in React state handles the UI during generation.

## Realtime Event Flow

```
┌──────────────┐
│   Database   │
│   Changes    │
└──────┬───────┘
       │
       │ Postgres trigger
       │
       ▼
┌──────────────┐
│  Supabase    │
│  Realtime    │
└──────┬───────┘
       │
       │ WebSocket
       │
       ▼
┌──────────────┐
│   Mobile     │
│     App      │
└──────┬───────┘
       │
       │ Subscription callback
       │
       ▼
┌──────────────┐
│ Load Lesson  │
│    Data      │
└──────┬───────┘
       │
       │ Query database
       │
       ▼
┌──────────────┐
│   Update     │
│     UI       │
└──────────────┘
```

## Code Flow

### 1. User Taps Card

```typescript
handleGenerateVideo()
  → setLessonData({ processing: Set(['video']) })
  → Badge changes to "GENERATING" (blue)
  → fetch('/lesson_generate_video')
  → Edge function called
  → [Background processing for 5-20 min]
```

### 2. Video Generation Completes

```typescript
Edge function:
  → OpenHand returns video
  → Upload to storage.lesson-assets
  → Insert into lesson_assets table
    ↓
Database:
  → Postgres change detected
  → Realtime broadcasts event
    ↓
Mobile App:
  → Subscription callback fired
  → loadLessonData() called
  → Query lesson_assets
  → outputs.video = true
  → processing.delete('video')
  → Badge changes to "GENERATED" (green)
```

### 3. User Taps Again

```typescript
handleGenerateVideo() or handleOpenVideo()
  → if (outputs.video) → Navigate to player
  → else → Start generation
```

## Summary

**Three Simple States:**
1. 🔘 **Gray** = Not yet made, tap to create
2. 🔵 **Blue** = Creating now, wait 5-20 min
3. 🟢 **Green** = Ready to view, tap to open

**Key Features:**
- Automatic updates via Realtime
- No manual refresh needed
- Clear visual feedback
- Consistent across all content types
- Database-driven, not hardcoded
