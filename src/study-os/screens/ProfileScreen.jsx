/**
 * Profile – show signed-in user from Supabase. Matches sub-screen layout (Analytics, etc.).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Icon } from '../components/Icons'
import './screens.css'

export default function ProfileScreen() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!cancelled) {
        setUser(u ?? null)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'User'
  const email = user?.email ?? ''

  return (
    <div className="so-screen">
      <header className="so-sub-header">
        <button type="button" className="so-sub-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-sub-title">Profile</h1>
        <span className="so-sub-spacer" />
      </header>

      <div className="so-screen-inner" style={{ padding: 16 }}>
        {loading ? (
          <p className="so-empty-subtitle">Loading…</p>
        ) : user ? (
          <div className="so-settings-profile-section" style={{ cursor: 'default', marginBottom: 24 }}>
            <div className="so-settings-avatar">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <p className="so-settings-profile-name">{displayName}</p>
            <p className="so-settings-profile-email">{email}</p>
          </div>
        ) : (
          <p className="so-empty-subtitle">Not signed in.</p>
        )}
      </div>
    </div>
  )
}
