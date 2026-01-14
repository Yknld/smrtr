# Study Plan API Documentation

## Overview

The `study_plan_upsert` Edge Function provides atomic create/update operations for study plans and their recurrence rules. This ensures data consistency when managing schedules.

## Architecture

### Flow

```
Mobile App
  ↓
  POST /functions/v1/study_plan_upsert
  Headers: Authorization: Bearer <JWT>
  Body: { plan, rules }
  ↓
  Edge Function validates JWT → RLS enforced
  ↓
  Upsert plan (create or update)
  ↓
  Replace rules (delete old + insert new)
  ↓
  Returns { plan, rules }
```

### Database Tables

#### study_plans

```sql
CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NULL REFERENCES courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (auto-generated if not provided)
- `user_id`: Owner (derived from `auth.uid()`, never from client)
- `course_id`: Optional link to a course (NULL for general schedules)
- `title`: Display name for the plan
- `timezone`: IANA timezone (e.g., "America/Toronto", "Europe/London")
- `is_enabled`: If false, no notifications are generated
- `created_at`: Timestamp when plan was created

#### study_plan_rules

```sql
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
```

**Fields:**
- `id`: Unique identifier (auto-generated)
- `user_id`: Owner (derived from `auth.uid()`)
- `study_plan_id`: Parent plan (CASCADE delete)
- `rrule`: iCalendar RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
- `start_time_local`: Local time of day (e.g., "19:00:00")
- `duration_min`: Session duration in minutes (5-600)
- `remind_before_min`: Minutes before session to send reminder (0-120)
- `created_at`: Timestamp when rule was created

### Row-Level Security (RLS)

RLS policies (from migration `007_schedule_rls_policies.sql`) ensure:
- Users can only view, insert, update, and delete their own plans and rules
- User ID is derived from `auth.uid()`, not client input
- Course references are validated (user must own the course)

## API Reference

### Endpoint

```
POST /functions/v1/study_plan_upsert
```

### Request

**Headers:**
```
Authorization: Bearer <Supabase JWT access token>
Content-Type: application/json
```

**Body:**
```json
{
  "plan": {
    "id": "uuid (optional - if provided, updates existing plan)",
    "course_id": "uuid | null (optional - link to course)",
    "title": "string (required)",
    "timezone": "string (optional - defaults to America/Toronto)",
    "is_enabled": "boolean (optional - defaults to true)"
  },
  "rules": [
    {
      "id": "uuid (optional - ignored, always replaced)",
      "rrule": "string (required - iCal RRULE format)",
      "start_time_local": "HH:MM or HH:MM:SS (required)",
      "duration_min": "number (optional - defaults to 45)",
      "remind_before_min": "number (optional - defaults to 10)"
    }
  ]
}
```

**Field Details:**

- **plan.id**: If provided, updates existing plan. If omitted, creates new plan.
- **plan.course_id**: Optional UUID linking to a course. Can be `null` for general schedules.
- **plan.title**: Display name (e.g., "Morning Study", "CS101 Review")
- **plan.timezone**: IANA timezone identifier (e.g., "America/New_York", "Asia/Tokyo")
- **plan.is_enabled**: If false, plan is disabled (no notifications generated)
- **rules**: Array of recurrence rules. Can be empty `[]` for plans without schedules.
- **rules[].rrule**: iCalendar RRULE (e.g., "FREQ=DAILY", "FREQ=WEEKLY;BYDAY=MO,WE,FR")
- **rules[].start_time_local**: Local time in 24-hour format (e.g., "19:00" or "19:00:00")
- **rules[].duration_min**: Session duration (5-600 minutes)
- **rules[].remind_before_min**: Reminder time before session (0-120 minutes)

### Response

**Success (200 OK):**
```json
{
  "plan": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7f3c4a89-1234-5678-9abc-def012345678",
    "course_id": "8a4d5b90-2345-6789-abcd-ef0123456789",
    "title": "Morning Study",
    "timezone": "America/Toronto",
    "is_enabled": true,
    "created_at": "2026-01-10T12:00:00Z"
  },
  "rules": [
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "user_id": "7f3c4a89-1234-5678-9abc-def012345678",
      "study_plan_id": "550e8400-e29b-41d4-a716-446655440000",
      "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      "start_time_local": "19:00:00",
      "duration_min": 60,
      "remind_before_min": 15,
      "created_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

**Error (4xx/5xx):**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid Authorization header |
| `INVALID_REQUEST` | 400 | Request body is not valid JSON |
| `INVALID_PLAN` | 400 | plan object is missing or invalid |
| `INVALID_TITLE` | 400 | plan.title is missing or empty |
| `INVALID_RULES` | 400 | rules must be an array |
| `INVALID_RRULE` | 400 | Rule rrule is missing or empty |
| `INVALID_START_TIME` | 400 | Rule start_time_local is missing or invalid |
| `INVALID_TIME_FORMAT` | 400 | start_time_local must be HH:MM or HH:MM:SS |
| `PLAN_NOT_FOUND` | 404 | Study plan not found or access denied |
| `UPDATE_PLAN_FAILED` | 500 | Failed to update study plan |
| `CREATE_PLAN_FAILED` | 500 | Failed to create study plan |
| `INSERT_RULES_FAILED` | 500 | Failed to insert study plan rules |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Usage Examples

### Example 1: Create New Plan with Rules

```bash
curl -X POST https://your-project.supabase.co/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": {
      "title": "Morning Study",
      "timezone": "America/Toronto",
      "is_enabled": true
    },
    "rules": [
      {
        "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        "start_time_local": "19:00",
        "duration_min": 60,
        "remind_before_min": 15
      }
    ]
  }'
```

### Example 2: Create Plan Linked to Course

```bash
curl -X POST https://your-project.supabase.co/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": {
      "course_id": "8a4d5b90-2345-6789-abcd-ef0123456789",
      "title": "CS101 Review Sessions",
      "timezone": "America/New_York"
    },
    "rules": [
      {
        "rrule": "FREQ=WEEKLY;BYDAY=TU,TH",
        "start_time_local": "14:00",
        "duration_min": 90,
        "remind_before_min": 30
      }
    ]
  }'
```

### Example 3: Update Existing Plan

```bash
# First, get the plan ID from a previous response or query
PLAN_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST https://your-project.supabase.co/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan\": {
      \"id\": \"$PLAN_ID\",
      \"title\": \"Updated Morning Study\",
      \"is_enabled\": false
    },
    \"rules\": []
  }"
```

**Note:** Updating a plan replaces ALL rules. To keep existing rules, you must include them in the request.

### Example 4: Create Plan with Multiple Rules

```bash
curl -X POST https://your-project.supabase.co/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": {
      "title": "Intensive Study Week",
      "timezone": "America/Los_Angeles"
    },
    "rules": [
      {
        "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        "start_time_local": "09:00",
        "duration_min": 120,
        "remind_before_min": 30
      },
      {
        "rrule": "FREQ=WEEKLY;BYDAY=TU,TH",
        "start_time_local": "14:00",
        "duration_min": 90,
        "remind_before_min": 15
      },
      {
        "rrule": "FREQ=WEEKLY;BYDAY=SA",
        "start_time_local": "10:00",
        "duration_min": 180,
        "remind_before_min": 60
      }
    ]
  }'
```

### Example 5: Create Plan Without Rules

```bash
curl -X POST https://your-project.supabase.co/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": {
      "title": "Flexible Study Plan",
      "timezone": "Europe/London"
    },
    "rules": []
  }'
```

## Reading Plans Back

### Using Supabase Client (JavaScript/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in first
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Get all plans for the user
const { data: plans, error } = await supabase
  .from('study_plans')
  .select(`
    *,
    rules:study_plan_rules(*)
  `)
  .order('created_at', { ascending: false });

console.log('Plans:', plans);
// [
//   {
//     id: "...",
//     title: "Morning Study",
//     timezone: "America/Toronto",
//     is_enabled: true,
//     rules: [
//       { rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR", start_time_local: "19:00:00", ... }
//     ]
//   }
// ]
```

### Get Single Plan with Rules

```typescript
const planId = "550e8400-e29b-41d4-a716-446655440000";

const { data: plan, error } = await supabase
  .from('study_plans')
  .select(`
    *,
    rules:study_plan_rules(*)
  `)
  .eq('id', planId)
  .single();

console.log('Plan:', plan);
```

### Get Plans for a Specific Course

```typescript
const courseId = "8a4d5b90-2345-6789-abcd-ef0123456789";

const { data: plans, error } = await supabase
  .from('study_plans')
  .select(`
    *,
    rules:study_plan_rules(*),
    course:courses(id, title)
  `)
  .eq('course_id', courseId)
  .order('created_at', { ascending: false });

console.log('Course Plans:', plans);
```

### Get Only Enabled Plans

```typescript
const { data: activePlans, error } = await supabase
  .from('study_plans')
  .select(`
    *,
    rules:study_plan_rules(*)
  `)
  .eq('is_enabled', true)
  .order('created_at', { ascending: false });

console.log('Active Plans:', activePlans);
```

## RRULE Format

Rules use the iCalendar RRULE format (RFC 5545). Common patterns:

### Daily
```
FREQ=DAILY
```
Every day.

### Weekdays Only
```
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
```
Monday through Friday.

### Specific Days
```
FREQ=WEEKLY;BYDAY=MO,WE,FR
```
Monday, Wednesday, Friday.

### Every Other Week
```
FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH
```
Tuesday and Thursday, every other week.

### Monthly
```
FREQ=MONTHLY;BYMONTHDAY=1,15
```
1st and 15th of each month.

### With End Date
```
FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z
```
Monday, Wednesday, Friday until December 31, 2026.

### With Count
```
FREQ=WEEKLY;BYDAY=TU;COUNT=10
```
Tuesday, for 10 occurrences.

**Resources:**
- [RFC 5545 (iCalendar)](https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.10)
- [RRULE Tool](https://icalendar.org/rrule-tool.html) - Interactive RRULE generator

## Timezone Handling

Study plans use IANA timezone identifiers (e.g., "America/Toronto", "Europe/London").

**Important:**
- `start_time_local` is in the plan's local timezone
- Backend will compute UTC timestamps for notifications using the timezone
- Daylight Saving Time (DST) is handled automatically

**Example:**
```json
{
  "plan": {
    "timezone": "America/New_York",
    ...
  },
  "rules": [
    {
      "start_time_local": "19:00",  // 7 PM Eastern Time
      ...
    }
  ]
}
```

In winter (EST), this is 00:00 UTC.
In summer (EDT), this is 23:00 UTC.

## Mobile Integration

### Create Plan

```typescript
async function createStudyPlan(
  accessToken: string,
  title: string,
  rules: Array<{ rrule: string; start_time_local: string; duration_min?: number }>
) {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/study_plan_upsert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: {
          title,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Device timezone
        },
        rules,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create plan');
  }

  return await response.json();
}

