# Manual Testing with curl - study_plan_upsert

Quick reference for testing `study_plan_upsert` Edge Function with curl.

## Setup

### 1. Get a User Token

```bash
cd backend/tests
node get-token.js user1@test.com password123
```

Copy the access token from the output.

### 2. Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Test Cases

### Test 1: Create New Study Plan with Rules

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
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

**Expected Response:**
```json
{
  "plan": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7f3c4a89-1234-5678-9abc-def012345678",
    "course_id": null,
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

**Save the plan ID for next tests:**
```bash
export PLAN_ID="550e8400-e29b-41d4-a716-446655440000"
```

### Test 2: Read Plan Back via Supabase Client

Using Node.js:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Read plan with rules
const { data: plan, error } = await supabase
  .from('study_plans')
  .select(`
    *,
    rules:study_plan_rules(*)
  `)
  .eq('id', PLAN_ID)
  .single();

console.log('Plan:', plan);
```

Or using SQL in Supabase SQL Editor:

```sql
SELECT 
  sp.*,
  json_agg(spr.*) as rules
FROM study_plans sp
LEFT JOIN study_plan_rules spr ON spr.study_plan_id = sp.id
WHERE sp.id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY sp.id;
```

### Test 3: Update Existing Plan (Change Title)

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan\": {
      \"id\": \"$PLAN_ID\",
      \"title\": \"Updated Morning Study\",
      \"is_enabled\": true
    },
    \"rules\": [
      {
        \"rrule\": \"FREQ=WEEKLY;BYDAY=MO,WE,FR\",
        \"start_time_local\": \"19:00\",
        \"duration_min\": 60,
        \"remind_before_min\": 15
      }
    ]
  }"
```

**Expected:**
- Same plan ID returned
- Title updated to "Updated Morning Study"
- Rules remain the same (1 rule)

### Test 4: Replace Rules (Update Plan with Different Rules)

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan\": {
      \"id\": \"$PLAN_ID\",
      \"title\": \"Updated Morning Study\"
    },
    \"rules\": [
      {
        \"rrule\": \"FREQ=DAILY\",
        \"start_time_local\": \"08:00\",
        \"duration_min\": 30,
        \"remind_before_min\": 5
      },
      {
        \"rrule\": \"FREQ=DAILY\",
        \"start_time_local\": \"20:00\",
        \"duration_min\": 45,
        \"remind_before_min\": 10
      }
    ]
  }"
```

**Expected:**
- Same plan ID
- Old rule deleted
- 2 new rules inserted

### Test 5: Create Plan Without Rules

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": {
      "title": "Flexible Study Plan",
      "timezone": "Europe/London"
    },
    "rules": []
  }'
```

**Expected:**
- New plan created
- Empty rules array returned

### Test 6: Create Plan with Multiple Rules

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
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

**Expected:**
- New plan created
- 3 rules inserted

### Test 7: Disable a Plan

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan\": {
      \"id\": \"$PLAN_ID\",
      \"is_enabled\": false
    },
    \"rules\": []
  }"
```

**Expected:**
- Plan disabled (`is_enabled: false`)
- All rules deleted (empty rules array)

### Test 8: Error - Missing Authorization

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Content-Type: application/json" \
  -d '{
    "plan": { "title": "Test" },
    "rules": []
  }'
```

**Expected Response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization header is required"
  }
}
```

### Test 9: Error - Missing Title

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": { "timezone": "America/Toronto" },
    "rules": []
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_TITLE",
    "message": "plan.title is required and must be a non-empty string"
  }
}
```

### Test 10: Error - Invalid RRULE (Missing)

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": { "title": "Test" },
    "rules": [
      {
        "start_time_local": "19:00"
      }
    ]
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_RRULE",
    "message": "Rule at index 0: rrule is required and must be a non-empty string"
  }
}
```

### Test 11: Error - Invalid Time Format

```bash
curl -X POST $SUPABASE_URL/functions/v1/study_plan_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": { "title": "Test" },
    "rules": [
      {
        "rrule": "FREQ=DAILY",
        "start_time_local": "25:00"
      }
    ]
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_TIME_FORMAT",
    "message": "Rule at index 0: start_time_local must be in HH:MM or HH:MM:SS format"
  }
}
```

## Verify in Database

After running tests, check the database:

### View All Plans for User

```sql
SELECT 
  sp.id,
  sp.title,
  sp.timezone,
  sp.is_enabled,
  COUNT(spr.id) as rule_count
FROM study_plans sp
LEFT JOIN study_plan_rules spr ON spr.study_plan_id = sp.id
WHERE sp.user_id = '<user_id_from_response>'
GROUP BY sp.id
ORDER BY sp.created_at DESC;
```

### View Plan with Rules

```sql
SELECT 
  sp.*,
  json_agg(
    json_build_object(
      'id', spr.id,
      'rrule', spr.rrule,
      'start_time_local', spr.start_time_local,
      'duration_min', spr.duration_min,
      'remind_before_min', spr.remind_before_min
    )
  ) as rules
FROM study_plans sp
LEFT JOIN study_plan_rules spr ON spr.study_plan_id = sp.id
WHERE sp.id = '<plan_id>'
GROUP BY sp.id;
```

### Check for Orphaned Rules

```sql
-- Should return 0 rows (all rules should have valid study_plan_id)
SELECT * FROM study_plan_rules
WHERE study_plan_id NOT IN (SELECT id FROM study_plans);
```

## Cleanup

Delete test plans:

```sql
-- Delete specific plan (rules cascade)
DELETE FROM study_plans WHERE id = '<plan_id>';

-- Delete all test plans
DELETE FROM study_plans WHERE title LIKE 'Test%' OR title LIKE '%Test%';
```

Or use the automated test:

```bash
cd backend/tests
npm install
node study_plan_upsert.test.js
```

The automated test cleans up after itself.

## Common RRULE Examples

### Daily
```json
{ "rrule": "FREQ=DAILY" }
```

### Weekdays Only
```json
{ "rrule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" }
```

### Specific Days
```json
{ "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR" }
```

### Every Other Week
```json
{ "rrule": "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH" }
```

### Monthly
```json
{ "rrule": "FREQ=MONTHLY;BYMONTHDAY=1,15" }
```

### With End Date
```json
{ "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z" }
```

### With Count
```json
{ "rrule": "FREQ=WEEKLY;BYDAY=TU;COUNT=10" }
```

## Time Format

Both formats are accepted and normalized to HH:MM:SS:

```json
"start_time_local": "19:00"     // Normalized to 19:00:00
"start_time_local": "19:00:00"  // Already normalized
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

### Rules Not Updating
- Remember: updating a plan replaces ALL rules
- Always include existing rules you want to keep
- To remove all rules, pass empty array: `"rules": []`
