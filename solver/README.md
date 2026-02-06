# Interactive Solver – where it’s served from

The interactive homework page is **solver.html** (not index.html). It’s loaded from two places:

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

## Summary

| Consumer   | Loads from                    | To update |
|-----------|--------------------------------|-----------|
| Web app   | Your deployed site `/solver/solver.html` | Redeploy web app (build copies `solver/` into dist). |
| Mobile app | Supabase Storage `solver/solver.html`   | Re-upload solver.html, homework-app.js, homework-styles.css to bucket `solver`. |