// Usage
const result = await createStudyPlan(
  accessToken,
  'Morning Study',
  [
    {
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      start_time_local: '19:00',
      duration_min: 60,
    }
  ]
);

console.log('Created plan:', result.plan.id);
```

### Update Plan

```typescript
async function updateStudyPlan(
  accessToken: string,
  planId: string,
  updates: { title?: string; is_enabled?: boolean },
  rules: Array<{ rrule: string; start_time_local: string; duration_min?: number }>
) {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/study_plan_upsert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: {
          id: planId,
          ...updates,
        },
        rules,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update plan');
  }

  return await response.json();
}

// Usage: Disable a plan
await updateStudyPlan(
  accessToken,
  planId,
  { is_enabled: false },
  [] // Keep rules empty or include existing rules
);
```

### Delete Plan

Plans can be deleted directly via Supabase client (rules cascade):

```typescript
const { error } = await supabase
  .from('study_plans')
  .delete()
  .eq('id', planId);
```

## Security Considerations

1. **User ID from JWT**: The function derives `user_id` from `auth.uid()`, never from client input.

2. **RLS Enforcement**: Using the user's JWT ensures all database operations are subject to RLS policies.

3. **Course Validation**: RLS policies verify that `course_id` references a course owned by the user.

4. **Atomic Operations**: Plan and rules are updated in sequence. If rules fail, the plan is still updated (eventual consistency).

5. **Rule Replacement**: Old rules are deleted before inserting new ones, preventing orphaned rules.

## Best Practices

### 1. Always Include Existing Rules When Updating

When updating a plan, include all rules you want to keep:

```typescript
// ❌ BAD: This will delete all rules
await updatePlan(planId, { title: 'New Title' }, []);

