# Gemini Summary Generation

**Purpose:** Generate AI-powered lesson summaries using Google Gemini API.

**Edge Function:** `lesson_generate_summary`

---

## Overview

The `lesson_generate_summary` function analyzes lesson content and generates:
- A structured summary of the main content
- 5-12 key concepts extracted from the material
- 3-7 example questions to test understanding

The function supports multiple content sources and customizable output styles.

---

## Content Sources (Priority Order)

The function attempts to load content from the following sources in order:

1. **Live Transcript Segments** (`live_transcript_segments`)
   - From recent study sessions
   - Concatenates all segments in sequence order

2. **Transcription Text** (`transcripts.full_text`)
   - From completed transcription sessions
   - Pre-merged full transcript

3. **Text Assets** (`lesson_assets`)
   - Text files (`text/plain`)
   - JSON files (`application/json`)
   - Downloaded from Supabase Storage

4. **PDF Assets** (Not Yet Supported)
   - Returns `UNSUPPORTED_CONTENT_TYPE` error
   - Future: Will extract text from PDFs

---

## API Contract

### Request

**Endpoint:** `POST /lesson_generate_summary`

**Headers:**
```
Authorization: Bearer <user_jwt>
Content-Type: application/json
```

**Body:**
```json
{
  "lesson_id": "uuid",
  "tone": "casual" | "exam" | "deep",
  "length": "short" | "medium" | "long"
}
```

**Parameters:**
- `lesson_id` (required): UUID of the lesson to summarize
- `tone` (optional, default: `"casual"`): Output tone/style
  - `casual`: Friendly, conversational tone for peer learning
  - `exam`: Formal, structured tone for exam preparation
  - `deep`: Academic, detailed tone with thorough explanations
- `length` (optional, default: `"medium"`): Summary length
  - `short`: 2-3 paragraphs, 5-8 concepts, 3 questions
  - `medium`: 4-5 paragraphs, 8-10 concepts, 5 questions
  - `long`: 6-8 paragraphs, 10-12 concepts, 5-7 questions

### Response (Success)

**Status:** `200 OK`

```json
{
  "output_id": "uuid",
  "summary": "A clear, well-structured summary...",
  "key_concepts": [
    "Concept 1",
    "Concept 2",
    "..."
  ],
  "example_questions": [
    "What is the relationship between X and Y?",
    "How does Z affect the outcome?",
    "..."
  ],
  "metadata": {
    "content_source": "live_transcript" | "transcription" | "text_asset",
    "content_length": 12345,
    "tone": "casual",
    "length": "medium"
  }
}
```

### Response (Errors)

**401 Unauthorized:**
```json
{
  "error": "Invalid or expired session. Please sign in again."
}
```

**404 Not Found:**
```json
{
  "error": "Lesson not found or unauthorized"
}
```

**400 Bad Request - No Content:**
```json
{
  "error": "No content available for this lesson. Please add text, audio, or transcript first.",
  "error_code": "NO_CONTENT_AVAILABLE"
}
```

**400 Bad Request - Unsupported Content:**
```json
{
  "error": "PDF extraction not yet supported. Please use text or audio lessons.",
  "error_code": "UNSUPPORTED_CONTENT_TYPE"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "request_id": "uuid"
}
```

---

## Gemini Prompt Structure

The function uses a deterministic prompt template to ensure consistent output:

### Prompt Components

1. **Context:**
   - Lesson title
   - Full content (up to 50,000 chars)

2. **Tone Instruction:**
   - Casual: "Use a friendly, conversational tone as if explaining to a peer."
   - Exam: "Use a formal, structured tone focused on exam preparation and key facts."
   - Deep: "Use an academic, detailed tone with thorough explanations and context."

3. **Length Instruction:**
   - Short: "Keep the summary concise (2-3 paragraphs). Provide 5-8 key concepts and 3 example questions."
   - Medium: "Provide a moderate summary (4-5 paragraphs). Provide 8-10 key concepts and 5 example questions."
   - Long: "Provide a comprehensive summary (6-8 paragraphs). Provide 10-12 key concepts and 5-7 example questions."

4. **Output Format:**
   ```json
   {
     "summary": "string",
     "key_concepts": ["string"],
     "example_questions": ["string"]
   }
   ```

5. **Rules:**
   - Output ONLY valid JSON (no markdown)
   - Summary captures main ideas and important details
   - Key concepts are specific terms, theories, or ideas
   - Questions vary in difficulty (recall, comprehension, application)
   - All JSON strings properly escaped

### Full Prompt Template

