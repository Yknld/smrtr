# interactive_extract_questions_from_image

Uses **Gemini 3 Flash** to read practice questions from a photo. Returns `problem_texts` in the format the interactive loop expects (array of strings, 1–5 items; if the image has more than 5 questions, picks the 5 hardest).

The main loop (`lesson_generate_interactive`) does not handle images. The client calls this function first when the user chooses "photo", then passes the returned `problem_texts` to `lesson_generate_interactive`.

## Request

- **POST** with `Authorization: Bearer <user_token>`
- Body: `{ "image_base64": "<base64>", "image_mime_type": "image/jpeg" }`

## Response

- `200`: `{ "problem_texts": ["question 1", "question 2", ...] }` — use this in the body of `lesson_generate_interactive` as `problem_texts`.
- `400`: No image, or extraction produced no questions. Body: `{ "error": "..." }`
- `401`: Not authenticated
- `503`: GEMINI_API_KEY not set

## Secrets

- `GEMINI_API_KEY` — required for Gemini 3 Flash vision

## Deploy (no JWT at gateway; function still validates auth in code)

```bash
supabase functions deploy interactive_extract_questions_from_image --no-verify-jwt
```
