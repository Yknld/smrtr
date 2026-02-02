/**
 * Matches study-os-mobile SettingsScreen.tsx structure and behavior
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icons'
import './screens.css'

const MOCK_USER = { name: 'User', email: 'user@example.com' }

export default function SettingsScreen() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    setUserName(MOCK_USER.name)
    setUserEmail(MOCK_USER.email)
  }, [])

  const handleSignOut = () => {
    console.log('Sign out')
  }

  return (
    <div className="so-screen">
      <div className="so-settings-header">
        <button
          type="button"
          className="so-settings-header-back"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-settings-title">Settings</h1>
        <button
          type="button"
          className="so-settings-header-profile"
          onClick={() => navigate('/app/settings/profile')}
          aria-label="Profile"
          title="Profile"
        >
          <Icon name="person" size={24} />
        </button>
      </div>

      <div className="so-settings-content">
        {/* Profile Section – same as iOS */}
        <button
          type="button"
          className="so-settings-profile-section"
          onClick={() => navigate('/app/settings/profile')}
        >
          <div className="so-settings-avatar">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <p className="so-settings-profile-name">{userName}</p>
          <p className="so-settings-profile-email">{userEmail}</p>
        </button>

        {/* Analytics – same as iOS */}
        <div className="so-settings-section">
          <button
            type="button"
            className="so-settings-analytics-card"
            onClick={() => navigate('/app/settings/analytics')}
          >
            <div className="so-settings-analytics-content">
              <p className="so-settings-analytics-title">Your Study Analytics</p>
              <p className="so-settings-analytics-desc">View your progress and insights</p>
            </div>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
        </div>

        {/* Account – same as iOS */}
        <div className="so-settings-section">
          <h2 className="so-settings-section-title">Account</h2>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/profile')}>
            <span>Profile</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/notifications')}>
            <span>Notifications</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
        </div>

        {/* Study – same as iOS */}
        <div className="so-settings-section">
          <h2 className="so-settings-section-title">Study</h2>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/study-preferences')}>
            <span>Study Preferences</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/language')}>
            <span>Language</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
        </div>

        {/* About – same as iOS */}
        <div className="so-settings-section">
          <h2 className="so-settings-section-title">About</h2>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/help')}>
            <span>Help & Support</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/privacy')}>
            <span>Privacy Policy</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
          <button type="button" className="so-settings-item" onClick={() => navigate('/app/settings/terms')}>
            <span>Terms of Service</span>
            <span className="so-settings-item-icon"><Icon name="chevronRight" size={20} /></span>
          </button>
        </div>

        <button type="button" className="so-sign-out-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
