# lesson_generate_flashcards Edge Function

## Overview

Generates AI-powered flashcards and quiz questions from lesson content using Google's Gemini AI. The function retrieves lesson text (from transcripts or live sessions), sends it to Gemini for processing, and stores the generated study materials in the `lesson_outputs` table.

## API

### Endpoint

```
POST /lesson_generate_flashcards
```

### Authentication

Requires a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <user_token>
```

### Request Body

```json
{
  "lesson_id": "uuid-of-lesson",
  "count": 15  // Optional: number of flashcards (10-25, default: 15)
}
```

#### Parameters

- `lesson_id` (required, string): UUID of the lesson to generate flashcards for
- `count` (optional, number): Number of flashcards to generate (10-25, default: 15)

### Response

#### Success (200 OK)

```json
{
  "flashcards": {
    "id": "uuid",
    "user_id": "uuid",
    "lesson_id": "uuid",
    "type": "flashcards",
    "status": "ready",
    "content_json": {
      "cards": [
        {
          "front": "What is a variable?",
          "back": "A named storage location in memory..."
        }
        // ... more cards
      ]
    },
    "created_at": "2026-01-10T...",
    "updated_at": "2026-01-10T..."
  },
  "quiz": {
    "id": "uuid",
    "user_id": "uuid",
    "lesson_id": "uuid",
    "type": "quiz",
    "status": "ready",
    "content_json": {
      "questions": [
        {
          "q": "What is the difference between int and float?",
          "choices": [
            "Int stores whole numbers, float stores decimals",
            "Int is faster than float",
            "Float is more accurate",
            "They are the same"
          ],
          "answer_index": 0,
          "explanation": "Integer types store whole numbers..."
        }
        // ... more questions (5 total)
      ]
    },
    "created_at": "2026-01-10T...",
    "updated_at": "2026-01-10T..."
  }
}
```

#### Error Responses

##### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization header is required"
  }
}
```

##### 400 Bad Request

```json
{
  "error": {
    "code": "INVALID_COUNT",
    "message": "count must be a number between 10 and 25"
  }
}
```

```json
{
  "error": {
    "code": "NO_CONTENT",
    "message": "No text content found for this lesson. Please ensure the lesson has been transcribed."
  }
}
```

##### 404 Not Found

```json
{
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Lesson not found or access denied"
  }
}
```

##### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Security

- **JWT Authentication**: Required for all requests
- **RLS Enforcement**: User can only generate flashcards for their own lessons
- **Ownership Verification**: Checks lesson ownership before processing
- **Rate Limiting**: Subject to Supabase Edge Functions limits

## Database Schema

### lesson_outputs Table

The function stores results in the `lesson_outputs` table:

```sql
CREATE TABLE lesson_outputs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('summary', 'key_concepts', 'flashcards', 'quiz', 'mindmap')),
  status text NOT NULL CHECK (status IN ('queued', 'ready', 'failed')),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Dependencies

### External Services

- **Google Gemini API**: Uses `gemini-3-flash-preview` model for content generation
- **Requires**: `GEMINI_API_KEY` environment variable

### Shared Helpers

- `getLessonText()` from `../shared/lessonHelpers.ts`: Retrieves lesson text content from various sources

## Content Sources

The function retrieves lesson content from:

1. **Live Transcript Segments**: Text from real-time transcription sessions (via `live_transcript_segments`)
2. **Future**: Could be extended to support uploaded text, PDFs, etc.

## Example Usage

### cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/lesson_generate_flashcards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "123e4567-e89b-12d3-a456-426614174000",
    "count": 20
  }'
```

### JavaScript/TypeScript

```typescript
const { data, error } = await supabase.functions.invoke('lesson_generate_flashcards', {
  body: {
    lesson_id: lessonId,
    count: 20
  }
});

if (error) {
  console.error('Error generating flashcards:', error);
} else {
  console.log('Flashcards:', data.flashcards);
  console.log('Quiz:', data.quiz);
}
```

## Deployment

Deploy using the deploy script:

```bash
cd study-os-mobile/supabase/functions
./deploy.sh
```

Or deploy individually:

```bash
supabase functions deploy lesson_generate_flashcards --no-verify-jwt
```

### Environment Variables

Ensure these secrets are set in your Supabase project:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

## Testing

### Prerequisites

1. Valid JWT token for a test user
2. Lesson with transcribed content
3. Gemini API key configured

### Test Command

```bash
# Get JWT token (use your auth method)
JWT_TOKEN="your_test_jwt_token"
LESSON_ID="your_lesson_uuid"

# Call function
curl -X POST https://your-project.supabase.co/functions/v1/lesson_generate_flashcards \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"$LESSON_ID\", \"count\": 15}"
```

## Error Handling

The function includes comprehensive error handling for:

- Invalid authentication
- Missing or invalid lesson_id
- Lesson not found or access denied
- No content available for lesson
- AI generation failures
- Database storage errors

All errors are logged with a unique request ID for debugging.

## Performance Considerations

- **AI Generation Time**: Typically 3-10 seconds depending on lesson length
- **Token Limits**: Lesson content is truncated if too long (handled by Gemini)
- **Rate Limits**: Subject to Gemini API rate limits

## Future Enhancements

- [ ] Support for custom flashcard templates
- [ ] Difficulty level selection
- [ ] Support for different quiz formats (true/false, fill-in-blank)
- [ ] Batch generation for multiple lessons
- [ ] Support for images in flashcards
- [ ] Progressive generation (background job with status polling)
