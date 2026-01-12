# lesson_create_from_youtube

Edge Function to import YouTube videos as lessons with automatic transcript extraction and AI-generated summaries.

## Overview

This function allows users to import YouTube videos into their courses by simply providing a YouTube URL. The function:

1. Validates the YouTube URL and extracts the video ID
2. Fetches the video transcript (if available)
3. Creates a lesson with `source_type='import'`
4. Stores the YouTube URL as a lesson asset
5. Generates an AI summary using Gemini (if transcript is available)
6. Stores the summary in `lesson_outputs`

## API Specification

### Endpoint

```
POST /lesson_create_from_youtube
```

### Authentication

Requires JWT authentication via `Authorization` header:

```
Authorization: Bearer <user_token>
```

### Request Body

```json
{
  "course_id": "uuid",
  "youtube_url": "string",
  "lesson_title": "string (optional)"
}
```

**Parameters:**
- `course_id` (required): UUID of the course to add the lesson to. Must be owned by the authenticated user.
- `youtube_url` (required): YouTube video URL in any of these formats:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `VIDEO_ID` (11-character video ID)
- `lesson_title` (optional): Custom title for the lesson. If not provided, defaults to `YouTube: VIDEO_ID`

### Success Response

**Status Code:** `200 OK`

```json
{
  "lesson_id": "uuid",
  "status": "ready",
  "message": "Lesson created successfully with transcript and summary"
}
```

**Fields:**
- `lesson_id`: UUID of the newly created lesson
- `status`: Processing status (`ready` = complete, `processing` = in progress)
- `message`: Human-readable status message

### Error Responses

#### 400 Bad Request

Invalid input parameters:

```json
{
  "error": {
    "code": "INVALID_COURSE_ID",
    "message": "course_id is required and must be a valid UUID"
  }
}
```

**Error Codes:**
- `INVALID_REQUEST` - Invalid JSON in request body
- `INVALID_COURSE_ID` - Missing or invalid course_id
- `INVALID_URL` - Missing youtube_url
- `INVALID_YOUTUBE_URL` - URL format not recognized

#### 401 Unauthorized

Authentication failed:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization header is required"
  }
}
```

#### 404 Not Found

Course not found or access denied:

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found or access denied"
  }
}
```

#### 500 Internal Server Error

Server-side error:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Database Schema

### Tables Modified

#### `lessons`
- Creates a new lesson with:
  - `source_type='import'`
  - `status='processing'` (initially) → `'ready'` (after processing)
  - `title` = provided or default

#### `lesson_assets`
- Creates an asset record with:
  - `kind='other'`
  - `storage_bucket='external'`
  - `storage_path=<youtube_url>`
  - `mime_type='text/uri-list'`

#### `lesson_outputs`
- If transcript is available, creates:
  - `type='summary'`
  - `status='ready'`
  - `content_json`:
    ```json
    {
      "summary": "AI-generated summary",
      "transcript": "Full video transcript",
      "language": "en",
      "source": "youtube",
      "video_id": "VIDEO_ID"
    }
    ```

## Features

### Transcript Extraction

Uses the `youtube-transcript` library to fetch captions/subtitles without requiring YouTube API credentials. Works with:
- Auto-generated captions
- Manual captions
- Multiple languages (fetches default language)

**Note:** Not all videos have transcripts available. The function gracefully handles this by creating the lesson without a transcript.

### AI Summary Generation

If a transcript is available and `GEMINI_API_KEY` is configured, the function:
1. Sends the transcript to Gemini 1.5 Flash
2. Requests a structured summary with:
   - Brief overview
   - Key topics covered
   - Main takeaways
3. Stores the result in `lesson_outputs`

### Error Handling

The function uses graceful degradation:
- **No transcript available**: Creates lesson with URL only
- **Summary generation fails**: Creates lesson with transcript but no summary
- **Asset creation fails**: Creates lesson without asset (logs error)

## Environment Variables

Required:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `GEMINI_API_KEY`: Google Gemini API key (optional, for summaries)

## Testing

### Prerequisites

1. Get a JWT token for testing (see `backend/tests/get-token.js`)
2. Create a test course and note its ID
3. Find a YouTube video with captions enabled

### Example cURL Request

```bash
# Set variables
export SUPABASE_URL="https://your-project.supabase.co"
export JWT_TOKEN="your.jwt.token"
export COURSE_ID="your-course-uuid"

# Test with full URL
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lesson_title": "Never Gonna Give You Up - Rick Astley"
  }'

# Test with short URL
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "https://youtu.be/dQw4w9WgXcQ"
  }'

# Test with video ID only
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_create_from_youtube" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "youtube_url": "dQw4w9WgXcQ"
  }'
```

### Expected Responses

#### Success (with transcript)
```json
{
  "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "ready",
  "message": "Lesson created successfully with transcript and summary"
}
```

#### Success (no transcript available)
```json
{
  "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "ready",
  "message": "Lesson created successfully (transcript not available for this video)"
}
```

#### Error (invalid course)
```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found or access denied"
  }
}
```

## Deployment

Deploy using the Supabase CLI:

```bash
# Navigate to functions directory
cd supabase/functions

# Deploy function
supabase functions deploy lesson_create_from_youtube

# Set environment variables (if not already set)
supabase secrets set GEMINI_API_KEY=your_api_key_here
```

## Limitations & Future Improvements

### Current Limitations
- Only fetches default language transcript (no multi-language support)
- Transcript length limited to ~50k characters for summary generation
- No support for private/unlisted videos requiring authentication
- No video metadata extraction (title, description, duration)

### Future Enhancements
- [ ] Fetch video metadata using YouTube Data API
- [ ] Support multiple transcript languages
- [ ] Download and store video thumbnail
- [ ] Extract timestamps and create segments
- [ ] Support for playlists (batch import)
- [ ] Progress updates for long-running operations
- [ ] Webhook support for async processing

## Troubleshooting

### "Transcript not available"
- Video may not have captions enabled
- Video may be private or age-restricted
- Captions may be disabled by uploader

### "Summary generation failed"
- Check GEMINI_API_KEY is set correctly
- Verify Gemini API quota/limits
- Transcript may be too long or contain invalid characters

### "Course not found"
- Verify course_id is correct
- Ensure user owns the course
- Check RLS policies on courses table

## Related Documentation

- [Database Schema](../../backend/docs/db-schema.md)
- [Edge Functions Setup](../README.md)
- [YouTube Transcript Library](https://www.npmjs.com/package/youtube-transcript)
- [Gemini API Documentation](https://ai.google.dev/docs)
