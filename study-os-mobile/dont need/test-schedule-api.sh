#!/bin/bash

# Test the study_plan_upsert Edge Function
# This will help debug auth issues

echo "Testing study_plan_upsert Edge Function..."
echo ""

# You need to provide a valid JWT token from your app
# To get it, add this to your app temporarily:
# const { data: { session } } = await supabase.auth.getSession();
# console.log('TOKEN:', session.access_token);

if [ -z "$JWT_TOKEN" ]; then
  echo "ERROR: JWT_TOKEN environment variable not set"
  echo ""
  echo "To get your JWT token:"
  echo "1. Add this code temporarily to your app:"
  echo "   const { data: { session } } = await supabase.auth.getSession();"
  echo "   console.log('TOKEN:', session.access_token);"
  echo "2. Copy the token from the console"
  echo "3. Run: export JWT_TOKEN='your-token-here'"
  echo "4. Run this script again"
  exit 1
fi

echo "Making request to Edge Function..."
echo ""

curl -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/study_plan_upsert" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI" \
  -d '{
    "plan": {
      "title": "Test Schedule",
      "timezone": "America/Toronto",
      "is_enabled": true
    },
    "rules": [
      {
        "rrule": "FREQ=WEEKLY;BYDAY=MO,WE",
        "start_time_local": "19:00",
        "duration_min": 45,
        "remind_before_min": 10
      }
    ]
  }' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Done!"
