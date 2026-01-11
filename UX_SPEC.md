# UX Specification: Study Workspace Web App

## Design Principles
- **Workspace Layout**: Left sidebar + main content area
- **Inspector Panel**: Optional, collapsible, OFF by default
- **Visual Style**: Minimal, premium, calm
- **Surfaces**: Rounded corners, subtle shadows, soft borders
- **Color Palette**: Light mode with off-white/warm gray background (not pure white)

---

## Screen 1: Home (Choose Class)

### Layout Description (Top → Bottom, Left → Right)

**Left Sidebar:**
- App logo/branding (top)
- Navigation menu item: "Classes" (active state)
- Navigation menu item: TBD (if applicable)
- User profile/settings (bottom)

**Main Content Area:**
- Page header: "Choose a Class" (or similar title)
- Search bar (optional filter/search)
- Class grid/list:
  - Class card/item per available class
  - Each card displays: class name, TBD (course code/subject/etc.)
  - Cards arranged in grid or list format

**Inspector Panel:**
- Hidden/collapsed by default
- N/A for this screen (or shows selected class preview if applicable)

### Component List
- Sidebar
- Logo/Branding
- Navigation Menu
- Navigation Menu Item
- User Profile
- Page Header
- Search Bar (optional)
- Class Card
- Grid/List Container

### UI States
- **Loading**: Skeleton placeholders for class cards
- **Empty**: Empty state message: "No classes available" (or TBD message)
- **Normal**: Grid/list of class cards displayed
- **Processing**: N/A (or loading overlay if search/filter active)
- **Error**: Error message with retry action

### Navigation Parameters
- **Outbound**: `classId`, `className` (passed to Class Notes screen on class selection)

---

## Screen 2: Class Notes (Previous Notes for a selected class)

### Layout Description (Top → Bottom, Left → Right)

**Left Sidebar:**
- App logo/branding (top)
- Navigation menu item: "Classes" (back to Home)
- Navigation menu item: TBD (if applicable)
- Breadcrumb or class name indicator: `className`
- User profile/settings (bottom)

**Main Content Area:**
- Page header: `className` (or "Notes for [className]")
- Action bar (optional): Create new note button, TBD filters/sort
- Notes list:
  - Note item per previous note
  - Each note item displays: note title, date/modified timestamp, TBD (preview/snippet)
  - List arranged vertically or in card grid
  - Notes sorted by: TBD (date, relevance, etc.)

**Inspector Panel:**
- Hidden/collapsed by default
- When expanded: Shows selected note preview/details (if applicable), or TBD

### Component List
- Sidebar
- Logo/Branding
- Navigation Menu
- Navigation Menu Item
- Breadcrumb/Class Indicator
- User Profile
- Page Header
- Action Bar (optional)
- Button (Create Note)
- Note Item
- List/Grid Container
- Inspector Panel (collapsible)

### UI States
- **Loading**: Skeleton placeholders for note items
- **Empty**: Empty state message: "No notes yet. Create your first note." (or TBD)
- **Normal**: List of note items displayed
- **Processing**: Loading overlay if creating/updating notes
- **Error**: Error message with retry action

### Navigation Parameters
- **Inbound**: `classId`, `className` (from Home screen)
- **Outbound**: `noteId`, `noteTitle` (passed to Study Hub screen on note selection)
- **Back Navigation**: Returns to Home screen (preserves classId/className or resets)

---

## Screen 3: Study Hub (Actions for selected note)

### Layout Description (Top → Bottom, Left → Right)

**Left Sidebar:**
- App logo/branding (top)
- Navigation menu item: "Classes" (back to Home)
- Navigation menu item: `className` (back to Class Notes for that class)
- Breadcrumb: `className` > `noteTitle`
- User profile/settings (bottom)

**Main Content Area:**
- Page header: `noteTitle`
- Action toolbar: TBD (edit, delete, share, export, etc.)
- Main action/content area:
  - Note content display/editor (TBD: read-only vs editable)
  - Action buttons/sections for study actions (TBD: flashcards, quiz, summary, etc.)
  - Layout: TBD (single column, multi-section, etc.)

**Inspector Panel:**
- Hidden/collapsed by default
- When expanded: Shows TBD (note metadata, tags, related notes, etc.)
- Toggle button visible to expand/collapse

### Component List
- Sidebar
- Logo/Branding
- Navigation Menu
- Navigation Menu Item
- Breadcrumb
- User Profile
- Page Header
- Action Toolbar
- Button (various actions)
- Note Content Area
- Study Action Section/Component
- Inspector Panel (collapsible)
- Inspector Toggle Button

### UI States
- **Loading**: Skeleton placeholder for note content and actions
- **Empty**: N/A (note should always have content or show empty editor)
- **Normal**: Note content and study actions displayed
- **Processing**: Loading overlay during save, generate, or action execution
- **Error**: Error message with retry action (e.g., "Failed to load note", "Action failed")

### Navigation Parameters
- **Inbound**: `noteId`, `noteTitle` (from Class Notes screen), `classId`, `className` (preserved from navigation)
- **Back Navigation**: Returns to Class Notes screen for the same `classId`/`className`

---

## Navigation Flow Summary

1. **Home → Class Notes**: User selects a class → Navigate with `classId`, `className`
2. **Class Notes → Study Hub**: User selects a note → Navigate with `noteId`, `noteTitle` (preserve `classId`, `className`)
3. **Study Hub → Class Notes**: Back navigation → Use preserved `classId`, `className`
4. **Class Notes → Home**: Back navigation → Return to Home (class selection)

---

## Shared Components & Patterns

### Inspector Panel (Global)
- **Default State**: Collapsed/hidden
- **Toggle**: Button/control in main content area (TBD: position and style)
- **Content**: Context-specific to each screen (see screen descriptions)
- **Animation**: TBD (slide, overlay, etc.)

### Sidebar (Global)
- **Width**: TBD
- **Fixed/Sticky**: TBD
- **Mobile Behavior**: TBD (collapsible drawer, hidden, etc.)

### Color Palette (TBD Specific Values)
- Background: Off-white/warm gray (not pure white)
- Primary: TBD
- Secondary: TBD
- Text: TBD (high contrast on warm background)
- Borders: Soft, subtle
- Shadows: Subtle elevation

### Typography (TBD)
- Font families, sizes, weights, line heights

---

## Open Questions / TBD Items
- Inspector panel toggle button placement and style
- Sidebar width and responsive behavior
- Specific color values and typography
- Note creation flow (modal, separate screen, inline)
- Study actions specific features and layout
- Search/filter functionality details
- Sorting options for notes
- Note content format (markdown, rich text, plain text)
- User profile/settings content
- Breadcrumb click behavior (navigate vs static)
- Mobile/responsive breakpoints and behavior
- Animation and transition specifications
- Icon library and icon usage
- Empty state illustrations/copy variations
