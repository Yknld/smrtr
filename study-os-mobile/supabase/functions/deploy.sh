#!/bin/bash
# ============================================================================
# Deploy ALL Edge Functions with --no-verify-jwt (gateway does not validate JWT).
# Run from study-os-mobile: ./supabase/functions/deploy.sh
# Or from study-os-mobile/supabase: ./functions/deploy.sh
# ============================================================================

set -e

FUNCTIONS=(
  gemini_live_token
  gemini_translate
  generate_youtube_recommendations
  interactive_module_get
  lesson_create_from_youtube
  lesson_generate_flashcards
  lesson_generate_interactive
  lesson_generate_interactive_reset
  lesson_generate_quiz
  lesson_generate_summary
  lesson_generate_video
  lesson_video_upload
  lesson_youtube_recs
  lesson_youtube_resource_add
  notes_append_from_asset
  notes_commit_from_segments
  notes_finalize
  notes_get
  podcast_create
  podcast_generate_audio
  podcast_generate_outline
  podcast_generate_script
  podcast_get
  podcast_join_in
  podcast_join_in_acknowledge
  push_token_upsert
  study_plan_upsert
  transcribe_chunk
  transcribe_poll
  transcribe_start
  tutor_chat
  video_poll_github
  test_flashcards_minimal
  test_no_validation
)

# Project root = parent of supabase/ (study-os-mobile). Script lives in supabase/functions/deploy.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

echo "Deploying ${#FUNCTIONS[@]} Edge Functions with --no-verify-jwt..."
echo ""

for fn in "${FUNCTIONS[@]}"; do
  echo "Deploying $fn..."
  supabase functions deploy "$fn" --no-verify-jwt
  echo ""
done

echo "All functions deployed with --no-verify-jwt."
echo "Secrets (if needed): supabase secrets set GEMINI_API_KEY=... RUNPOD_API_KEY=... RUNPOD_ENDPOINT=..."
