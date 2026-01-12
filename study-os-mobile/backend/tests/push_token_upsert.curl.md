# Manual Testing with curl

Quick reference for testing `push_token_upsert` Edge Function with curl.

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

### Test 1: Register a New iOS Token

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": "test-ios-token-12345"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7f3c4a89-1234-5678-9abc-def012345678"
}
```

### Test 2: Update Existing Token (Same Token, Second Call)

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": "test-ios-token-12345"
  }'
```

**Expected:**
- Same `id` as Test 1 (updated, not inserted)
- `last_seen_at` should be more recent

### Test 3: Register Android Token

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "android",
    "push_token": "test-android-token-67890"
  }'
```

**Expected:**
- New `id` (different token, so new row)
- Success response

### Test 4: Error - Missing Authorization

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": "test-token"
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

### Test 5: Error - Invalid Platform

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "windows",
    "push_token": "test-token"
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_PLATFORM",
    "message": "platform must be 'ios' or 'android'"
  }
}
```

### Test 6: Error - Missing push_token

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios"
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "push_token is required and must be a non-empty string"
  }
}
```

### Test 7: Error - Empty push_token

```bash
curl -X POST $SUPABASE_URL/functions/v1/push_token_upsert \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "push_token": ""
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "push_token is required and must be a non-empty string"
  }
}
```

## Verify in Database

After running tests, check the database:

```bash
cd backend/tests
```

In `psql` or Supabase SQL Editor:

```sql
-- View all tokens for the test user
SELECT id, user_id, platform, push_token, is_active, last_seen_at
FROM device_push_tokens
WHERE user_id = '<user_id_from_response>'
ORDER BY created_at DESC;
```

**Expected:**
- Only 2 rows (one for iOS token, one for Android token)
- No duplicates despite multiple calls with same token
- `last_seen_at` should be recent for updated tokens

## Cleanup

Delete test tokens:

```sql
DELETE FROM device_push_tokens
WHERE push_token LIKE 'test-%';
```

Or use the automated test:

```bash
cd backend/tests
npm install
node push_token_upsert.test.js
```

The automated test cleans up after itself.
