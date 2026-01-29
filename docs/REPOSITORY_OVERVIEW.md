# Study OS Mobile - Repository Overview

**Last Updated:** January 10, 2026  
**Purpose:** Complete reference for all features, databases, APIs, and architecture

---

## 📱 Application Overview

**Study OS Mobile** is a React Native mobile application (iOS/Android) designed to help students manage their learning through:
- Course and lesson organization
- Real-time transcription during lectures
- AI-powered study materials (summaries, flashcards, quizzes)
- YouTube video imports with automatic transcription
- Study scheduling and progress tracking
- Push notifications for study reminders

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Navigation:** React Navigation (stack navigator)
- **State:** Context/hooks-based state management
- **Design:** Light mode, rounded cards, pill chips

### Backend
- **Platform:** Supabase
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth (JWT)
- **Storage:** Supabase Storage (for audio, PDFs, images)
- **Edge Functions:** Deno runtime
- **AI Provider:** Google Gemini API

---

## 📂 Repository Structure

```
smrtr/
├── study-os-mobile/
│   ├── apps/mobile/              # React Native app (Expo)
│   │   ├── src/
│   │   │   ├── screens/          # Screen components
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/               # Design system tokens
│   │   │   ├── data/             # Data fetching layer
│   │   │   ├── state/            # State management
│   │   │   ├── services/         # Business logic services
│   │   │   ├── types/            # TypeScript definitions
│   │   │   └── utils/            # Utility functions
│   │   └── docs/                 # App-specific documentation
│   │
│   ├── supabase/
│   │   ├── functions/            # Edge Functions (serverless)
│   │   ├── migrations/           # Database migrations
│   │   └── lib/                  # Shared libraries
│   │
│   ├── backend/
│   │   ├── docs/                 # Backend documentation
│   │   ├── tests/                # Test suites
│   │   ├── ai/gemini/            # AI prompts and config
│   │   └── functions/            # Legacy function location
│   │
│   └── contracts/                # Shared type contracts
│
└── docs/                         # Project-level documentation
```

---

## 🗄️ Database Schema

### Core Tables

#### `courses`
Organize lessons into courses (e.g., "Biology 101", "Spanish 201")
- `id`, `user_id`, `title`, `term`, `color`, `created_at`
- **RLS:** Users can only access their own courses

#### `lessons`
Individual lessons within courses
- `id`, `user_id`, `course_id`, `title`, `source_type`, `status`, `last_opened_at`, `created_at`
- **Source Types:** `upload`, `live_session`, `import`
- **Status:** `draft`, `ready`, `processing`, `failed`
- **RLS:** Users can only access their own lessons

#### `lesson_assets`
Files and media associated with lessons
- `id`, `lesson_id`, `user_id`, `kind`, `storage_bucket`, `storage_path`, `mime_type`, `duration_ms`, `created_at`
- **Asset Types:** `pdf`, `slides`, `notes`, `audio`, `image`, `other`
- **RLS:** Users can only access assets for their own lessons

#### `study_sessions`
Track active or completed study sessions
- `id`, `user_id`, `lesson_id`, `mode`, `status`, `started_at`, `ended_at`
- **Modes:** `listen`, `read`, `live_transcribe`, `live_translate`
- **Status:** `active`, `ended`, `failed`

### Live Session Tables

#### `live_transcript_segments`
Real-time transcript segments from speech-to-text
- `id`, `user_id`, `study_session_id`, `seq`, `text`, `language`, `start_ms`, `end_ms`, `confidence`, `created_at`
- **Unique:** `(study_session_id, seq)` - ensures ordered playback

#### `live_translation_segments`
Translated versions of transcript segments
- `id`, `user_id`, `study_session_id`, `source_seq`, `source_lang`, `target_lang`, `translated_text`, `provider`, `created_at`
- **Unique:** `(study_session_id, source_seq, target_lang)`

