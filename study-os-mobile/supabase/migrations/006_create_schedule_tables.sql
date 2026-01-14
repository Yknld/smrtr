-- Migration 006: Create Schedule Tables
-- study_plans, study_plan_rules, device_push_tokens, scheduled_notifications

-- =============================================================================
-- STUDY_PLANS
-- =============================================================================
CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NULL REFERENCES courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE study_plans IS 'User-created study schedules, optionally linked to a course';
COMMENT ON COLUMN study_plans.user_id IS 'References auth.users(id) - owner of the plan';
COMMENT ON COLUMN study_plans.course_id IS 'Optional link to a specific course; NULL for general schedules';
COMMENT ON COLUMN study_plans.timezone IS 'IANA timezone for computing local times (e.g., America/Toronto)';
COMMENT ON COLUMN study_plans.is_enabled IS 'If false, no new notifications are generated';

-- =============================================================================
-- STUDY_PLAN_RULES
-- =============================================================================
CREATE TABLE study_plan_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  study_plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  rrule text NOT NULL,
  start_time_local time NOT NULL,
  duration_min int NOT NULL DEFAULT 45,
  remind_before_min int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT duration_min_valid CHECK (duration_min >= 5 AND duration_min <= 600),
  CONSTRAINT remind_before_min_valid CHECK (remind_before_min >= 0 AND remind_before_min <= 120)
);

COMMENT ON TABLE study_plan_rules IS 'Recurrence rules for study plans using iCal RRULE format';
COMMENT ON COLUMN study_plan_rules.rrule IS 'iCalendar RRULE string (e.g., FREQ=WEEKLY;BYDAY=MO,WE)';
COMMENT ON COLUMN study_plan_rules.start_time_local IS 'Local time of day for the session (e.g., 19:00)';
COMMENT ON COLUMN study_plan_rules.duration_min IS 'Session duration in minutes (5-600)';
COMMENT ON COLUMN study_plan_rules.remind_before_min IS 'Minutes before session to send reminder (0-120)';

-- =============================================================================
-- DEVICE_PUSH_TOKENS
-- =============================================================================
CREATE TABLE device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  push_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NULL
);

COMMENT ON TABLE device_push_tokens IS 'Device push notification tokens for FCM/APNs';
COMMENT ON COLUMN device_push_tokens.platform IS 'Device platform: ios or android';
COMMENT ON COLUMN device_push_tokens.push_token IS 'Globally unique device token from FCM/APNs';
COMMENT ON COLUMN device_push_tokens.is_active IS 'If false, do not send notifications to this device';
COMMENT ON COLUMN device_push_tokens.last_seen_at IS 'Last time this token was used or verified';

-- =============================================================================
-- SCHEDULED_NOTIFICATIONS
-- =============================================================================
CREATE TABLE scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  study_plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  fire_at timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('reminder', 'start', 'nudge')),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'canceled')) DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_notification UNIQUE (user_id, study_plan_id, fire_at, type)
);

COMMENT ON TABLE scheduled_notifications IS 'Queue of pending and historical notifications';
COMMENT ON COLUMN scheduled_notifications.fire_at IS 'UTC timestamp when notification should be sent';
COMMENT ON COLUMN scheduled_notifications.type IS 'reminder (before session), start (session begins), nudge (motivational)';
COMMENT ON COLUMN scheduled_notifications.payload_json IS 'Additional data for notification content (title, body, etc.)';
COMMENT ON COLUMN scheduled_notifications.status IS 'queued (pending), sent (delivered), failed (error), canceled (dismissed)';
