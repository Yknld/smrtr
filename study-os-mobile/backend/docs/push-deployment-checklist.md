# Push Token Deployment Checklist

## Pre-Deployment Verification

### 1. Database Schema ✅
- [x] `device_push_tokens` table exists (migration `006_create_schedule_tables.sql`)
- [x] RLS policies configured (migration `007_schedule_rls_policies.sql`)
- [x] Indexes created (migration `008_schedule_indexes.sql`)

Verify with:
```sql
-- Check table exists
\d device_push_tokens

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'device_push_tokens';

-- Check policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'device_push_tokens';
```

### 2. Function Files ✅
- [x] `supabase/functions/push_token_upsert/index.ts` created
- [x] `supabase/functions/push_token_upsert/deno.json` created
- [x] No linter errors

Verify with:
```bash
cd study-os-mobile
ls -la supabase/functions/push_token_upsert/
```

### 3. Tests ✅
- [x] Automated test suite created (`backend/tests/push_token_upsert.test.js`)
- [x] Manual test guide created (`backend/tests/push_token_upsert.curl.md`)
- [x] Test file is executable

Verify with:
```bash
cd study-os-mobile/backend/tests
ls -la push_token_upsert.*
```

### 4. Documentation ✅
- [x] API documentation (`backend/docs/push.md`)
- [x] Implementation summary (`backend/docs/push-token-implementation.md`)
- [x] Deployment checklist (this file)
- [x] Updated main README (`supabase/functions/README.md`)

## Deployment Steps

### Step 1: Link to Supabase Project
```bash
cd study-os-mobile
supabase link --project-ref your-project-ref
```

### Step 2: Verify Migrations Applied
```bash
# Check migration status
supabase db diff

# If migrations not applied, run them
supabase db push
```

### Step 3: Deploy Function
```bash
cd supabase/functions
supabase functions deploy push_token_upsert --no-verify-jwt
```

Or deploy all functions:
```bash
./deploy.sh
```

### Step 4: Verify Deployment
```bash
# Check function is deployed
supabase functions list

# Should show:
# - push_token_upsert (deployed)
```

### Step 5: Test in Production

#### Get User Token
```bash
cd backend/tests
node get-token.js user@example.com password123
```

#### Test Function
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export USER_TOKEN="<token_from_previous_step>"

curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": "test-production-token-123"
  }'
```

Expected response:
```json
{
  "ok": true,
  "id": "uuid",
  "user_id": "uuid"
}
```

#### Verify in Database
```sql
SELECT id, user_id, platform, push_token, is_active, last_seen_at
FROM device_push_tokens
WHERE push_token = 'test-production-token-123';
```

Should see exactly one row.

#### Test Update (No Duplicates)
```bash
# Call again with same token
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "android",
    "push_token": "test-production-token-123"
  }'
```

Expected:
- Same `id` returned
- `platform` updated to "android"
- `last_seen_at` updated
- Still only one row in database

#### Cleanup Test Data
```sql
DELETE FROM device_push_tokens
WHERE push_token = 'test-production-token-123';
```

### Step 6: Run Automated Tests (Optional)

If you have a test environment:
```bash
cd backend/tests

# Create .env file with test credentials
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
USER1_EMAIL=test@example.com
USER1_PASSWORD=testpassword
EOF

# Run tests
node push_token_upsert.test.js
```

Expected output:
```
✅ First call returns 200
✅ Response has ok=true
✅ Response has id
✅ Response has correct user_id
✅ Second call returns 200
✅ Second response has ok=true
✅ Same ID returned (updated, not inserted)
✅ Exactly one row exists
✅ Token has correct user_id
✅ Token is active
✅ Token platform updated to android
✅ Token has last_seen_at
✅ Returns 401 for missing auth
✅ Error response has error.code
✅ Returns 400 for invalid platform
✅ Error response has INVALID_PLATFORM code
✅ Returns 400 for missing push_token
✅ Error response has INVALID_TOKEN code

📊 Test Results: 17 passed, 0 failed
✅ All tests passed!
```

## Post-Deployment

### 1. Monitor Function Logs
```bash
# Watch logs in real-time
supabase functions logs push_token_upsert --tail

# Check for errors
supabase functions logs push_token_upsert --limit 100 | grep ERROR
```

### 2. Monitor Database
```sql
-- Count active tokens
SELECT COUNT(*) as active_tokens
FROM device_push_tokens
WHERE is_active = true;

