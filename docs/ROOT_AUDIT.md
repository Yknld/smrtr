# Root folder audit (GitHub repo)

Systematic pass over root-level folders. Focus: remove or flag what is no longer needed, especially "initial commit only" or placeholder-only.

## Removed (this pass)

| Folder | Reason |
|--------|--------|
| assets/ | Only `.gitkeep`; only commit ever was initial commit. No references in app. |
| compositions/ | Only `.gitkeep`; only commit was initial commit. No references. |
| exports/ | Only `.gitkeep`; only commit was initial commit. `.gitignore` already ignores `exports/*`. |
| scripts/ (repo root) | Only initial commit. Contained `smartr_video_planner.py`, `smartr_veo_director.py`, `smartr_audio_generator.py`, etc. App video uses `lesson_generate_video` (Edge Function + RunPod), not these. |

## Not in repo (gitignored; already excluded)

- `gar/` — in `.gitignore`. Local only.
- `AppIcons*/` — in `.gitignore`.
- `dist/`, `node_modules/` — standard ignores.

## Kept (in use or multiple commits)

| Folder | Why keep |
|--------|----------|
| .github/ | CI/workflows |
| docs/ | Many commits; implementation and overview docs |
| external/ | Chatterbox TTS (submodule/vendored); used by services |
| services/ | chatterbox_tts, referenced by podcast/TTS docs |
| src/ | Study OS web app (active) |
| study-os-mobile/ | Mobile app and Supabase (active) |
| solver/ | Interactive solver (active) |

## Root files (kept)

- `README.md`, `.env.example`, `.gitignore`, `.gitmodules`
- `index.html`, `vite.config.js`, `vercel.json`, `package.json`, `requirements.txt`
- `content_analyzer.py`, `veo_client.py`, `veo_integration.py`, `design-tokens.json` — referenced in docs (VEO_SETUP, README_VEO, etc.). Remove only if you drop Veo/local video tooling entirely.