#### `live_tts_chunks`
Text-to-speech audio chunks generated from translations
- `id`, `user_id`, `study_session_id`, `target_lang`, `source_seq`, `audio_bucket`, `audio_path`, `duration_ms`, `voice_id`, `provider`, `status`, `created_at`
- **Status:** `queued`, `ready`, `failed`

### Study Materials Tables

#### `lesson_outputs`
AI-generated study materials for lessons
- `id`, `user_id`, `lesson_id`, `type`, `status`, `content_json`, `created_at`, `updated_at`
- **Types:** `summary`, `key_concepts`, `flashcards`, `quiz`, `mindmap`
- **Status:** `queued`, `ready`, `failed`

#### `lesson_progress`
Track user progress through lessons
- `user_id`, `lesson_id`, `last_position_ms`, `completed`, `updated_at`
- **Primary Key:** `(user_id, lesson_id)`

### Scheduling Tables

#### `study_plans`
User-defined study schedules
- `id`, `user_id`, `title`, `course_id`, `timezone`, `is_enabled`, `created_at`, `updated_at`

#### `study_plan_rules`
Recurrence rules for study plans (iCalendar RRULE format)
- `id`, `study_plan_id`, `rrule`, `start_time_local`, `duration_min`, `remind_before_min`, `created_at`

#### `device_push_tokens`
Device push notification tokens for reminders
- `id`, `user_id`, `platform`, `push_token`, `is_active`, `last_seen_at`, `created_at`, `updated_at`
- **Unique:** `push_token` (one token per device)

### YouTube Integration Tables

#### `youtube_videos`
Metadata cache for imported YouTube videos
- `id`, `video_id`, `title`, `channel_name`, `duration_seconds`, `view_count`, `published_at`, `created_at`
- **Unique:** `video_id`

#### `youtube_lesson_resources`
Links between lessons and YouTube videos
- `lesson_id`, `video_id`, `is_primary`, `added_at`
- Supports one primary video + multiple supplementary videos per lesson

### User Configuration

#### `user_settings`
Per-user preferences and default settings
- `user_id`, `default_source_lang`, `default_target_lang`, `live_listen_enabled`, `tts_voice_id`, `created_at`, `updated_at`

### Transcription Tables (Legacy/Alternative System)

#### `transcription_sessions`
Chunked transcription sessions (alternative to live_transcript_segments)
- `id`, `user_id`, `status`, `language`, `full_text`, `created_at`, `updated_at`

#### `transcription_chunks`
Individual audio chunks for transcription
- `id`, `session_id`, `user_id`, `chunk_index`, `status`, `storage_path`, `duration_ms`, `overlap_ms`, `raw_text`, `error`, `created_at`, `updated_at`

### Storage Buckets

#### `lesson_assets`
- **Purpose:** Store PDFs, audio files, images, text files
- **Size Limit:** 50MB per file
- **Allowed Types:** PDF, MP3, WAV, M4A, JPEG, PNG, WebP, plain text, JSON

#### `tts_audio`
- **Purpose:** Store TTS audio chunks
- **Size Limit:** 10MB per chunk
- **Allowed Types:** MP3

#### `raw_audio_chunks`
- **Purpose:** Temporary storage for chunked audio transcription
- **Size Limit:** 5MB per chunk
- **Allowed Types:** M4A, WebM, MP3, WAV

---

## 🔌 Edge Functions (Supabase)

### 1. `transcribe_start`
**Purpose:** Initialize a new transcription session  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "language": "en-US"  // Optional
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "recording",
  "language": "en-US",
  "created_at": "2026-01-10T12:00:00Z"
}
```

---

### 2. `transcribe_chunk`
**Purpose:** Transcribe an uploaded audio chunk  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "session_id": "uuid",
  "chunk_index": 0,
  "storage_path": "transcription/{user_id}/{session_id}/chunk_0.m4a",
  "duration_ms": 5000,
  "overlap_ms": 500
}
```

