/**
 * Matches study-os-mobile LessonCard.tsx structure and styles
 */
import { Icon } from './Icons'

function formatLastOpened(date) {
  if (!date) return 'Never opened'
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const LessonStatusLabels = { draft: 'Draft', ready: 'Ready', processing: 'Processing', failed: 'Failed' }
const LessonStatusColors = { draft: '#8A8A8A', ready: '#4ADE80', processing: '#60A5FA', failed: '#F87171' }

export default function LessonCard({ lesson, onPress, onLongPress, onDelete }) {
  const status = (lesson.status === 'upload' ? 'draft' : lesson.status) || 'draft'
  const statusColor = LessonStatusColors[status] || LessonStatusColors.draft
  const label = LessonStatusLabels[status] || status
  const hasOutputs = lesson.hasSummary || lesson.hasFlashcards || lesson.hasQuiz || lesson.hasVideo

  const handleMainClick = () => onPress(lesson)
  const handleDeleteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof onDelete === 'function') onDelete(lesson)
  }

  return (
    <div className="so-lesson-card">
      <div
        className="so-lesson-card-main"
        onClick={handleMainClick}
        onContextMenu={(e) => { e.preventDefault(); if (typeof onLongPress === 'function') onLongPress(lesson) }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMainClick() } }}
        aria-label={lesson.title}
      >
        <div className="so-lesson-content">
          <div className="so-lesson-header">
            <h3 className="so-lesson-title">{lesson.title}</h3>
            <span
              className="so-lesson-pill"
              style={{ backgroundColor: statusColor + '20', color: statusColor }}
            >
              {label}
            </span>
          </div>
          <p className="so-lesson-subtitle">Last opened {formatLastOpened(lesson.lastOpenedAt)}</p>
          {hasOutputs && (
            <div className="so-lesson-output-icons">
              {lesson.hasSummary && <span className="so-lesson-output-icon" aria-hidden><Icon name="fileText" size={14} /></span>}
              {lesson.hasFlashcards && <span className="so-lesson-output-icon" aria-hidden><Icon name="layers" size={14} /></span>}
              {lesson.hasQuiz && <span className="so-lesson-output-icon" aria-hidden><Icon name="help" size={14} /></span>}
              {lesson.hasVideo && <span className="so-lesson-output-icon" aria-hidden><Icon name="video" size={14} /></span>}
            </div>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          className="so-lesson-card-delete"
          onClick={handleDeleteClick}
          aria-label="Delete lesson"
          title="Delete lesson"
        >
          <Icon name="trash" size={18} />
        </button>
      )}
    </div>
  )
}
