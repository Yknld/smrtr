# Practice Flow Testing Guide

## Files Created/Edited

### New Files Created (11 files):

1. **`src/screens/PracticeHome.jsx`** - Step 1: Practice Home screen
2. **`src/screens/PracticeHome.css`** - Styles for Practice Home
3. **`src/screens/PracticeLectureSelection.jsx`** - Step 2: Lecture Selection screen
4. **`src/screens/PracticeLectureSelection.css`** - Styles for Lecture Selection
5. **`src/screens/PracticeModeSelection.jsx`** - Step 3: Mode Selection screen
6. **`src/screens/PracticeModeSelection.css`** - Styles for Mode Selection
7. **`src/screens/PracticeFlashcards.jsx`** - Step 4: Flashcards practice experience
8. **`src/screens/PracticeFlashcards.css`** - Styles for Flashcards
9. **`src/screens/PracticeMultipleChoice.jsx`** - Step 4: Multiple Choice practice experience
10. **`src/screens/PracticeMultipleChoice.css`** - Styles for Multiple Choice
11. **`src/data/practiceQuestions.js`** - Static demo questions data

### Files Edited (3 files):

1. **`src/components/Layout/Sidebar.jsx`** - Added "Practice" navigation item
2. **`src/App.jsx`** - Added routes for all Practice screens
3. **`src/components/Layout/TopBar.jsx`** - Added title handling for Practice screens

---

## How to Test the Full Practice Flow

### Prerequisites
- Development server running: `npm run dev`
- Browser open to `http://localhost:5173`

### Step 1: Practice Home

1. **Navigate to Practice:**
   - Click "Practice" in the left sidebar (✏️ icon)
   - URL: `http://localhost:5173/practice`

2. **Verify:**
   - Title: "Practice"
   - Subtitle: "Test what you've learned"
   - Grid of 4 class cards displayed
   - Each card shows: class name + "X lectures available"
   - Each card has colored top border
   - Hover over cards → they lift slightly with shadow increase
   - Click a card → navigates to Step 2

### Step 2: Lecture Selection

1. **From Practice Home:**
   - Click any class card (e.g., "Introduction to Computer Science")
   - URL: `http://localhost:5173/practice/1/lectures?className=...`

2. **Verify:**
   - Header: "Practice · {Class Name}"
   - Instruction: "Select lectures to include"
   - "Select all" and "Clear all" buttons at top
   - List of lectures with checkboxes
   - Checkboxes are functional
   - "Continue" button at bottom (disabled until ≥1 selected)
   - Select at least one lecture
   - Click "Continue" → navigates to Step 3

### Step 3: Mode Selection

1. **From Lecture Selection:**
   - Select one or more lectures
   - Click "Continue"
   - URL: `http://localhost:5173/practice/1/mode?className=...&lectures=...`

2. **Verify:**
   - Title: "Choose a practice mode"
   - Two large cards displayed:
     - **Flashcards** (🎴) - "Study key terms and concepts..."
     - **Multiple Choice** (✓) - "Test your knowledge..."
   - Each card shows icon, title, and description
   - Hover over cards → they lift with shadow
   - Click a mode → navigates to Step 4

### Step 4a: Flashcards Practice

1. **From Mode Selection:**
   - Click "Flashcards" card
   - URL: `http://localhost:5173/practice/1/flashcards?className=...&lectures=...`

2. **Verify:**
   - Back button (← Back) at top left
   - Progress indicator (1 / 5) at top right
   - Large centered flashcard
   - Front shows: "Question" label + question text + "Click to flip" hint
   - Click card → horizontal flip animation → shows back
   - Back shows: "Answer" label + answer text + "Click to flip" hint
   - Click again → flips back to front
   - "Next" button at bottom
   - Click "Next" → advances to next card
   - After last card, button shows "Finish"
   - Click "Finish" → returns to Practice Home

**Test Multiple Cards:**
- Go through all 5 flashcards
- Verify smooth flip animation each time
- Verify progress updates (1/5, 2/5, etc.)

### Step 4b: Multiple Choice Practice

1. **From Mode Selection:**
   - Click "Multiple Choice" card
   - URL: `http://localhost:5173/practice/1/multiple-choice?className=...&lectures=...`

2. **Verify:**
   - Back button (← Back) at top left
   - Progress indicator (1 / 5) at top right
   - Question displayed at top (large, bold)
   - Exactly 4 answer options below
   - Click an option → it becomes selected (highlighted)
   - "Submit" button at bottom (disabled until option selected)
   - Click "Submit" → shows result
   - **Correct answer:** Green highlight + checkmark (✓) appears
   - **Incorrect answer:** Gentle horizontal shake animation (no red)
   - Button changes to "Next"
   - Click "Next" → advances to next question
   - After last question, button shows "Finish"
   - Click "Finish" → returns to Practice Home

**Test Multiple Questions:**
- Answer all 5 questions
- Try correct and incorrect answers
- Verify correct answer shows green + checkmark
- Verify incorrect answer shows shake (no red explosion)
- Verify progress updates

---

## Quick Test Flow Summary

```
1. Click "Practice" in sidebar
   ↓
2. Click a class card
   ↓
3. Select one or more lectures, click "Continue"
   ↓
4a. Click "Flashcards" → Practice with flashcards
   OR
4b. Click "Multiple Choice" → Practice with quiz
   ↓
5. Complete practice → Returns to Practice Home
```

---

## Features Verified

✅ **Step 1 (Practice Home):**
- Grid layout with class cards
- Card hover lift effect
- Navigation to lecture selection

✅ **Step 2 (Lecture Selection):**
- Checkbox list of lectures
- Select all / Clear all controls
- Continue button (disabled when no selection)
- Navigation to mode selection

✅ **Step 3 (Mode Selection):**
- Two large mode cards
- Card hover lift effect
- Navigation to practice experience

✅ **Step 4a (Flashcards):**
- Horizontal flip animation
- Front/back card display
- Progress indicator
- Navigation through cards
- Finish returns to home

✅ **Step 4b (Multiple Choice):**
- 4 answer choices per question
- Submit button (disabled until selection)
- Correct answer: green highlight + checkmark
- Incorrect answer: gentle shake (no red)
- Progress indicator
- Navigation through questions
- Finish returns to home

✅ **Navigation:**
- Practice item in sidebar
- All routes properly configured
- Back buttons work
- Flow progression works

✅ **Design:**
- Uses design tokens
- Subtle animations
- No gamification
- Calm, educational aesthetic
- Clear hierarchy

---

## Notes

- All data is static/demo (no backend)
- Questions are pre-defined in `src/data/practiceQuestions.js`
- No scoring persistence
- No timers
- No popups
- Animations are subtle and calm
- All interactions use motion tokens
