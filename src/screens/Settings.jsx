import { useNavigate } from 'react-router-dom'
import './Settings.css'

function Settings() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  const handleMenuClick = (path) => {
    // TODO: Navigate to respective settings pages
    console.log('Navigate to:', path)
  }

  return (
    <div className="screen settings">
      <div className="settings__header">
        <button className="settings__back-button" onClick={handleBack}>
          ← Back
        </button>
        <h1 className="settings__title">Settings</h1>
      </div>

      <div className="settings__content">
        {/* User Account Section */}
        <div className="settings__user-section">
          <div className="settings__user-avatar">U</div>
          <div className="settings__user-name">user1</div>
          <div className="settings__user-email">user1@test.com</div>
        </div>

        {/* ACCOUNT Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">ACCOUNT</h2>
          <div className="settings__menu">
            <button className="settings__menu-item" onClick={() => handleMenuClick('/settings/profile')}>
              <span className="settings__menu-label">Profile</span>
              <span className="settings__menu-chevron">›</span>
            </button>
            <button className="settings__menu-item" onClick={() => handleMenuClick('/settings/notifications')}>
              <span className="settings__menu-label">Notifications</span>
              <span className="settings__menu-chevron">›</span>
            </button>
          </div>
        </div>

        {/* STUDY Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">STUDY</h2>
          <div className="settings__menu">
            <button className="settings__menu-item" onClick={() => handleMenuClick('/settings/study-preferences')}>
              <span className="settings__menu-label">Study Preferences</span>
              <span className="settings__menu-chevron">›</span>
            </button>
            <button className="settings__menu-item" onClick={() => handleMenuClick('/settings/language')}>
              <span className="settings__menu-label">Language</span>
              <span className="settings__menu-chevron">›</span>
            </button>
          </div>
        </div>

        {/* ABOUT Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">ABOUT</h2>
          <div className="settings__menu">
            <button className="settings__menu-item" onClick={() => handleMenuClick('/settings/help')}>
              <span className="settings__menu-label">Help & Support</span>
              <span className="settings__menu-chevron">›</span>
            </button>
            <button className="settings__menu-item" onClick={() => handleMenuClick('/settings/privacy')}>
              <span className="settings__menu-label">Privacy Policy</span>
              <span className="settings__menu-chevron">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
