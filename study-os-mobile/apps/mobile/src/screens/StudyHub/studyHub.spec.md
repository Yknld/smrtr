# StudyHub Screen Specification

## UI Sections

### 1. Screen Header
- **Back button**: Left side, returns to Home
- **Title**: Class name from nav params (Heading 1, 28px bold)
- **Background**: White
- **Height**: 60px
- **Padding**: 16px horizontal

### 2. Progress Summary (Conditional)
- **Visible when**: User has previous sessions
- **Layout**: Top section, 16px padding, light background (#F9FAFB)
- **Content**:
  - "Last studied": Caption (14px, #6B7280) + timestamp
  - Progress bar (if applicable): 4px height, rounded
  - Completion text: "65% complete" (Caption, #6B7280)

### 3. Action Cards Grid

#### Card Layout
- 2 columns on phone, 2-3 on tablet
- 16px gap between cards
- Equal height cards

#### Action Card Structure
Each card contains:
- **Icon**: 32px, centered or left-aligned
- **Label**: Heading 3 (18px semibold, #111827)
- **Description**: Caption (14px, #6B7280) - Brief explanation
- **Badge** (optional): Pill chip ("New", "Recommended")

**Card styling**:
- Rounded: 12px
- Padding: 20px
- Background: #FFFFFF
- Border: 1px solid #E5E7EB
- Shadow: Card shadow

**Primary card** ("Continue" if active):
- Background: #2563EB (primary blue)
- Text: White
- Border: None
- More prominent shadow

**Disabled card**:
- Opacity: 0.5
- Not tappable
- Gray background

#### Action Cards

1. **Continue** (conditional)
   - **Visible**: Only if `hasResumableSession === true`
   - **Style**: Primary (blue background, white text)
   - **Icon**: Play or resume icon
   - **Label**: "Continue"
   - **Description**: "Pick up where you left off"

2. **Study now**
   - **Always visible**
   - **Style**: Default (white background)
   - **Icon**: Book or study icon
   - **Label**: "Study now"
   - **Description**: "Start a new study session"

3. **Quick recap**
   - **Visible**: If user has completed 1+ sessions
   - **Style**: Default
   - **Icon**: Clock or fast-forward icon
   - **Label**: "Quick recap"
   - **Description**: "5-minute review of key concepts"

4. **Flashcards**
   - **Visible**: If user has notes
   - **Style**: Default
   - **Icon**: Cards or grid icon
   - **Label**: "Flashcards"
   - **Description**: "Test your knowledge"

## States

### Loading
- Show header with class name (from params)
- Show 4 skeleton action cards (2x2 grid)
- Back button remains active

### Empty
- Show header with class name
- Show only "Study now" card (highlighted)
- Optional text: "Start your first study session"
- Other cards hidden or disabled

### Ready
- Show header with class name
- Show progress summary (if exists)
- Show all applicable action cards
- Highlight "Continue" if resumable session exists

### Error
- Show header with class name
- Centered error state
- Heading: "Couldn't load study info"
- Subtext: Error message
- Fallback: Show "Study now" button only
- Button: "Try Again" → Refetch progress

### Processing
- User taps action card
- Show loading spinner on that card
- Card label changes to "Loading..." or "Starting..."
- Other cards remain visible but disabled
- Transition to study session (future)

## Components Used

- `Card` - Wraps each action card
- `Pill` - Badges on cards ("New", "Recommended")
- `LoadingState` - Skeleton loaders
- `EmptyState` - No sessions (show study now only)
- `ErrorState` - Fetch failed (future component)

## Data Flow

1. On mount → Extract `classId` from route params
2. Fetch progress via `fetchProgressByClassId(classId)`
3. Set loading state → Show skeleton loaders
4. On success → Determine which actions to show → Set ready state
5. On error → Set error state with fallback (show "Study now" only)
6. User taps action → Set processing state → Navigate to session (future)

## Action Visibility Logic

| Action | Condition |
|--------|-----------|
| Continue | `hasResumableSession === true` |
| Study now | Always visible |
| Quick recap | User has completed 1+ sessions |
| Flashcards | User has 1+ notes |

## Navigation

- **Route params**: `{ classId: string, className: string, hasResumableSession?: boolean }`
- **Back button**: Return to Home screen
- **Action taps** (future): Navigate to study session screen with action type

## Must NOT Include

- Study session implementation (separate screen)
- Note display (use ClassNotes screen)
- Direct Supabase calls (use data layer)
- Hardcoded colors (use ui tokens)
- Class editing or settings
