# Interactive Solver – where it’s served from

The interactive homework page is **solver.html** (not index.html). It’s loaded from two places.

## Keeping solver code up to date (source: GeminiLoop)

The **canonical implementation** of the interactive solver is in **GeminiLoop** (same repo or sibling): `homework-app.js`, `homework-styles.css`, `solver.html`, and the logic that loads manifest + components. The **web and mobile app** use a **copy** in `smrtr/solver/`. To keep behavior in sync (e.g. image handling, manifest format, iframe loading):

1. **Copy from GeminiLoop into smrtr/solver/**  
   From the repo root (with both GeminiLoop and smrtr available):
   ```bash
   cp GeminiLoop/homework-app.js    smrtr/solver/
   cp GeminiLoop/homework-styles.css smrtr/solver/
   cp GeminiLoop/solver.html        smrtr/solver/
   ```
   Or run the sync script if present: `./scripts/sync-solver-from-gemini-loop.sh` (from smrtr).

2. **Bump cache**  
   In `solver/solver.html`, update the `?v=` query on the script and stylesheet (e.g. `?v=1769600000` → new timestamp).

3. **Deploy**  
   - **Web:** Rebuild and deploy the smrtr web app so `dist/solver/` gets the new files.  
   - **Mobile / external viewer:** Upload `solver.html`, `homework-app.js`, `homework-styles.css` to Supabase Storage bucket **solver** so `SOLVER_VIEWER_URL` serves the new code.

## 1. Web app (Study OS web)

- **URL:** Same-origin first, e.g. `https://<your-domain>/solver/solver.html?lesson_id=...`
- **Source:** Files are copied at **build time** from `solver/` into `dist/solver/` (see `vite.config.js` → copy-solver). The deployed site serves those static files.
- **To get updates live:** Rebuild and redeploy the web app (`npm run build` then deploy). Updating only Supabase does **not** change what the web app serves.

## 2. Mobile app (and web when not using same-origin)

- **URL:** From `SOLVER_VIEWER_URL` in config, e.g.  
  `https://euxfugfzmpsemkjpcpuz.supabase.co/storage/v1/object/public/solver/solver.html`
- **Source:** Supabase Storage, bucket **solver**, file **solver.html** (and same folder: **homework-app.js**, **homework-styles.css**).
- **Config:**  
  - Web: `src/study-os/config/supabase.js` → `SOLVER_VIEWER_URL`  
  - Mobile: `study-os-mobile/apps/mobile/src/config/supabase.ts` → `SOLVER_VIEWER_URL`
- **To get updates live:** Upload to Supabase Storage bucket `solver`: **solver.html**, **homework-app.js**, **homework-styles.css**.

## Cache-busting

Both **solver.html** and **index.html** use `?v=1769600000` on the script and stylesheet. When you change the solver, bump the `?v=` value in **solver.html** (and optionally index.html) and re-upload / redeploy so browsers load the new JS and CSS.

## Environment variables (Vercel / web app)

The **main app** (Vite) needs these in Vercel (or your host). Names must stay as-is so the app can read them:

| Variable | Used for |
|----------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL (solver gets it via postMessage from the app). |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for the app’s Supabase client. |
| `VITE_GEMINI_API_KEY` | Optional; Live Tutor in the solver if you pass it via postMessage. |

You do **not** need different variable names. The solver does not read Vite env directly: when the solver runs inside the web app, the app sends Supabase URL and the user’s token to the iframe via postMessage, and the solver uses those. No extra env vars are required for “Feeling stuck?” or the resources modal.

## Summary

| Consumer   | Loads from                    | To update |
|-----------|--------------------------------|-----------|
| Web app   | Your deployed site `/solver/solver.html` | Redeploy web app (build copies `solver/` into dist). |
| Mobile app | Supabase Storage `solver/solver.html`   | Re-upload solver.html, homework-app.js, homework-styles.css to bucket `solver`. |
