import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getClassColor } from '../data/classColors'
import './StudyHub.css'

const GENERATED_OUTPUTS = [
  {
    id: 'summary',
    title: 'Summary Notes',
    type: 'summary',
    status: 'Ready',
    duration: '5 min read',
    icon: '📝',
    description: 'Key points and concepts extracted from the lecture'
  },
  {
    id: 'audio',
    title: 'Audio Lesson',
    type: 'audio',
    status: 'Ready',
    duration: '15 min',
    icon: '🎙️',
    description: 'Narrated audio version of the lecture content'
  },
  {
    id: 'video',
    title: 'Animated Video',
    type: 'video',
    status: 'Processing',
    duration: '12 min',
    icon: '🎬',
    description: 'Visual animated explanation of key concepts'
  },
  {
    id: 'concepts',
    title: 'Key Concepts',
    type: 'concepts',
    status: 'Ready',
    duration: '20 items',
    icon: '💡',
    description: 'Important concepts and definitions highlighted'
  }
]

const getStatusConfig = (status) => {
  switch (status) {
    case 'Ready':
      return {
        label: 'Ready',
        color: 'var(--color-status-ready)',
        bgColor: 'var(--color-status-ready-bg)'
      }
    case 'Processing':
      return {
        label: 'Processing',
        color: 'var(--color-status-processing)',
        bgColor: 'var(--color-status-processing-bg)'
      }
    case 'Failed':
      return {
        label: 'Failed',
        color: 'var(--color-status-failed)',
        bgColor: 'var(--color-status-failed-bg)'
      }
    default:
      return {
        label: 'Ready',
        color: 'var(--color-status-ready)',
        bgColor: 'var(--color-status-ready-bg)'
      }
  }
}

const getActionLabel = (type, status) => {
  if (status === 'Processing') return 'Generating...'
  if (type === 'audio' || type === 'video') return 'Play'
  return 'View'
}

function StudyHub() {
  const { classId, noteId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const noteTitle = searchParams.get('noteTitle') || 'Lecture'
  const className = searchParams.get('className') || 'Class'
  const bloomColor = getClassColor(classId)

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div 
      className="screen study-hub"
      style={{ '--bloom-color': bloomColor }}
    >
      <div className="study-hub__header">
        <button
          className="study-hub__back-button"
          onClick={handleBack}
        >
          ← Back
        </button>
        <div className="study-hub__header-content">
          <h2 className="study-hub__title">{noteTitle}</h2>
          <div className="study-hub__meta">
            <span className="study-hub__class">{className}</span>
            <span className="study-hub__separator">•</span>
            <span className="study-hub__duration">15 min</span>
          </div>
        </div>
      </div>

      <div className="study-hub__content">
        <div className="study-hub__section">
          <h3 className="study-hub__section-title">Generated Outputs</h3>
          <p className="study-hub__section-description">
            Content generated from this lecture
          </p>

          <div className="study-hub__outputs-grid">
            {GENERATED_OUTPUTS.map(output => (
              <OutputCard
                key={output.id}
                id={output.id}
                title={output.title}
                type={output.type}
                status={output.status}
                duration={output.duration}
                icon={output.icon}
                description={output.description}
                noteTitle={noteTitle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function OutputCard({ id, title, type, status, duration, icon, description, noteTitle }) {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  const statusConfig = getStatusConfig(status)
  const actionLabel = getActionLabel(type, status)

  const handleViewClick = (e) => {
    e.stopPropagation()
    if (status === 'Ready') {
      // Navigate to view/play the output (placeholder for now)
      // Could navigate to a detail view or open a modal
      console.log(`View ${type}: ${id}`)
    }
  }

  return (
    <div
      className="study-hub__output-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="study-hub__output-card-content">
        <div className="study-hub__output-icon">{icon}</div>
        <div className="study-hub__output-info">
          <h4 className="study-hub__output-title">{title}</h4>
          <p className="study-hub__output-description">{description}</p>
          <div className="study-hub__output-meta">
            <span className="study-hub__output-duration">{duration}</span>
            <div
              className="study-hub__output-status"
              style={{
                color: statusConfig.color,
                backgroundColor: statusConfig.bgColor
              }}
            >
              {statusConfig.label}
            </div>
          </div>
        </div>
      </div>
      {isHovered && status === 'Ready' && (
        <div className="study-hub__output-action">
          <button
            className="study-hub__action-button"
            onClick={handleViewClick}
          >
            {actionLabel}
          </button>
        </div>
      )}
      {status === 'Processing' && (
        <div className="study-hub__processing-indicator">
          <div className="study-hub__processing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyHub
