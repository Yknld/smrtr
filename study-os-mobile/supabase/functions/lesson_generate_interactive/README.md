# lesson_generate_interactive

Enqueues interactive module generation (GeminiLoop/RunPod). Uses the same lesson content order as video generation: **summary** → **notes/transcript** (from `sourceHash`) → **lesson title**.

## Deploy

From repo root (or `study-os-mobile`):

```bash
supabase functions deploy lesson_generate_interactive --no-verify-jwt
```

Or deploy all functions:

```bash
cd supabase/functions && ./deploy.sh
```

Then set secrets in Supabase Dashboard → Edge Functions → lesson_generate_interactive → Secrets (or CLI):

- `RUNPOD_API_KEY` – RunPod API key
- `RUNPOD_ENDPOINT` – RunPod serverless endpoint ID (e.g. `abc123xyz`)
- `GEMINI_API_KEY` – (optional) Used to generate practice questions from lesson content; if unset, context is split into chunks as problems

## Request

- **POST** with `Authorization: Bearer <user_token>`
- Body: `{ "lesson_id": "<uuid>" }`

## Response

- `200`: `{ lesson_id, status: "generating", job_id?: "<runpod-job-id>" }`
- `401`: Not authenticated
- `404`: Lesson not found or access denied
- `502`: RunPod run failed
- `503`: RUNPOD_API_KEY or RUNPOD_ENDPOINT not set

## How the builder gets “what questions to generate”

The Edge Function does **not** pass file assets. It builds a single text **context** from your lesson, then **generates practice questions** from that context (via Gemini) and passes them as **problem_texts**. RunPod/GeminiLoop uses each string as one “problem” to generate steps and components for.

**1. Lesson context (same order as video generation)**

1. **Summary** – `lesson_outputs` where `type = 'summary'` and `status = 'ready'` → `content_json.summary`.
2. **Else: notes + transcript** – `gatherSourceInputs(lesson_id)` then `getContentText()`:
   - Notes: `lesson_outputs` (type=notes) → `notes_final_text` or `notes_raw_text`
   - Transcript: `study_sessions` → `live_transcript_segments.text`
   - YouTube transcript: `youtube_lesson_resources.transcript_text`
3. **Else** – `"This lesson is about: {lesson.title}"`.

Context is capped at 8000 characters.

**2. From context → practice questions (`problem_texts`)**

- **When `GEMINI_API_KEY` is set:** Gemini is called with a prompt that asks for 1–3 clear practice questions or problem statements based on the lesson content. The response is parsed as a JSON array of strings (e.g. "Calculate...", "Explain why...", "Implement a function that...").
- **Fallback (no key or Gemini failure):** Split context on double newline `\n\n`, take up to 3 non-empty chunks. If no chunks, use the whole trimmed context as one problem.

**3. Sent to RunPod**

```json
{
  "input": {
    "problem_texts": ["chunk 1...", "chunk 2...", "..."],
    "lesson_id": "<uuid>",
    "user_id": "<uuid>",
    "push_to_supabase": true
  }
}
```

GeminiLoop’s RunPod handler receives `problem_texts` and runs `generate.py` with those strings as the problem descriptions; it generates the interactive module (steps, components, etc.) and pushes to Supabase.

## Flow

1. Validate auth and lesson ownership.
2. Get lesson context (summary → notes/transcript → title).
3. Generate `problem_texts` via Gemini (1–3 practice questions). Requires GEMINI_API_KEY; if Gemini fails, a single generic question is used (no raw summary chunks).
4. Insert or update `lesson_outputs` (type=interactive_pages, status=processing).
5. POST to RunPod with `input: { problem_texts, lesson_id, user_id, push_to_supabase: true }`.
6. Return immediately; RunPod worker pushes module to Supabase and updates the row to status=ready.

## App

LessonHub shows **Generate** / **Generating** / **Generated** badge for Interact (same style as Video). Realtime on `lesson_outputs` updates the badge when the RunPod job completes.
