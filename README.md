# smrtr

Monorepo for Study OS: web app, mobile app, interactive solver, and backend (Supabase Edge Functions, migrations).

## Contents

- **study-os-mobile/** — React Native (Expo) app: courses, lessons, lesson hub (notes, Live, AI Tutor, Interact, Podcast, Video, Flashcards, Quiz, Assets), Supabase auth and data.
- **src/study-os/** — Web UI for Study OS (if present).
- **solver/** — Interactive homework viewer (solver.html, homework-app.js). Served from Supabase Storage; mobile app loads it in a WebView with auth and lesson ID.
- **study-os-mobile/supabase/** — Config, migrations, Edge Functions (flashcards, quiz, podcast, video, interactive, notes, tutor, etc.).

## Docs

- [study-os-mobile/docs/OVERVIEW.md](study-os-mobile/docs/OVERVIEW.md) — How the mobile app works.
- [study-os-mobile/docs/FEATURES.md](study-os-mobile/docs/FEATURES.md) — One flowchart per feature.
- [study-os-mobile/README.md](study-os-mobile/README.md) — Mobile app setup and structure.

## Quick start (mobile)

```bash
cd study-os-mobile/apps/mobile
npm install
npx expo start
```

See `study-os-mobile/README.md` and `study-os-mobile/apps/mobile/README.md` for env (Supabase URL/anon key, solver viewer URL) and native build instructions.

## License

See LICENSE in this repository.
