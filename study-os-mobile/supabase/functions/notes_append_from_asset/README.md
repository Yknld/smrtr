# notes_append_from_asset

When a new file is dropped into the lesson assets folder (web or mobile), this function summarizes that file and appends the result to the lesson's single notes document (`lesson_outputs` type `notes`). That notes file is then used by all generations (flashcards, quiz, podcast, etc.).

## Request

- **Method:** POST
- **Headers:** `Content-Type: application/json`, optional `Authorization: Bearer <token>`
- **Body:** `{ "lesson_id": "uuid", "asset_id": "uuid" }`

Deploy with `--no-verify-jwt` (auth not yet integrated); the function still validates asset ownership when a token is provided.

## Behavior

1. Loads the asset from `lesson_assets` and downloads the file from storage.
2. **Text files** (plain, markdown, etc.): appends content (truncated if very long).
3. **PDF / images / Office:** uses Gemini to summarize, then appends the summary.
4. Gets or creates the lesson's notes row (`lesson_outputs` type `notes`), appends a section `--- Content from <filename> ---` plus the text/summary, and clears `notes_final_text` so the user can re-finalize if desired.
5. Returns `{ ok: true, appended_length, notes_preview }`.

## Response

- **200:** `{ ok: true, appended_length: number, notes_preview: string }`
- **4xx/5xx:** `{ error: string }`

## Deploy

```bash
supabase functions deploy notes_append_from_asset --no-verify-jwt
```

Requires `GEMINI_API_KEY` for PDF/image summarization.
