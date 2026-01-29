# 30-Second Video Generation Feature

## Overview

This feature generates 30-second educational video visualizations for lessons using Remotion, OpenHand agent, and Gemini AI.

## Architecture

### Components

1. **Edge Function**: `lesson_generate_video`
   - Location: `supabase/functions/lesson_generate_video/`
   - Handles API requests, story planning, and video processing

2. **Gemini 3 Pro Preview** (or latest model)
   - Generates detailed STORY_JSON plans based on lesson content
   - Creates structured storyboards with scenes, timing, and content

3. **OpenHand Agent**
   - Uses Remotion skill to generate complete video projects
   - Executes the full Remotion pipeline (narration, TTS, rendering)
   - Returns MP4 video files

4. **Remotion Framework**
   - Programmatic video creation using React
   - Generates 30-second narrated explainer videos
   - Supports multiple aspect ratios (16:9, 9:16, 1:1)

## Flow

```
User Request
    ↓
Edge Function: lesson_generate_video
    ↓
1. Get lesson context (summary/transcript/title)
    ↓
2. Gemini generates STORY_JSON plan
    ↓
3. Build Remotion prompt with STORY_JSON
    ↓
4. Start OpenHand conversation
    ↓
5. Return immediately (status: "generating")
    ↓
6. Background: Poll OpenHand for completion
    ↓
7. Download video from OpenHand artifacts
    ↓
8. Upload to Supabase Storage
    ↓
9. Update lesson_assets record
```

## Setup

### 1. Environment Variables

Add to Supabase Edge Function secrets:

```bash
GEMINI_API_KEY=your_gemini_api_key
OPENHAND_API_KEY=your_openhand_api_key
```

### 2. Storage Bucket Configuration

**IMPORTANT**: You must manually add video MIME types to the `lesson_assets` storage bucket.

**Option 1: Via Supabase Dashboard (Recommended)**
1. Go to Storage > Buckets
2. Click on `lesson_assets` bucket
3. Go to Settings
4. Add to "Allowed MIME types":
   - `video/mp4`
   - `video/mpeg`
5. Optionally increase file size limit to 100MB if needed (videos can be larger than 50MB)

**Option 2: Via SQL (if you have superuser access)**
```sql
UPDATE storage.buckets
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'video/mp4'
)
WHERE id = 'lesson_assets'
  AND NOT ('video/mp4' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));

UPDATE storage.buckets
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'video/mpeg'
)
WHERE id = 'lesson_assets'
  AND NOT ('video/mpeg' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));
```

**Note**: The migration file `016_add_video_support_to_storage.sql` documents this step but doesn't execute it automatically due to permission restrictions.

### 3. Deploy Edge Function

```bash
cd study-os-mobile/supabase/functions/lesson_generate_video
supabase functions deploy lesson_generate_video
```

## API Usage

### Request

```typescript
POST /functions/v1/lesson_generate_video
Headers: {
  Authorization: Bearer <jwt_token>,
  Content-Type: application/json
}
Body: {
  lesson_id: "uuid",
  aspect_ratios?: ["16:9"] // Optional
}
```

### Response

```typescript
{
  lesson_id: "uuid",
  video_id: "uuid",
  status: "generating",
  conversation_id: "string"
}
```

### Polling for Completion

Check the `lesson_assets` table:

```sql
SELECT * FROM lesson_assets 
WHERE id = '<video_id>' 
  AND kind = 'video';
```

When `storage_path` is populated and `mime_type = 'video/mp4'`, the video is ready.

## Video Specifications

- **Duration**: Exactly 30 seconds
- **FPS**: 30
- **Resolutions**:
  - 16:9: 1280x720
  - 9:16: 1080x1920
  - 1:1: 1080x1080
- **Format**: H.264 MP4 with audio narration
- **Style**: Minimalist, math-first vector animation

## Storage

Videos are stored in:
```
lesson_assets/{user_id}/{lesson_id}/{video_id}.mp4
```

## Database

Videos are tracked in `lesson_assets`:
- `kind`: "video"
- `storage_bucket`: "lesson_assets"
- `storage_path`: Full path to video
- `mime_type`: "video/mp4"
- `duration_ms`: 30000

## Remotion Prompt

The prompt template is embedded in the edge function and includes:
- Complete Remotion project structure
- Gemini TTS integration
- Subtitle generation
- Multiple aspect ratio support
- Quality checks and validation

See `supabase/functions/remotionPrompt.txt` for the full prompt template.

## Limitations & Considerations

1. **Async Processing**: Video generation is asynchronous and can take 5-20 minutes
2. **Edge Function Timeout**: Background processing may not complete if function times out
3. **OpenHand API**: Requires valid OpenHand API key and account
4. **Storage Limits**: Videos must be under bucket file size limit (50MB default)
5. **Polling**: Clients should poll `lesson_assets` table to check completion

## Future Improvements

- Use Supabase Queue or pg_net for reliable background processing
- Add webhook support for completion notifications
- Support custom video durations
- Add video preview/thumbnail generation
- Implement retry logic for failed generations
- Add progress tracking for long-running generations

## Testing

1. Create a lesson with content (summary or transcript)
2. Call the edge function with the lesson_id
3. Poll the `lesson_assets` table until video is ready
4. Download and verify the video file

## Troubleshooting

- **"OPENHAND_API_KEY not configured"**: Add API key to Supabase secrets
- **"GEMINI_API_KEY not configured"**: Add API key to Supabase secrets
- **Upload fails**: Check storage bucket MIME types include video/mp4
- **Video not appearing**: Check background processing completed (may need job queue)
- **OpenHand timeout**: Increase MAX_POLL_ATTEMPTS or use job queue
