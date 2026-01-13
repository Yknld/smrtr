import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

function Sidebar({ isCollapsed, onToggle }) {
  const location = useLocation()

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <div className="sidebar__logo">
          {!isCollapsed && <span>Smartr</span>}
        </div>
        <button 
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="sidebar__nav">
        <Link 
          to="/" 
          className={`sidebar__nav-item ${location.pathname === '/' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-icon">📚</span>
          {!isCollapsed && <span>Classes</span>}
        </Link>
        <Link 
          to="/practice" 
          className={`sidebar__nav-item ${location.pathname.startsWith('/practice') ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-icon">✏️</span>
          {!isCollapsed && <span>Practice</span>}
        </Link>
      </nav>
      <div className="sidebar__footer">
        <div className="sidebar__user">
          {!isCollapsed && <span>User</span>}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
