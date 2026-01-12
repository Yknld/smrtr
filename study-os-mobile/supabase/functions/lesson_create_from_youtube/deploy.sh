#!/bin/bash

# Deploy lesson_create_from_youtube Edge Function
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying lesson_create_from_youtube Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy lesson_create_from_youtube

# Check if GEMINI_API_KEY is set
echo ""
echo "🔑 Checking environment variables..."
echo "   Required: GEMINI_API_KEY (for AI summary generation)"
echo ""
echo "   To set secrets, run:"
echo "   supabase secrets set GEMINI_API_KEY=your_api_key_here"
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📚 Test the function:"
echo "   cd ../../backend/tests"
echo "   node test-youtube-import.js"
echo ""
echo "📖 Documentation:"
echo "   See lesson_create_from_youtube/README.md for API details and cURL examples"
