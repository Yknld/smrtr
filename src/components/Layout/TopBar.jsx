import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import './TopBar.css'

function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Extract page title from route
  let pageTitle = 'Study'
  
  if (location.pathname === '/home') {
    pageTitle = 'Study'
  } else if (location.pathname === '/podcast') {
    pageTitle = 'Podcasts'
  } else if (location.pathname === '/settings' || location.pathname.startsWith('/settings')) {
    pageTitle = 'Settings'
  } else if (location.pathname.startsWith('/practice')) {
    const pathParts = location.pathname.split('/')
    if (pathParts.length === 4 && (pathParts[3] === 'flashcards' || pathParts[3] === 'multiple-choice')) {
      // Practice mode screens
      pageTitle = pathParts[3] === 'flashcards' ? 'Flashcards' : 'Multiple Choice'
    } else if (pathParts.length === 4 && pathParts[3] === 'mode') {
      pageTitle = 'Choose Mode'
    } else if (pathParts.length === 4 && pathParts[3] === 'lectures') {
      const className = searchParams.get('className')
      pageTitle = className ? `Practice · ${className}` : 'Select Lectures'
    } else {
      pageTitle = 'Practice'
    }
  } else if (location.pathname.startsWith('/classes/')) {
    const pathParts = location.pathname.split('/')
    if (pathParts.length === 6 && pathParts[4] === 'translate') {
      // Translation screen
      pageTitle = 'Translate Lecture'
    } else if (pathParts.length === 5 && pathParts[3] === 'notes') {
      // Study Hub screen - extract from URL params or use placeholder
      const noteTitle = searchParams.get('noteTitle')
      pageTitle = noteTitle || 'Study Hub'
    } else if (pathParts.length === 3) {
      // Class Notes screen - get class name from query params
      const className = searchParams.get('className')
      pageTitle = className || 'Class Notes'
    }
  }

  return (
    <div className="top-bar">
      <div className="top-bar__content">
        <div className="top-bar__logo">
          <button 
            className="top-bar__logo-button"
            onClick={() => navigate('/')}
          >
            Smartr
          </button>
        </div>
        <nav className="top-bar__nav">
          <Link 
            to="/home" 
            className={`top-bar__nav-item ${location.pathname === '/home' ? 'top-bar__nav-item--active' : ''}`}
          >
            <span className="top-bar__nav-icon">📚</span>
            <span>Classes</span>
          </Link>
          <Link 
            to="/podcast" 
            className={`top-bar__nav-item ${location.pathname.startsWith('/podcast') ? 'top-bar__nav-item--active' : ''}`}
          >
            <span className="top-bar__nav-icon">🎙️</span>
            <span>Podcasts</span>
          </Link>
          <Link 
            to="/settings" 
            className={`top-bar__nav-item ${location.pathname.startsWith('/settings') ? 'top-bar__nav-item--active' : ''}`}
          >
            <span className="top-bar__nav-icon">⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>
        <div className="top-bar__title-section">
          <h1 className="top-bar__title">{pageTitle}</h1>
        </div>
        <div className="top-bar__actions">
          <button 
            className="top-bar__auth-button"
            onClick={() => navigate('/login')}
          >
            Sign up / Log in
          </button>
        </div>
      </div>
    </div>
  )
}

export default TopBar
