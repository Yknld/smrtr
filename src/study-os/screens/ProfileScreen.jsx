import { useNavigate } from 'react-router-dom'
import './screens.css'

export default function ProfileScreen() {
  const navigate = useNavigate()
  return (
    <div className="so-screen">
      <header className="so-header">
        <button type="button" className="so-icon-btn" onClick={() => navigate(-1)} aria-label="Back">&larr;</button>
        <h1 className="so-header-title">Profile</h1>
        <span className="so-header-spacer" />
      </header>
      <div className="so-screen-inner">
        <p className="so-empty-subtitle">Edit name, email, and bio. Connect auth to persist.</p>
      </div>
    </div>
  )
}
