import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from './config/supabase'
import './AppShell.css'

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'user1@test.com'
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'password123'

export default function AppShell() {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session) {
          await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
        }
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!authReady) {
    return (
      <div className="so-app">
        <main className="so-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <p className="so-empty-subtitle">Loading…</p>
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
