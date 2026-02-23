# lesson_video_upload Edge Function

## Purpose

Receives the rendered MP4 from OpenHand (or any caller) and stores it in
Supabase Storage, then marks the `lesson_assets` record as ready.

This is the **primary delivery path** for generated videos.  A one-time
`upload_token` (UUID) is embedded in the OpenHand prompt so the agent can
upload without needing the app's anon key.

## How OpenHand adds the video to Supabase

1. **`lesson_generate_video`** creates a `lesson_assets` row with
   `storage_path = null` and stores a random `upload_token` UUID in the row's
   `metadata` JSONB column.

2. **OpenHand** is given a `curl` command in its prompt:
   ```bash
   curl -X POST \
     -H "X-Upload-Token: <upload_token>" \
     -H "Content-Type: video/mp4" \
     --data-binary @out/video.mp4 \
     "<supabase_url>/functions/v1/lesson_video_upload"
   ```
   The agent runs this command after the Remotion render succeeds.

3. **This function** validates the token (DB lookup via JSONB filter), uploads
   the raw bytes to the `lesson-assets` Storage bucket at
   `<user_id>/<lesson_id>/<video_id>.mp4`, then updates the `lesson_assets`
   row:
   - `storage_path` ← the storage path above
   - `mime_type`    ← `"video/mp4"`
   - `duration_ms`  ← `30000` (placeholder; real duration from story plan is
     set at insert time)
   - `metadata`     ← upload_token removed (consumed)

4. The **frontend** polls `lesson_assets` for a non-null `storage_path` to
   show the video as ready.

## Fallback

`video_poll_github` is a cron-driven fallback that polls the OpenHand
conversation directly and uploads the artifact if the curl step above was
skipped or failed.

## Request

```
POST /functions/v1/lesson_video_upload
Headers:
  X-Upload-Token: <one-time UUID token>
  Content-Type: video/mp4
Body: raw MP4 bytes (max 200 MB)
```

Deploy with `--no-verify-jwt` so the OpenHand agent can call it without a
Supabase JWT.

## Response

| Status | Body |
|--------|------|
| 200 | `{ "ok": true, "storage_path": "…" }` |
| 400 | `{ "error": "Empty body" }` or size exceeded |
| 401 | `{ "error": "Missing X-Upload-Token header" }` or invalid token |
| 405 | `{ "error": "Method not allowed" }` |
| 500 | Server / upload / DB error |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL (auto-set) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (auto-set) |

## Storage

Videos land in the `lesson-assets` bucket at:
```
<user_id>/<lesson_id>/<video_id>.mp4
```
