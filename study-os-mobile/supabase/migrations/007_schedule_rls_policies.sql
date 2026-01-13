-- Migration 007: Schedule Tables RLS Policies
-- Enable RLS and create user isolation policies for scheduling tables

-- =============================================================================
-- ENABLE RLS ON ALL SCHEDULE TABLES
-- =============================================================================
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STUDY_PLANS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own study plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans"
  ON study_plans FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (course_id IS NULL OR EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.user_id = auth.uid()))
  );

CREATE POLICY "Users can update their own study plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- STUDY_PLAN_RULES POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own study plan rules"
  ON study_plan_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plan rules"
  ON study_plan_rules FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_id AND study_plans.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own study plan rules"
  ON study_plan_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plan rules"
  ON study_plan_rules FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- DEVICE_PUSH_TOKENS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own push tokens"
  ON device_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON device_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON device_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON device_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- SCHEDULED_NOTIFICATIONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own scheduled notifications"
  ON scheduled_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled notifications"
  ON scheduled_notifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_id AND study_plans.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own scheduled notifications"
  ON scheduled_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled notifications"
  ON scheduled_notifications FOR DELETE
  USING (auth.uid() = user_id);
