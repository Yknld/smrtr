/**
 * Interactive Solver – same flow as study-os-mobile InteractiveSolverScreen:
 * 1. Check interactive_module_get for lesson.
 * 2. Always use iframe src (same-origin /solver in dev, same-origin or SOLVER_VIEWER_URL in prod). Auth + Gemini key via postMessage on load.
 *    (Srcdoc with cross-origin base was removed: it triggered CSP and blocked assets.)
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

        // Dev: same-origin /solver from Vite. Production: prefer same-origin /solver (built into dist) so assets load; SOLVER_VIEWER_URL override if set.
        const sameOriginSolver = typeof window !== 'undefined' ? `${window.location.origin}/solver/solver.html` : ''
        const directUrl = USE_PROXY
          ? `${typeof window !== 'undefined' ? window.location.origin : ''}/solver/solver.html?lesson_id=${encodeURIComponent(lessonId)}`
          : (() => {
              const viewerUrl = (SOLVER_VIEWER_URL || '').trim()
              const base = sameOriginSolver || viewerUrl
              if (!base) {
                setError('Solver viewer URL not configured.')
                setContentUrl(null)
                setSrcdocHtml(null)
                setLoading(false)
                return null
              }
              const sep = base.includes('?') ? '&' : '?'
              return `${base}${sep}lesson_id=${encodeURIComponent(lessonId)}`
            })()
        if (directUrl === null) return
        setError(null)
        setContentUrl(directUrl)

        // Always use iframe src (never srcdoc). Srcdoc with cross-origin base triggers CSP and blocks assets.
        // Auth and Gemini key are sent via postMessage in handleIframeLoad.
        setSrcdocHtml(null)
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

  const geminiApiKey = typeof import.meta?.env?.VITE_GEMINI_API_KEY === 'string' ? import.meta.env.VITE_GEMINI_API_KEY.trim() : ''

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    if (srcdocHtml) return
    if (!iframeRef.current?.contentWindow || !contentUrl) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      try {
        const payload = { type: 'auth', token: session.access_token, url: SUPABASE_URL, lessonId: lessonId || '' }
        if (geminiApiKey) payload.geminiApiKey = geminiApiKey
        iframeRef.current.contentWindow.postMessage(payload, '*')
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
            {lessonId && isValidUuid(lessonId) && (
              <button
                type="button"
                className="so-solver-placeholder-back"
                onClick={() => navigate(`/app/lesson/${lessonId}`, { state: { lessonTitle } })}
              >
                Back to Lesson
              </button>
            )}
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
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          ) : (
            <iframe
              ref={iframeRef}
              src={contentUrl}
              title="Interactive content"
              className="so-solver-iframe"
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin allow-modals"
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
