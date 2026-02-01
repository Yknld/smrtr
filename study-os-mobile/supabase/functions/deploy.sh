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
echo "📦 Deploying gemini_live_token..."
supabase functions deploy gemini_live_token --no-verify-jwt

echo ""
echo "📦 Deploying push_token_upsert..."
supabase functions deploy push_token_upsert --no-verify-jwt

echo ""
echo "📦 Deploying study_plan_upsert..."
supabase functions deploy study_plan_upsert --no-verify-jwt

echo ""
echo "📦 Deploying lesson_generate_flashcards..."
supabase functions deploy lesson_generate_flashcards --no-verify-jwt

echo ""
echo "📦 Deploying lesson_generate_summary..."
supabase functions deploy lesson_generate_summary --no-verify-jwt

echo ""
echo "📦 Deploying tutor_chat..."
supabase functions deploy tutor_chat --no-verify-jwt

echo ""
echo "📦 Deploying lesson_generate_interactive..."
supabase functions deploy lesson_generate_interactive --no-verify-jwt

echo ""
echo "📦 Deploying lesson_generate_interactive_reset..."
supabase functions deploy lesson_generate_interactive_reset --no-verify-jwt

echo ""
echo "✅ All functions deployed successfully!"
echo ""
echo "⚠️  Don't forget to set secrets (per function):"
echo "   supabase secrets set GEMINI_API_KEY=your_key"
echo "   supabase secrets set RUNPOD_API_KEY=your_key   # for lesson_generate_interactive"
echo "   supabase secrets set RUNPOD_ENDPOINT=your_endpoint_id"
echo ""
echo "📚 Test with:"
echo "   curl https://your-project.supabase.co/functions/v1/transcribe_start \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"language\":\"en-US\"}'"
