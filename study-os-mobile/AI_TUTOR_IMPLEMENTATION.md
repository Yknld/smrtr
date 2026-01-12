# AI Tutor Backend Implementation ✅

**Date:** 2026-01-11  
**Feature:** MVP AI Tutor chat with conversation history and RAG context  
**Status:** Complete and ready for deployment

---

## 📊 Implementation Summary

### What Was Built

#### 1. **Database Schema** (Migrations 012 & 013)

**Tables Created:**
- `conversations` - AI tutor chat sessions with optional lesson/course context
- `messages` - Individual messages (user/assistant/system) with conversation history
- `course_materials` - Searchable lesson content for RAG retrieval
- `ai_usage` - Token tracking for analytics and cost monitoring

**Key Features:**
- ✅ User isolation via `user_id` and RLS policies
- ✅ Cascade deletes for data consistency
- ✅ Auto-update `conversations.updated_at` trigger on new messages
- ✅ Optimized indexes for common query patterns
- ✅ Full CRUD RLS policies using `auth.uid()`

#### 2. **Edge Function** (`tutor_chat`)

**Location:** `/supabase/functions/tutor_chat/index.ts`

**Capabilities:**
- ✅ Create new conversations or continue existing ones
- ✅ JWT authentication and authorization
- ✅ Fetch last 10 messages for conversation context
- ✅ Retrieve up to 6 course materials for RAG context
- ✅ Build structured prompts for Gemini AI
- ✅ Generate educational responses with proper format
- ✅ Save user and assistant messages to database
- ✅ Log AI usage (token estimates) for analytics
- ✅ Auto-generate conversation titles from first message

**Model:** Google Gemini 2.0 Flash (fast, cost-effective)

#### 3. **Integration Test Script**

**Location:** `/scripts/test-tutor-chat.js`

**Test Coverage:**
- ✅ Create new conversation
- ✅ Continue existing conversation
- ✅ Verify database persistence
- ✅ Validate message history
- ✅ Test edge cases (empty message, long message, invalid ID)

---

## 🗄️ Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Store AI tutor conversation sessions

**Key Points:**
- Title auto-generated from first user message (max 60 chars)
- Optional `lesson_id` for lesson-scoped tutoring
- Optional `course_id` for course-scoped tutoring
- `updated_at` automatically updated when new messages arrive

### Messages Table

```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Store individual messages in conversations

**Roles:**
- `user` - Student messages
- `assistant` - AI tutor responses
- `system` - Context or system messages (future use)

### Course Materials Table

```sql
CREATE TABLE course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('transcript', 'notes', 'asset', 'summary', 'other')),
  text_content text NOT NULL,
  source_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Searchable lesson content for RAG context

**Material Types:**
- `transcript` - Lesson transcripts
- `notes` - Student notes
- `asset` - Document text
- `summary` - AI-generated summaries
- `other` - Other content

**Note:** For MVP, retrieval is "latest 6" (no vector search yet)

### AI Usage Table

```sql
CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NULL REFERENCES conversations(id) ON DELETE SET NULL,
  feature text NOT NULL CHECK (feature IN ('tutor_chat', 'summary', 'flashcards', 'quiz', 'podcast', 'notes', 'other')),
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Track AI API usage for analytics and cost monitoring

**Features Tracked:**
- `tutor_chat` - AI tutor conversations
- `summary`, `flashcards`, `quiz`, `podcast`, `notes` - Other AI features
- Token counts are estimates (1 token ≈ 4 chars)

---

## 🔌 API Specification

### Endpoint: `tutor_chat`

**URL:** `POST /functions/v1/tutor_chat`

**Headers:**
```
Authorization: Bearer <user_jwt>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  conversationId?: string | null,  // null to create new conversation
  lessonId?: string | null,         // optional lesson context
  courseId?: string | null,         // optional course context
  message: string                   // user's question (max 2000 chars)
}
```

**Response (200 OK):**
```typescript
{
  conversationId: string,           // conversation ID (new or existing)
  messageId: string,                // AI message ID
  assistantMessage: string,         // AI's response
  title: string                     // conversation title
}
```

**Error Responses:**
- `400` - Invalid request (empty message, too long, etc.)
- `401` - Missing or invalid authentication
- `404` - Conversation not found or access denied
- `500` - Service configuration error or internal error

---

## 🤖 AI Tutor Behavior

### System Prompt

The AI tutor follows these guidelines:

1. **Educational Focus**: Clear, educational explanations
2. **Structured Format**: Answer → Example → Quick Check → Summary → Sources
3. **Context Priority**: Prefer provided materials over general knowledge
4. **Citation Integrity**: Never hallucinate citations
5. **Active Learning**: Encourage critical thinking with follow-up questions
6. **Supportive Tone**: Patient and encouraging

### Response Format

```
**Answer:**
Clear, direct answer to the student's question.

