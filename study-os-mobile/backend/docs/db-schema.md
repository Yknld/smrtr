# Database Schema Documentation

## Overview

This document describes the core database schema for the StudyOS mobile MVP. The schema supports:
- Course and lesson management
- Real-time transcription and translation during live study sessions
- Text-to-speech (TTS) audio generation
- AI-generated study materials
- User progress tracking

**Key Design Principles:**
- User isolation via Row Level Security (RLS)
- Cascade deletes for data consistency
- Sequence-based alignment for transcript→translation→TTS pipeline
- MVP-focused (extensible but not over-engineered)

---

## Table Relationships

```
users (auth.users - managed by Supabase Auth)
  ↓
  ├─→ courses
  │     ↓
  │     └─→ lessons
  │           ↓
  │           ├─→ lesson_assets
  │           ├─→ study_sessions
  │           │     ↓
  │           │     ├─→ live_transcript_segments
  │           │     │     ↓ (via source_seq)
  │           │     ├─→ live_translation_segments
  │           │     │
  │           │     └─→ live_tts_chunks
  │           │
  │           ├─→ lesson_outputs
  │           ├─→ lesson_progress
  │           │
  │           └─→ podcast_episodes
  │                 ↓
  │                 └─→ podcast_segments
  │
  └─→ user_settings
```

---

## Core Tables

### `courses`

**Purpose:** Organize lessons into courses (e.g., "Introduction to Biology", "Spanish 101").

**Columns:**
- `id` (uuid, PK): Unique course identifier
- `user_id` (uuid, NOT NULL): Owner of the course (references `auth.users`)
- `title` (text, NOT NULL): Course name
- `term` (text, NULL): Academic term (e.g., "Fall 2024")
- `color` (text, NULL): UI color code for visual organization
- `created_at` (timestamptz): Creation timestamp

**Relationships:**
- One-to-many with `lessons`

**RLS:** Users can only access their own courses.

---

### `lessons`

**Purpose:** Individual lessons within courses. Can be created from uploads, live sessions, or imports.

**Columns:**
- `id` (uuid, PK): Unique lesson identifier
- `user_id` (uuid, NOT NULL): Owner of the lesson
- `course_id` (uuid, NOT NULL, FK): Parent course
- `title` (text, NOT NULL): Lesson name
- `source_type` (text, NOT NULL): How lesson was created
  - `upload`: File uploaded by user
  - `live_session`: Recorded during live transcription
  - `import`: Imported from external source
- `status` (text, NOT NULL): Processing status
  - `draft`: Not yet ready
  - `ready`: Available for study
  - `processing`: Background processing in progress
  - `failed`: Processing error
- `last_opened_at` (timestamptz, NULL): For "recently opened" sorting
- `created_at` (timestamptz): Creation timestamp

**Relationships:**
- Many-to-one with `courses` (ON DELETE CASCADE)
- One-to-many with `lesson_assets`, `study_sessions`, `lesson_outputs`, `lesson_progress`

**RLS:** Users can only access their own lessons. Insert requires ownership of parent course.

**Indexes:**
- `(user_id, course_id)`: Fetch lessons within a course
- `(user_id, last_opened_at DESC)`: Recently opened lessons

---

### `lesson_assets`

**Purpose:** Files and media associated with lessons (PDFs, slides, audio recordings, images).

**Columns:**
- `id` (uuid, PK): Unique asset identifier
- `lesson_id` (uuid, NOT NULL, FK): Parent lesson
- `user_id` (uuid, NOT NULL): Owner
- `kind` (text, NOT NULL): Asset type
  - `pdf`, `slides`, `notes`, `audio`, `image`, `other`
- `storage_bucket` (text, NOT NULL): Supabase Storage bucket name
- `storage_path` (text, NOT NULL): Path within bucket
- `mime_type` (text, NOT NULL): MIME type for download
- `duration_ms` (int, NULL): Duration for audio/video assets
- `created_at` (timestamptz): Creation timestamp

