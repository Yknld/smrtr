-- Check if test users exist
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email IN ('user1@test.com', 'user2@test.com')
ORDER BY email;
