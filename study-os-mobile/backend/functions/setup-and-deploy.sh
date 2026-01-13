#!/bin/bash

# ============================================================================
# Setup and Deploy Transcription Edge Functions
# ============================================================================

set -e

echo "🔧 Setting up Supabase Edge Functions..."
echo ""

# Project details
PROJECT_REF="euxfugfzmpsemkjpcpuz"
GEMINI_KEY="AIzaSyDVoAIPakAXm0wYkmuTM-AlFiufWzo93BI"

# Go to project root
cd "$(dirname "$0")/../.."

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Check if logged in
echo "Step 1: Checking Supabase login..."
if supabase projects list >/dev/null 2>&1; then
    echo "✅ Already logged in to Supabase"
else
    echo "❌ Not logged in. Please login:"
    supabase login
fi
echo ""

# Step 2: Link project
echo "Step 2: Linking to project ${PROJECT_REF}..."
if [ -f ".supabase/config.toml" ]; then
    echo "⚠️  Project already linked. Skipping..."
else
    supabase link --project-ref ${PROJECT_REF}
    echo "✅ Project linked"
fi
echo ""

# Step 3: Set Gemini API key
echo "Step 3: Setting GEMINI_API_KEY secret..."
supabase secrets set GEMINI_API_KEY="${GEMINI_KEY}"
echo "✅ Secret set"
echo ""

# Step 4: Deploy functions
echo "Step 4: Deploying Edge Functions..."
echo ""

cd backend/functions

echo "📦 Deploying transcribe_start..."
supabase functions deploy transcribe_start --no-verify-jwt

echo ""
echo "📦 Deploying transcribe_chunk..."
supabase functions deploy transcribe_chunk --no-verify-jwt

echo ""
echo "📦 Deploying transcribe_poll..."
supabase functions deploy transcribe_poll --no-verify-jwt

echo ""
echo "✅ All functions deployed successfully!"
echo ""
echo "🎉 Setup complete! Your Edge Functions are live at:"
echo "   https://${PROJECT_REF}.supabase.co/functions/v1/transcribe_start"
echo "   https://${PROJECT_REF}.supabase.co/functions/v1/transcribe_chunk"
echo "   https://${PROJECT_REF}.supabase.co/functions/v1/transcribe_poll"
echo ""
echo "📚 Next steps:"
echo "   1. Test with: curl -X POST https://${PROJECT_REF}.supabase.co/functions/v1/transcribe_start \\"
echo "      -H 'Authorization: Bearer YOUR_USER_TOKEN' -d '{\"language\":\"en-US\"}'"
echo "   2. See CLIENT_INTEGRATION.md for React Native examples"
echo ""
