import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getClassColor } from '../data/classColors'
import FloatingActionButton from '../components/FloatingActionButton/FloatingActionButton'
import AddMaterialModal from '../components/AddMaterialModal/AddMaterialModal'
import EditNoteModal from '../components/EditNoteModal/EditNoteModal'
import './ClassNotes.css'

// Mock data for lectures/notes
const MOCK_NOTES = [
  {
    id: 'n1',
    title: 'Introduction to Algorithms',
    duration: 12,
    status: 'Finished',
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'n2',
    title: 'Data Structures Overview',
    duration: 15,
    status: 'Unfinished',
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'n3',
    title: 'Sorting Algorithms',
    duration: 18,
    status: 'Finished',
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'n4',
    title: 'Search Algorithms',
    duration: 10,
    status: 'Unfinished',
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
]

// Actions section cards
const ACTIONS = [
  {
    id: 'flashcards',
    title: 'Flashcards',
    icon: '📄',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    icon: '?',
  },
  {
    id: 'podcast',
    title: 'Podcast',
    icon: '🎙️',
  }
]

function ClassNotes() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const className = searchParams.get('className') || 'Class'

  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [noteToEdit, setNoteToEdit] = useState(null)

  const bloomColor = getClassColor(classId || '1')

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
      setNotes(MOCK_NOTES)
    }, 800)

    return () => clearTimeout(timer)
  }, [classId])

  const handleBack = () => {
    navigate('/home')
  }

  const handleNoteClick = (noteId, noteTitle) => {
    navigate(`/classes/${classId}/notes/${noteId}?className=${encodeURIComponent(className)}&noteTitle=${encodeURIComponent(noteTitle)}`)
  }

  const handleUploadComplete = (newNote) => {
    setNotes(prev => [newNote, ...prev])
    setIsAddModalOpen(false)
  }

  const handleEditClick = (note) => {
    setNoteToEdit(note)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = (updatedNote) => {
    setNotes(prev => prev.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    ))
    setIsEditModalOpen(false)
    setNoteToEdit(null)
  }

  const handleActionClick = (actionId) => {
    switch (actionId) {
      case 'flashcards':
        navigate(`/practice/${classId}/lectures?className=${encodeURIComponent(className)}`)
        break
      case 'quiz':
        navigate(`/practice/${classId}/lectures?className=${encodeURIComponent(className)}`)
        break
      case 'podcast':
        navigate('/podcast')
        break
      default:
        break
    }
  }

  return (
    <div 
      className="screen class-notes"
      style={{ '--bloom-color': bloomColor }}
    >
      <div className="class-notes__header">
        <button
          className="class-notes__back-button"
          onClick={handleBack}
        >
          ← Back
        </button>
        <h2 className="class-notes__title">{className}</h2>
      </div>

      <div className="class-notes__content">
        {loading && (
          <div className="class-notes__state">
            <div className="class-notes__skeleton-list">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="class-notes__skeleton-row">
                  <div className="class-notes__skeleton-left">
                    <div className="class-notes__skeleton-text">
                      <div className="class-notes__skeleton-line class-notes__skeleton-line--title"></div>
                      <div className="class-notes__skeleton-line class-notes__skeleton-line--subtitle"></div>
                    </div>
                  </div>
                  <div className="class-notes__skeleton-right">
                    <div className="class-notes__skeleton-line class-notes__skeleton-line--duration"></div>
                    <div className="class-notes__skeleton-pill"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="class-notes__state class-notes__state--empty">
            <div className="class-notes__empty-illustration"></div>
            <div className="class-notes__empty-message">No notes yet</div>
            <div className="class-notes__empty-submessage">Add your first lecture or material</div>
          </div>
        )}

        {!loading && notes.length > 0 && (
          <>
            <div className="class-notes__note-list">
              {notes.map(note => (
                <NoteRow
                  key={note.id}
                  note={note}
                  onClick={() => handleNoteClick(note.id, note.title)}
                  onEdit={() => handleEditClick(note)}
                />
              ))}
            </div>

            {/* ACTIONS Section */}
            <div className="class-notes__actions-section">
              <h3 className="class-notes__actions-title">ACTIONS</h3>
              <div className="class-notes__actions-grid">
                {ACTIONS.map(action => (
                  <ActionCard
                    key={action.id}
                    id={action.id}
                    title={action.title}
                    icon={action.icon}
                    onClick={() => handleActionClick(action.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {!loading && (
        <FloatingActionButton
          onClick={() => setIsAddModalOpen(true)}
          classId={classId}
        />
      )}

      <AddMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        classId={classId}
      />

      {noteToEdit && (
        <EditNoteModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setNoteToEdit(null)
          }}
          onSave={handleSaveEdit}
          note={noteToEdit}
        />
      )}
    </div>
  )
}

function NoteRow({ note, onClick, onEdit }) {
  const statusConfig = {
    'Finished': {
      label: 'Finished',
      color: 'var(--color-status-ready)',
      bgColor: 'var(--color-status-ready-bg)'
    },
    'Unfinished': {
      label: 'Unfinished',
      color: 'var(--color-status-processing)',
      bgColor: 'var(--color-status-processing-bg)'
    },
    'Processing': {
      label: 'Processing',
      color: 'var(--color-status-processing)',
      bgColor: 'var(--color-status-processing-bg)'
    }
  }

  const config = statusConfig[note.status] || statusConfig['Unfinished']

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  return (
    <div className="class-notes__note-row" onClick={onClick}>
      <div className="class-notes__note-left">
        <div className="class-notes__note-info">
          <div className="class-notes__note-title">{note.title}</div>
          <div className="class-notes__note-meta">
            <span className="class-notes__note-duration">{note.duration} min</span>
            <span className="class-notes__note-separator">•</span>
            <span className="class-notes__note-date">{formatDate(note.updatedAt)}</span>
          </div>
        </div>
      </div>
      <div className="class-notes__note-right">
        <span
          className="class-notes__note-status"
          style={{
            color: config.color,
            backgroundColor: config.bgColor
          }}
        >
          {config.label}
        </span>
        <button
          className="class-notes__note-edit"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function ActionCard({ id, title, icon, onClick }) {
  return (
    <button className="class-notes__action-card" onClick={onClick}>
      <div className="class-notes__action-icon">{icon}</div>
      <div className="class-notes__action-badge">GENERATE</div>
      <div className="class-notes__action-title">{title}</div>
    </button>
  )
}

export default ClassNotes
