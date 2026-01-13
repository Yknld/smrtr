# Schedule + Reminders Database Schema

**Version:** MVP (Phase 1 - Database Layer Only)  
**Status:** ✅ Implemented  
**Created:** 2026-01-10

---

## Overview

This document describes the database schema for the scheduling and push notification system. This MVP phase focuses on the data layer only—tables, constraints, indexes, and RLS policies. Edge functions for cron jobs will be added in a future phase.

The scheduling system enables users to:
- Create recurring study plans (optionally linked to courses)
- Define recurrence rules using iCalendar RRULE format
- Register device push tokens for notifications
- Queue and track scheduled notifications

---

## Tables

### 1. `study_plans`

User-created study schedules that define when and how often they want to study.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Unique plan identifier |
| `user_id` | uuid | NOT NULL | Owner of the study plan (references auth.users) |
| `course_id` | uuid | NULL, REFERENCES courses(id) ON DELETE SET NULL | Optional link to a specific course |
| `title` | text | NOT NULL | User-facing name (e.g., "Evening Study Sessions") |
| `timezone` | text | NOT NULL, default 'America/Toronto' | IANA timezone for local time calculations |
| `is_enabled` | boolean | NOT NULL, default true | If false, no new notifications generated |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

**Notes:**
- `course_id` is optional—plans can be general or course-specific
- If the linked course is deleted, `course_id` becomes NULL (plan remains active)
- `timezone` is critical for correctly converting local times to UTC

---

### 2. `study_plan_rules`

Recurrence rules for study plans, defining when sessions occur.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Unique rule identifier |
| `user_id` | uuid | NOT NULL | Owner (for RLS and indexing) |
| `study_plan_id` | uuid | NOT NULL, REFERENCES study_plans(id) ON DELETE CASCADE | Parent plan |
| `rrule` | text | NOT NULL | iCalendar RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE") |
| `start_time_local` | time | NOT NULL | Local time of day (e.g., 19:00) |
| `duration_min` | int | NOT NULL, default 45, CHECK (5-600) | Session duration in minutes |
| `remind_before_min` | int | NOT NULL, default 10, CHECK (0-120) | Minutes before session to send reminder |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

**Constraints:**
- `duration_min` must be between 5 and 600 minutes (5min - 10hrs)
- `remind_before_min` must be between 0 and 120 minutes (0-2hrs)

**Notes:**
- Multiple rules can exist per plan for complex schedules
- RRULE format follows RFC 5545 (iCalendar) specification
- Examples:
  - `FREQ=DAILY` = every day
  - `FREQ=WEEKLY;BYDAY=MO,WE,FR` = Mon/Wed/Fri every week
  - `FREQ=WEEKLY;BYDAY=TU,TH;INTERVAL=2` = Tue/Thu every 2 weeks

---

### 3. `device_push_tokens`

Registered device tokens for push notifications (FCM/APNs).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Unique token record identifier |
| `user_id` | uuid | NOT NULL | Owner of the device |
| `platform` | text | NOT NULL, CHECK IN ('ios', 'android') | Device platform |
| `push_token` | text | NOT NULL, UNIQUE | Device token from FCM/APNs |
| `is_active` | boolean | NOT NULL, default true | If false, skip this device |
| `created_at` | timestamptz | NOT NULL, default now() | First registration timestamp |
| `last_seen_at` | timestamptz | NULL | Last time token was verified/used |

**Constraints:**
- `push_token` is globally unique (one token per device)
- `platform` must be 'ios' or 'android'

**Notes:**
- Users can have multiple devices (multiple rows per user_id)
- `is_active` = false when token expires or user logs out
- `last_seen_at` used for cleanup of stale tokens

---

### 4. `scheduled_notifications`

Queue of pending and historical notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Unique notification identifier |
| `user_id` | uuid | NOT NULL | Owner (for RLS and indexing) |
| `study_plan_id` | uuid | NOT NULL, REFERENCES study_plans(id) ON DELETE CASCADE | Source plan |
| `fire_at` | timestamptz | NOT NULL | UTC timestamp when notification should fire |
| `type` | text | NOT NULL, CHECK IN ('reminder', 'start', 'nudge') | Notification purpose |
| `payload_json` | jsonb | NOT NULL, default '{}' | Notification content (title, body, etc.) |
| `status` | text | NOT NULL, CHECK IN ('queued', 'sent', 'failed', 'canceled'), default 'queued' | Delivery status |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

