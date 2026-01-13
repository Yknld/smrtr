# StudyHub Screen

Action center for starting, continuing, or reviewing study sessions.

## Purpose

Present study action options for a selected class and allow users to begin different types of study activities.

## Layout Sections

1. **Header**
   - Back button to Home
   - Dynamic title: Class name (from nav params)
   - Background: White

2. **Progress Summary** (if session exists)
   - Last studied timestamp
   - Progress percentage (optional)
   - Completion indicator

3. **Action Cards**
   - Grid or list of study actions
   - Each action is a tappable card:
     1. **Continue** - Resume session (if exists)
     2. **Study now** - Start fresh session
     3. **Quick recap** - 5-minute review
     4. **Flashcards** - Review mode

## User Interactions

- Tap action card → Start study session (future: navigate to study screen)
- Back button → Return to Home
- Pull-to-refresh → Reload progress data

## Data Requirements

- Receive `classId`, `className`, and optional `hasResumableSession` from nav params
- Fetch progress via `fetchProgressByClassId(classId)` from data layer
- Determine which actions to show/enable based on progress
- Handle loading, ready, and error states

## Navigation

- Route params: `{ classId: string, className: string, hasResumableSession?: boolean }`
- Back button returns to Home
- (Future) Action taps navigate to study session screen

## Components Used

- `Card` - For each action card
- `Pill` - For badges ("Recommended", "New", etc.)
- `LoadingState` - During progress fetch
- `EmptyState` - No previous sessions (show "Study now" only)
