-- Migration 013: AI Tutor RLS Policies
-- Row Level Security for conversations, messages, course_materials, ai_usage

-- =============================================================================
-- ENABLE RLS ON ALL AI TUTOR TABLES
-- =============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CONVERSATIONS POLICIES
-- =============================================================================

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- MESSAGES POLICIES
-- =============================================================================

-- Users can view messages only if they own the parent conversation
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Users can insert messages only into their own conversations
CREATE POLICY "Users can insert messages into their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Users can update messages only in their own conversations
CREATE POLICY "Users can update messages in their conversations"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Users can delete messages only in their own conversations
CREATE POLICY "Users can delete messages in their conversations"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- =============================================================================
-- COURSE_MATERIALS POLICIES
-- =============================================================================

CREATE POLICY "Users can view their own course materials"
  ON course_materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course materials"
  ON course_materials FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_id AND lessons.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own course materials"
  ON course_materials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own course materials"
  ON course_materials FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- AI_USAGE POLICIES
-- =============================================================================

-- Users can view their own AI usage
CREATE POLICY "Users can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own AI usage (typically done by edge functions)
CREATE POLICY "Users can insert their own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies - usage records are immutable for audit trail
