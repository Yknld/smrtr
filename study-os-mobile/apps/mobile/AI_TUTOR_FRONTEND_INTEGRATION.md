# AI Tutor - Frontend Integration ✅

## What Was Updated

### AITutorScreen.tsx

**Changes:**
1. ✅ Added Supabase import
2. ✅ Added `conversationId` state to track conversations
3. ✅ Added `error` state for error handling
4. ✅ Replaced placeholder `setTimeout` with real `supabase.functions.invoke` call
5. ✅ Call `tutor_chat` edge function with proper parameters
6. ✅ Handle conversation ID for follow-up messages
7. ✅ Display error messages in chat if request fails

**Before:**
```typescript
// Simulate AI response (replace with actual AI integration)
setTimeout(() => {
  const aiMessage: Message = {
    id: (Date.now() + 1).toString(),
    type: 'ai',
    content: 'This is a placeholder AI response. Integration with AI tutor coming soon.',
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, aiMessage]);
  setIsTyping(false);
}, 1500);
```

**After:**
```typescript
// Call tutor_chat edge function
const { data, error: functionError } = await supabase.functions.invoke('tutor_chat', {
  body: {
    conversationId: conversationId,
    lessonId: lessonId,
    message: messageText,
  },
});

if (functionError) {
  throw new Error(functionError.message || 'Failed to get AI response');
}

// Save conversation ID for follow-up messages
if (data?.conversationId && !conversationId) {
  setConversationId(data.conversationId);
}

// Add AI response to messages
const aiMessage: Message = {
  id: data?.messageId || (Date.now() + 1).toString(),
  type: 'ai',
  content: data?.assistantMessage || 'No response received',
  timestamp: new Date(),
};

setMessages((prev) => [...prev, aiMessage]);
```

---

## Testing Checklist

### Backend Must Be Deployed First

Before testing the app, ensure:

1. ✅ Migrations 012 & 013 applied to Supabase
2. ✅ `GEMINI_API_KEY` secret set in Supabase
3. ✅ `tutor_chat` function deployed
4. ✅ Backend test passes (`node scripts/test-tutor-chat.js`)

### Deploy Backend (If Not Done Yet)

```bash
cd study-os-mobile

# 1. Apply migrations
supabase db push --file supabase/migrations/012_create_ai_tutor_tables.sql
supabase db push --file supabase/migrations/013_ai_tutor_rls_policies.sql

# 2. Set API key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key

# 3. Deploy function
supabase functions deploy tutor_chat

# 4. Verify
supabase functions list  # Should show tutor_chat
```

---

## Test the Integration

### 1. Run the App

```bash
cd apps/mobile
npm start
# or
npx expo start
```

### 2. Sign In

Use your test account:
- Email: `user1@test.com`
- Password: `password123`

### 3. Navigate to AI Tutor

1. Go to a Lesson Hub
2. Tap "AI Tutor" card
3. You should see the chat screen

### 4. Send a Message

Try these test messages:

**First Message (Creates Conversation):**
```
What is photosynthesis?
```

**Follow-up Message (Uses Conversation History):**
```
Can you explain it step by step?
```

**Expected Behavior:**
- ✅ User message appears immediately (right side, blue)
- ✅ Typing indicator shows while AI responds (3 dots)
- ✅ AI response appears after 2-5 seconds (left side, gray)
- ✅ Response is educational and structured
- ✅ Follow-up messages maintain conversation context

---

## Troubleshooting

### Error: "Failed to get AI response"

**Check:**
1. Is backend deployed?
   ```bash
   supabase functions list  # Should see tutor_chat
   ```

