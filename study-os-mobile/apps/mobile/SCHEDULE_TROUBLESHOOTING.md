# Schedule Feature Troubleshooting

## Error: "Failed to create study plan: 401"

### Cause
This error means the authentication token is invalid or expired. The Edge Function cannot verify your identity.

### Solutions

#### Solution 1: Refresh Your Session (Try This First)
The easiest fix is to **log out and log back in**:

1. Go to Settings screen
2. Tap "Log Out"
3. Log back in with your credentials
4. Try creating a schedule again

#### Solution 2: Check Console Logs
With the updated code, you should see detailed logs in the Metro console. Look for lines starting with `[Schedule]`:

```
[Schedule] Creating study plan with user: abc-123-def
[Schedule] Request body: {...}
[Schedule] Response status: 401
[Schedule] Error response: {...}
```

This will tell you exactly what error the backend is returning.

#### Solution 3: Manual Token Test
To verify the Edge Function is working, you can test it manually:

1. **Get your JWT token** by adding this code temporarily to `LessonHubScreen.tsx`:

```typescript
const testAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('JWT TOKEN:', session?.access_token);
};
```

2. Call `testAuth()` and copy the token from the console

3. Run the test script:

```bash
cd study-os-mobile
export JWT_TOKEN='your-token-here'
./test-schedule-api.sh
```

This will show you if the Edge Function is responding correctly.

---

## Error: "Failed to create study plan: 404"

### Cause
The Edge Function is not deployed.

### Solution
Deploy the Edge Function:

```bash
cd study-os-mobile
supabase functions deploy study_plan_upsert
```

---

## Error: "User not authenticated"

### Cause
No active session found.

### Solution
1. Make sure you're logged in
2. Check if other features (like flashcards, notes) work
3. If nothing works, there may be a broader auth issue

---

## Debug Mode

To enable more detailed logging, open the Metro console and look for:
- `[Schedule]` logs - from the frontend repository
- Edge Function logs - visible in Supabase Dashboard under Functions → study_plan_upsert → Logs

---

## Common Issues

### Issue: Works for other features but not schedules
- The schedule Edge Function might not have the right environment variables
- Check Supabase Dashboard → Edge Functions → study_plan_upsert → Settings

### Issue: "course_id is null" error
- This is okay! Schedules can be created without a course
- The error should not prevent creation

### Issue: Time picker doesn't show
- Make sure you installed `@react-native-community/datetimepicker`:
```bash
cd apps/mobile
npm install @react-native-community/datetimepicker@7.6.1 --legacy-peer-deps
```

---

## Still Not Working?

1. **Check Supabase Dashboard** for Edge Function logs
2. **Verify migrations** are applied:
```bash
cd study-os-mobile
supabase db push
```

3. **Test with curl** using the test script provided

4. **Check RLS policies** are enabled for `study_plans` and `study_plan_rules` tables