```
You are an expert educational assistant. Analyze the following lesson content and generate a structured summary.

LESSON TITLE: {lesson.title}

CONTENT:
{content}

INSTRUCTIONS:
{tone_instruction}
{length_instruction}

OUTPUT FORMAT (JSON):
{
  "summary": "A clear, well-structured summary of the main content",
  "key_concepts": ["concept 1", "concept 2", ...],
  "example_questions": ["question 1?", "question 2?", ...]
}

RULES:
- Output ONLY valid JSON with no markdown formatting or code blocks
- Summary should capture the main ideas and important details
- Key concepts should be specific terms, theories, or ideas from the content
- Example questions should test understanding and application of the material
- Questions should vary in difficulty (recall, comprehension, application)
- Ensure all JSON strings are properly escaped
```

---

## Cost Controls

### Input Limits

- **Max Input Chars:** 50,000 characters (~12,500 tokens)
- Content is automatically truncated if it exceeds this limit
- Truncation adds "..." to indicate incomplete content

### Token Estimation

| Length | Approx Input Tokens | Approx Output Tokens | Total Tokens |
|--------|---------------------|---------------------|--------------|
| Short  | 12,500             | 300-400             | ~13,000      |
| Medium | 12,500             | 500-600             | ~13,100      |
| Long   | 12,500             | 700-900             | ~13,400      |

### Gemini Pricing (as of 2026)

**Model:** `gemini-1.5-flash`

- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Cost per Summary:**
- Short: ~$0.001-0.002
- Medium: ~$0.001-0.002
- Long: ~$0.001-0.002

---

## Database Schema

### lesson_outputs Table

Summaries are stored in the `lesson_outputs` table:

```sql
CREATE TABLE lesson_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('summary', 'key_concepts', 'flashcards', 'quiz', 'mindmap')),
  status text NOT NULL CHECK (status IN ('queued', 'ready', 'failed')),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### content_json Structure

For `type='summary'`:

```json
{
  "summary": "string",
  "key_concepts": ["string"],
  "example_questions": ["string"]
}
```

---

## Security

### Authentication

- Requires valid Supabase JWT in `Authorization` header
- JWT is validated using service role key
- User context is used for all database operations (RLS enforced)

### Authorization

- Verifies lesson belongs to authenticated user
- RLS policies ensure users can only access their own data

### Data Privacy

- `GEMINI_API_KEY` never exposed to client
- All API calls made server-side
- User content sent to Gemini (see Google's privacy policy)

---

## Error Handling

### Common Errors

1. **Missing Authorization:**
   - Status: 401
   - Cause: No JWT in Authorization header

2. **Invalid JWT:**
   - Status: 401
   - Cause: Expired or malformed JWT

3. **Lesson Not Found:**
   - Status: 404
   - Cause: Invalid lesson_id or lesson doesn't belong to user

4. **No Content Available:**
   - Status: 400
   - Error Code: `NO_CONTENT_AVAILABLE`
   - Cause: Lesson has no text, transcript, or supported assets

5. **Unsupported Content Type:**
   - Status: 400
   - Error Code: `UNSUPPORTED_CONTENT_TYPE`
   - Cause: Lesson only has PDF assets (not yet supported)

6. **Gemini API Error:**
   - Status: 500
   - Cause: Gemini API failure or invalid response

7. **JSON Parse Error:**
   - Status: 500
   - Cause: Gemini returned invalid JSON

---

## Usage Examples

### Basic Request (TypeScript)

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/lesson_generate_summary`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userJWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
  }
);

const data = await response.json();
console.log(data.summary);
console.log(data.key_concepts);
console.log(data.example_questions);
```

### Custom Tone and Length

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/lesson_generate_summary`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userJWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      tone: 'exam',
      length: 'long',
    }),
  }
);
```

### Retrieving Saved Summary

```typescript
// Query lesson_outputs table
const { data, error } = await supabase
  .from('lesson_outputs')
  .select('*')
  .eq('lesson_id', lessonId)
  .eq('type', 'summary')
  .eq('status', 'ready')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (data) {
  const { summary, key_concepts, example_questions } = data.content_json;
}
```

---

## Testing

See `backend/tests/lesson_generate_summary.test.md` for detailed test cases and curl examples.

---

## Future Enhancements

1. **PDF Support:**
   - Integrate PDF text extraction library
   - Handle multi-page PDFs with chunking

2. **Image Support:**
   - Use Gemini's vision capabilities for diagrams/slides
   - Extract text from images (OCR)

3. **Caching:**
   - Cache summaries to avoid regenerating for same content
   - Invalidate cache when lesson content changes

4. **Batch Processing:**
   - Generate summaries for multiple lessons
   - Queue-based processing for large courses

5. **Custom Prompts:**
   - Allow users to customize prompt templates
   - Support for different educational levels (high school, college, grad)

6. **Multi-language:**
   - Detect content language
   - Generate summaries in user's preferred language

---

## Related Documentation

- [Gemini Ephemeral Tokens](./gemini-ephemeral-token.md)
- [Gemini Live Transcription](./gemini-live-transcription.md)
- [Database Schema](./db-schema.md)
- [Edge Functions Overview](../supabase/functions/README.md)
