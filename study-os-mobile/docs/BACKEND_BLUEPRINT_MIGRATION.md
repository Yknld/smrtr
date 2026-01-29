# Backend Blueprint Implementation Guide

## Status: IN PROGRESS

This document tracks the implementation of the consistent backend pattern across all AI features (flashcards, quiz, tutor, podcast).

---

## Phase 1: Database Schema ✅ (Needs Manual Application)

### Migration Created: `014_enhance_lesson_outputs.sql`

**Location:** `/supabase/migrations/014_enhance_lesson_outputs.sql`

**Changes:**
- ✅ Added `version` column (int, auto-increments on regeneration)
- ✅ Added `source_hash` column (text, for cache consistency)
- ✅ Added `model` column (text, tracks AI model used)
- ✅ Updated `type` enum to include: `podcast_outline`, `podcast_script`, `podcast_audio`, `tutor_state`, `youtube_recs`
- ✅ Updated `status` enum to include `processing`
- ✅ Added indexes for cache lookup and version tracking
- ✅ Created trigger to auto-increment version on regeneration

**To Apply:**
```bash
# Option 1: Via Supabase SQL Editor (Recommended for now)
# 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# 2. Copy contents of supabase/migrations/014_enhance_lesson_outputs.sql
# 3. Run the SQL

# Option 2: Via CLI (when migration conflicts are resolved)
cd study-os-mobile
supabase db push --include-all
```

---

## Phase 2: Shared Utilities ✅

### Source Hash Utility

**Location:** `/supabase/functions/shared/sourceHash.ts`

**Functions:**
- ✅ `generateSourceHash(inputs)` - Creates SHA-256 hash from lesson inputs
- ✅ `gatherSourceInputs(supabase, lesson_id)` - Collects all source content
- ✅ `checkCache(supabase, lesson_id, type, source_hash)` - Checks for cached output
- ✅ `getContentText(inputs, maxLength)` - Extracts text for AI generation

**How it works:**
1. Gathers: notes (final > raw), transcripts, assets metadata, YouTube transcript
2. Creates deterministic hash (SHA-256)
3. Before generating, checks if output with same source_hash exists
4. Returns cached if found, otherwise generates new

---

## Phase 3: Updated Edge Functions

### 3.1 Flashcards Generation (In Progress)

**Location:** `/supabase/functions/lesson_generate_flashcards/`

**Status:** 🔄 Updating with caching pattern

**Changes Needed:**
- [ ] Import sourceHash utilities
- [ ] Generate source_hash before generation
- [ ] Check cache first
- [ ] Save output with source_hash, version, model
- [ ] Return structured schema

### 3.2 Quiz Generation (To Create)

**Location:** `/supabase/functions/lesson_generate_quiz/` (NEW)

**Status:** ⏳ Pending

**Requirements:**
- Separate endpoint from flashcards
- Same caching pattern
- Structured JSON schema
- Support for quiz_attempts table (optional)

### 3.3 AI Tutor (To Update)

**Location:** `/supabase/functions/tutor_chat/`

**Status:** ⏳ Pending

**Changes Needed:**
- Use sourceHash utilities to build context pack
- Always include: summary + key concepts + recent notes + transcript excerpt
- Maintain conversation history (already done)
- Add citations from specific sources

### 3.4 Podcast Outline (To Create)

**Location:** `/supabase/functions/podcast_generate_outline/` (NEW)

**Status:** ⏳ Pending

**Requirements:**
- Stage A of two-stage podcast generation
- Creates teaching outline with sections, analogies, checkpoints
- Saves to lesson_outputs(type='podcast_outline')
- Uses caching pattern

### 3.5 Podcast Script (To Update)

**Location:** `/supabase/functions/podcast_generate_script/`

**Status:** ⏳ Pending

**Changes Needed:**
- Stage B of two-stage generation
- Takes outline as input
- Generates dialogue following quality rules
- Saves to lesson_outputs(type='podcast_script')

---

## Phase 4: Testing Checklist

### Per Feature:
- [ ] Cache hit works (same source = same output)
- [ ] Cache miss works (new generation)
- [ ] Version increments on regeneration
- [ ] Cross-device consistency (same source_hash on different devices)
- [ ] Error handling
- [ ] Input length limits respected

### Integration:
- [ ] Mobile app displays cached results
- [ ] No unnecessary regenerations
- [ ] Status updates work (queued → processing → ready)
- [ ] Failed outputs are retryable

---

## Implementation Order (Fast MVP Wins)

1. ✅ Database migration (created, needs application)
2. ✅ Source hash utility (completed)
3. 🔄 Flashcards with caching (in progress)
4. ⏳ Quiz generation (separate endpoint)
5. ⏳ Test flashcards + quiz
6. ⏳ Tutor context pack
7. ⏳ Podcast outline → script (two-stage)
8. ⏳ End-to-end testing

---

## Key Implementation Rules

### Always Follow:
1. ✅ Use `lesson_outputs` + `source_hash` caching
2. ✅ Never store raw LLM text without schema validation
3. ✅ Cap input size + output sizes
4. ✅ Version outputs (allows regeneration without breaking clients)
5. ✅ Return 404 on cross-user access
6. ✅ Return structured JSON with strict schemas

### Never Do:
- ❌ Generate without checking cache first
- ❌ Store outputs without source_hash
- ❌ Parse free-form text on clients
- ❌ Allow unbounded input/output sizes
- ❌ Skip version tracking

---

## Cost Optimization Notes

- Cache hits = $0 cost
- Source hash ensures same content = same output across devices
- Version tracking allows easy regeneration when needed
- Input caps prevent runaway costs

---

## Next Steps

1. Apply migration 014 to database
2. Update flashcards function with caching
3. Test flashcards thoroughly
4. Create separate quiz endpoint
5. Continue with tutor and podcast updates

---

**Last Updated:** 2026-01-12
**Status:** Phase 3 - Updating Edge Functions
