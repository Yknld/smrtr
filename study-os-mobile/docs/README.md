# Study OS Mobile — Documentation

## Core docs

- **[OVERVIEW.md](./OVERVIEW.md)** — What the app is, how it works, repository layout.
- **[FEATURES.md](./FEATURES.md)** — One flowchart per feature (Lesson Hub, Notes, Live, AI Tutor, Interact, Podcast, Video, Flashcards, Quiz, Assets, YouTube, Schedules).

## By topic

Implementation and deployment notes live in this folder; names are descriptive (e.g. `NOTES_DUAL_SAVE_IMPLEMENTATION.md`, `PODCAST_INTEGRATION_COMPLETE.md`). Use the repo search or list this directory to find a specific topic.

## Backend and Edge Functions

Edge Functions live under `supabase/functions/`. Each function folder usually has a README or QUICK_REFERENCE for request/response and env vars. Key entry points:

- Lesson outputs: `lesson_generate_flashcards`, `lesson_generate_quiz`, `lesson_generate_summary`, `lesson_generate_interactive`, `lesson_generate_video`.
- Podcast: `podcast_generate_outline`, `podcast_generate_script`, `podcast_generate_audio`.
- Notes: `notes_append_from_asset`, `notes_finalize`, `notes_get`.
- Live and tutor: `gemini_live_token`, `gemini_translate`, `tutor_chat`.
- YouTube: `lesson_youtube_recs`, `generate_youtube_recommendations`, `lesson_create_from_youtube`.
