import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const SOLVER_VIEWER_BASE =
  process.env.VITE_SOLVER_VIEWER_BASE ||
  'https://euxfugfzmpsemkjpcpuz.supabase.co/storage/v1/object/public/solver'

export default defineConfig({
  plugins: [
    react(),
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