**Features:**
- Downloads audio from Storage
- Transcribes with Gemini
- Merges with existing transcript (overlap detection)
- Returns tail_text for live captions

---

### 3. `transcribe_poll`
**Purpose:** Poll for session status and retrieve results  
**Method:** `GET`  
**Auth:** JWT required  
**Query:** `?session_id=uuid`

**Response:**
```json
{
  "session_id": "uuid",
  "status": "recording",
  "language": "en-US",
  "progress": 75,
  "chunks": [...],
  "total_chunks": 4,
  "completed_chunks": 3,
  "failed_chunks": 0,
  "full_text": "Complete transcript text...",
  "tail_text": "...last 600 characters...",
  "updated_at": "2026-01-10T12:01:30Z"
}
```

---

### 4. `gemini_live_token`
**Purpose:** Mint ephemeral tokens for Gemini Live API WebSocket connections  
**Method:** `POST`  
**Auth:** JWT required

**Features:**
- Secure: GEMINI_API_KEY never leaves the server
- Short-lived tokens (30 min max, 1 min for new sessions)
- Enables real-time transcription in the mobile app

**Response:**
```json
{
  "token": "ephemeral_token_string",
  "expire_time": "2026-01-10T12:30:00Z",
  "new_session_expire_time": "2026-01-10T12:01:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025"
}
```

---

### 5. `lesson_generate_summary`
**Purpose:** Generate AI-powered lesson summaries using Gemini  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "lesson_id": "uuid",
  "tone": "casual" | "exam" | "deep",      // Optional, default: "casual"
  "length": "short" | "medium" | "long"    // Optional, default: "medium"
}
```

**Response:**
```json
{
  "output_id": "uuid",
  "summary": "A clear, well-structured summary...",
  "key_concepts": ["concept 1", "concept 2", "..."],
  "example_questions": ["question 1?", "question 2?", "..."],
  "metadata": {
    "content_source": "live_transcript",
    "content_length": 12345,
    "tone": "casual",
    "length": "medium"
  }
}
```

**Features:**
- Multi-source content loading (transcripts, text assets, live sessions)
- Customizable tone and length
- Cost controls (50k character limit)
- Results cached in lesson_outputs table

---

### 6. `lesson_generate_flashcards`
**Purpose:** Generate AI-powered flashcards and quiz questions from lesson content  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "lesson_id": "uuid",
  "count": 15  // Optional: 10-25, default 15
}
```

**Response:**
```json
{
  "flashcards": {
    "id": "uuid",
    "type": "flashcards",
    "status": "ready",
    "content_json": {
      "cards": [
        { "front": "Question", "back": "Answer" }
      ]
    }
  },
  "quiz": {
    "id": "uuid",
    "type": "quiz",
    "status": "ready",
    "content_json": {
      "questions": [
        {
          "q": "Question text?",
          "choices": ["A", "B", "C", "D"],
          "answer_index": 0,
          "explanation": "Why this is correct"
        }
      ]
    }
  }
}
```

**Features:**
- Generates 10-25 flashcards (configurable)
- Generates 5 multiple choice quiz questions
- Synchronous generation (3-15 seconds)
- Results cached in database

---

### 7. `lesson_create_from_youtube`
**Purpose:** Import YouTube videos as lessons with automatic transcript extraction  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "course_id": "uuid",
  "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "lesson_title": "Optional Custom Title"
}
```

**Response:**
```json
{
  "lesson_id": "uuid",
  "status": "ready",
  "message": "Lesson created successfully with transcript and summary"
}
```

**Features:**
- Extracts video ID from various YouTube URL formats
- Fetches transcript if available (auto-generated or manual captions)
- Generates AI summary using Gemini
- Stores YouTube URL as lesson asset
- Creates lesson with source_type='import'
- Caches video metadata in youtube_videos table

---

### 8. `lesson_youtube_recs`
**Purpose:** Get AI-powered YouTube video recommendations for a lesson  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "lesson_id": "uuid",
  "max_results": 5  // Optional, default: 5
}
```