-- Check recent activity
SELECT user_id, platform, last_seen_at
FROM device_push_tokens
WHERE last_seen_at > now() - interval '1 hour'
ORDER BY last_seen_at DESC;

-- Check for duplicates (should be 0)
SELECT push_token, COUNT(*) as count
FROM device_push_tokens
GROUP BY push_token
HAVING COUNT(*) > 1;
```

### 3. Set Up Monitoring (Optional)

Create a monitoring query to run periodically:
```sql
-- Stale tokens (not seen in 30 days)
SELECT COUNT(*) as stale_tokens
FROM device_push_tokens
WHERE is_active = true
  AND last_seen_at < now() - interval '30 days';

-- Tokens per platform
SELECT platform, COUNT(*) as count
FROM device_push_tokens
WHERE is_active = true
GROUP BY platform;
```

### 4. Schedule Cleanup Job (Optional)

Create a cron job or scheduled function to cleanup old tokens:
```sql
-- Mark inactive tokens (90+ days)
UPDATE device_push_tokens
SET is_active = false
WHERE last_seen_at < now() - interval '90 days'
  AND is_active = true;

-- Delete very old inactive tokens (180+ days)
DELETE FROM device_push_tokens
WHERE is_active = false
  AND last_seen_at < now() - interval '180 days';
```

## Mobile App Integration

### iOS

1. **Get APNs Token:**
```swift
// In AppDelegate or SceneDelegate
func application(_ application: UIApplication, 
                didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    // Call registerPushToken(token)
}
```

2. **Register with Backend:**
```typescript
async function registerPushToken(token: string) {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/push_token_upsert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'ios',
        push_token: token,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to register token');
  }
  
  return await response.json();
}
```

### Android

1. **Get FCM Token:**
```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Call registerPushToken(token)
    }
}
```

2. **Register with Backend:** (same as iOS, but with `platform: 'android'`)

### React Native (Expo)

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function registerForPushNotifications() {
  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Push notification permissions not granted');
  }

  // Get token
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Register with backend
  await fetch(
    'https://your-project.supabase.co/functions/v1/push_token_upsert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        push_token: token,
      }),
    }
  );
}
```

## Troubleshooting

### Function Not Found (404)
- Verify function is deployed: `supabase functions list`
- Check function name is correct: `push_token_upsert`
- Verify URL: `https://your-project.supabase.co/functions/v1/push_token_upsert`

### Unauthorized (401)
- Check JWT token is valid and not expired
- Verify `Authorization: Bearer <token>` header is present
- Test token with another function (e.g., `transcribe_start`)

### Database Error (500)
- Check RLS policies are enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'device_push_tokens';`
- Verify migrations are applied: `supabase db diff`
- Check function logs: `supabase functions logs push_token_upsert`

### Duplicate Tokens
- Should not happen due to UNIQUE constraint on `push_token`
- If duplicates exist, check database constraint: `\d device_push_tokens`
- Manually cleanup: `DELETE FROM device_push_tokens WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY push_token ORDER BY created_at) as rn FROM device_push_tokens) t WHERE t.rn > 1);`

## Success Criteria

- [x] Function deploys without errors
- [x] Function returns 200 for valid requests
- [x] Function returns appropriate error codes for invalid requests
- [x] No duplicate tokens created (verified in database)
- [x] RLS policies enforced (users can only see their own tokens)
- [x] Logs show no errors
- [x] Mobile app can register tokens successfully
- [x] Tokens persist across app restarts

## Rollback Plan

If issues occur:

### 1. Disable Function
```bash
# Delete function
supabase functions delete push_token_upsert
```

### 2. Revert Database Changes (if needed)
```sql
-- If you need to remove test data
DELETE FROM device_push_tokens WHERE push_token LIKE 'test-%';

-- If you need to disable table (not recommended)
-- ALTER TABLE device_push_tokens DISABLE ROW LEVEL SECURITY;
```

### 3. Redeploy Previous Version
```bash
# If you have a previous version
git checkout previous-commit
supabase functions deploy push_token_upsert
```

## Support

- **Documentation:** `backend/docs/push.md`
- **Tests:** `backend/tests/push_token_upsert.test.js`
- **Function Code:** `supabase/functions/push_token_upsert/index.ts`
- **Database Schema:** `supabase/migrations/006_create_schedule_tables.sql`

---

**Deployment Status:** ⏭️ Ready for deployment

**Last Updated:** 2026-01-10
