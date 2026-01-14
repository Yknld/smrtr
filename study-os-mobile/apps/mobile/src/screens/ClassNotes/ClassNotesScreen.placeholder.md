# ClassNotes Screen

Screen for viewing all notes from a selected class in chronological order.

## Purpose

Display a read-only list of notes generated during study sessions for a specific class.

## Layout Sections

1. **Header**
   - Back button to Home
   - Dynamic title: Class name (from nav params)
   - Background: White

2. **Notes List**
   - Chronological list (newest first)
   - Each note card shows:
     - Date (e.g., "Jan 9, 2026")
     - Timestamp (e.g., "2:30 PM")
     - Note preview (first 2-3 lines)
     - Optional: Duration or word count

## User Interactions

- Pull-to-refresh → Reload notes
- Tap note card → Expand or view full note (future)
- Back button → Return to Home

## Data Requirements

- Receive `classId` and `className` from navigation params
- Fetch notes via `fetchNotesByClassId(classId)` from data layer
- Display loading state while fetching
- Handle empty state (no notes yet)
- Handle error state (fetch failed)

## Navigation

- Route params: `{ classId: string, className: string }`
- Back button returns to Home

## Components Used

- `Card` - For each note card
- `LoadingState` - During data fetch
- `EmptyState` - If no notes exist