// ✅ GOOD: Fetch existing rules first
const { data: plan } = await supabase
  .from('study_plans')
  .select('*, rules:study_plan_rules(*)')
  .eq('id', planId)
  .single();

await updatePlan(planId, { title: 'New Title' }, plan.rules);
```

### 2. Validate RRULE Before Sending

Use a library like `rrule` to validate RRULE strings:

```typescript
import { RRule } from 'rrule';

try {
  RRule.fromString('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  // Valid
} catch (error) {
  // Invalid RRULE
}
```

### 3. Use Device Timezone

Always use the device's timezone for better UX:

```typescript
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await createStudyPlan(...);
} catch (error) {
  if (error.message.includes('INVALID_RRULE')) {
    // Show user-friendly message about invalid schedule
  } else if (error.message.includes('UNAUTHORIZED')) {
    // Redirect to login
  } else {
    // Generic error
  }
}
```

## Troubleshooting

### "Plan not found or access denied"
- Verify the plan ID is correct
- Ensure the plan belongs to the authenticated user
- Check JWT token is valid

### "Failed to insert study plan rules"
- Check RRULE format is valid
- Verify time format is HH:MM or HH:MM:SS
- Ensure duration_min is between 5 and 600
- Ensure remind_before_min is between 0 and 120

### "Invalid or expired token"
- Token may have expired (default: 1 hour)
- Refresh the session: `await supabase.auth.refreshSession()`

### Rules Not Updating
- Remember: updating a plan replaces ALL rules
- Always include existing rules you want to keep

## Future Enhancements

1. **Partial Rule Updates**: Support updating individual rules without replacing all
2. **Rule Validation**: Server-side RRULE parsing and validation
3. **Conflict Detection**: Warn about overlapping schedules
4. **Bulk Operations**: Create/update multiple plans in one call
5. **Soft Delete**: Archive plans instead of deleting

## References

- **Function Code:** `supabase/functions/study_plan_upsert/index.ts`
- **Database Schema:** `supabase/migrations/006_create_schedule_tables.sql`
- **RLS Policies:** `supabase/migrations/007_schedule_rls_policies.sql`
- **RRULE Spec:** [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.10)
