# Root folder audit (GitHub repo)

Systematic pass over root-level folders. Focus: remove or flag what is no longer needed, especially "initial commit only" or placeholder-only.

**Second pass:** Double-check only. No deletions unless you specify. This doc is the single source of truth for what was removed earlier and what is only recommended for review.

---

## Removed (in a previous pass; do not re-delete)

| Folder | Reason |
|--------|--------|
| assets/ | Only `.gitkeep`; only commit ever was initial commit. No references in app. |
| compositions/ | Only `.gitkeep`; only commit was initial commit. No references. |
| exports/ | Only `.gitkeep`; only commit was initial commit. `.gitignore` already ignores `exports/*`. |
| scripts/ (repo root) | Only initial commit. Contained `smartr_video_planner.py`, `smartr_veo_director.py`, `smartr_audio_generator.py`, etc. App video uses `lesson_generate_video` (Edge Function + RunPod), not these. |

| Root files: requirements.txt, veo_client.py, veo_integration.py, content_analyzer.py | Legacy Veo Python tooling from initial commit. Video generation is via Edge Function `lesson_generate_video`; docs (VEO_SETUP, README_VEO, etc.) referenced these but app does not. |

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

## Root files (kept; verified)

| File | Used by |
|------|---------|
| README.md, .env.example, .gitignore, .gitmodules | Repo config |
| index.html, vite.config.js, vercel.json, package.json, package-lock.json | Vite/React web app (src/); solver README references vite copy-solver |
| design-tokens.json | Referenced in docs (FILE_LIST, IMPLEMENTATION_SUMMARY). No imports from study-os-mobile or Edge Functions. |

---

## Second-pass verification (no deletions)

- **external/** — Required by **services/**; `services/chatterbox_tts` and `services/chatterbox_tts_multilingual` import the `chatterbox` package from `external/chatterbox`. Do not remove if you use Chatterbox TTS (RunPod/serverless). Mobile app does not use root external/ or services/.
- **services/** — Chatterbox TTS app and RunPod handlers; depend on external/chatterbox. Podcast pipeline can use Gemini TTS or RunPod; Chatterbox is an alternative. Do not remove unless you drop that TTS path.
- **src/** — Study OS web app (Vite entry: index.html → main.jsx → App.jsx). Active; used for web UI.
- **study-os-mobile/** — Mobile app and Supabase; active. No removal recommended.

---

## Review only (do not delete unless you specify)

| Path | Notes |
|------|--------|
| study-os-mobile/dont need/ | 65 tracked files (SQL, sh, md, ad-hoc scripts and docs). Folder name indicates unused. Safe to remove only after you confirm you do not need any of them. |
