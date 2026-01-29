# Quick Start: Disable Video Generation Auth

## TL;DR

Run these two commands to disable authentication:

```bash
cd study-os-mobile
supabase secrets set REQUIRE_AUTH=false DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

Done! Now you can call the video generation function without a JWT token.

## Step by Step

### 1. Get Your User ID

You already have it from the earlier query: **`00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3`**

Or run this SQL in Supabase:
```sql
SELECT id FROM auth.users LIMIT 1;
```

### 2. Set Environment Variables

```bash
cd /Users/danielntumba/smrtr/study-os-mobile
supabase secrets set REQUIRE_AUTH=false DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

### 3. Test It

Now the mobile app should work without JWT errors!

```bash
# Or test with curl:
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"
  }'
```

## What Changed

### Before (With Auth)
- ❌ "Invalid JWT" error
- ❌ Need valid token
- ❌ Tokens expire

### After (Without Auth)
- ✅ No JWT needed
- ✅ Works from mobile app
- ✅ Easy testing

## Re-enable Auth Later

When you're ready for production:

```bash
cd study-os-mobile
supabase secrets set REQUIRE_AUTH=true
```

## How It Works

The edge function now:
1. Checks if `REQUIRE_AUTH` is `false`
2. If yes, uses `DEFAULT_USER_ID` instead of validating JWT
3. Skips user ownership checks
4. Generates video normally

## Security Note

⚠️ **This disables authentication!**
- Anyone can generate videos for any lesson
- Only use for development/testing
- Re-enable for production

## Troubleshooting

### Still getting "Invalid JWT"?

Wait 1-2 minutes for secrets to propagate, then try again.

### Error: "DEFAULT_USER_ID must be set"?

Run the command again:
```bash
supabase secrets set DEFAULT_USER_ID=00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3
```

### Check Current Settings

```bash
supabase secrets list
```

Look for:
- `REQUIRE_AUTH = false`
- `DEFAULT_USER_ID = 00da82c4-f3cd-40c3-b5e0-fa8b3daf0cc3`

## Alternative: Use Scripts

```bash
# Disable auth (automated)
./disable_video_auth.sh

# Enable auth later
./enable_video_auth.sh
```

Note: Scripts may prompt for user ID if database query fails.

## Complete Configuration

Your edge function now has:
- ✅ `GEMINI_API_KEY` - For story planning
- ✅ `OPENHAND_API_KEY` - For video generation
- ✅ `REQUIRE_AUTH=false` - Auth disabled
- ✅ `DEFAULT_USER_ID=...` - Fallback user

All set for testing!