2. Are migrations applied?
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('conversations', 'messages');
   ```

3. Is GEMINI_API_KEY set?
   ```bash
   supabase secrets list
   ```

4. Check function logs:
   ```bash
   supabase functions logs tutor_chat
   ```

### Error: "Invalid or expired session"

**Fix:** Sign out and sign back in

### No Response / Long Wait

**Possible causes:**
1. Gemini API timeout (check quota)
2. Network issue (check internet connection)
3. Function error (check logs)

**Check logs:**
```bash
supabase functions logs tutor_chat --tail
```

### App Shows Old Placeholder

**Fix:** 
1. Stop app
2. Clear Metro cache: `npm start -- --reset-cache`
3. Rebuild app

---

## How It Works

### Flow

1. **User Types Message** → Tap send
2. **Frontend Adds User Message** → Displayed immediately
3. **Frontend Calls Backend** → `supabase.functions.invoke('tutor_chat', {...})`
4. **Backend Authenticates** → Verifies JWT token
5. **Backend Creates/Finds Conversation** → First message creates new conversation
6. **Backend Fetches Context** → Gets last 10 messages + up to 6 course materials
7. **Backend Calls Gemini** → Generates educational response
8. **Backend Saves to DB** → Stores user + AI messages
9. **Backend Returns Response** → `{ conversationId, assistantMessage, ... }`
10. **Frontend Displays AI Response** → Shown in chat

### State Management

```typescript
const [messages, setMessages] = useState<Message[]>([]);       // Chat history
const [conversationId, setConversationId] = useState<string | null>(null);  // Saved after first message
const [isTyping, setIsTyping] = useState(false);              // Shows typing indicator
const [error, setError] = useState<string | null>(null);      // Error state
```

### Conversation Continuity

- First message: `conversationId = null` → Backend creates new conversation
- Subsequent messages: `conversationId = <uuid>` → Backend adds to existing conversation
- Backend maintains full history in database
- Frontend only needs to pass `conversationId` + new message

---

## Populate Course Materials (For Better Context)

The AI tutor works better with course materials. Here's how to populate them:

### Option 1: From Lesson Transcripts

```typescript
// In your lesson creation/update flow
import { supabase } from './config/supabase';

async function populateLessonMaterials(lessonId: string) {
  // Get lesson details
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, courses(*)')
    .eq('id', lessonId)
    .single();

  if (!lesson) return;

  // Get transcript from study session
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
      await supabase.from('course_materials').insert({
        lesson_id: lessonId,
        course_id: lesson.course_id,
        title: `${lesson.title} - Transcript`,
        type: 'transcript',
        text_content: transcriptText,
      });
    }
  }
}
```

### Option 2: From Lesson Summary

```typescript
async function populateSummaryMaterial(lessonId: string) {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, courses(*)')
    .eq('id', lessonId)
    .single();

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

---

## Performance Tips

1. **Debounce Input** - Don't send on every keystroke
2. **Show Optimistic Updates** - User messages appear immediately
3. **Cache Responses** - Consider caching common questions
4. **Limit Message Length** - Already enforced (2000 chars)
5. **Handle Slow Networks** - Show timeout message after 30s

---

## Next Steps

### Features to Add

1. **Suggested Questions** - Show AI-generated follow-ups
2. **Message Reactions** - Thumbs up/down for feedback
3. **Export Chat** - Download conversation as text/PDF
4. **Voice Input** - Use mic button for voice questions
5. **Search History** - Find past conversations
6. **Share Response** - Share AI answer with others

### Production Considerations

1. **Rate Limiting** - Limit messages per user per day
2. **Cost Monitoring** - Track AI usage per user
3. **Analytics** - Log popular questions and topics
4. **Error Reporting** - Integrate Sentry for crashes
5. **A/B Testing** - Test different prompt variations

---

## Summary

✅ **Frontend Updated** - Real Supabase integration  
✅ **No More Placeholders** - Calls actual `tutor_chat` function  
✅ **Conversation History** - Maintains context across messages  
✅ **Error Handling** - Shows user-friendly errors  
✅ **Ready to Test** - Deploy backend and try it!

**Next:** Deploy the backend if you haven't already, then test in the app! 🚀
