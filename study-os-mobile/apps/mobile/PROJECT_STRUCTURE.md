# Project Structure

This document defines the file and folder organization rules for the Study OS mobile application.

## Directory Layout

```
src/
├── app/                 # Application bootstrap and navigation setup
├── screens/             # Screen components (one folder per screen)
├── components/          # Reusable UI building blocks
├── ui/                  # Design system (tokens, not components)
├── data/                # Data fetching and repository layer
├── state/               # Application state management
├── types/               # TypeScript type definitions
├── utils/               # Pure utility functions
└── assets/              # Images, icons, fonts
```

## Folder Responsibilities

### `app/`

**Purpose**: Application initialization, navigation configuration, and routing.

**Contains**:
- App entry point
- Navigation container setup
- Root route definitions
- Global providers (auth, state)

**Rules**:
- Keep minimal - only bootstrap logic
- No business logic or UI components
- Navigation structure should mirror screen folders

---

### `screens/`

**Purpose**: Top-level views that represent distinct pages in the app.

**Structure**: One folder per screen containing:
- Screen component file
- Screen-specific sub-components (if needed)
- Spec document defining responsibilities

**Naming**: `[ScreenName]Screen` (e.g., `HomeScreen`, `ClassNotesScreen`)

**Responsibilities**:
- Handle navigation params and routing
- Fetch data via data layer
- Manage screen-level state (loading, error, data)
- Compose components from `components/`
- Respond to user interactions

**Boundaries** (what screens MUST NOT do):
- Make direct Supabase calls (use `data/` layer)
- Define reusable UI (extract to `components/`)
- Hardcode design tokens (use `ui/` system)
- Share code between screens (extract to `components/` or `utils/`)

---

### `components/`

**Purpose**: Reusable UI building blocks used across multiple screens.

**Structure**: One folder per component containing:
- Component file
- Component-specific types (if any)
- Placeholder/spec document

**Naming**: `[ComponentName]` (e.g., `Card`, `Pill`, `EmptyState`)

**Responsibilities**:
- Render UI based on props
- Handle local interaction state (hover, press)
- Emit events via callbacks
- Be composable and reusable

**Boundaries** (what components MUST NOT do):
- Navigate to other screens
- Fetch data or make API calls
- Access global state directly
- Contain business logic

**When to create a component**:
- UI pattern used in 2+ screens
- Complex UI that clutters screen code
- Clear single responsibility

**When NOT to create a component**:
- One-off UI used in single screen
- Trivial markup (2-3 lines)

---

### `ui/`

**Purpose**: Design system tokens and specifications (NOT components).

**Contains**:
- Color palette definitions
- Typography scales and font families
- Spacing/sizing constants
- Border radius values
- Shadow/elevation styles
- Spec documents for each category

**Rules**:
- Token values only - no React components
- All values defined in one place
- Components consume these tokens
- Light mode focused (as specified)

**Example token categories**:
- `colors`: primary, secondary, text, background, borders
- `spacing`: xs, sm, md, lg, xl (4, 8, 16, 24, 32px equivalents)
- `radii`: card, pill, button (8, 16, 24px)
- `typography`: heading1, heading2, body, caption
- `shadows`: card, elevated

---

### `data/`

**Purpose**: Data fetching, caching, and repository patterns.

**Structure**: One file per entity/resource (e.g., `classes.repo`, `notes.repo`)

**Naming**: `[entity].repo.ts` for repositories, `supabase.ts` for client

**Responsibilities**:
- Initialize and configure Supabase client
- Fetch data from backend
- Transform API responses to app types
- Handle errors and retries
- Cache strategies (if needed)

**Boundaries** (what data layer MUST NOT do):
- Update UI components
- Navigate between screens
- Contain business logic or calculations
- Store application state

**Repository pattern**:
Each `.repo` file exports functions like:
- `fetchClasses()` - get all classes
- `fetchClassById(id)` - get single class
- `fetchNotesByClassId(classId)` - get notes for a class

---

### `state/`

**Purpose**: Application-level state management.

**Structure**: One file per state domain (e.g., `session.store`, `playback.store`)

**Naming**: `[domain].store.ts`

**Responsibilities**:
- Manage cross-screen state
- Provide state access patterns (Context or hooks)
- Handle state updates and synchronization

**Boundaries** (what state layer MUST NOT do):
- Fetch data directly (call `data/` layer)
- Contain UI components
- Navigate or handle routing

**State vs. Server**:
- **Client state**: UI state, form inputs, modal visibility
- **Server state**: Data from Supabase (use `data/` layer + screen state)
- **Shared state**: User session, current playback, selected class

---

### `types/`

**Purpose**: TypeScript type definitions for the entire application.

**Structure**: One file per entity (e.g., `class.type.ts`, `note.type.ts`)

**Naming**: `[entity].type.ts`

**Responsibilities**:
- Define core data types
- Define screen props and route params
- Provide type safety across layers

**Rules**:
- Single source of truth for types
- No implementation code
- Use explicit types (not inference)
- Keep types close to data shape

**Example types**:
- `Class` - class entity structure
- `Note` - note entity structure
- `Progress` - study progress tracking
- `HomeScreenProps` - Home screen navigation props

---

### `utils/`

**Purpose**: Pure utility functions used across the app.

**Structure**: Grouped by domain (e.g., `time.utils.ts`, `formatting.utils.ts`)

**Naming**: `[domain].utils.ts`

**Responsibilities**:
- Pure functions (no side effects)
- Calculations and transformations
- Formatting and parsing

**Examples**:
- `formatDuration(seconds)` - convert seconds to "5m 30s"
- `formatDate(date)` - format date for display
- `calculateProgress(completed, total)` - compute percentage

**Rules**:
- No React hooks or components
- No API calls or data fetching
- No global state access
- Fully testable in isolation

---

### `assets/`

**Purpose**: Static files (images, icons, fonts).

**Structure**:
```
assets/
├── images/       # PNG, JPG files
├── icons/        # SVG files or icon fonts
└── fonts/        # Custom font files
```

**Rules**:
- Keep assets small (optimize images)
- Use vector formats when possible (SVG)
- Organize by type, not by feature

---

## File Naming Conventions

- **TypeScript files**: `kebab-case.tsx` or `kebab-case.ts`
- **Type files**: `[entity].type.ts`
- **Repository files**: `[entity].repo.ts`
- **Store files**: `[domain].store.ts`
- **Utility files**: `[domain].utils.ts`
- **Spec files**: `[name].spec.md`
- **Placeholder files**: `[Name].placeholder.md`

## Import Order

1. React/React Native
2. Third-party libraries
3. Local types
4. Local components
5. Local utilities
6. Local assets

## Testing Strategy

- **Unit tests**: Components, utils (isolated)
- **Integration tests**: Data layer, state management
- **E2E tests**: Critical user flows (happy paths)

Each layer should be testable independently.

## Rationale

This structure enforces **separation of concerns**:
- Screens own navigation and composition
- Components own reusable UI
- Data layer owns backend communication
- State layer owns cross-screen state
- Types ensure type safety
- Utils provide pure functions

This makes the codebase:
- **Maintainable**: Easy to find and change code
- **Testable**: Each layer can be tested in isolation
- **Scalable**: Clear place for new features
- **Collaborative**: Multiple developers can work without conflicts
