# Push Notification Token Management

## Overview

The `push_token_upsert` Edge Function manages device push notification tokens for mobile clients. It allows devices to register their FCM (Firebase Cloud Messaging) or APNs (Apple Push Notification service) tokens, enabling the backend to send push notifications.

## Architecture

### Flow

```
Mobile App (on login/heartbeat)
  ↓
  POST /functions/v1/push_token_upsert
  Headers: Authorization: Bearer <JWT>
  Body: { platform, push_token }
  ↓
  Edge Function validates JWT → RLS enforced
  ↓
  Upserts into device_push_tokens table
  ↓
  Returns { ok: true, id, user_id }
```

### Database Table

The `device_push_tokens` table (created in migration `006_create_schedule_tables.sql`):

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

**Key Points:**
- `push_token` is globally unique across all users
- If a device switches users (e.g., device is reset and signed in with a different account), the token ownership transfers
- `is_active` flag allows soft-deletion without removing the record
- `last_seen_at` tracks when the token was last verified (useful for cleanup)

### Row-Level Security (RLS)

RLS policies (from migration `007_schedule_rls_policies.sql`) ensure:
- Users can only view, insert, update, and delete their own tokens
- User ID is derived from `auth.uid()`, not client input
- No user can see another user's tokens

## API Reference

### Endpoint

```
POST /functions/v1/push_token_upsert
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
  "platform": "ios" | "android",
  "push_token": "string"
}
```

**Field Validation:**
- `platform`: Required. Must be exactly `"ios"` or `"android"`
- `push_token`: Required. Non-empty string. This is the device token from FCM or APNs

### Response

**Success (200 OK):**
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7f3c4a89-1234-5678-9abc-def012345678"
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
| `INVALID_PLATFORM` | 400 | Platform must be 'ios' or 'android' |
| `INVALID_TOKEN` | 400 | push_token is missing or empty |
| `DATABASE_ERROR` | 500 | Failed to query database |
| `UPDATE_FAILED` | 500 | Failed to update existing token |
| `INSERT_FAILED` | 500 | Failed to insert new token |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Usage in Mobile App

### On Login

When a user successfully logs in, the mobile app should:
1. Obtain the device push token from the platform SDK (FCM for Android, APNs for iOS)
2. Call `push_token_upsert` with the user's JWT and the device token
3. Store the returned `id` locally (optional, for debugging)

**Example (pseudo-code):**

```typescript
async function registerPushToken(accessToken: string) {
  // Get platform-specific token
  const deviceToken = await getPlatformPushToken(); // From FCM/APNs SDK
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  // Register with backend
  const response = await fetch(
    'https://[your-project].supabase.co/functions/v1/push_token_upsert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        push_token: deviceToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to register push token:', error);
    throw new Error(error.error?.message || 'Failed to register token');
  }

  const data = await response.json();
  console.log('Push token registered:', data.id);
}
```

### Periodic Heartbeat (Optional)

To ensure tokens remain active and to detect stale tokens:
1. Call `push_token_upsert` periodically (e.g., daily or on app foreground)
2. This updates `last_seen_at` and re-activates the token if it was marked inactive

**Benefits:**
- Detects token changes (iOS tokens can be rotated by the OS)
- Allows backend to identify inactive devices for cleanup
- Ensures `last_seen_at` is current for analytics

### Token Transfer

If a device is factory reset and a user logs in with a different account:
- The same push token will now be associated with the new user
- The Edge Function automatically transfers ownership by updating `user_id`
- This prevents duplicate tokens and ensures notifications go to the correct user

## Backend Usage (Sending Notifications)

When sending push notifications (from a separate notification service or Edge Function):

```sql
-- Get active tokens for a user
SELECT push_token, platform
FROM device_push_tokens
WHERE user_id = '<user_id>'
  AND is_active = true;
```

Then use the appropriate SDK:
- **iOS**: APNs with the `push_token`
- **Android**: FCM with the `push_token`

## Maintenance

### Cleanup Inactive Tokens

Periodically (e.g., monthly cron job), remove tokens that haven't been seen recently:

```sql
-- Mark tokens inactive if not seen in 90 days
UPDATE device_push_tokens
SET is_active = false
WHERE last_seen_at < now() - interval '90 days'
  AND is_active = true;

-- Delete very old inactive tokens (optional)
DELETE FROM device_push_tokens
WHERE is_active = false
  AND last_seen_at < now() - interval '180 days';
```

### Handle Invalid Tokens

If FCM/APNs reports a token as invalid:
1. Mark it as inactive in the database
2. The next heartbeat will either:
   - Re-activate it if still valid
   - Register a new token if the device received a new one

## Security Considerations

1. **User ID from JWT**: The function derives `user_id` from `auth.uid()`, never from client input. This prevents token hijacking.

2. **RLS Enforcement**: Using the user's JWT as the Supabase client ensures all database operations are subject to RLS policies.

3. **Token Uniqueness**: The `UNIQUE` constraint on `push_token` prevents duplicates and enables token transfer between users.

4. **No Sensitive Data**: Push tokens are safe to store in plaintext; they're not authentication credentials and are useless without backend infrastructure.

## Testing

See `backend/tests/push_token_upsert.test.js` for automated tests.

Manual test with `curl`:

```bash
# 1. Get a user token
node backend/tests/get-token.js user@example.com password123

# 2. Register a token (first call)
curl -X POST https://[your-project].supabase.co/functions/v1/push_token_upsert \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": "test-device-token-123456789"
  }'

# 3. Register the same token again (should update, not create duplicate)
curl -X POST https://[your-project].supabase.co/functions/v1/push_token_upsert \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": "test-device-token-123456789"
  }'

# 4. Verify in database
# Should see only ONE row with updated last_seen_at
```

## Future Enhancements

1. **Token Validation**: Optionally validate tokens against FCM/APNs before storing (adds latency)
2. **Device Metadata**: Store device model, OS version, app version for debugging
3. **Multi-Device Support**: Track multiple tokens per user (already supported via uniqueness on push_token)
4. **Analytics**: Track token lifecycle (created, updated, expired) for insights
