# AI Tutor - Quick Start Guide

Get the AI Tutor backend running in 5 minutes.

---

## Prerequisites

- Supabase project created
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Project linked: `supabase link --project-ref your-ref`

---

## 🚀 Deployment (3 steps)

### 1. Apply Migrations

```bash
cd study-os-mobile

# Apply AI tutor tables
supabase db push --file supabase/migrations/012_create_ai_tutor_tables.sql

# Apply RLS policies
supabase db push --file supabase/migrations/013_ai_tutor_rls_policies.sql
```

**Or via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy/paste contents of `012_create_ai_tutor_tables.sql` → Run
3. Copy/paste contents of `013_ai_tutor_rls_policies.sql` → Run

### 2. Set API Key

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

### 3. Deploy Function

```bash
supabase functions deploy tutor_chat
```

**Or deploy all functions:**
```bash
cd supabase/functions
./deploy.sh
```

---

## ✅ Verify Deployment

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('conversations', 'messages', 'course_materials', 'ai_usage');
```

Should return 4 rows.

### Check RLS Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('conversations', 'messages', 'course_materials', 'ai_usage');
```

All should have `rowsecurity = true`.

### Check Function Deployed

```bash
supabase functions list
```

Should see `tutor_chat` in the list.

---

## 🧪 Test It

### Option 1: curl

```bash
# Set variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Get auth token
TOKEN=$(curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}' \
  | jq -r '.access_token')

# Send message
curl -X POST "${SUPABASE_URL}/functions/v1/tutor_chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is photosynthesis?"}' \
  | jq
```

### Option 2: Test Script

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export TEST_EMAIL="user1@test.com"
export TEST_PASSWORD="password123"

node scripts/test-tutor-chat.js
```

Expected: `✅ ALL TESTS PASSED!`

---

## 📱 Client Integration

### React Native (Supabase SDK)

```typescript
import { supabase } from './config/supabase';

async function sendTutorMessage(message: string, conversationId?: string) {
  const { data, error } = await supabase.functions.invoke('tutor_chat', {
    body: {
      conversationId: conversationId || null,
      message,
    },
  });

  if (error) {
    console.error('Tutor chat error:', error);
    throw error;
  }

  return data;
}

// Usage
const response = await sendTutorMessage('What is the Krebs cycle?');
console.log(response.assistantMessage);  // AI's answer
console.log(response.conversationId);    // Save for next message
```

### Continue Conversation

```typescript
// Use conversationId from previous response
const response = await sendTutorMessage(
  'Can you explain it step by step?',
  previousConversationId
);
```

---

## 🔧 Troubleshooting

### "GEMINI_API_KEY not configured"

**Fix:**
```bash
supabase secrets set GEMINI_API_KEY=your_key
supabase functions deploy tutor_chat  # Redeploy
```

### "Conversation not found"

**Causes:**
- Wrong conversation ID
- User doesn't own conversation (RLS blocked it)

**Fix:** Check conversation ownership in database

### "Invalid or expired session"

**Cause:** JWT token expired

**Fix:** Re-authenticate user

### Function not found

**Fix:**
```bash
supabase functions deploy tutor_chat
supabase functions list  # Verify it appears
```

---

## 💰 Cost

**Per message:** ~$0.00009 (less than 1 cent per 100 messages)

**1000 messages/month:** ~$0.09

Very affordable! 🎉

---

## 📚 Next Steps

1. **Add course materials** - Populate `course_materials` table for better context
2. **Test with real lessons** - Pass `lessonId` to scope conversations
3. **Monitor usage** - Check `ai_usage` table for analytics
4. **Integrate UI** - Build chat interface in mobile app

---

## 📖 Full Documentation

- [Complete Implementation Guide](./AI_TUTOR_IMPLEMENTATION.md)
- [API Reference](./supabase/functions/tutor_chat/README.md)
- [Database Schema](./backend/docs/db-schema.md)

---

## 🆘 Need Help?

Check the logs:
```bash
supabase functions logs tutor_chat
```

View recent conversations:
```sql
SELECT * FROM conversations 
WHERE user_id = auth.uid() 
ORDER BY updated_at DESC 
LIMIT 10;
```

View messages:
```sql
SELECT m.role, m.content, m.created_at
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE c.user_id = auth.uid()
ORDER BY m.created_at DESC
LIMIT 20;
```
