#!/bin/bash
# Get JWT token from Supabase auth

# Your Supabase project
PROJECT_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"

# Demo account credentials
EMAIL="${1:-user1@test.com}"
PASSWORD="${2:-password123}"

echo "Attempting to login as: $EMAIL"
echo ""

# Get anon key from .env or prompt
if [ -f "apps/mobile/.env" ]; then
  ANON_KEY=$(grep SUPABASE_ANON_KEY apps/mobile/.env | cut -d '=' -f2 | tr -d '"' | tr -d ' ')
elif [ -f ".env" ]; then
  ANON_KEY=$(grep SUPABASE_ANON_KEY .env | cut -d '=' -f2 | tr -d '"' | tr -d ' ')
fi

if [ -z "$ANON_KEY" ]; then
  echo "Enter your Supabase ANON_KEY:"
  read ANON_KEY
fi

# Login and get token
RESPONSE=$(curl -s -X POST "$PROJECT_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Check for errors
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ Login failed:"
  echo "$RESPONSE" | jq '.error_description // .message // .error'
  exit 1
fi

# Extract token
JWT=$(echo "$RESPONSE" | jq -r '.access_token // empty')

if [ -z "$JWT" ]; then
  echo "❌ Failed to get token"
  echo "Response:"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

# Success!
echo "✅ Login successful!"
echo ""
echo "JWT Token:"
echo "$JWT"
echo ""
echo "User ID: $(echo "$RESPONSE" | jq -r '.user.id')"
echo "Email: $(echo "$RESPONSE" | jq -r '.user.email')"
echo "Expires in: $(echo "$RESPONSE" | jq -r '.expires_in') seconds"
echo ""
echo "Export for use in other commands:"
echo "export JWT='$JWT'"
