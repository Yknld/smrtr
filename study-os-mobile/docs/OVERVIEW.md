# Study OS Mobile: Overview

Mobile-only React Native (TypeScript) app for study sessions, lesson notes, and learning outputs. Backend is Supabase: Postgres, Auth, Storage, and Edge Functions. The app consumes lesson content and generated assets (notes, flashcards, quiz, podcast, video, interactive solver) and coordinates generation via Edge Functions and optional RunPod workers.

## How it works

1. **Identity and data.** Users sign in with Supabase Auth. Data lives in Postgres: courses, lessons, lesson_outputs (notes, summary, flashcards, quiz, interactive_pages status), lesson_assets (audio, video, etc.), study plans, and related tables. The mobile client uses the Supabase JS client with RLS.

2. **Home and navigation.** Home lists courses; course detail lists lessons. Tapping a lesson opens the Lesson Hub: notes preview, action tiles (Live, AI Tutor, Interact, Podcast, Video, Flashcards, Quiz, Assets). Each tile either opens a viewer or triggers generation. Generation is async: Edge Functions enqueue work or call RunPod; the client polls or subscribes to realtime for status updates.

3. **Content sources.** Notes come from lesson_outputs (notes type) and optionally from transcripts. Summary is a separate output type. These texts feed into generation prompts (flashcards, quiz, podcast script, video story, interactive problem texts).

4. **Generation.** Each output type has an Edge Function (and sometimes RunPod): lesson_generate_flashcards, lesson_generate_quiz, lesson_generate_summary, podcast_generate_outline/script/audio, lesson_generate_video, lesson_generate_interactive. Functions read lesson content, call Gemini (or RunPod) with structured prompts, write results to lesson_outputs and/or lesson_assets, and update status. The app shows Generate / Generating / Generated (or Open) per tile based on status and assets.

5. **Viewers.** Flashcards and Quiz screens read content from lesson_outputs. Podcast player uses lesson_assets (audio) and metadata. Video player uses signed URLs for video assets. Interactive solver loads the solver HTML (from storage) in a WebView with auth and lesson ID injected; the solver fetches the interactive module manifest from an Edge Function and renders steps with pre-generated components and audio.

6. **Live and AI Tutor.** Live/Translate (Lesson Workspace) uses either AssemblyAI or Gemini Live for real-time transcription and optional translation; the app gets an ephemeral token from an Edge Function for Gemini Live. AI Tutor uses tutor_chat Edge Function (Gemini) with lesson context for multimodal chat.

## Repository layout

- `apps/mobile/`: React Native app (Expo); screens, components, data layer, services.
- `supabase/`: config, migrations, Edge Functions. Functions call Gemini or RunPod and read/write Supabase.
- `backend/`: optional backend services and tests (e.g. transcription, Gemini Live token).
- `docs/`: overview, feature pipelines, and implementation notes.
- `contracts/`: API contracts for external services.

## Documentation index

- [OVERVIEW.md](./OVERVIEW.md) — this file.
- [FEATURES.md](./FEATURES.md) — one flowchart per feature (Lesson Hub, Notes, Live, AI Tutor, Interact, Podcast, Video, Flashcards, Quiz, Assets, YouTube, Schedules).
- Other docs in this folder cover specific implementations (notes, podcast, translation, deployment, etc.).