**Features:**
- Analyzes lesson content to generate search queries
- Uses Gemini to create contextual YouTube searches
- Returns curated video recommendations

---

### 9. `lesson_youtube_resource_add`
**Purpose:** Add a YouTube video as a supplementary resource to a lesson  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "lesson_id": "uuid",
  "video_id": "YouTube video ID"
}
```

**Features:**
- Links external YouTube videos to existing lessons
- Caches video metadata
- Supports multiple supplementary videos per lesson

---

### 10. `push_token_upsert`
**Purpose:** Register or update device push notification tokens  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "platform": "ios" | "android",
  "push_token": "device_push_token_string"
}
```

**Response:**
```json
{
  "ok": true,
  "id": "uuid",
  "user_id": "uuid"
}
```

**Features:**
- Upsert logic (no duplicates)
- Automatic token transfer between users
- Soft deletion with is_active flag
- Last seen timestamp for cleanup

---

### 11. `study_plan_upsert`
**Purpose:** Atomically create or update study plans with recurrence rules  
**Method:** `POST`  
**Auth:** JWT required

**Request:**
```json
{
  "plan": {
    "id": "uuid (optional)",
    "title": "Morning Study",
    "timezone": "America/Toronto",
    "is_enabled": true
  },
  "rules": [
    {
      "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      "start_time_local": "19:00",
      "duration_min": 60,
      "remind_before_min": 15
    }
  ]
}
```

**Response:**
```json
{
  "plan": { "id": "...", "title": "...", ... },
  "rules": [ { "id": "...", "rrule": "...", ... } ]
}
```

**Features:**
- Atomic operations (plan + rules in one transaction)
- RRULE format validation (iCalendar standard)
- Optional course linking
- Timezone support

---

## 🔒 Security Model

### Row Level Security (RLS)
All tables have RLS enabled with user isolation:

1. **Direct Ownership:** Users can only access rows where `user_id = auth.uid()`
2. **Transitive Ownership:** Child tables verify parent resource ownership on insert
3. **No Cross-User Access:** User A cannot see or modify User B's data

### Authentication
- JWT-based authentication via Supabase Auth
- All Edge Functions require valid JWT token
- User ID extracted from `auth.uid()` (never from client input)

### Storage Policies
- Path-based isolation: `{bucket}/{user_id}/{resource_id}/{filename}`
- Users can only read/write their own files
- Service role access for Edge Functions

---

## 🎯 Key Features

### ✅ Implemented Features

1. **Course & Lesson Management**
   - Create and organize courses
   - Multiple lesson sources (upload, live, import)
   - Track recently opened lessons

2. **Real-Time Transcription**
   - Gemini Live API integration (WebSocket)
   - Chunked audio transcription (5s chunks with 0.5s overlap)
   - Overlap detection and merging
   - Live captions display

3. **AI-Powered Study Materials**
   - Lesson summaries (customizable tone and length)
   - Flashcards (10-25 cards)
   - Quiz questions (multiple choice)
   - Key concepts extraction

4. **YouTube Integration**
   - Import videos as lessons
   - Automatic transcript extraction
   - AI-powered video recommendations
   - Link supplementary videos to lessons

5. **Study Scheduling**
   - Create recurring study plans (iCalendar RRULE)
   - Optional course linking
   - Timezone support
   - Push notification reminders

6. **Push Notifications**
   - Device token management
   - iOS and Android support
   - Automatic token cleanup

7. **Progress Tracking**
   - Playback position saving
   - Completion status
   - Session history

### 🚧 Not Yet Implemented (UI Needed)