**Relationships:**
- Many-to-one with `lessons` (ON DELETE CASCADE)

**RLS:** Users can only access assets for their own lessons.

**Indexes:**
- `(lesson_id)`: Fetch all assets for a lesson

---

### `study_sessions`

**Purpose:** Track active or completed study sessions. Each session can have a different mode (listen, read, live transcribe, live translate).

**Columns:**
- `id` (uuid, PK): Unique session identifier
- `user_id` (uuid, NOT NULL): Owner
- `lesson_id` (uuid, NOT NULL, FK): Lesson being studied
- `mode` (text, NOT NULL): Study mode
  - `listen`: Audio playback
  - `read`: Text-based reading
  - `live_transcribe`: Real-time speech-to-text
  - `live_translate`: Real-time STT + translation
- `status` (text, NOT NULL): Session state
  - `active`: Currently in progress
  - `ended`: Completed normally
  - `failed`: Error occurred
- `started_at` (timestamptz): Session start time
- `ended_at` (timestamptz, NULL): Session end time (NULL while active)

**Relationships:**
- Many-to-one with `lessons` (ON DELETE CASCADE)
- One-to-many with `live_transcript_segments`, `live_translation_segments`, `live_tts_chunks`

**RLS:** Users can only access their own sessions. Insert requires ownership of parent lesson.

**Indexes:**
- `(user_id, lesson_id)`: Fetch sessions for a lesson
- `(user_id, started_at DESC)`: Recent session history
- `(status) WHERE status = 'active'`: Find active sessions (partial index)

---

## Live Session Tables

These tables support real-time transcription, translation, and TTS during live study sessions. The key linking mechanism is the **sequence number (`seq`)**.

### Sequence Alignment

```
live_transcript_segments.seq = 1, 2, 3, ...
         ↓
live_translation_segments.source_seq = 1, 2, 3, ...
         ↓
live_tts_chunks.source_seq = 1, 2, 3, ...
```

Each transcript segment gets a unique `seq` number within a session. Translation and TTS records reference this `seq` to align with the source transcript.

---

### `live_transcript_segments`

**Purpose:** Store real-time transcript segments from speech-to-text during live sessions.

**Columns:**
- `id` (uuid, PK): Unique segment identifier
- `user_id` (uuid, NOT NULL): Owner
- `study_session_id` (uuid, NOT NULL, FK): Parent session
- `seq` (int, NOT NULL): Sequence number within session (must be unique per session)
- `text` (text, NOT NULL): Transcribed text
- `language` (text, NOT NULL, DEFAULT 'en'): Source language (ISO 639-1)
- `start_ms` (int, NULL): Start time in milliseconds from session start
- `end_ms` (int, NULL): End time in milliseconds from session start
- `confidence` (real, NULL): STT confidence score (0.0-1.0)
- `created_at` (timestamptz): Creation timestamp

**Constraints:**
- UNIQUE(`study_session_id`, `seq`): Each sequence number must be unique within a session

**Relationships:**
- Many-to-one with `study_sessions` (ON DELETE CASCADE)
- Referenced by `live_translation_segments.source_seq` and `live_tts_chunks.source_seq`

**RLS:** Users can only access segments from their own sessions.

**Indexes:**
- `(study_session_id, seq)`: Fetch ordered segments for playback

---

### `live_translation_segments`

**Purpose:** Store translated versions of transcript segments.

**Columns:**
- `id` (uuid, PK): Unique translation identifier
- `user_id` (uuid, NOT NULL): Owner
- `study_session_id` (uuid, NOT NULL, FK): Parent session
- `source_seq` (int, NOT NULL): Links to `live_transcript_segments.seq`
- `source_lang` (text, NOT NULL): Original language (ISO 639-1)
- `target_lang` (text, NOT NULL): Translation target language (ISO 639-1)
- `translated_text` (text, NOT NULL): Translated text
- `provider` (text, NOT NULL): Translation service (e.g., "google", "deepl", "azure")
- `created_at` (timestamptz): Creation timestamp

