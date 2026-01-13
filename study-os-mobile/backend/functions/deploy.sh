#!/bin/bash

# ============================================================================
# Deploy all transcription Edge Functions to Supabase
# ============================================================================

set -e

echo "🚀 Deploying Transcription Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if linked to a project
if [ ! -f "../../.supabase/config.toml" ] && [ ! -f "../../../.supabase/config.toml" ]; then
    echo "⚠️  Not linked to a Supabase project. Run:"
    echo "   supabase link --project-ref your-project-ref"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy functions
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
echo "⚠️  Don't forget to set secrets:"
echo "   supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE"
echo "   Get your key from: https://platform.openai.com/api-keys"
echo ""
echo "📚 Test with:"
echo "   cd ../tests"
echo "   ./test-whisper.sh YOUR_USER_JWT"