1. **Mobile Screens**
   - Home screen (course list)
   - Class Notes screen (lesson list)
   - Study Hub screen (study actions)
   - Live Transcription screen (recording UI)
   - Flashcard review screen
   - Quiz taking screen
   - Study plan creation/editing screen

2. **Settings & Preferences**
   - Language preferences UI
   - TTS voice selection
   - Notification preferences

3. **Offline Support**
   - Local caching
   - Offline playback
   - Sync queue

---

## 📊 Database Migrations

Migrations are applied in order:

1. **000_setup_auth_helpers.sql** - Auth helper functions
2. **001_create_core_tables.sql** - courses, lessons, lesson_assets, study_sessions
3. **002_add_provider_field.sql** - Add provider field to sessions
4. **002_create_live_tables.sql** - live_transcript_segments, live_translation_segments, live_tts_chunks
5. **003_create_outputs_and_progress.sql** - lesson_outputs, lesson_progress, user_settings
6. **004_rls_policies.sql** - Enable RLS and create policies
7. **005_indexes.sql** - Performance indexes
8. **006_create_schedule_tables.sql** - study_plans, study_plan_rules, device_push_tokens
9. **007_schedule_rls_policies.sql** - RLS for scheduling tables
10. **008_schedule_indexes.sql** - Scheduling performance indexes
11. **009_storage_setup.sql** - Storage buckets and policies
12. **010_create_youtube_videos.sql** - youtube_videos, youtube_lesson_resources

---

## 🧪 Testing

### SQL Test Files
- `backend/tests/sql/db_smoke_test_simple.sql` - Core database functionality
- `backend/tests/sql/storage_smoke_test_simple.sql` - Storage bucket tests
- `backend/tests/sql/schedule_smoke_test_simple.sql` - Scheduling tests

### JavaScript Test Files
- `backend/tests/test-youtube-import.js` - YouTube import automated tests
- `backend/tests/push_token_upsert.test.js` - Push token tests
- `backend/tests/study_plan_upsert.test.js` - Study plan tests

### Manual Test Guides
- `backend/tests/lesson_create_from_youtube.test.md` - YouTube import curl examples
- `backend/tests/push_token_upsert.curl.md` - Push token curl examples
- `backend/tests/study_plan_upsert.curl.md` - Study plan curl examples

---

## 📖 Key Documentation Files

### App Documentation
- `study-os-mobile/README.md` - Main project overview
- `study-os-mobile/apps/mobile/README.md` - Mobile app setup
- `study-os-mobile/apps/mobile/docs/happy-path.md` - Navigation flow
- `study-os-mobile/apps/mobile/docs/screen-states.md` - State management patterns
- `study-os-mobile/apps/mobile/docs/ui-style.md` - Design system

### Backend Documentation
- `study-os-mobile/backend/docs/db-schema.md` - Complete database schema
- `study-os-mobile/backend/docs/schedule-api.md` - Scheduling API reference
- `study-os-mobile/backend/docs/push.md` - Push notification documentation
- `study-os-mobile/supabase/functions/README.md` - Edge Functions overview

### Feature Implementation Docs
- `YOUTUBE_IMPORT_COMPLETE.md` - YouTube import feature
- `YOUTUBE_RECOMMENDATIONS_COMPLETE.md` - YouTube recommendations
- `study-os-mobile/FLASHCARD_GENERATION_COMPLETE.md` - Flashcard generation
- `study-os-mobile/LESSON_SUMMARY_IMPLEMENTATION.md` - Summary generation
- `PUSH_TOKEN_IMPLEMENTATION.md` - Push notifications
- `STUDY_PLAN_IMPLEMENTATION.md` - Study scheduling

### Setup Guides
- `study-os-mobile/apps/mobile/GEMINI_LIVE_SETUP.md` - Gemini Live API setup
- `study-os-mobile/GEMINI_LIVE_IMPLEMENTATION.md` - Implementation details
- `study-os-mobile/supabase/migrations/README.md` - Migration guide