**Constraints:**
- `UNIQUE (user_id, study_plan_id, fire_at, type)` prevents duplicate notifications

**Notification Types:**
- `reminder`: Sent `remind_before_min` before session (e.g., "Study session in 15 minutes")
- `start`: Sent at session start time (e.g., "Your study session is starting now")
- `nudge`: Motivational/engagement notifications (future feature)

**Statuses:**
- `queued`: Pending delivery
- `sent`: Successfully delivered
- `failed`: Delivery failed (e.g., invalid token)
- `canceled`: User dismissed or plan disabled

---

## Relationships

```
users (auth.users)
  ├─> courses
  ├─> study_plans ──> study_plan_rules
  │                └─> scheduled_notifications
  └─> device_push_tokens

courses <─┐ (optional)
           │
      study_plans
           ├─> study_plan_rules (1:many)
           └─> scheduled_notifications (1:many)
```

**Key Relationships:**
1. **study_plans → courses**: Optional foreign key (ON DELETE SET NULL)
2. **study_plan_rules → study_plans**: Required (ON DELETE CASCADE)
3. **scheduled_notifications → study_plans**: Required (ON DELETE CASCADE)
4. **device_push_tokens**: Independent per-user records

---

## Indexes

### Study Plans
```sql
idx_study_plans_user_enabled_created (user_id, is_enabled, created_at)
idx_study_plans_course (course_id)
```
- Supports listing user's active plans
- Supports finding plans for a course

### Study Plan Rules
```sql
idx_study_plan_rules_plan (study_plan_id)
idx_study_plan_rules_user_plan (user_id, study_plan_id)
```
- Supports fetching all rules for a plan
- Supports user-scoped queries

### Device Push Tokens
```sql
idx_device_push_tokens_user_active (user_id, is_active)
```
- Supports fetching active tokens for notification delivery

### Scheduled Notifications
```sql
idx_scheduled_notifications_user_status_fire (user_id, status, fire_at)
idx_scheduled_notifications_plan_status_fire (study_plan_id, status, fire_at)
```
- **Critical for cron jobs**: Efficiently scans queued notifications by fire_at
- Supports user queries for upcoming notifications
- Supports plan-level notification history

---

## RLS Policies

All tables have **full CRUD RLS policies** based on `user_id = auth.uid()`.

### Special Protections

**study_plan_rules:**
```sql
INSERT CHECK: 
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM study_plans 
          WHERE id = study_plan_id AND user_id = auth.uid())
```
Prevents linking rules to another user's plan.

**scheduled_notifications:**
```sql
INSERT CHECK:
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM study_plans 
          WHERE id = study_plan_id AND user_id = auth.uid())
```
Prevents creating notifications for another user's plan.

**study_plans:**
```sql
INSERT CHECK:
  user_id = auth.uid() AND
  (course_id IS NULL OR 
   EXISTS (SELECT 1 FROM courses 
           WHERE id = course_id AND user_id = auth.uid()))
```
Prevents linking plans to another user's course.

---

## Future: How Cron Will Work

This MVP phase includes **database schema only**. Future edge functions will implement:

### Job 1: Generate Notifications (Runs Daily)

**Purpose:** Create notification records for the next 7 days based on active plans.

**Algorithm:**
1. Fetch all `study_plans` where `is_enabled = true`
2. For each plan, fetch `study_plan_rules`
3. For each rule:
   - Parse RRULE + start_time_local + timezone
   - Calculate next 7 days of occurrences in UTC
   - For each occurrence:
     - Create "reminder" notification (fire_at = occurrence - remind_before_min)
     - Create "start" notification (fire_at = occurrence)
4. Use `ON CONFLICT (user_id, study_plan_id, fire_at, type) DO NOTHING` to avoid duplicates

**Query Example:**
```sql
SELECT sp.*, spr.*
FROM study_plans sp
JOIN study_plan_rules spr ON spr.study_plan_id = sp.id
WHERE sp.is_enabled = true
  AND sp.user_id = ?
```

---

### Job 2: Send Notifications (Runs Every Minute)

