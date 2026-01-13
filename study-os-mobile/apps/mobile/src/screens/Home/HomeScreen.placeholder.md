# Home Screen

Entry point screen where users select which class to study.

## Purpose

Display a list of enrolled classes and allow users to navigate to ClassNotes or StudyHub for a selected class.

## Layout Sections

1. **Header**
   - Screen title: "Home"
   - Optional: User profile icon (future)

2. **Recently Studied** (optional section)
   - Shows classes with active/recent sessions
   - Highlighted with "Continue" badge

3. **All Classes**
   - Grid or list of class cards
   - Each card shows: name, last studied, progress indicator

## User Interactions

- Tap class card → Navigate to StudyHub
- Tap "View notes" on card → Navigate to ClassNotes
- Pull-to-refresh → Reload class list

## Data Requirements

- Fetch all classes via `fetchClasses()` from data layer
- Display loading state while fetching
- Handle empty state (no classes)
- Handle error state (fetch failed)

## Navigation

- No back button (root screen)
- Navigate to ClassNotes with `{ classId, className }`
- Navigate to StudyHub with `{ classId, className, hasResumableSession? }`

## Components Used

- `Card` - For each class card
- `Pill` - For "Continue" or status badges
- `LoadingState` - During data fetch
- `EmptyState` - If no classes exist
