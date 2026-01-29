#!/bin/bash
# Smart polling: Checks OpenHand status first, then GitHub
# Run this frequently (every 30-60 seconds recommended)

echo "🔍 Checking OpenHand conversations for completed videos..."
echo ""

# Get service role key from Supabase
cd /Users/danielntumba/smrtr/study-os-mobile

# Call the polling endpoint
result=$(curl -s -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/video_poll_github" \
  -H "Authorization: Bearer $(supabase status --output json 2>/dev/null | jq -r '.service_role_key' 2>/dev/null || echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU')" \
  -H "Content-Type: application/json")

echo "$result" | jq '.'

# Parse and show summary
checked=$(echo "$result" | jq -r '.checked // 0')
stillGenerating=$(echo "$result" | jq -r '.stillGenerating // 0')
found=$(echo "$result" | jq -r '.found // 0')
processed=$(echo "$result" | jq -r '.processed // 0')
failed=$(echo "$result" | jq -r '.failed // 0')

echo ""
echo "📊 Summary:"
echo "  - Videos checked: $checked"
echo "  - Still generating: $stillGenerating"
echo "  - Videos completed & found: $found"
echo "  - Successfully processed: $processed"
echo "  - Failed: $failed"
echo ""

if [ "$processed" -gt 0 ]; then
  echo "✅ $processed video(s) ready! Check your app."
elif [ "$stillGenerating" -gt 0 ]; then
  echo "⏳ $stillGenerating video(s) still generating. Check again in 30-60 seconds."
elif [ "$checked" -eq 0 ]; then
  echo "✨ No pending videos."
else
  echo "⏳ Checked $checked video(s). Will check again soon."
fi