**Constraints:**
- UNIQUE(`study_session_id`, `source_seq`, `target_lang`): One translation per segment per language

**Relationships:**
- Many-to-one with `study_sessions` (ON DELETE CASCADE)
- Logically linked to `live_transcript_segments` via `source_seq` (not a formal FK)

**RLS:** Users can only access translations from their own sessions.

**Indexes:**
- `(study_session_id, target_lang, source_seq)`: Fetch translations for a specific language

**Usage Example:**
```sql
-- Get transcript segment and its French translation
SELECT 
  t.seq, 
  t.text AS original, 
  tl.translated_text AS french
FROM live_transcript_segments t
LEFT JOIN live_translation_segments tl 
  ON tl.study_session_id = t.study_session_id 
  AND tl.source_seq = t.seq 
  AND tl.target_lang = 'fr'
WHERE t.study_session_id = :session_id
ORDER BY t.seq;
```

---

### `live_tts_chunks`

**Purpose:** Store TTS audio chunks generated from translated segments.

**Columns:**
- `id` (uuid, PK): Unique TTS chunk identifier
- `user_id` (uuid, NOT NULL): Owner
- `study_session_id` (uuid, NOT NULL, FK): Parent session
- `target_lang` (text, NOT NULL): Language of synthesized speech
- `source_seq` (int, NULL): Links to `live_transcript_segments.seq` (NULL for batch TTS)
- `audio_bucket` (text, NOT NULL): Supabase Storage bucket for audio file
- `audio_path` (text, NOT NULL): Path within storage bucket
- `duration_ms` (int, NULL): Audio duration in milliseconds
- `voice_id` (text, NULL): Voice identifier for the TTS provider
- `provider` (text, NOT NULL): TTS service (e.g., "elevenlabs", "google", "azure")
- `status` (text, NOT NULL): Processing status
  - `queued`: Waiting for generation
  - `ready`: Audio file available
  - `failed`: Generation error
- `created_at` (timestamptz): Creation timestamp

**Relationships:**
- Many-to-one with `study_sessions` (ON DELETE CASCADE)
- Logically linked to `live_transcript_segments` via `source_seq` (not a formal FK)

**RLS:** Users can only access TTS chunks from their own sessions.

**Indexes:**
- `(study_session_id, target_lang, created_at)`: Fetch TTS audio for playback
- `(status) WHERE status = 'queued'`: TTS processing queue (partial index)

**Usage Example:**
```sql
-- Get TTS audio chunks for French translation in sequence order
SELECT 
  tts.source_seq,
  tts.audio_path,
  tts.duration_ms
FROM live_tts_chunks tts
WHERE tts.study_session_id = :session_id
  AND tts.target_lang = 'fr'
  AND tts.status = 'ready'
ORDER BY tts.source_seq NULLS LAST, tts.created_at;
```

---

## Study Materials Tables

### `lesson_outputs`

**Purpose:** Store AI-generated study materials for lessons (summaries, flashcards, quizzes, notes, etc.).

**Columns:**
- `id` (uuid, PK): Unique output identifier
- `user_id` (uuid, NOT NULL): Owner
- `lesson_id` (uuid, NOT NULL, FK): Parent lesson
- `type` (text, NOT NULL): Output type
  - `summary`: Text summary of lesson
  - `key_concepts`: List of key concepts
  - `flashcards`: Flashcard deck (Q&A pairs)
  - `quiz`: Quiz questions
  - `mindmap`: Mind map structure
  - `notes`: Live notes updated incrementally from transcripts
- `status` (text, NOT NULL): Generation status
  - `queued`: Waiting for AI generation
  - `ready`: Content available
  - `failed`: Generation error
