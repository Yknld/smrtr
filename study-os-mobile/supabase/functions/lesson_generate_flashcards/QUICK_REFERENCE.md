# lesson_generate_flashcards - Quick Reference

## 🚀 Quick Start

### Deploy
```bash
cd supabase/functions
./deploy.sh
# Or individually:
supabase functions deploy lesson_generate_flashcards --no-verify-jwt
```

### Set API Key
```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

### Test
```bash
curl -X POST https://your-project.supabase.co/functions/v1/lesson_generate_flashcards \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "YOUR_LESSON_UUID", "count": 15}'
```

## 📋 API Quick Reference

### Endpoint
```
POST /functions/v1/lesson_generate_flashcards
```

### Request Body
```json
{
  "lesson_id": "uuid",      // Required
  "count": 15               // Optional: 10-25, default 15
}
```

### Success Response (200)
```json
{
  "flashcards": {
    "id": "uuid",
    "type": "flashcards",
    "status": "ready",
    "content_json": {
      "cards": [{"front": "Q", "back": "A"}]
    }
  },
  "quiz": {
    "id": "uuid",
    "type": "quiz",
    "status": "ready",
    "content_json": {
      "questions": [{
        "q": "Question?",
        "choices": ["A", "B", "C", "D"],
        "answer_index": 0,
        "explanation": "Why"
      }]
    }
  }
}
```

## 🔒 Authentication
- **Required**: JWT token in `Authorization: Bearer <token>` header
- **Verification**: User must own the lesson
- **RLS**: Row Level Security enforced on all queries

## ⚠️ Common Errors

| Error Code | Meaning | Fix |
|------------|---------|-----|
| `UNAUTHORIZED` | Missing/invalid JWT | Check token |
| `LESSON_NOT_FOUND` | Wrong lesson_id or not owned | Verify lesson exists |
| `NO_CONTENT` | Lesson has no transcript | Ensure lesson transcribed |
| `INVALID_COUNT` | Count not 10-25 | Use valid range |
| `AI_GENERATION_FAILED` | Gemini API error | Check API key/quota |

## 📊 Performance

| Lesson Size | Response Time | Cost |
|-------------|---------------|------|
| < 500 words | 3-5 sec | ~$0.001 |
| 500-2000 words | 5-8 sec | ~$0.005 |
| 2000+ words | 8-15 sec | ~$0.01 |

## 🔧 Troubleshooting

### Check if lesson has content
```sql
SELECT COUNT(*)
FROM live_transcript_segments lts
JOIN study_sessions ss ON ss.id = lts.study_session_id
WHERE ss.lesson_id = 'YOUR_LESSON_ID';
```

### Check existing flashcards
```sql
SELECT type, status, created_at
FROM lesson_outputs
WHERE lesson_id = 'YOUR_LESSON_ID'
  AND type IN ('flashcards', 'quiz');
```

### View function logs
```bash
supabase functions logs lesson_generate_flashcards --tail
```

## 💻 Client Integration

### TypeScript/React Native
```typescript
const { data, error } = await supabase.functions.invoke(
  'lesson_generate_flashcards',
  {
    body: { lesson_id: lessonId, count: 20 }
  }
);

if (data) {
  const cards = data.flashcards.content_json.cards;
  const quiz = data.quiz.content_json.questions;
}
```

### Check before generating
```typescript
// Avoid regenerating if exists
const { data: existing } = await supabase
  .from('lesson_outputs')
  .select('*')
  .eq('lesson_id', lessonId)
  .eq('type', 'flashcards')
  .eq('status', 'ready')
  .maybeSingle();

if (!existing) {
  // Generate new
  await supabase.functions.invoke('lesson_generate_flashcards', ...);
}
```

## 📁 Content Structure

### Flashcards JSON
```json
{
  "cards": [
    {
      "front": "What is a variable?",
      "back": "A named storage location..."
    }
  ]
}
```

### Quiz JSON
```json
{
  "questions": [
    {
      "q": "Which is correct?",
      "choices": ["A", "B", "C", "D"],
      "answer_index": 0,
      "explanation": "Because..."
    }
  ]
}
```

## 🔗 Related Files
- **Full Docs**: `README.md`
- **Testing**: `TEST.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Source Code**: `index.ts`
- **Helper**: `../shared/lessonHelpers.ts`

## 🎯 Key Points
- ✅ Synchronous generation (no polling needed)
- ✅ Creates 2 lesson_outputs records (flashcards + quiz)
- ✅ Requires lesson with transcript data
- ✅ Count range: 10-25 flashcards
- ✅ Quiz always has 5 questions
- ✅ Uses Gemini 2.0 Flash model
- ✅ Cost-effective (~$0.001-0.01 per request)
