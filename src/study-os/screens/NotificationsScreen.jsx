import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './screens.css'

export default function NotificationsScreen() {
  const navigate = useNavigate()
  const [pushEnabled, setPushEnabled] = useState(true)
  const [studyReminders, setStudyReminders] = useState(true)
  return (
    <div className="so-screen">
      <header className="so-header">
        <button type="button" className="so-icon-btn" onClick={() => navigate(-1)} aria-label="Back">&larr;</button>
        <h1 className="so-header-title">Notifications</h1>
        <span className="so-header-spacer" />
      </header>
      <div className="so-screen-inner">
        <section className="so-settings-section">
          <h2 className="so-settings-section-title">Push</h2>
          <label className="so-settings-toggle">
            <span>Enable Push Notifications</span>
            <input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} />
          </label>
          <label className="so-settings-toggle">
            <span>Study Reminders</span>
            <input type="checkbox" checked={studyReminders} onChange={(e) => setStudyReminders(e.target.checked)} />
          </label>
        </section>
      </div>
    </div>
  )
}
