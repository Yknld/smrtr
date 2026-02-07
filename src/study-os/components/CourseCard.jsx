function formatCreatedAt(date) {
  if (!date) return ''
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export default function CourseCard({ course, onPress }) {
  const accent = course.color || 'var(--so-primary)'
  const lessonCount = course.lessonCount ?? 0

  return (
    <button
      type="button"
      className="so-course-card"
      onClick={() => onPress(course)}
    >
      <span className="so-course-card-accent" style={{ background: accent }} />
      <div className="so-course-card-content">
        <h3 className="so-course-card-title">{course.title}</h3>
        <p className="so-course-card-subtitle">
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          {' · '}
          Created {formatCreatedAt(course.createdAt)}
        </p>
        {course.term && <p className="so-course-card-term">{course.term}</p>}
      </div>
    </button>
  )
}
