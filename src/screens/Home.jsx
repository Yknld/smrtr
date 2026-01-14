import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmationDialog from '../components/ConfirmationDialog/ConfirmationDialog'
import './Home.css'

// Mock data - exactly 4 classes
const MOCK_CLASSES = [
  {
    id: '1',
    name: 'Introduction to Computer Science',
    color: '#4F46E5',
    noteCount: 12,
    lastOpenedAt: new Date(2024, 0, 15, 10, 30).toISOString()
  },
  {
    id: '2',
    name: 'Linear Algebra',
    color: '#10B981',
    noteCount: 8,
    lastOpenedAt: new Date(2024, 0, 16, 14, 20).toISOString()
  },
  {
    id: '3',
    name: 'History of Art',
    color: '#F59E0B',
    noteCount: 5,
    lastOpenedAt: new Date(2024, 0, 14, 9, 15).toISOString()
  },
  {
    id: '4',
    name: 'Organic Chemistry',
    color: '#EF4444',
    noteCount: 15,
    lastOpenedAt: new Date(2024, 0, 13, 16, 45).toISOString()
  }
]

// Mock data for Continue Learning - last 2 lectures with progress
const CONTINUE_LEARNING = [
  {
    id: 'n1',
    classId: '1',
    className: 'Introduction to Computer Science',
    classColor: '#4F46E5',
    title: 'Introduction to Algorithms',
    progress: 65,
    duration: 12,
    lastAccessedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'n4',
    classId: '2',
    className: 'Linear Algebra',
    classColor: '#10B981',
    title: 'Matrix Operations',
    progress: 40,
    duration: 10,
    lastAccessedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
  }
]

// Actions section cards - removed, moved to ClassNotes page

function Home() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState(null)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
      setClasses(MOCK_CLASSES)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setClasses(MOCK_CLASSES)
    }, 800)
  }

  const filterClasses = () => {
    if (error) return []
    if (filter === 'All') return classes
    if (filter === 'Today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return classes.filter(cls => {
        const lastOpened = new Date(cls.lastOpenedAt)
        return lastOpened >= today
      })
    }
    if (filter === 'Recent') {
      const recent = new Date()
      recent.setDate(recent.getDate() - 7) // Last 7 days
      return classes.filter(cls => {
        const lastOpened = new Date(cls.lastOpenedAt)
        return lastOpened >= recent
      })
    }
    return classes
  }

  const filteredClasses = filterClasses()

  const handleClassClick = (classId, className) => {
    navigate(`/classes/${classId}?className=${encodeURIComponent(className)}`)
  }

  const handleActionClick = (actionId) => {
    switch (actionId) {
      case 'practice':
        navigate('/practice')
        break
      case 'notes':
        // Navigate to first continue learning item or study hub
        if (CONTINUE_LEARNING.length > 0) {
          const first = CONTINUE_LEARNING[0]
          navigate(`/classes/${first.classId}/notes/${first.id}?className=${encodeURIComponent(first.className)}&noteTitle=${encodeURIComponent(first.title)}`)
        }
        break
      case 'flashcards':
        // Navigate to practice flashcards if we have a class
        if (classes.length > 0) {
          navigate(`/practice/${classes[0].id}/lectures?className=${encodeURIComponent(classes[0].name)}`)
        }
        break
      case 'quiz':
        // Navigate to practice quiz if we have a class
        if (classes.length > 0) {
          navigate(`/practice/${classes[0].id}/lectures?className=${encodeURIComponent(classes[0].name)}`)
        }
        break
      case 'podcast':
        navigate('/podcast')
        break
      default:
        break
    }
  }

  const handleAddClass = () => {
    const newClass = {
      id: String(Date.now()),
      name: 'New Class',
      color: '#4F46E5',
      noteCount: 0,
      lastOpenedAt: new Date().toISOString()
    }
    setClasses([...classes, newClass])
  }

  const handleDeleteClick = (classId, className) => {
    setClassToDelete({ id: classId, name: className })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (classToDelete) {
      setClasses(classes.filter(cls => cls.id !== classToDelete.id))
      setDeleteDialogOpen(false)
      setClassToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setClassToDelete(null)
  }

  return (
    <div className="screen home">
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Class"
        message={`Are you sure you want to delete "${classToDelete?.name}"? This action cannot be undone.`}
      />
      <div className="home__header">
        <div className="home__header-top">
          <h2 className="home__title">Study</h2>
          <button className="home__add-button" onClick={handleAddClass}>
            <span className="home__add-button-icon">+</span>
            <span>Add Class</span>
          </button>
        </div>
        <div className="home__filters">
          <button
            className={`home__filter-pill ${filter === 'All' ? 'home__filter-pill--active' : ''}`}
            onClick={() => setFilter('All')}
          >
            All
          </button>
          <button
            className={`home__filter-pill ${filter === 'Today' ? 'home__filter-pill--active' : ''}`}
            onClick={() => setFilter('Today')}
          >
            Today
          </button>
          <button
            className={`home__filter-pill ${filter === 'Recent' ? 'home__filter-pill--active' : ''}`}
            onClick={() => setFilter('Recent')}
          >
            Recent
          </button>
        </div>
      </div>

      <div className="home__content">
        {loading && (
          <div className={`home__state ${!loading ? 'home__state--fade-out' : ''}`}>
            <div className="home__skeleton-list">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="home__skeleton-row">
                  <div className="home__skeleton-left">
                    <div className="home__skeleton-color"></div>
                    <div className="home__skeleton-text">
                      <div className="home__skeleton-line home__skeleton-line--title"></div>
                      <div className="home__skeleton-line home__skeleton-line--subtitle"></div>
                    </div>
                  </div>
                  <div className="home__skeleton-chevron"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="home__state home__state--error">
            <div className="home__error-message">
              {error}
            </div>
            <button className="home__retry-button" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredClasses.length === 0 && (
          <div className="home__state home__state--empty">
            <div className="home__empty-illustration"></div>
            <div className="home__empty-message">
              No classes found
            </div>
            <div className="home__empty-submessage">
              Get started by creating your first class
            </div>
            <button className="home__cta-button">
              Create a class
            </button>
          </div>
        )}

        {!loading && !error && filteredClasses.length > 0 && (
          <>
            <div className={`home__class-list ${!loading ? 'home__class-list--fade-in' : ''}`}>
              {filteredClasses.map(cls => (
                <ClassRow
                  key={cls.id}
                  id={cls.id}
                  name={cls.name}
                  color={cls.color}
                  noteCount={cls.noteCount}
                  onClick={() => handleClassClick(cls.id, cls.name)}
                  onDelete={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(cls.id, cls.name)
                  }}
                />
              ))}
            </div>

          </>
        )}
      </div>
    </div>
  )
}

function ClassRow({ id, name, color, noteCount, onClick }) {
  return (
    <button className="home__class-row" onClick={onClick}>
      <div className="home__class-row-left">
        <div 
          className="home__class-color" 
          style={{ backgroundColor: color }}
        ></div>
        <div className="home__class-info">
          <div className="home__class-name">{name}</div>
          <div className="home__class-note-count">{noteCount} notes</div>
        </div>
      </div>
      <div className="home__class-chevron">›</div>
    </button>
  )
}

function ActionCard({ id, title, icon, onClick }) {
  return (
    <button className="home__action-card" onClick={onClick}>
      <div className="home__action-icon">{icon}</div>
      <div className="home__action-badge">GENERATE</div>
      <div className="home__action-title">{title}</div>
    </button>
  )
}

export default Home