**Purpose:** Deliver queued notifications whose time has come.

**Algorithm:**
1. Query notifications ready to fire:
   ```sql
   SELECT * FROM scheduled_notifications
   WHERE status = 'queued'
     AND fire_at <= now()
   ORDER BY fire_at ASC
   LIMIT 100
   ```
2. For each notification:
   - Fetch active device tokens for user_id
   - Send push notification via FCM/APNs
   - Update status to 'sent' or 'failed'
3. Log failures for retry/debugging

**Batching:**
- Process max 100 notifications per run to avoid timeouts
- If backlog exceeds capacity, increase cron frequency or add more workers

---

## Important Limitations

### iOS App-Lock Constraint

**Background:** iOS does not provide APIs to lock users into an app or enforce screen time at the OS level (outside parental controls).

**Implication:** The "Focus Session" feature in the app is a **voluntary UX** element:
- Timer countdown
- In-app navigation restrictions
- Visual cues to stay focused

**What the database does:**
- Tracks when sessions are scheduled
- Sends reminders and start notifications
- Does NOT enforce attendance or lock device

**User Behavior:**
- Users can dismiss notifications
- Users can exit the app during "Focus Session"
- Actual focus time tracking is in-app only (not OS-enforced)

---

## Testing

See: `backend/tests/sql/schedule_smoke_test.sql`

The smoke test verifies:
- ✅ User isolation (RLS policies work)
- ✅ Constraint enforcement (duration, reminders, unique notifications)
- ✅ Cross-user reference prevention
- ✅ Cascading deletes

**To run:**
```bash
psql $DATABASE_URL -f backend/tests/sql/schedule_smoke_test.sql
```

Or paste into Supabase SQL Editor.

---

## Migration Files

| File | Purpose |
|------|---------|
| `006_create_schedule_tables.sql` | Create 4 tables with constraints |
| `007_schedule_rls_policies.sql` | Enable RLS + policies for user isolation |
| `008_schedule_indexes.sql` | Add indexes for queries and cron scanning |

**Apply migrations:**
```bash
supabase db push
```

Or apply manually via Supabase Dashboard → SQL Editor.

---

## Next Steps (Future Phases)

- [ ] **Phase 2:** Edge function for notification generation (Job 1)
- [ ] **Phase 3:** Edge function for notification delivery (Job 2)
- [ ] **Phase 4:** RRULE parsing library (JavaScript or WASM)
- [ ] **Phase 5:** Push notification integration (FCM/APNs)
- [ ] **Phase 6:** Token refresh + cleanup cron
- [ ] **Phase 7:** User settings for notification preferences
- [ ] **Phase 8:** Analytics (notification open rates, session attendance)

---

## Questions / Troubleshooting

### Q: Can I have multiple rules per plan?
**A:** Yes! Create multiple `study_plan_rules` rows with the same `study_plan_id`.  
Example: Mon/Wed evenings (7pm) + Saturday mornings (9am).

### Q: What happens if I delete a course linked to a plan?
**A:** The plan's `course_id` becomes NULL (plan remains active).  
Use `ON DELETE SET NULL` to preserve schedules when courses are deleted.

### Q: What happens if I delete a plan?
**A:** All rules and notifications are deleted (ON DELETE CASCADE).

### Q: Can notifications be edited after creation?
**A:** Yes—users can update `status` to 'canceled' or reschedule by changing `fire_at`.

### Q: How do I prevent duplicate notifications?
**A:** Unique constraint: `(user_id, study_plan_id, fire_at, type)`.  
Use `ON CONFLICT DO NOTHING` in generation job.

### Q: What timezone should fire_at use?
**A:** Always UTC. Convert local times using `timezone` field during generation.

---

## References

- **iCalendar RRULE:** [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545)
- **RRULE.js (JavaScript parser):** [jkbrzt/rrule](https://github.com/jkbrzt/rrule)
- **Firebase Cloud Messaging:** [FCM Docs](https://firebase.google.com/docs/cloud-messaging)
- **Apple Push Notification Service:** [APNs Docs](https://developer.apple.com/documentation/usernotifications)

---

**Last Updated:** 2026-01-10  
**Author:** Study App Team  
**Status:** Database layer complete ✅ | Edge functions pending ⏳
