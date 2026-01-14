# AI Tutor Chat - Edge Function

## Quick Reference

### Endpoint
```
POST /functions/v1/tutor_chat
```

### Request
```typescript
{
  conversationId?: string | null,  // null = create new
  lessonId?: string | null,         // optional context
  courseId?: string | null,         // optional context
  message: string                   // max 2000 chars
}
```

### Response
```typescript
{
  conversationId: string,
  messageId: string,
  assistantMessage: string,
  title: string
}
```

## Example Usage

### Create New Conversation

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/tutor_chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What is photosynthesis?',
    lessonId: 'optional-lesson-uuid',  // null or omit if not needed
  }),
});

const data = await response.json();
console.log(data.assistantMessage);  // AI's response
console.log(data.conversationId);    // Save for next message
```

### Continue Conversation

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/tutor_chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    conversationId: savedConversationId,  // From previous response
    message: 'Can you explain it step by step?',
  }),
});

const data = await response.json();
console.log(data.assistantMessage);
```

## Client Integration (React Native)

```typescript
// hooks/useTutorChat.ts
import { useState } from 'react';
import { supabase } from '../config/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useTutorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, lessonId?: string) => {
    setIsLoading(true);

    // Add user message optimistically
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const { data, error } = await supabase.functions.invoke('tutor_chat', {
        body: {
          conversationId,
          lessonId,
          message,
        },
      });

      if (error) throw error;

      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Add AI response
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.assistantMessage },
      ]);

      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading, conversationId };
}
```

## Error Handling

```typescript
try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tutor_chat`, {
    // ... request config
  });

  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 401) {
      // Session expired - re-authenticate
      console.error('Authentication failed');
    } else if (response.status === 404) {
      // Conversation not found - start new one
      console.error('Conversation not found');
    } else if (response.status === 500) {
      // Server error - retry or show error
      console.error('Server error:', error.message);
    }
    
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  // Handle success
} catch (error) {
  console.error('Network error:', error);
}
```

## Populating Course Materials (for RAG)

The AI tutor uses `course_materials` table for context. Populate it like this:

```typescript
// When a lesson is created or updated
async function populateLessonMaterials(lessonId: string) {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, lesson_assets(*)')
    .eq('id', lessonId)
    .single();

  if (!lesson) return;

  // Get transcript from lesson
  const { data: session } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('lesson_id', lessonId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (session) {
    const { data: segments } = await supabase
      .from('live_transcript_segments')
      .select('text')
      .eq('study_session_id', session.id)
      .order('seq', { ascending: true });

    const transcriptText = segments?.map(s => s.text).join(' ') || '';

    if (transcriptText) {
      // Insert as course material
      await supabase.from('course_materials').insert({
        lesson_id: lessonId,
        course_id: lesson.course_id,
        title: `${lesson.title} - Transcript`,
        type: 'transcript',
        text_content: transcriptText,
      });
    }
  }

  // Get summary if available
  const { data: summary } = await supabase
    .from('lesson_outputs')
    .select('content_json')
    .eq('lesson_id', lessonId)
    .eq('type', 'summary')
    .eq('status', 'ready')
    .single();

  if (summary?.content_json?.summary) {
    await supabase.from('course_materials').insert({
      lesson_id: lessonId,
      course_id: lesson.course_id,
      title: `${lesson.title} - Summary`,
      type: 'summary',
      text_content: summary.content_json.summary,
    });
  }
}
```

## Performance Tips

1. **Debounce user input** - Don't send messages on every keystroke
2. **Show typing indicator** - Display loading state while AI responds
3. **Cache conversations** - Store conversation history locally
4. **Lazy load history** - Only fetch recent messages on mount
5. **Optimistic updates** - Show user messages immediately

## Cost Optimization

1. **Limit message length** - Enforce 2000 char client-side limit
2. **Truncate context** - Materials already truncated to 1500 chars each
3. **Conversation history** - Only last 10 messages sent to AI
4. **Use Flash model** - Already using cost-effective Gemini 2.0 Flash

## Security

✅ **Server-side API key** - `GEMINI_API_KEY` never exposed to client  
✅ **JWT authentication** - User must be authenticated  
✅ **RLS enforcement** - User can only access their own conversations  
✅ **Input validation** - Message length and format validated  
✅ **Rate limiting** - Rely on Supabase function limits (consider adding more)

## Monitoring

Check AI usage:
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as message_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(input_tokens + output_tokens) as total_tokens
FROM ai_usage
WHERE feature = 'tutor_chat'
  AND user_id = '<user-id>'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

## Troubleshooting

**No context in AI responses?**
- Check if `course_materials` table has data for the lesson
- Verify `lessonId` is being passed correctly

**Messages not persisting?**
- Check RLS policies are applied
- Verify user owns the conversation

**Slow responses?**
- Gemini 2.0 Flash is typically 2-5 seconds
- Check network latency
- Consider implementing streaming (future enhancement)

## See Also

- [Full Implementation Docs](/AI_TUTOR_IMPLEMENTATION.md)
- [Database Schema](/backend/docs/db-schema.md)
- [Integration Tests](/scripts/test-tutor-chat.js)
