import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from './config/supabase'
import './AppShell.css'

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'user1@test.com'
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'password123'

export default function AppShell() {
  const [authReady, setAuthReady] = useState(false)
  const [session, setSession] = useState(null)
  const [signInError, setSignInError] = useState(null)
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (cancelled) return
        if (s) {
          setSession(s)
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
          if (cancelled) return
          if (!error) {
            const { data: { session: s2 } } = await supabase.auth.getSession()
            setSession(s2)
          }
        }
      } catch (_) {
        // ignore
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription?.unsubscribe()
  }, [])

  const handleSignIn = async (e) => {
    e.preventDefault()
    setSignInError(null)
    setSigningIn(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setSignInError(error.message)
    } finally {
      setSigningIn(false)
    }
  }

  if (!authReady) {
    return (
      <div className="so-app">
        <main className="so-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <p className="so-empty-subtitle">Loading…</p>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="so-app">
        <main className="so-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
          <div className="so-signin-box">
            <h2 className="so-signin-title">Sign in</h2>
            <p className="so-signin-subtitle">Use your account to access lessons and notes.</p>
            <form onSubmit={handleSignIn} className="so-signin-form">
              <label className="so-signin-label">
                Email
                <input
                  type="email"
                  className="so-signin-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="so-signin-label">
                Password
                <input
                  type="password"
                  className="so-signin-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>
              {signInError && <p className="so-signin-err" role="alert">{signInError}</p>}
              <button type="submit" className="so-signin-btn" disabled={signingIn}>
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="so-signin-hint">
              No account? Create one in Supabase Dashboard (Authentication → Users) or enable sign up.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="so-app">
      <main className="so-main">
        <Outlet />
      </main>
    </div>
  )
}
