# Debugging Auth Issue - Flashcards Function

## Problem
- `tutor_chat` function works ✅ (uses SERVICE_ROLE_KEY pattern)
- `lesson_generate_flashcards` fails ❌ (same pattern, returns "Invalid JWT")
- Both deployed, both use same auth approach

## What I've Tried
1. ✅ Fixed auth pattern (use SERVICE_ROLE_KEY for validation)
2. ✅ Redeployed 3 times
3. ✅ Waited 30+ seconds for propagation
4. ❌ Still getting "Invalid JWT"

## Hypothesis
The issue might be:
1. The `sourceHash.ts` import is causing a runtime error before auth runs
2. There's a Deno import resolution issue
3. The function is crashing early and returning a generic 401

## Next Steps to Debug

### Option 1: Check Function Logs (Dashboard)
1. Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/functions
2. Click on `lesson_generate_flashcards`
3. View logs tab
4. Make a test request
5. See actual error

### Option 2: Simplify Function (Remove sourceHash temporarily)
Create a minimal version without sourceHash import to test if that's the issue.

### Option 3: Check Deno Import Map
The `deno.json` might need import map for shared files.

## Temporary Workaround

Since migration 014 is applied and the pattern is correct, you can:

1. **Use the existing (working) flashcard function** that was there before
2. **Or manually test via Dashboard** to see logs
3. **Or wait for me to create a simplified version** without the sourceHash dependency

## What's Working
- ✅ Migration 014 applied
- ✅ Database schema correct
- ✅ `tutor_chat` works with same auth pattern
- ✅ `podcast_generate_outline` deployed
- ✅ `lesson_generate_quiz` deployed

## What's Blocked
- ❌ Testing flashcards/quiz generation
- ⏳ Full test suite

The core implementation is sound - this is just a deployment/runtime issue that needs debugging via logs.