- `content_json` (jsonb, NOT NULL, DEFAULT '{}'): Structured content (schema depends on type)
- `notes_raw_text` (text, NULL): Raw notes text accumulated from transcript segments (notes type only)
- `notes_final_text` (text, NULL): Final polished/formatted notes (notes type only, NULL until finalized)
- `last_committed_seq` (int, NOT NULL, DEFAULT 0): Last transcript segment sequence processed (for incremental notes updates)
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

**Relationships:**
- Many-to-one with `lessons` (ON DELETE CASCADE)

**RLS:** Users can only access outputs for their own lessons.

**Indexes:**
- `(lesson_id, type)`: Fetch specific output type for a lesson
- `(user_id, type, updated_at DESC)`: Query all notes for a user
- `(status) WHERE status = 'queued'`: AI generation queue (partial index)

**Notes Type Details:**
The `notes` type enables canonical live notes that update incrementally as transcript segments arrive:
- `notes_raw_text`: Continuously appended with notes from new transcript segments
- `last_committed_seq`: Tracks which transcript segments have been processed (prevents duplicate processing)
- `notes_final_text`: Set when notes are polished/finalized (remains NULL during live recording)

**Content JSON Examples:**

```json
// type = 'summary'
{
  "summary": "This lecture covered variables and data types...",
  "word_count": 250
}

// type = 'flashcards'
{
  "cards": [
    {"front": "What is a variable?", "back": "A named storage location..."},
    {"front": "What are primitive data types?", "back": "int, float, bool..."}
  ]
}

// type = 'quiz'
{
  "questions": [
    {
      "question": "What is the difference between int and float?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "B",
      "explanation": "..."
    }
  ]
}
```

---

### `lesson_progress`

**Purpose:** Track user progress through lessons (playback position, completion status).

**Columns:**
- `user_id` (uuid, PK): User
- `lesson_id` (uuid, PK, FK): Lesson
- `last_position_ms` (int, NOT NULL, DEFAULT 0): Last playback position in milliseconds
- `completed` (boolean, NOT NULL, DEFAULT false): Whether user marked lesson as complete
- `updated_at` (timestamptz): Last update timestamp

**Primary Key:** `(user_id, lesson_id)` (composite key for efficient upserts)

**Relationships:**
- Many-to-one with `lessons` (ON DELETE CASCADE)

**RLS:** Users can only access their own progress records.

**Indexes:**
- `(lesson_id)`: Reverse lookup (e.g., "who has accessed this lesson?")

**Usage Example:**
```sql
-- Upsert progress (common pattern)
INSERT INTO lesson_progress (user_id, lesson_id, last_position_ms)
VALUES (:user_id, :lesson_id, 45000)
ON CONFLICT (user_id, lesson_id) 
DO UPDATE SET 
  last_position_ms = EXCLUDED.last_position_ms,
  updated_at = now();
```

---

## Podcast System Tables

### `podcast_episodes`

**Purpose:** AI-generated podcast-style dialogues that present lesson content as conversations between two speakers (host and co-host). Each episode is linked to a lesson and goes through scripting and voicing phases.

**Columns:**
- `id` (uuid, PK): Unique episode identifier
- `user_id` (uuid, NOT NULL): Owner
- `lesson_id` (uuid, NOT NULL, FK): Source lesson
- `status` (text, NOT NULL): Episode generation status
  - `queued`: Waiting for script generation
  - `scripting`: AI generating dialogue script
  - `voicing`: Synthesizing audio for segments
  - `ready`: Complete and playable
  - `failed`: Generation error
- `title` (text, NULL): Episode title (defaults to lesson title)
- `language` (text, NOT NULL, DEFAULT 'en'): Dialogue language
- `voice_a_id` (text, NOT NULL): Voice identifier for speaker A (host)
- `voice_b_id` (text, NOT NULL): Voice identifier for speaker B (co-host)
- `total_segments` (int, NOT NULL, DEFAULT 0): Number of dialogue segments
- `error` (text, NULL): Error message if status = 'failed'
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

