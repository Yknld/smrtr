# Push Token Implementation Summary

## Overview

Edge Function `push_token_upsert` has been successfully implemented for managing device push notification tokens.

## Files Created

### 1. Edge Function
- **Path:** `supabase/functions/push_token_upsert/index.ts`
- **Purpose:** Upsert device push tokens with RLS enforcement
- **Features:**
  - JWT authentication required
  - Platform validation (ios/android)
  - Token uniqueness enforcement
  - Automatic token transfer between users
  - Structured error responses

### 2. Configuration
- **Path:** `supabase/functions/push_token_upsert/deno.json`
- **Dependencies:** `@supabase/supabase-js@2.39.3`

### 3. Documentation
- **Path:** `backend/docs/push.md`
- **Contents:**
  - Architecture overview
  - API reference with all error codes
  - Mobile integration guide
  - Backend usage examples
  - Maintenance procedures
  - Security considerations

### 4. Tests
- **Path:** `backend/tests/push_token_upsert.test.js`
- **Coverage:**
  - Insert new token
  - Update existing token (no duplicates)
  - Database verification
  - Error handling (unauthorized, invalid platform, missing token)
  - Automatic cleanup

### 5. Manual Testing Guide
- **Path:** `backend/tests/push_token_upsert.curl.md`
- **Contents:**
  - curl examples for all test cases
  - Expected responses
  - Database verification queries

## Database Schema

The function uses the existing `device_push_tokens` table from migration `006_create_schedule_tables.sql`:

```sql
CREATE TABLE device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  push_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NULL
);
```

**RLS Policies** (from `007_schedule_rls_policies.sql`):
- Users can only view/insert/update/delete their own tokens
- `user_id` derived from `auth.uid()`, never from client input

## API Specification

### Endpoint
```
POST /functions/v1/push_token_upsert
```

### Request
```json
{
  "platform": "ios" | "android",
  "push_token": "string"
}
```

### Success Response (200)
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7f3c4a89-1234-5678-9abc-def012345678"
}
```

### Error Response (4xx/5xx)
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid Authorization header |
| `INVALID_REQUEST` | 400 | Request body is not valid JSON |
| `INVALID_PLATFORM` | 400 | Platform must be 'ios' or 'android' |
| `INVALID_TOKEN` | 400 | push_token is missing or empty |
| `DATABASE_ERROR` | 500 | Failed to query database |
| `UPDATE_FAILED` | 500 | Failed to update existing token |
| `INSERT_FAILED` | 500 | Failed to insert new token |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Behavior

### Token Uniqueness
- `push_token` is globally unique across all users
- If a token already exists:
  - Updates `user_id` (transfers ownership)
  - Updates `platform`
  - Sets `is_active = true`
  - Updates `last_seen_at = now()`
- If token is new:
  - Inserts new row with current user's `user_id`

### Use Cases

#### 1. Login
Mobile app calls on successful login:
```typescript
await registerPushToken(accessToken);
```

#### 2. Heartbeat (Optional)
Periodic calls to keep token active:
```typescript
// On app foreground or daily
await registerPushToken(accessToken);
```

#### 3. Device Transfer
If device is reset and new user logs in:
- Same push token automatically transfers to new user
- No duplicates created

## Deployment

### Deploy Function
```bash
cd supabase/functions
supabase functions deploy push_token_upsert --no-verify-jwt
```

Or use the deploy script:
```bash
cd supabase/functions
./deploy.sh
```

### Verify Deployment
```bash
# Get user token
cd backend/tests
node get-token.js user@example.com password

# Test function
curl -X POST https://your-project.supabase.co/functions/v1/push_token_upsert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"platform":"ios","push_token":"test-token-123"}'
```

## Testing

### Automated Tests
```bash
cd backend/tests
npm install  # If not already done
node push_token_upsert.test.js
```

**Tests include:**
- ✅ Insert new token
- ✅ Update existing token (no duplicates)
- ✅ Verify database state
- ✅ Error: Missing Authorization
- ✅ Error: Invalid platform
- ✅ Error: Missing push_token
- ✅ Automatic cleanup

### Manual Testing
See `backend/tests/push_token_upsert.curl.md` for curl examples.

## Security

### Authentication
- Requires `Authorization: Bearer <JWT>` header
- JWT validated using Supabase auth
- User ID derived from `auth.uid()`, not client input

### Authorization
- RLS policies enforce user isolation
- Users can only manage their own tokens
- Function uses user's JWT for all database operations

### Data Protection
- Push tokens are not sensitive credentials
- Safe to store in plaintext
- Useless without backend infrastructure (FCM/APNs)

## Integration with Notifications

When sending push notifications (separate service):

```sql
-- Get active tokens for a user
SELECT push_token, platform
FROM device_push_tokens
WHERE user_id = '<user_id>'
  AND is_active = true;
```

Then use appropriate SDK:
- **iOS:** APNs with the `push_token`
- **Android:** FCM with the `push_token`

## Maintenance

### Cleanup Inactive Tokens

```sql
-- Mark tokens inactive if not seen in 90 days
UPDATE device_push_tokens
SET is_active = false
WHERE last_seen_at < now() - interval '90 days'
  AND is_active = true;

-- Delete very old inactive tokens
DELETE FROM device_push_tokens
WHERE is_active = false
  AND last_seen_at < now() - interval '180 days';
```

### Monitor Token Activity

```sql
-- Count active tokens per user
SELECT user_id, COUNT(*) as token_count
FROM device_push_tokens
WHERE is_active = true
GROUP BY user_id
ORDER BY token_count DESC;

-- Find stale tokens
SELECT user_id, platform, last_seen_at
FROM device_push_tokens
WHERE is_active = true
  AND last_seen_at < now() - interval '30 days'
ORDER BY last_seen_at;
```

## Next Steps

1. ✅ Edge Function implemented
2. ✅ Tests created
3. ✅ Documentation written
4. ⏭️ Deploy to production
5. ⏭️ Integrate with mobile app
6. ⏭️ Implement notification sending service
7. ⏭️ Set up token cleanup cron job

## References

- **API Docs:** `backend/docs/push.md`
- **Tests:** `backend/tests/push_token_upsert.test.js`
- **Manual Testing:** `backend/tests/push_token_upsert.curl.md`
- **Function Code:** `supabase/functions/push_token_upsert/index.ts`
- **Database Schema:** `supabase/migrations/006_create_schedule_tables.sql`
- **RLS Policies:** `supabase/migrations/007_schedule_rls_policies.sql`
