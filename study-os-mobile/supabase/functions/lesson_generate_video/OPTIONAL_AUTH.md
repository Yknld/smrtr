# Optional Authentication for Video Generation

## Overview

The `lesson_generate_video` edge function now supports optional JWT authentication, making it easier to test and debug without dealing with expired tokens.

## Environment Variables

### REQUIRE_AUTH

**Type**: Boolean (string)  
**Default**: `true`  
**Values**: `"true"` or `"false"`

When set to `"false"`, the edge function will not require a valid JWT token.

### DEFAULT_USER_ID

**Type**: String (UUID)  
**Required when**: `REQUIRE_AUTH=false` and no valid JWT is provided  
**Example**: `"00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3"`

The user ID to use when authentication is disabled and no JWT is provided.

## Configuration

### Option 1: Supabase Dashboard

1. Go to **Edge Functions** in your Supabase Dashboard
2. Select `lesson_generate_video`
3. Click **Settings** or **Secrets**
4. Add the following secrets:

```
REQUIRE_AUTH=false
DEFAULT_USER_ID=your-user-id-here
```

### Option 2: Supabase CLI

```bash
# Set environment variables
supabase secrets set REQUIRE_AUTH=false
supabase secrets set DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3

# Or set both at once
supabase secrets set REQUIRE_AUTH=false DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

### Option 3: Local Development (.env)

Create a `.env` file in your function directory:

```bash
REQUIRE_AUTH=false
DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

## How It Works

### With Auth Enabled (Default)

```
Request → Check Authorization header
       → Validate JWT token
       → Extract user ID
       → Verify lesson belongs to user
       → Generate video
```

### With Auth Disabled (REQUIRE_AUTH=false)

```
Request → Check if Authorization header present
       → If JWT provided, try to validate (non-blocking)
       → If no JWT or invalid, use DEFAULT_USER_ID
       → Skip user ownership check
       → Generate video
```

## Usage Examples

### 1. No Authentication Required

**Configuration:**
```bash
REQUIRE_AUTH=false
DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

**Request:**
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'
```

✅ **Success** - Uses DEFAULT_USER_ID

### 2. Optional Authentication (Best of Both Worlds)

**Configuration:**
```bash
REQUIRE_AUTH=false
DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

**Request with JWT:**
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Authorization: Bearer valid_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'
```

✅ **Success** - Uses authenticated user from JWT

**Request without JWT:**
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'
```

✅ **Success** - Falls back to DEFAULT_USER_ID

### 3. Authentication Required (Production)

**Configuration:**
```bash
REQUIRE_AUTH=true
# DEFAULT_USER_ID not needed
```

**Request without JWT:**
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'
```

❌ **Error**: `Missing Authorization header`

**Request with invalid JWT:**
```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'
```

❌ **Error**: `Invalid or expired session`

## Security Considerations

### ⚠️ WARNING: Use with Caution

When `REQUIRE_AUTH=false`:
- **Any user** can generate videos for **any lesson**
- **No ownership verification** is performed
- This is intended for **development and testing only**

### Best Practices

1. **Development/Testing**: Use `REQUIRE_AUTH=false`
   - Easier debugging
   - No JWT token management
   - Faster iteration

2. **Staging**: Use `REQUIRE_AUTH=false` with test user
   - Controlled testing
   - Known user context
   - Easy to reproduce issues

3. **Production**: Use `REQUIRE_AUTH=true`
   - Proper security
   - User isolation
   - Audit trail

### How to Get DEFAULT_USER_ID

```sql
-- Get your user ID from Supabase
SELECT id, email FROM auth.users LIMIT 1;

-- Or get user ID for a specific lesson
SELECT user_id FROM lessons WHERE id = 'your-lesson-id';
```

## Troubleshooting

### Error: "DEFAULT_USER_ID must be set when REQUIRE_AUTH=false"

**Cause**: `REQUIRE_AUTH` is set to `false` but `DEFAULT_USER_ID` is not provided and no valid JWT was sent.

**Solution**: Set the `DEFAULT_USER_ID` environment variable:
```bash
supabase secrets set DEFAULT_USER_ID=your-user-id-here
```

### Error: "Invalid or expired session" (when REQUIRE_AUTH=true)

**Cause**: The JWT token is invalid or expired.

**Solution**: 
- Get a fresh token from your app
- Or set `REQUIRE_AUTH=false` for testing

### Error: "Lesson not found"

**Cause**: The lesson_id doesn't exist in the database.

**Solution**: Verify the lesson exists:
```sql
SELECT id, title, user_id FROM lessons WHERE id = 'your-lesson-id';
```

## Mobile App Integration

### When Auth is Required (Production)

```typescript
// Get fresh JWT token
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: lessonId,
    }),
  }
);
```

### When Auth is Optional (Testing)

```typescript
// Can call without token
const response = await fetch(
  'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_id: lessonId,
    }),
  }
);
```

## Logging

When `REQUIRE_AUTH=false`, the logs will show:

```
[request-id] ⚠️  Authentication disabled (REQUIRE_AUTH=false)
[request-id] Using default user: 00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
[request-id] Using lesson owner as user: 00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

This helps identify when auth is bypassed in logs.

## Recommendations

### For Local Development
```bash
REQUIRE_AUTH=false
DEFAULT_USER_ID=your-dev-user-id
```

### For Staging/Testing
```bash
REQUIRE_AUTH=false
DEFAULT_USER_ID=test-user-id
```

### For Production
```bash
REQUIRE_AUTH=true
# DEFAULT_USER_ID not needed
```

## Summary

This feature allows you to:
- ✅ Test edge function without JWT hassles
- ✅ Debug video generation easily
- ✅ Use the same function in dev and prod
- ✅ Gradually migrate to full auth
- ⚠️ Remember to enable auth in production!

**Quick Start (Testing):**
```bash
supabase secrets set REQUIRE_AUTH=false DEFAULT_USER_ID=$(supabase db query "SELECT id FROM auth.users LIMIT 1" --csv | tail -n 1)
```

This will automatically use the first user in your database for all unauthenticated requests.
