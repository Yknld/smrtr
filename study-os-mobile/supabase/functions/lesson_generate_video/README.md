# Lesson Generate Video Edge Function

## Overview

This edge function generates 30-second educational video visualizations for lessons using:
- **Gemini 3 Pro Preview** (or latest available model) as the video storyboard planner
- **OpenHand agent** with Remotion skill to generate the actual video
- **Remotion** framework for programmatic video creation

## API Endpoint

```
POST /lesson_generate_video
```

### Authentication

Requires JWT Bearer token in Authorization header.

### Request Body

```json
{
  "lesson_id": "uuid",
  "aspect_ratios": ["16:9"] // Optional, default: ["16:9"]
}
```

### Response

```json
{
  "lesson_id": "uuid",
  "video_id": "uuid",
  "status": "generating",
  "conversation_id": "string"
}
```

## How It Works

1. **Story Planning**: Uses Gemini to generate a detailed STORY_JSON plan based on lesson content (summary, transcript, or title)
2. **Video Generation**: Sends the story plan to OpenHand agent with Remotion prompt
3. **Background Processing**: Polls OpenHand for completion and downloads the generated video
4. **Storage**: Uploads the video to Supabase Storage (`lesson_assets` bucket)
5. **Database**: Creates/updates `lesson_assets` record with video metadata

## Environment Variables

Required:
- `GEMINI_API_KEY`: Google Gemini API key
- `OPENHAND_API_KEY`: OpenHand API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

## Video Specifications

- **Duration**: Exactly 30 seconds
- **FPS**: 30
- **Resolution**: 
  - 16:9: 1280x720
  - 9:16: 1080x1920 (if enabled)
  - 1:1: 1080x1080 (if enabled)
- **Format**: H.264 MP4 with audio narration
- **Style**: Minimalist, math-first vector animation

## Storage

Videos are stored in:
```
lesson_assets/{user_id}/{lesson_id}/{video_id}.mp4
```

**Important**: The `lesson_assets` storage bucket must allow `video/mp4` and `video/mpeg` MIME types. 

**To configure via Supabase Dashboard:**
1. Go to Storage > Buckets > `lesson_assets`
2. Settings > Allowed MIME types
3. Add: `video/mp4` and `video/mpeg`

**To configure via SQL (requires superuser):**
```sql
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'video/mp4')
WHERE id = 'lesson_assets';

UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'video/mpeg')
WHERE id = 'lesson_assets';
```

## Database

Videos are tracked in the `lesson_assets` table:
- `kind`: "video"
- `storage_bucket`: "lesson_assets"
- `storage_path`: Full path to video file
- `mime_type`: "video/mp4"
- `duration_ms`: 30000 (30 seconds)

## Status Flow

1. **generating**: Video generation started, OpenHand conversation in progress
2. **ready**: Video generated and uploaded successfully
3. **failed**: Generation or upload failed (check error details)

## Notes

- Video generation is asynchronous - the function returns immediately with `status: "generating"`
- Clients should poll the `lesson_assets` table to check when the video is ready
- OpenHand conversation can take 5-20 minutes depending on complexity
- The function uses background processing that may not complete if the edge function times out
- Consider using a background job queue (e.g., pg_net, Supabase Queue) for production

## Error Handling

- Invalid lesson_id: Returns 404
- Missing API keys: Returns 500
- OpenHand failures: Video record created but status indicates failure
- Storage upload failures: Error logged, video record updated

## Example Usage

```typescript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/lesson_generate_video',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: '123e4567-e89b-12d3-a456-426614174000',
      aspect_ratios: ['16:9', '9:16'], // Optional
    }),
  }
);

const data = await response.json();
// { lesson_id, video_id, status: "generating", conversation_id }

// Poll lesson_assets table to check when video is ready
```
