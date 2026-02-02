/**
 * Interactive Solver – same flow as study-os-mobile InteractiveSolverScreen:
 * 1. Check interactive_module_get for lesson.
 * 2. Dev: iframe src=/solver/solver.html?lesson_id=... (scripts/styles from real URL); auth via postMessage.
 * 3. Production: fetch HTML from viewer URL, inject auth, render via iframe srcdoc (or src if fetch fails).
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { supabase, SUPABASE_URL, SOLVER_VIEWER_URL } from '../config/supabase'
import './screens.css'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isValidUuid(str) {
  return typeof str === 'string' && UUID_REGEX.test(str)
}

const USE_PROXY = typeof import.meta !== 'undefined' && import.meta.env?.DEV && typeof window !== 'undefined'

/** In dev: local /solver. Otherwise same-origin proxy base for HTML/CSS. */
function solverBaseUrl() {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const base = USE_PROXY ? '/solver/' : '/solver-proxy/'
  return origin.endsWith('/') ? origin + base.slice(1) : origin + base
}

export default function InteractiveSolverScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Interactive'
  const stateSolverUrl = location.state?.solverUrl || null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contentUrl, setContentUrl] = useState(stateSolverUrl)
  const [srcdocHtml, setSrcdocHtml] = useState(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (stateSolverUrl) {
      setContentUrl(stateSolverUrl)
      setLoading(false)
      setError(null)
      setSrcdocHtml(null)
      return
    }
    if (!lessonId) {
      setContentUrl(null)
      setSrcdocHtml(null)
      setLoading(false)
      setError(null)
      return
    }
    if (!isValidUuid(lessonId)) {
      setContentUrl(null)
      setSrcdocHtml(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session?.access_token) {
          setError('Sign in required to load interactive content.')
          setContentUrl(null)
          setSrcdocHtml(null)
          setLoading(false)
          return
        }

        const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/interactive_module_get?lesson_id=${encodeURIComponent(lessonId)}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (cancelled) return

        if (res.status === 404) {
          setContentUrl(null)
          setSrcdocHtml(null)
          setError(null)
          setLoading(false)
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body?.error || `Failed to load (${res.status})`)
          setContentUrl(null)
          setSrcdocHtml(null)
          setLoading(false)
          return
        }

        const directUrl = USE_PROXY
          ? `${typeof window !== 'undefined' ? window.location.origin : ''}/solver/solver.html?lesson_id=${encodeURIComponent(lessonId)}`
          : (() => {
              const viewerUrl = (SOLVER_VIEWER_URL || '').trim()
              if (!viewerUrl) {
                setError('Solver viewer URL not configured.')
                setContentUrl(null)
                setSrcdocHtml(null)
                setLoading(false)
                return null
              }
              const sep = viewerUrl.includes('?') ? '&' : '?'
              return `${viewerUrl}${sep}lesson_id=${encodeURIComponent(lessonId)}`
            })()
        if (directUrl === null) return
        setError(null)
        setContentUrl(directUrl)

        // In dev we serve /solver from disk: use iframe src so scripts and styles load from real URL; auth via postMessage.
        // In production we fetch HTML, inject auth, and use srcdoc (or src if fetch fails).
        if (USE_PROXY) {
          setSrcdocHtml(null)
        } else {
          // No proxy (e.g. production): try to fetch from viewer URL; CORS may block
          const viewerUrl = (SOLVER_VIEWER_URL || '').trim()
          const withoutQuery = viewerUrl.split('?')[0]
          const lastSlash = withoutQuery.lastIndexOf('/')
          const baseUrl = lastSlash === -1 ? withoutQuery : withoutQuery.slice(0, lastSlash + 1)
          const htmlUrl = baseUrl ? `${baseUrl}solver.html` : withoutQuery
          try {
            const htmlRes = await fetch(htmlUrl, { cache: 'no-store' })
            if (cancelled) return
            if (!htmlRes.ok) {
              setSrcdocHtml(null)
              setLoading(false)
              return
            }
            let html = await htmlRes.text()
            if (cancelled) return
            const authScript = `<script>(function(){window.__SUPABASE_TOKEN__=${JSON.stringify(session.access_token)};window.__SUPABASE_URL__=${JSON.stringify(SUPABASE_URL)};window.__LESSON_ID__=${JSON.stringify(lessonId)};})();<\/script>`
            const baseTag = baseUrl ? `<base href="${baseUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">` : ''
            html = html.replace(/<head\s*>/i, '<head>' + baseTag + authScript)
            setSrcdocHtml(html)
          } catch (_) {
            setSrcdocHtml(null)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load interactive content.')
          setContentUrl(null)
          setSrcdocHtml(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [lessonId, stateSolverUrl])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    if (srcdocHtml) return
    if (!iframeRef.current?.contentWindow || !contentUrl) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: 'auth', token: session.access_token, url: SUPABASE_URL, lessonId: lessonId || '' },
          '*'
        )
      } catch (_) {}
    })
  }

  if (loading) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-solver-content">
          <div className="so-solver-loading">
            <p className="so-solver-loading-text">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-solver-content">
          <div className="so-solver-placeholder">
            <p className="so-solver-placeholder-desc" style={{ color: 'var(--so-error, #b91c1c)' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!contentUrl) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-solver-content">
          <div className="so-solver-placeholder">
            <span className="so-solver-placeholder-icon" aria-hidden>
              <Icon name="gamepad" size={48} />
            </span>
            <h2 className="so-solver-placeholder-title">Interactive Solver</h2>
            <p className="so-solver-placeholder-desc">
              Practice steps and interactive content will appear here when generated for this lesson.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="so-screen">
      <header className="so-simple-header">
        <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-simple-title">{lessonTitle}</h1>
        <span className="so-simple-spacer" />
      </header>

      <div className="so-solver-content">
        <div className="so-solver-embed-wrap">
          {srcdocHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={srcdocHtml}
              title="Interactive content"
              className="so-solver-iframe"
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <iframe
              ref={iframeRef}
              src={contentUrl}
              title="Interactive content"
              className="so-solver-iframe"
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
          {!iframeLoaded && (
            <div className="so-solver-loading">
              <p className="so-solver-loading-text">Loading interactive content…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