---

## 💰 Cost Estimates

### Per Hour of Recording (Transcription)
- Storage: ~50 MB × $0.021/GB/month = negligible
- Edge Functions: 720 invocations × $2/million = $0.00144
- Gemini: 3600s × $0.0001 = $0.36
- **Total: ~$0.36 per hour**

### Per AI Generation Request
- Summary: ~$0.001-0.01 (depending on lesson length)
- Flashcards: ~$0.001-0.01
- YouTube import: ~$0.001-0.005

---

## 🚀 Quick Start for UI Development

### What's Ready to Use

1. **Backend is fully operational:**
   - All database tables created ✅
   - All Edge Functions deployed ✅
   - Authentication working ✅
   - Storage buckets configured ✅

2. **API contracts defined:**
   - See `study-os-mobile/contracts/` for TypeScript types
   - All endpoints documented in respective README files

3. **Data layer helpers available:**
   - Check `study-os-mobile/apps/mobile/src/data/` (if exists)
   - Example integration code in function documentation

### What Needs UI

1. **Home Screen**
   - List user's courses
   - Show recently opened lessons
   - "Create new course" button

2. **Class Notes Screen**
   - List lessons in a course
   - Filter by status (ready, processing, draft)
   - Lesson metadata (duration, last opened)

3. **Study Hub Screen**
   - "Study now" (start live transcription)
   - "Continue" (resume lesson)
   - "Quick recap" (view summary)
   - "Flashcards" (review flashcards)

4. **Live Transcription Screen**
   - Audio recording controls
   - Real-time transcript display
   - Session status

5. **Flashcard Review Screen**
   - Flashcard deck display
   - Swipe to flip/next
   - Progress tracking

6. **Study Plan Screen**
   - Create/edit study plans
   - Set recurrence rules
   - View upcoming sessions

### Recommended UI Development Order

1. **Phase 1: Core Navigation**
   - Home → Course List → Lesson List
   - Basic navigation setup

2. **Phase 2: Lesson Viewing**
   - Display lesson summary
   - Show transcript text
   - Mark as complete

3. **Phase 3: YouTube Import**
   - Add YouTube URL input
   - Show import progress
   - Display imported lessons

4. **Phase 4: Study Materials**
   - Flashcard review screen
   - Quiz taking screen
   - Generate materials button

5. **Phase 5: Live Recording**
   - Live transcription screen
   - Recording controls
   - Real-time display

6. **Phase 6: Scheduling**
   - Study plan creation
   - Push notification setup
   - Calendar view

---

## 📞 Support & Resources

### Getting Help
- Main README: `study-os-mobile/README.md`
- Database Schema: `study-os-mobile/backend/docs/db-schema.md`
- API Reference: `study-os-mobile/supabase/functions/README.md`
- Edge Function Docs: Each function has its own README in `supabase/functions/{function_name}/`

### Environment Variables Required
```bash
# Mobile App (.env.local)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Supabase Edge Functions (via secrets)
GEMINI_API_KEY=your-gemini-api-key
```

### Deployment
```bash
# Deploy all Edge Functions
cd study-os-mobile/supabase/functions
./deploy.sh

# Run migrations
supabase db push

# Start mobile app
cd study-os-mobile/apps/mobile
npm install
npm start
```

---

## 🎉 Summary

You have a **fully functional backend** with:
- ✅ 11 Edge Functions for transcription, AI generation, YouTube, scheduling
- ✅ 20+ database tables with RLS and proper indexes
- ✅ Storage buckets for files and audio
- ✅ Complete authentication system
- ✅ Comprehensive test suites
- ✅ Detailed documentation

**What you need to build:**
- 📱 Mobile UI screens (React Native)
- 🎨 Design system implementation
- 🔄 State management integration
- 📡 API client layer (calling Edge Functions)

**Start with:** The Home screen and basic navigation, then progressively add features screen by screen!
