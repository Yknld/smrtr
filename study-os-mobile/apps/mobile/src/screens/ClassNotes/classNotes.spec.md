# ClassNotes Screen Specification

## UI Sections

### 1. Screen Header
- **Back button**: Left side, returns to Home
- **Title**: Class name from nav params (Heading 1, 28px bold)
- **Background**: White
- **Height**: 60px
- **Padding**: 16px horizontal

### 2. Notes List

#### Note Card
Each note card contains:
- **Date**: Body Bold (16px semibold, #111827) - "Jan 9, 2026"
- **Timestamp**: Caption (14px, #6B7280) - "2:30 PM"
- **Content preview**: Body (16px, #111827) - First 2-3 lines of note
- **Metadata** (optional): Small (12px, #9CA3AF) - "5 min read" or "250 words"

**Card styling**:
- Rounded: 12px
- Padding: 16px
- Background: #FFFFFF
- Border: 1px solid #E5E7EB
- Shadow: Card shadow
- Gap between cards: 16px

**Card press state** (future):
- Increase shadow
- Scale 0.98
- Navigate to full note view

#### List Layout
- Vertical scroll
- 16px padding horizontal
- 24px padding top
- 16px gap between cards

## States

### Loading
- Show header with class name (from params)
- Show 3-5 skeleton note cards
- Back button remains active

### Empty
- Show header with class name
- Centered empty state
- Icon: Document/note icon (64px, #9CA3AF)
- Heading: "No notes yet"
- Subtext: "Notes from your study sessions will appear here"
- No action button (notes are auto-generated)

### Ready
- Show header with class name
- Display notes list (newest first)
- Pull-to-refresh enabled

### Error
- Show header with class name
- Centered error state
- Icon: Alert (64px)
- Heading: "Couldn't load notes"
- Subtext: Error message
- Button: "Retry" → Refetch notes

## Components Used

- `Card` - Wraps each note
- `LoadingState` - Skeleton loaders
- `EmptyState` - No notes
- `ErrorState` - Fetch failed (future component)

## Data Flow

1. On mount → Extract `classId` from route params
2. Fetch notes via `fetchNotesByClassId(classId)`
3. Set loading state → Show skeleton loaders
4. On success → Set ready state → Display notes
5. On error → Set error state → Show error message
6. On retry → Repeat from step 2

## Sorting & Filtering

- **Sort order**: Newest first (descending by created date)
- **Filtering**: None in MVP (all notes shown)

## Navigation

- **Route params**: `{ classId: string, className: string }`
- **Back button**: Return to Home screen

## Must NOT Include

- Note creation UI (notes auto-generated during study)
- Note editing (read-only in MVP)
- Direct Supabase calls (use data layer)
- Hardcoded colors (use ui tokens)
- Navigation to other classes (use back button to Home first)