**Relationships:**
- Many-to-one with `lessons` (ON DELETE CASCADE)
- One-to-many with `podcast_segments`

**RLS:** Users can only access episodes for their own lessons. Insert requires ownership of parent lesson.

**Indexes:**
- `(user_id, lesson_id, created_at DESC)`: Fetch episodes for a user's lessons

---

### `podcast_segments`

**Purpose:** Individual dialogue turns within a podcast episode. Each segment belongs to one speaker (A or B) and has associated TTS audio.

**Columns:**
- `id` (uuid, PK): Unique segment identifier
- `user_id` (uuid, NOT NULL): Owner
- `episode_id` (uuid, NOT NULL, FK): Parent episode
- `seq` (int, NOT NULL): Sequence number for playback order
- `speaker` (text, NOT NULL): Speaker identifier (`a` = host, `b` = co-host)
- `text` (text, NOT NULL): Dialogue text to be spoken
- `tts_status` (text, NOT NULL): Audio generation status
  - `queued`: Waiting for TTS generation
  - `generating`: TTS in progress
  - `ready`: Audio available for playback
  - `failed`: TTS generation error
- `audio_bucket` (text, NULL): Storage bucket for audio file
- `audio_path` (text, NULL): Path within storage bucket
- `duration_ms` (int, NULL): Audio duration in milliseconds
- `created_at` (timestamptz): Creation timestamp

**Constraints:**
- UNIQUE(`episode_id`, `seq`): Each sequence number must be unique within an episode

**Relationships:**
- Many-to-one with `podcast_episodes` (ON DELETE CASCADE)

**RLS:** Users can only access segments for their own episodes. Insert requires ownership of parent episode.

**Indexes:**
- `(episode_id, seq)`: Fetch segments in playback order
- `(episode_id, tts_status) WHERE tts_status IN ('queued', 'generating')`: TTS processing queue (partial index)

**Usage Example:**
```sql
-- Get all segments for an episode in playback order
SELECT 
  seq, 
  speaker, 
  text, 
  audio_path, 
  duration_ms
FROM podcast_segments
WHERE episode_id = :episode_id 
  AND tts_status = 'ready'
ORDER BY seq;
```

---

## User Configuration

### `user_settings`

**Purpose:** Store per-user preferences and default settings.

**Columns:**
- `user_id` (uuid, PK): User (references `auth.users`)
- `default_source_lang` (text, NOT NULL, DEFAULT 'en'): Default language for transcription (ISO 639-1)
- `default_target_lang` (text, NULL): Default translation target language (NULL = no translation)
- `live_listen_enabled` (boolean, NOT NULL, DEFAULT false): Enable real-time TTS during live sessions
- `tts_voice_id` (text, NULL): Preferred TTS voice identifier
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

**RLS:** Users can only access their own settings.

**Usage Example:**
```sql
-- Get or create user settings (common pattern)
INSERT INTO user_settings (user_id, default_source_lang, default_target_lang)
VALUES (:user_id, 'en', 'es')
ON CONFLICT (user_id) DO NOTHING
RETURNING *;
```

---

## Security Model (RLS)

All tables have Row Level Security (RLS) enabled. The security model is based on **user isolation**:

### Core Principles

1. **Direct Ownership:** Users can only access rows where `user_id = auth.uid()`
2. **Transitive Ownership:** For child tables (e.g., `lesson_assets`), inserts require ownership of parent resource
3. **No Cross-User Access:** User A cannot see or modify User B's data

### Policy Patterns

#### Standard Owner-Only Pattern
```sql
-- SELECT policy
CREATE POLICY "Users can view their own X"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can insert their own X"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update their own X"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete their own X"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

#### Parent Ownership Verification Pattern
```sql
-- Example: lesson_assets INSERT must verify lesson ownership
CREATE POLICY "Users can insert their own lesson assets"
  ON lesson_assets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM lessons 
      WHERE lessons.id = lesson_id 
        AND lessons.user_id = auth.uid()
    )
  );
