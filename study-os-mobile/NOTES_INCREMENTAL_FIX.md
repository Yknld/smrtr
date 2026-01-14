# Live Notes Incremental Generation - Bug Fixes

## Issues Found

### 1. Database Constraint Error ✅ FIXED
**Error:** `code: "42P10" - there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Root Cause:** 
- Used `.upsert()` with `onConflict: 'user_id,lesson_id,type'`
- But `lesson_outputs` table doesn't have a unique constraint on those columns
- Only has `id` as PRIMARY KEY

**Solution:**
Changed `saveNotesToDatabase()` to:
1. First check if a record exists (SELECT)
2. If exists → UPDATE by id
3. If not exists → INSERT new record

This avoids the need for a unique constraint.

### 2. Notes Not Generating During Recording ✅ FIXED
**Problem:** Notes only appeared after stopping recording, "Notes length: 0"

**Root Cause:**
- Used `React.useCallback` for `generateNotesIncremental()` with dependencies
- Timer intervals captured stale closures of the function
- When transcript updated, the timer was still calling the old version with old transcript value

**Solution:**
Refactored to use refs instead of useCallback:
```typescript
// Create refs for values that need to be accessed in timers
const transcriptRef = useRef(transcript);
const lastProcessedTranscriptRef = useRef(lastProcessedTranscript);
const isGeneratingNotesRef = useRef(isGeneratingNotes);

// Keep refs in sync with state
useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
useEffect(() => { lastProcessedTranscriptRef.current = lastProcessedTranscript; }, [lastProcessedTranscript]);
useEffect(() => { isGeneratingNotesRef.current = isGeneratingNotes; }, [isGeneratingNotes]);

// Function always accesses current values via refs
const generateNotesIncremental = async () => {
  const currentTranscript = transcriptRef.current;
  const currentLastProcessed = lastProcessedTranscriptRef.current;
  // ... rest of logic
};
```

This ensures the timer always calls a function that reads the latest values.

## How It Works Now

### During Recording (Every 20 seconds):
1. Timer fires → `generateNotesIncremental()` called
2. Reads current transcript from `transcriptRef.current`
3. Compares with `lastProcessedTranscriptRef.current`
4. If new content exists:
   - Formats as bullet points
   - Appends to notes state
   - Saves to database (`notes_raw_text`)
   - Updates `lastProcessedTranscript`

### When Recording Stops:
1. `stopRecording()` called
2. Clears the interval timer
3. Calls `finalizeNotes()` automatically
4. AI formats the notes nicely
5. Saves to database (`notes_final_text`)

### When Viewing in LessonHub:
1. `loadLessonData()` queries `lesson_outputs` table
2. Fetches `notes_final_text` (if available) or `notes_raw_text`
3. Displays in `NotesPreview` component
4. Reloads when screen comes into focus

## Testing Steps

1. **Start Recording:**
   - Tap mic button
   - Should see: `[Notes] ✅ Timers started: 5s initial + 20s periodic`

2. **Speak for 5+ seconds:**
   - Should see transcript updates: `[Transcript] 🎤 Got final text: "..."`
   - Should see: `[Transcript] ✅ Updated from X to Y chars`

3. **Wait 5 seconds:**
   - Should see: `[Notes] ⏰ Timer: Running first generation after 5s`
   - Should see: `[Notes] 📝 generateNotesIncremental called`
   - Should see: `[Notes] 📄 New content: "..." (X chars)`
   - Should see: `[Notes] ✅ Updated notes from 0 to X chars`
   - Should see: `[Notes] 💾 Saving to database`
   - Should see: `[Notes] ✅ Inserted new record to database`

4. **Check Notes Section:**
   - Should show bullet points with your spoken text

5. **Continue speaking + wait 20 seconds:**
   - Should see: `[Notes] ⏰ Timer: Running periodic generation (20s interval)`
   - Notes should update again

6. **Stop Recording:**
   - Should see: `[Notes] ✅ Finalized: X chars`
   - Should see: `[Notes] ✅ Updated existing record in database`

7. **Navigate back to LessonHub:**
   - Should see: `[LessonHub] Loaded notes: X chars`
   - Notes should appear in preview at top

## Files Changed

### /apps/mobile/src/screens/LessonWorkspace/LessonWorkspaceScreen.tsx
- Refactored `generateNotesIncremental()` to use refs instead of useCallback
- Fixed `saveNotesToDatabase()` to check-then-update instead of upsert
- Added better logging throughout

### /apps/mobile/src/screens/LessonHub/LessonHubScreen.tsx
- Added `loadLessonData()` function
- Added screen focus listener for auto-reload
- Integrated with NotesPreview component

## Expected Console Output (Success Case)

```
[Notes] ✅ Timers started: 5s initial + 20s periodic
[Transcript] 🎤 Got final text: "hello world"
[Transcript] ✅ Updated from 0 to 11 chars
[Notes] ⏰ Timer: Running first generation after 5s
[Notes] 📝 generateNotesIncremental called
[Notes] 📄 New content: "hello world" (11 chars)
[Notes] ✅ Updated notes from 0 to 14 chars
[Notes] Preview: "
• hello world..."
[Notes] 🎉 Successfully generated notes from 11 new chars
[Notes] 💾 Saving to database (14 chars, final: false)
[Notes] ✅ Inserted new record to database
... (20 seconds later)
[Notes] ⏰ Timer: Running periodic generation (20s interval)
[Notes] 📝 generateNotesIncremental called
... (more updates)
... (user stops recording)
[Notes] ✅ Finalized: 245 chars
[Notes] 💾 Saving to database (245 chars, final: true)
[Notes] ✅ Updated existing record in database
... (user navigates back)
[LessonHub] Loaded notes: 245 chars
```

## Next Steps if Still Not Working

1. **Share full console logs** from start to 30 seconds of recording
2. **Check database directly:**
   ```sql
   SELECT * FROM lesson_outputs 
   WHERE lesson_id = 'YOUR_LESSON_ID' 
   AND type = 'notes';
   ```
3. **Verify AssemblyAI is working** - check for transcript updates
4. **Check refs are updating** - the console logs will show this

## Technical Notes

### Why Refs Instead of useCallback?

When you use `useCallback` with dependencies and pass the result to a timer:
```typescript
const fn = useCallback(() => { 
  console.log(someState); // captures current value
}, [someState]);

setInterval(fn, 1000); // captures THIS version of fn
```

The interval captures the version of `fn` that existed when the interval was created. Even if `someState` changes and `fn` is recreated, the interval is still calling the old version.

With refs:
```typescript
const ref = useRef(someState);
useEffect(() => { ref.current = someState }, [someState]);

const fn = () => { 
  console.log(ref.current); // always reads latest value
};

setInterval(fn, 1000); // calls fn which reads current ref
```

The interval calls the same function, but that function reads the current value from the ref.
