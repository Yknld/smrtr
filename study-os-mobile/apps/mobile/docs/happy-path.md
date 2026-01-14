# Happy Path User Flows

This document defines the core navigation flows and screen responsibilities for the Study OS mobile app.

## Screen Overview

The app consists of three primary screens:

1. **Home** - Class selection
2. **ClassNotes** - Review previous notes
3. **StudyHub** - Study action center

## Navigation Structure

```
Home (Root/Stack)
├── ClassNotes (Push)
└── StudyHub (Push)
```

## Flow 1: Choose Class and View Notes

**User Goal**: Review notes from a previous class session.

**Steps**:
1. User launches app → **Home Screen**
2. User sees list of enrolled classes (cards)
3. User taps on "Biology 101" card
4. App navigates to **ClassNotes Screen** with `classId` param
5. User sees chronological list of notes for that class
6. User can scroll, read, and navigate back to Home

**Navigation Params**:
```typescript
Home → ClassNotes: { classId: string, className: string }
```

**Success Criteria**:
- Notes load within 2 seconds
- Notes are sorted by date (newest first)
- Empty state shown if no notes exist

---

## Flow 2: Choose Class and Start Studying

**User Goal**: Begin a new study session for a class.

**Steps**:
1. User launches app → **Home Screen**
2. User sees list of enrolled classes
3. User taps on "Chemistry 201" card
4. App navigates to **StudyHub Screen** with `classId` param
5. User sees action options:
   - "Study now" (start new session)
   - "Continue" (resume previous session)
   - "Quick recap" (5-minute review)
   - "Flashcards" (review mode)
6. User taps "Study now"
7. *(Future: Study session begins)*

**Navigation Params**:
```typescript
Home → StudyHub: { classId: string, className: string }
```

**Success Criteria**:
- Action cards are clearly labeled and tappable
- "Continue" only shows if there's a resumable session
- Each action is self-explanatory

---

## Flow 3: Resume Study Session

**User Goal**: Pick up where they left off in a previous study session.

**Steps**:
1. User launches app → **Home Screen**
2. User sees "Recently Studied" section at top
3. User taps on class card with "Continue studying" badge
4. App navigates to **StudyHub Screen** with `classId` param
5. "Continue" action is highlighted/prominent
6. User taps "Continue"
7. *(Future: Session resumes from last position)*

**Navigation Params**:
```typescript
Home → StudyHub: { classId: string, className: string, hasResumableSession?: boolean }
```

**Success Criteria**:
- Progress indicator shows how much is left
- Timestamp of last session is visible
- User can choose to start fresh instead

---

## Screen Responsibilities

### Home Screen

**Purpose**: Entry point for selecting which class to study.

**Must Display**:
- List of enrolled classes (cards)
- Class name and subject
- Last studied timestamp
- Progress indicator (if session in progress)
- Optional: "Recently studied" section at top

**Must Handle**:
- Navigate to ClassNotes when user taps "View notes" or card
- Navigate to StudyHub when user taps "Study" action
- Loading state while fetching classes
- Empty state if user has no classes

**Must NOT**:
- Show notes content (that's ClassNotes' job)
- Show study actions (that's StudyHub's job)
- Allow editing class info

**Navigation Actions**:
- `onClassPress(classId)` → Navigate to StudyHub
- `onViewNotesPress(classId)` → Navigate to ClassNotes

---

### ClassNotes Screen

**Purpose**: Display all notes for a selected class in chronological order.

**Route Params**:
- `classId: string` (required)
- `className: string` (required, for header title)

**Must Display**:
- Header with class name
- Chronological list of notes (newest first)
- Note date and timestamp
- Note preview/content
- Back button to Home

**Must Handle**:
- Loading state while fetching notes
- Empty state if no notes exist ("No notes yet")
- Error state if fetch fails
- Pull-to-refresh

**Must NOT**:
- Allow creating/editing notes (view-only)
- Show study actions
- Navigate to other classes directly

**Data Dependencies**:
- Fetch notes via `fetchNotesByClassId(classId)`

---

### StudyHub Screen

**Purpose**: Action center for starting, continuing, or reviewing study sessions.

**Route Params**:
- `classId: string` (required)
- `className: string` (required, for header title)
- `hasResumableSession?: boolean` (optional, to highlight "Continue")

**Must Display**:
- Header with class name
- Action cards (pills or buttons):
  1. **Study now** - Start fresh session
  2. **Continue** - Resume previous session (if exists)
  3. **Quick recap** - 5-minute review
  4. **Flashcards** - Review key concepts
- Progress indicator (if session exists)
- Last studied timestamp

**Must Handle**:
- Show/hide "Continue" based on progress state
- Navigate to study session on action tap *(future)*
- Loading state while checking progress
- Empty/ready state

**Must NOT**:
- Display note content
- List other classes
- Allow editing progress directly

**Data Dependencies**:
- Fetch progress via `fetchProgressByClassId(classId)`

---

## Navigation Parameters Summary

All navigation includes both `classId` and `className` to avoid redundant fetches:

| From | To | Params |
|------|-----|--------|
| Home | ClassNotes | `{ classId, className }` |
| Home | StudyHub | `{ classId, className, hasResumableSession? }` |
| ClassNotes | Home | Back navigation (no params) |
| StudyHub | Home | Back navigation (no params) |

## Future Flows (Not Implemented)

- Study Session Screen (active studying)
- Flashcard Review Screen
- Class Detail/Edit Screen
- Settings Screen
- Profile/Stats Screen

These will be separate screens added later with their own specs.
