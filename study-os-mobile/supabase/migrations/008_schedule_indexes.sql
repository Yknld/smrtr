-- Migration 008: Schedule Tables Indexes
-- Optimize queries for listing plans, cron scanning, and lookups

-- =============================================================================
-- STUDY_PLANS INDEXES
-- =============================================================================
-- Support listing user's active/enabled plans, ordered by creation
CREATE INDEX idx_study_plans_user_enabled_created 
  ON study_plans(user_id, is_enabled, created_at);

-- Support finding plans for a specific course
CREATE INDEX idx_study_plans_course 
  ON study_plans(course_id);

-- =============================================================================
-- STUDY_PLAN_RULES INDEXES
-- =============================================================================
-- Support fetching all rules for a plan
CREATE INDEX idx_study_plan_rules_plan 
  ON study_plan_rules(study_plan_id);

-- Support user-level queries (e.g., "all my rules for a plan")
CREATE INDEX idx_study_plan_rules_user_plan 
  ON study_plan_rules(user_id, study_plan_id);

-- =============================================================================
-- DEVICE_PUSH_TOKENS INDEXES
-- =============================================================================
-- Support fetching active tokens for a user
CREATE INDEX idx_device_push_tokens_user_active 
  ON device_push_tokens(user_id, is_active);

-- =============================================================================
-- SCHEDULED_NOTIFICATIONS INDEXES
-- =============================================================================
-- Support cron job scanning: "queued notifications ready to fire"
-- Also supports user queries for upcoming notifications
CREATE INDEX idx_scheduled_notifications_user_status_fire 
  ON scheduled_notifications(user_id, status, fire_at);

-- Support plan-level queries: "all notifications for this plan"
CREATE INDEX idx_scheduled_notifications_plan_status_fire 
  ON scheduled_notifications(study_plan_id, status, fire_at);
