# lesson_generate_summary - Quick Reference

## Endpoint

```
POST /functions/v1/lesson_generate_summary
```

## Request

```json
{
  "lesson_id": "uuid",
  "tone": "casual" | "exam" | "deep",      // optional, default: "casual"
  "length": "short" | "medium" | "long"    // optional, default: "medium"
}
```

## Response

```json
{
  "output_id": "uuid",
  "summary": "string",
  "key_concepts": ["string"],
  "example_questions": ["string"],
  "metadata": {
    "content_source": "live_transcript" | "transcription" | "text_asset",
    "content_length": number,
    "tone": "casual" | "exam" | "deep",
    "length": "short" | "medium" | "long"
  }
}
```

## Quick Test

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/lesson_generate_summary" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "your-lesson-id"}'
```

## TypeScript

```typescript
const { data: session } = await supabase.auth.getSession();

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/lesson_generate_summary`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: lessonId,
      tone: 'casual',
      length: 'medium',
    }),
  }
);

const summary = await response.json();
```

## Get Saved Summary

```typescript
const { data } = await supabase
  .from('lesson_outputs')
  .select('*')
  .eq('lesson_id', lessonId)
  .eq('type', 'summary')
  .eq('status', 'ready')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const { summary, key_concepts, example_questions } = data.content_json;
```

## Deploy

```bash
supabase functions deploy lesson_generate_summary --no-verify-jwt
```

## Test

```bash
USER_JWT="your_jwt" LESSON_ID="your_lesson_id" \
  ./backend/tests/test-lesson-summary.sh
```

## Errors

| Status | Error                       | Meaning                    |
|--------|-----------------------------|----------------------------|
| 400    | `lesson_id is required`     | Missing parameter          |
| 400    | `NO_CONTENT_AVAILABLE`      | Lesson has no content      |
| 400    | `UNSUPPORTED_CONTENT_TYPE`  | PDF not yet supported      |
| 401    | `Missing authorization`     | No JWT                     |
| 404    | `Lesson not found`          | Invalid ID or unauthorized |
| 500    | `Service configuration`     | Missing GEMINI_API_KEY     |

## Costs

- **Model:** gemini-3-flash-preview
- **Cost per summary:** ~$0.001-0.002
- **Response time:** 3-12 seconds (depending on content length)
- **Max input:** 50,000 characters

## Content Sources (Priority)

1. Live transcript segments (`live_transcript_segments`)
2. Transcription text (`transcripts.full_text`)
3. Text assets (`lesson_assets` with `text/plain` or `application/json`)
4. PDF assets (not yet supported)

## Tone Options

- **casual:** Friendly, conversational
- **exam:** Formal, exam-focused
- **deep:** Academic, detailed

## Length Options

- **short:** 2-3 paragraphs, 5-8 concepts, 3 questions
- **medium:** 4-5 paragraphs, 8-10 concepts, 5 questions
- **long:** 6-8 paragraphs, 10-12 concepts, 5-7 questions

## Full Documentation

- [API Docs](../../../backend/docs/gemini-summary.md)
- [Test Cases](../../../backend/tests/lesson_generate_summary.test.md)
- [Client Integration](./CLIENT_INTEGRATION.md)
