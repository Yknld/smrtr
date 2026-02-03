import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/** Copy solver/ to dist/solver/ so production can serve it same-origin. */
function copySolverToDist() {
  return {
    name: 'copy-solver',
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist')
      const solverDir = path.resolve(process.cwd(), 'solver')
      const destDir = path.join(outDir, 'solver')
      if (!fs.existsSync(solverDir)) return
      fs.mkdirSync(destDir, { recursive: true })
      for (const name of ['solver.html', 'homework-app.js', 'homework-styles.css']) {
        const src = path.join(solverDir, name)
        const dest = path.join(destDir, name)
        if (fs.existsSync(src)) fs.copyFileSync(src, dest)
      }
    },
  }
}

const SOLVER_VIEWER_BASE =
  process.env.VITE_SOLVER_VIEWER_BASE ||
  'https://euxfugfzmpsemkjpcpuz.supabase.co/storage/v1/object/public/solver'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://euxfugfzmpsemkjpcpuz.supabase.co'

export default defineConfig({
  server: {
    proxy: {
      // Avoid CORS for Edge Functions in dev: browser hits same-origin, Vite proxies to Supabase.
      '/supabase-functions': {
        target: SUPABASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-functions/, '/functions/v1'),
        secure: true,
      },
    },
  },
  plugins: [
    react(),
    copySolverToDist(),
    {
      name: 'solver-static',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/solver')) return next()
          const pathname = (req.url.split('?')[0] || '').replace(/^\/solver\/?/, '') || 'solver.html'
          const solverDir = path.resolve(process.cwd(), 'solver')
          const filePath = path.resolve(solverDir, pathname)
          if (!filePath.startsWith(solverDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next()
          const ext = path.extname(filePath)
          const ct = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream'
          res.setHeader('Content-Type', ct + (ext === '.html' || ext === '.js' || ext === '.css' ? '; charset=utf-8' : ''))
          const buf = fs.readFileSync(filePath, ext === '.html' || ext === '.js' || ext === '.css' ? 'utf-8' : undefined)
          res.end(buf)
        })
      },
    },
    {
      name: 'solver-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/solver-proxy')) return next()
          const pathname = req.url.split('?')[0] || ''
          const path = pathname.replace(/^\/solver-proxy\/?/, '') || 'solver.html'
          const target = `${SOLVER_VIEWER_BASE.replace(/\/$/, '')}/${path}`
          try {
            const r = await fetch(target)
            const body = await r.text()
            res.statusCode = r.status
            if (path.endsWith('.html') || path === 'solver.html' || !path.includes('.')) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
            } else if (path.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            } else if (path.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css; charset=utf-8')
            } else {
              ;(r.headers.get('content-type') || '').split(';').forEach(h => res.setHeader('Content-Type', h.trim()))
            }
            res.end(body)
          } catch (e) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'text/plain')
            res.end('Proxy error: ' + (e?.message || 'unknown'))
          }
        })
      },
    },
  ],
})