**Example:**
A concrete example that illustrates the concept.

**Quick Check:**
A brief question to verify understanding (optional).

**Summary:**
Key takeaway in 1-2 sentences.

**Sources Used:**
List the specific materials you referenced (if any).
```

### Context Retrieval (RAG)

**MVP Approach:**
- Fetch up to 6 course materials for the lesson/course
- Order by `created_at DESC` (most recent first)
- Truncate each material to 1500 chars to avoid token overflow
- Total context budget: ~9000 chars (6 × 1500)

**Future Enhancement:**
- Implement vector embeddings for semantic search
- Use cosine similarity to find most relevant materials
- Support larger context windows with Gemini Pro

---

## 📦 Deployment

### Prerequisites

1. Supabase project with CLI configured
2. `GEMINI_API_KEY` available
3. Test user account created

### Step 1: Apply Database Migrations

```bash
cd study-os-mobile

# Apply migration 012 (tables)
supabase db push --file supabase/migrations/012_create_ai_tutor_tables.sql

# Apply migration 013 (RLS)
supabase db push --file supabase/migrations/013_ai_tutor_rls_policies.sql
```

**Or via Supabase SQL Editor:**
1. Copy contents of `012_create_ai_tutor_tables.sql`
2. Run in SQL Editor
3. Copy contents of `013_ai_tutor_rls_policies.sql`
4. Run in SQL Editor

### Step 2: Set API Key Secret

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

**Verify:**
```bash
supabase secrets list
```

### Step 3: Deploy Edge Function

```bash
supabase functions deploy tutor_chat
```

**Verify deployment:**
```bash
supabase functions list
```

You should see `tutor_chat` in the list.

### Step 4: Test Integration

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export TEST_EMAIL="user1@test.com"
export TEST_PASSWORD="password123"

# Run test script
node scripts/test-tutor-chat.js
```

**Expected Output:**
```
✅ Signed in as user1@test.com
✅ Conversation created: <uuid>
✅ Title: "What is photosynthesis?"
✅ AI Response: Photosynthesis is the process...
✅ Conversation exists in database
✅ Found 2 messages
✅ ALL TESTS PASSED!
```

---

## 🧪 Testing

### Manual Test via curl

#### Create New Conversation

```bash
# Get auth token
TOKEN=$(curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}' \
  | jq -r '.access_token')

# Send first message
curl -X POST "${SUPABASE_URL}/functions/v1/tutor_chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the Krebs cycle?"
  }' | jq
```

#### Continue Conversation

```bash
# Use conversationId from previous response
curl -X POST "${SUPABASE_URL}/functions/v1/tutor_chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "<uuid-from-previous-response>",
    "message": "Can you explain it step by step?"
  }' | jq
```

### Verify in Database

