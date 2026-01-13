# Home Screen Specification

## UI Sections

### 1. Screen Header
- **Title**: "Home" (Heading 1, 28px bold)
- **Background**: White
- **Height**: 60px
- **Padding**: 16px horizontal

### 2. Content Area

#### Recently Studied Section (Conditional)
- **Visible when**: User has active/recent sessions
- **Heading**: "Recently Studied" (Heading 2, 22px semibold)
- **Layout**: Horizontal scrollable list
- **Card appearance**: Same as class card + "Continue" pill badge

#### All Classes Section
- **Heading**: "Your Classes" (Heading 2, 22px semibold)
- **Layout**: Vertical list, 16px gap between cards
- **Scroll**: Vertical scroll if exceeds screen height

### 3. Class Card
Each class card contains:
- **Class name**: Heading 3 (18px semibold, #111827)
- **Last studied**: Caption (14px, #6B7280) - "2 hours ago" or "Never"
- **Progress bar**: If session exists
  - Height: 4px
  - Rounded ends
  - Background: #DBEAFE
  - Fill: #2563EB
  - Width: Percentage of completion
- **Actions**:
  - Primary: "Study" button or entire card tap → StudyHub
  - Secondary: "View notes" text link → ClassNotes

**Card styling**:
- Rounded: 12px
- Padding: 16px
- Background: #FFFFFF
- Border: 1px solid #E5E7EB
- Shadow: Card shadow
- Press state: Increase shadow, scale 0.98

## States

### Loading
- Show 3-5 skeleton cards
- Skeleton matches card dimensions
- No empty/error message

### Empty
- Centered empty state
- Icon: Book/class icon (64px)
- Heading: "No classes yet"
- Subtext: "Add your first class to start studying"
- Button: "Add Class" (future, can be disabled)

### Ready
- Display class list
- Show "Recently Studied" if applicable
- Pull-to-refresh enabled

### Error
- Centered error state
- Icon: Alert (64px)
- Heading: "Couldn't load classes"
- Subtext: Error message or "Check your connection"
- Button: "Try Again" → Retry fetch

## Components Used

- `Card` - Wraps each class
- `Pill` - "Continue" badge
- `LoadingState` - Skeleton loaders
- `EmptyState` - No classes
- `ErrorState` - Fetch failed (future component)

## Data Flow

1. On mount → Fetch classes via `fetchClasses()`
2. Set loading state → Show skeleton loaders
3. On success → Set ready state → Display classes
4. On error → Set error state → Show error message
5. On retry → Repeat from step 1

## Navigation Triggers

- User taps class card → Navigate to StudyHub with `{ classId, className }`
- User taps "View notes" → Navigate to ClassNotes with `{ classId, className }`

## Must NOT Include

- Direct Supabase calls (use data layer)
- Hardcoded colors (use ui tokens)
- Class creation form (future feature)
- User settings (separate screen)
