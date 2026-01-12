# Screen State Management

This document defines the common states for each screen and how to handle them consistently.

## State Types

All screens should handle these five states:

1. **Loading** - Fetching data from server
2. **Empty** - No data available (first-time or filtered)
3. **Ready** - Data loaded and displayed
4. **Error** - Failed to fetch data
5. **Processing** - User action in progress (optional)

---

## Home Screen States

### Loading
**When**: Initial app launch, refreshing class list  
**Display**:
- Skeleton loaders for class cards (3-5 placeholders)
- Maintain layout structure
- No error message

**Implementation Notes**:
- Show immediately on mount
- Minimum 300ms to avoid flash

### Empty
**When**: User has no enrolled classes  
**Display**:
- Centered empty state illustration
- Heading: "No classes yet"
- Subtext: "Add your first class to start studying"
- Primary button: "Add Class" *(future)*

**Should NOT happen in MVP** (assume user has classes)

### Ready
**When**: Classes successfully loaded (1+ classes)  
**Display**:
- List of class cards
- Each card shows:
  - Class name
  - Last studied date (if available)
  - Progress indicator (if session active)
  - "Study" and "View notes" actions

**Interactions**:
- Tap card or "Study" → Navigate to StudyHub
- Tap "View notes" → Navigate to ClassNotes
- Pull-to-refresh → Reload class list

### Error
**When**: Failed to fetch classes (network, auth, server error)  
**Display**:
- Centered error state
- Icon: Alert/warning icon
- Heading: "Couldn't load classes"
- Subtext: Error message or "Check your connection"
- Primary button: "Try Again"

**Actions**:
- "Try Again" → Retry fetch
- Auto-retry after 3 seconds (max 2 retries)

### Processing
**Not applicable** - Home has no long-running actions

---

## ClassNotes Screen States

### Loading
**When**: Navigating from Home, fetching notes  
**Display**:
- Header with class name (from nav params)
- Skeleton loaders for note cards (3-5 placeholders)
- Back button remains active

**Implementation Notes**:
- Use className from nav params immediately
- Don't block navigation

### Empty
**When**: Class has no notes yet  
**Display**:
- Header with class name
- Centered empty state
- Icon: Document/note icon
- Heading: "No notes yet"
- Subtext: "Notes from your study sessions will appear here"

**Should NOT**:
- Show "Create note" button (notes auto-generated during study)

### Ready
**When**: Notes successfully loaded (1+ notes)  
**Display**:
- Header with class name
- Chronological list of notes (newest first)
- Each note card shows:
  - Date (e.g., "Jan 9, 2026")
  - Timestamp (e.g., "2:30 PM")
  - Preview of note content (first 2-3 lines)
  - Optional: Duration or word count

**Interactions**:
- Pull-to-refresh → Reload notes
- Tap note → Expand/view full note *(future)*
- Back button → Return to Home

### Error
**When**: Failed to fetch notes  
**Display**:
- Header with class name
- Centered error state
- Icon: Alert icon
- Heading: "Couldn't load notes"
- Subtext: "Check your connection and try again"
- Primary button: "Retry"

**Actions**:
- "Retry" → Refetch notes
- Back button → Return to Home (always available)

### Processing
**Not applicable** - ClassNotes is read-only

---

## StudyHub Screen States

### Loading
**When**: Checking for resumable sessions, fetching progress  
**Display**:
- Header with class name (from nav params)
- Skeleton loaders for action cards (4 placeholders)
- Back button remains active

**Duration**: Should be fast (<500ms) since only checking progress

### Empty
**When**: No previous study sessions exist  
**Display**:
- Header with class name
- All action cards displayed:
  - **Study now** (primary/highlighted)
  - **Quick recap** (disabled or hidden)
  - **Flashcards** (disabled or hidden)
- "Continue" card is hidden
- Subtext: "Start your first study session"

**Rationale**: Empty means "no progress," not "no actions"

### Ready
**When**: Progress data loaded, at least one previous session exists  
**Display**:
- Header with class name
- All action cards:
  1. **Continue** - Resumable session available (highlighted if recent)
  2. **Study now** - Start fresh session
  3. **Quick recap** - 5-minute review
  4. **Flashcards** - Review mode
- Progress summary:
  - Last studied: "2 hours ago"
  - Progress: "65% complete" (optional)

**Card States**:
- **Continue**: Only visible if `hasResumableSession === true`
- **Quick recap**: Enabled if user has completed 1+ sessions
- **Flashcards**: Enabled if user has notes

### Error
**When**: Failed to fetch progress/session data  
**Display**:
- Header with class name
- Error state in content area
- Heading: "Couldn't load study info"
- Subtext: Error message
- Fallback: Show "Study now" button only

**Actions**:
- "Try Again" → Refetch progress
- "Study now" → Navigate to study session (ignore progress)

### Processing
**When**: User taps an action and app is preparing session  
**Display**:
- Overlay loading spinner on tapped card
- Card label changes to "Loading..." or "Starting..."
- Other cards remain visible but disabled

**Actions**:
- Should transition to study session within 1-2 seconds
- If longer, show full-screen loading

---

## State Transition Patterns

### Standard Load Flow
```
Loading → Ready (success)
Loading → Error (failure)
Loading → Empty (no data)
```

### Error Recovery
```
Error → [User taps "Retry"] → Loading → Ready/Empty
```

### Pull-to-Refresh
```
Ready → [Pull] → Loading (show refresh indicator) → Ready/Error
```

### Processing to Ready
```
Ready → [User action] → Processing → Ready (success)
Ready → [User action] → Processing → Error (failure)
```

---

## UI Component Mapping

Each state uses shared components:

- **Loading**: `<LoadingState />` component with skeleton loaders
- **Empty**: `<EmptyState icon heading subtext />` component
- **Error**: `<ErrorState icon heading subtext onRetry />` component
- **Processing**: Overlay spinner or loading indicator

These components ensure visual consistency across screens.

---

## Implementation Checklist

For each screen:
- [ ] Define loading state (skeleton loaders)
- [ ] Define empty state (icon, heading, subtext)
- [ ] Define ready state (data display)
- [ ] Define error state (retry action)
- [ ] Define processing state (if applicable)
- [ ] Handle state transitions
- [ ] Add pull-to-refresh (if applicable)
- [ ] Add auto-retry logic for errors
- [ ] Test all states manually

---

## Rationale

Consistent state management:
- Improves UX (users know what to expect)
- Reduces bugs (all edge cases covered)
- Simplifies testing (test each state independently)
- Enables reusable components (LoadingState, EmptyState, etc.)
