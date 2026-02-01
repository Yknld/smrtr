import { useNavigate } from 'react-router-dom'
import './screens.css'

export default function TermsOfServiceScreen() {
  const navigate = useNavigate()
  return (
    <div className="so-screen">
      <header className="so-header">
        <button type="button" className="so-icon-btn" onClick={() => navigate(-1)} aria-label="Back">&larr;</button>
        <h1 className="so-header-title">Terms of Service</h1>
        <span className="so-header-spacer" />
      </header>
      <div className="so-screen-inner">
        <p className="so-empty-subtitle">Terms and conditions of use.</p>
      </div>
    </div>
  )
}
