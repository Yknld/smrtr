-- Migration 012: AI Tutor Tables
-- conversations, messages, course_materials, ai_usage

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE conversations IS 'AI tutor conversation sessions';
COMMENT ON COLUMN conversations.lesson_id IS 'Optional lesson context for conversation';
COMMENT ON COLUMN conversations.course_id IS 'Optional course context for conversation';
COMMENT ON COLUMN conversations.title IS 'Conversation title (auto-generated from first message)';
COMMENT ON COLUMN conversations.updated_at IS 'Auto-updated when new messages arrive';

-- =============================================================================
-- MESSAGES
-- =============================================================================
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Individual messages in AI tutor conversations';
COMMENT ON COLUMN messages.role IS 'Message sender: user (student), assistant (AI), system (context)';
COMMENT ON COLUMN messages.content IS 'Message text content';

-- =============================================================================
-- COURSE_MATERIALS
-- =============================================================================
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

COMMENT ON TABLE course_materials IS 'Searchable lesson content for RAG/context retrieval';
COMMENT ON COLUMN course_materials.type IS 'Material type: transcript, notes, asset, summary, other';
COMMENT ON COLUMN course_materials.text_content IS 'Full text content for context retrieval';
COMMENT ON COLUMN course_materials.source_url IS 'Optional link to original source';

-- =============================================================================
-- AI_USAGE (Optional - for token tracking)
-- =============================================================================
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

COMMENT ON TABLE ai_usage IS 'Track AI API usage for analytics and cost monitoring';
COMMENT ON COLUMN ai_usage.feature IS 'Which feature generated the usage';
COMMENT ON COLUMN ai_usage.model IS 'AI model used (e.g., gemini-3-flash-preview)';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Conversations: User's recent conversations
CREATE INDEX idx_conversations_user_updated 
  ON conversations(user_id, updated_at DESC);

-- Conversations: Lesson context lookup
CREATE INDEX idx_conversations_lesson 
  ON conversations(lesson_id) WHERE lesson_id IS NOT NULL;

-- Messages: Fetch conversation history
CREATE INDEX idx_messages_conversation_created 
  ON messages(conversation_id, created_at ASC);

-- Course Materials: Fetch materials for a lesson
CREATE INDEX idx_course_materials_lesson 
  ON course_materials(lesson_id, created_at DESC);

-- Course Materials: Fetch materials for a course
CREATE INDEX idx_course_materials_course 
  ON course_materials(course_id, created_at DESC);

-- AI Usage: User's usage over time
CREATE INDEX idx_ai_usage_user_created 
  ON ai_usage(user_id, created_at DESC);

-- AI Usage: Feature analytics
CREATE INDEX idx_ai_usage_feature_created 
  ON ai_usage(feature, created_at DESC);

-- =============================================================================
-- TRIGGER: Auto-update conversations.updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

COMMENT ON FUNCTION update_conversation_timestamp IS 'Auto-update conversations.updated_at when new message is added';
