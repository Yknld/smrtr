#!/usr/bin/env bash
# Copy solver assets from TheGeminiLoop into smrtr/solver/ so web and mobile
# use the same code as the canonical TheGeminiLoop implementation.
# Run from smrtr repo root: ./scripts/sync-solver-from-gemini-loop.sh

set -e
GEMINI_LOOP_DIR="${GEMINI_LOOP_DIR:-../TheGeminiLoop}"
SRC="$GEMINI_LOOP_DIR"
DEST="solver"

if [[ ! -d "$SRC" ]]; then
  echo "TheGeminiLoop not found at $SRC. Set GEMINI_LOOP_DIR or run from smrtr with TheGeminiLoop as sibling."
  exit 1
fi

for f in homework-app.js homework-styles.css solver.html; do
  if [[ -f "$SRC/$f" ]]; then
    cp "$SRC/$f" "$DEST/$f"
    echo "Copied $f"
  else
    echo "Skip (missing): $SRC/$f"
  fi
done

echo "Done. Bump ?v= in solver/solver.html and redeploy web / re-upload to Supabase bucket 'solver' for mobile."