```sql
-- View conversations
SELECT * FROM conversations WHERE user_id = '<user-id>' ORDER BY updated_at DESC;

-- View messages for a conversation
SELECT 
  role, 
  LEFT(content, 100) as content_preview,
  created_at
FROM messages
WHERE conversation_id = '<conversation-id>'
ORDER BY created_at ASC;

-- View AI usage
SELECT 
  feature, 
  model, 
  input_tokens, 
  output_tokens, 
  created_at
FROM ai_usage
WHERE user_id = '<user-id>'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 💰 Cost Estimation

### Gemini 2.0 Flash Pricing

- **Input:** $0.00001875 per 1K tokens ($0.01875 per 1M tokens)
- **Output:** $0.000075 per 1K tokens ($0.075 per 1M tokens)

### Typical Request

**Prompt (Input):**
- System prompt: ~400 tokens
- Course materials: ~2000 tokens (6 materials × ~330 tokens)
- Conversation history: ~500 tokens (5 messages)
- User question: ~50 tokens
- **Total input:** ~2950 tokens

**Response (Output):**
- AI answer: ~500 tokens

**Cost per request:**
- Input: 2.95K tokens × $0.00001875 = $0.000055
- Output: 0.5K tokens × $0.000075 = $0.000038
- **Total: ~$0.00009 per message**

### Monthly Estimates

| Messages/Day | Messages/Month | Cost/Month |
|--------------|----------------|------------|
| 10           | 300            | $0.03      |
| 50           | 1,500          | $0.14      |
| 100          | 3,000          | $0.27      |
| 500          | 15,000         | $1.35      |
| 1,000        | 30,000         | $2.70      |

**Very affordable for MVP!** 🎉

---

## 🚨 Troubleshooting

### Error: "GEMINI_API_KEY not configured"

**Fix:**
```bash
supabase secrets set GEMINI_API_KEY=your_key
supabase functions deploy tutor_chat  # Redeploy to pick up secret
```

### Error: "Conversation not found"

**Causes:**
1. Conversation doesn't exist (wrong ID)
2. User doesn't own the conversation (RLS blocked it)

**Fix:** Verify conversation ID and ownership in database

### Error: "Failed to create conversation"

**Causes:**
1. RLS policies not applied
2. Invalid `lesson_id` or `course_id` (foreign key constraint)

**Fix:** Ensure migrations 012 & 013 are applied

### Function deployment fails

**Fix:**
```bash
# Check Supabase CLI version
supabase --version

# Re-authenticate
supabase login

# Try deploying again
supabase functions deploy tutor_chat --no-verify-jwt
```

### No AI response / timeout

**Causes:**
1. GEMINI_API_KEY invalid
2. Gemini API quota exceeded
3. Network timeout

**Fix:** Check Gemini API dashboard for quota and errors

---

## 📚 What's Reused from Existing Code

1. **Edge Function Pattern**: Same structure as `lesson_generate_summary`, `lesson_generate_flashcards`
2. **Auth Validation**: JWT validation via `supabaseAdmin.auth.getUser()`
3. **Gemini SDK**: `@google/generative-ai@0.21.0` (same version)
4. **RLS Approach**: `auth.uid()` based policies (same as all existing tables)
5. **Error Handling**: Request IDs, console logging, CORS headers
6. **Database Patterns**: UUID primary keys, timestamptz, cascade deletes

---

## 🎯 Next Steps (Future Enhancements)

1. **Vector Search**: Implement embeddings for semantic material retrieval
2. **Streaming Responses**: Use Gemini streaming for real-time typing effect
3. **Voice Input**: Accept audio transcriptions as messages
4. **Message Reactions**: Let users upvote/downvote AI responses
5. **Export Conversations**: Download chat history as PDF/text
6. **Suggested Questions**: AI-generated follow-up question suggestions
7. **Multi-turn Context**: Better handling of long conversations (summarization)
8. **Rate Limiting**: Per-user message limits to prevent abuse

---

## 📄 Files Created

### Migrations
- `/supabase/migrations/012_create_ai_tutor_tables.sql` (176 lines)
- `/supabase/migrations/013_ai_tutor_rls_policies.sql` (124 lines)

### Edge Function
- `/supabase/functions/tutor_chat/index.ts` (470 lines)
- `/supabase/functions/tutor_chat/deno.json` (5 lines)

### Tests & Docs
- `/scripts/test-tutor-chat.js` (270 lines)
- `/AI_TUTOR_IMPLEMENTATION.md` (This file)

**Total:** 1,045+ lines of production-ready code + documentation

---

## ✅ Checklist

- [x] Database schema with proper relationships
- [x] RLS policies for user isolation
- [x] Auto-update trigger for conversation timestamps
- [x] Optimized indexes for query performance
- [x] Edge function with JWT authentication
- [x] Gemini AI integration with structured prompts
- [x] Conversation history management (last 10 messages)
- [x] RAG context retrieval (up to 6 materials)
- [x] AI usage tracking for analytics
- [x] Error handling and validation
- [x] Integration test script
- [x] Comprehensive documentation
- [x] Cost estimation
- [x] Deployment instructions

**Status: 🚀 Ready for Production!**