```

This prevents User B from inserting assets into User A's lessons, even if they know the lesson ID.

---

## Cascade Delete Behavior

To maintain data consistency, foreign keys use `ON DELETE CASCADE`:

```
courses (deleted)
  ↓ CASCADE
  └─→ lessons (deleted)
        ↓ CASCADE
        ├─→ lesson_assets (deleted)
        ├─→ study_sessions (deleted)
        │     ↓ CASCADE
        │     ├─→ live_transcript_segments (deleted)
        │     ├─→ live_translation_segments (deleted)
        │     └─→ live_tts_chunks (deleted)
        ├─→ lesson_outputs (deleted)
        ├─→ lesson_progress (deleted)
        └─→ podcast_episodes (deleted)
              ↓ CASCADE
              └─→ podcast_segments (deleted)
```

**Example:** Deleting a course will automatically delete:
- All lessons in the course
- All assets for those lessons
- All study sessions for those lessons
- All transcript/translation/TTS data for those sessions
- All outputs and progress records for those lessons
- All podcast episodes and their segments for those lessons

This ensures no orphaned data and simplifies cleanup.

---

## Indexes Summary

Indexes are created for common query patterns:

### User Data Access
- `courses(user_id, created_at DESC)` - List user's courses
- `lessons(user_id, course_id)` - List lessons in a course
- `lessons(user_id, last_opened_at DESC)` - Recently opened lessons

### Session Playback
- `live_transcript_segments(study_session_id, seq)` - Ordered transcript playback
- `live_translation_segments(study_session_id, target_lang, source_seq)` - Aligned translations
- `live_tts_chunks(study_session_id, target_lang, created_at)` - TTS audio playback

### Background Processing
- `live_tts_chunks(status) WHERE status = 'queued'` - TTS generation queue (partial)
- `lesson_outputs(status) WHERE status = 'queued'` - AI generation queue (partial)
- `study_sessions(status) WHERE status = 'active'` - Active session monitoring (partial)

Partial indexes are used for queues to minimize index size (only index queued/active items).

---

## Migration Order

Migrations must be applied in order:

1. **001_create_core_tables.sql** - courses, lessons, lesson_assets, study_sessions
2. **002_create_live_tables.sql** - live_transcript_segments, live_translation_segments, live_tts_chunks
3. **003_create_outputs_and_progress.sql** - lesson_outputs, lesson_progress, user_settings
4. **004_rls_policies.sql** - Enable RLS and create policies
5. **005_indexes.sql** - Create performance indexes
6. **011_create_podcast_tables.sql** - podcast_episodes, podcast_segments
7. **012_add_notes_to_lesson_outputs.sql** - Add notes type and incremental update fields

---

## Testing

See `backend/tests/sql/db_smoke_test.sql` for comprehensive RLS and constraint testing of core tables.

The test covers:
- User isolation (User A cannot see User B's data)
- Insert policies (User B cannot insert into User A's resources)
- Unique constraints (duplicate seq/source_seq blocked)
- Cascade deletes (deleting a course removes all related data)

For podcast system testing, see `backend/tests/sql/podcast_smoke_test.sql`, which validates:
- Unique constraints on episode segments (duplicate seq blocked)
- Cascade deletes (lesson→episode→segments)
- Status constraints (invalid status values rejected)
- Triggers (updated_at auto-updated on changes)

---

## Future Extensions (Post-MVP)

Potential enhancements (not implemented yet):
- Sharing/collaboration (relaxed RLS policies for shared resources)
- Analytics tables (aggregate study time, completion rates)
- Notification preferences
- Scheduled TTS/translation jobs
- Version history for lesson outputs
- Tags/categories for courses and lessons
- Search indexes (full-text search on transcripts)

These can be added via new migrations without breaking existing schema.
