# Live Notes Debugging Guide

## Overview
This guide documents the incremental live notes feature and debugging steps.

## How It Works

### 1. Recording Flow
```
User starts recording
  ↓
AssemblyAI sends transcript events
  ↓
Transcript state updates
  ↓
Timer triggers generateNotesIncremental every 20s
  ↓
Notes update incrementally as bullet points
  ↓
Notes saved to database (lesson_outputs)
  ↓
User stops recording
  ↓
Notes finalized with AI formatting
  ↓
Final notes saved to database
```

### 2. Database Schema
Notes are stored in `lesson_outputs` table:
- `notes_raw_text`: Incremental notes (updated every 20s during recording)
- `notes_final_text`: Finalized, AI-formatted notes (set when recording stops)
- `type`: 'notes'
- `status`: 'ready'

### 3. Key Components

#### LessonWorkspaceScreen.tsx
- **Transcript state**: Updated from AssemblyAI real-time events
- **Notes state**: Incrementally built from transcript
- **generateNotesIncremental()**: Runs every 20 seconds during recording
- **saveNotesToDatabase()**: Saves notes to `lesson_outputs` table
- **finalizeNotes()**: AI-formats notes when recording stops

#### LessonHubScreen.tsx
- **loadLessonData()**: Loads notes from database on mount and focus
- **NotesPreview**: Displays notes at top of screen

## Debug Logging

### What to Look For

#### 1. Transcript Updates
```
[Transcript] 🎤 Got final text: "hello world"
[Transcript] ✅ Updated from 0 to 11 chars
[Transcript] Content preview: "hello world..."
```

#### 2. Timer Events
```
[Notes] ✅ Timers started: 5s initial + 20s periodic
[Notes] ⏰ Timer: Running first generation after 5s
[Notes] ⏰ Timer: Running periodic generation (20s interval)
```

#### 3. Note Generation
```
[Notes] 📝 generateNotesIncremental called
[Notes] 📄 New content: "hello world..." (11 chars)
[Notes] ✅ Updated notes from 0 to 15 chars
[Notes] Preview: "• hello world..."
[Notes] 🎉 Successfully generated notes from 11 new chars
```

#### 4. Database Saves
```
[Notes] 💾 Saving to database (15 chars, final: false)
[Notes] ✅ Saved to database successfully
```

#### 5. Finalization
```
[Notes] ✅ Finalized: 245 chars
[Notes] 💾 Saving to database (245 chars, final: true)
[Notes] ✅ Saved to database successfully
```

### Skip Reasons
If note generation is skipped, you'll see:
```
[Notes] ⏸️ Already generating, skipping
[Notes] ⏸️ No new transcript, skipping (identical strings)
[Notes] ⏸️ Transcript too short (5 < 10), skipping
```

## Testing Checklist

### Basic Flow
1. ✅ Start recording (tap mic button)
2. ✅ Speak for 5+ seconds
3. ✅ Check console for transcript updates
4. ✅ Wait 5 seconds for first note generation
5. ✅ Verify notes appear in Notes section
6. ✅ Continue speaking
7. ✅ Wait 20 seconds for periodic generation
8. ✅ Verify notes update
9. ✅ Stop recording
10. ✅ Verify notes are finalized
11. ✅ Navigate to LessonHub
12. ✅ Verify notes appear in NotesPreview

### Edge Cases
- [ ] Recording with no speech (no transcript)
- [ ] Recording with very short speech (<10 chars)
- [ ] Stopping recording before 5 seconds
- [ ] Network errors during save
- [ ] Rapid start/stop recording

## Troubleshooting

### Problem: Notes not appearing during recording

**Check:**
1. Is transcript updating? Look for `[Transcript] ✅ Updated` logs
2. Are timers running? Look for `[Notes] ✅ Timers started` log
3. Is generateNotesIncremental being called? Look for `[Notes] 📝 generateNotesIncremental called`
4. Is it being skipped? Look for `[Notes] ⏸️` skip logs

**Common Causes:**
- AssemblyAI not sending transcript events (check API key, network)
- Transcript length < 10 characters
- Component re-rendering and resetting state

### Problem: Notes not saving to database

**Check:**
1. Look for `[Notes] 💾 Saving to database` logs
2. Check for error logs: `[Notes] ❌ Failed to save to database`
3. Verify user is authenticated
4. Check database permissions (RLS policies)

**SQL Query to Check:**
```sql
SELECT * FROM lesson_outputs 
WHERE lesson_id = 'YOUR_LESSON_ID' 
AND type = 'notes';
```

### Problem: Notes not appearing in LessonHub

**Check:**
1. Look for `[LessonHub] Loaded notes: X chars` log
2. Verify notes exist in database (see SQL above)
3. Check that `notesContent` state is being set
4. Verify `NotesPreview` component is rendering

**Common Causes:**
- Notes not saved to database
- Wrong lesson_id
- RLS policy blocking read access

## Files Modified

### /apps/mobile/src/screens/LessonWorkspace/LessonWorkspaceScreen.tsx
- Added extensive debug logging
- Implemented `saveNotesToDatabase()` function
- Enhanced `generateNotesIncremental()` with better logging
- Added transcript change listener for debugging

### /apps/mobile/src/screens/LessonHub/LessonHubScreen.tsx
- Added `loadLessonData()` to fetch notes from database
- Added screen focus listener to reload notes
- Integrated with `NotesPreview` component

## Next Steps

If notes still don't appear:
1. Share full console logs from start to stop recording
2. Check database with SQL query above
3. Verify migrations 012 has been applied
4. Check Supabase dashboard for RLS policy issues
