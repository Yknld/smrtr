/**
 * Matches study-os-mobile CourseDetailScreen.tsx – uses Supabase for signed-in user (same data as phone).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchLessons, createLesson, deleteLesson } from '../data/lessons.repository'
import { deleteCourse } from '../data/courses.repository'
import { isValidUuid } from '../utils/uuid'
import LessonCard from '../components/LessonCard'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import FAB from '../components/FAB'
import { Icon } from '../components/Icons'
import './screens.css'

export default function CourseDetailScreen() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const courseTitle = location.state?.courseTitle || 'Course'

  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [newLessonName, setNewLessonName] = useState('')
  const [creating, setCreating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadLessons = async () => {
    if (!isValidUuid(courseId)) {
      setLoading(false)
      setRefreshing(false)
      navigate('/app', { replace: true })
      return
    }
    setLoading(true)
    try {
      const data = await fetchLessons(courseId)
      setLessons(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load lessons:', e?.message)
      setLessons([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLessons()
  }, [courseId])

  const handleLessonPress = (lesson) => {
    navigate(`/app/lesson/${lesson.id}`, { state: { lessonTitle: lesson.title } })
  }

  const handleCreateLesson = async (e) => {
    e?.preventDefault()
    const name = (newLessonName || '').trim() || `Lesson ${lessons.length + 1}`
    if (!isValidUuid(courseId)) return
    setCreating(true)
    try {
      const newLesson = await createLesson(courseId, name, 'upload')
      setSheetVisible(false)
      setNewLessonName('')
      await loadLessons()
      navigate(`/app/lesson/${newLesson.id}`, { state: { lessonTitle: newLesson.title } })
    } catch (e) {
      console.error('Failed to create lesson:', e?.message)
    } finally {
      setCreating(false)
    }
  }

  const closeModal = () => {
    setSheetVisible(false)
    setNewLessonName('')
  }

  const handleDeleteCourse = async () => {
    setMenuOpen(false)
    if (!window.confirm(`Delete course "${courseTitle}"? All lessons in this course will be removed.`)) return
    setDeleting(true)
    try {
      await deleteCourse(courseId)
      navigate('/app', { replace: true })
    } catch (e) {
      console.error('Failed to delete course:', e?.message)
      alert(e?.message || 'Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return
    try {
      await deleteLesson(lesson.id)
      await loadLessons()
    } catch (e) {
      console.error('Failed to delete lesson:', e?.message)
      alert(e?.message || 'Failed to delete lesson')
    }
  }

  return (
    <div className="so-screen">
      {/* Header – same as iOS */}
      <div className="so-detail-header">
        <button type="button" className="so-detail-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-detail-title">{courseTitle}</h1>
        <div className="so-detail-menu-wrap">
          <button
            type="button"
            className="so-detail-menu-btn"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={deleting}
          >
            <Icon name="more" size={24} />
          </button>
          {menuOpen && (
            <>
              <div className="so-detail-menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="so-detail-menu-dropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="so-detail-menu-item so-detail-menu-item--danger"
                  onClick={handleDeleteCourse}
                >
                  Delete course
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="so-screen-inner">
        {loading ? (
          <div className="so-detail-loading-wrap">
            <LoadingState count={5} />
          </div>
        ) : lessons.length === 0 ? (
          <div className="so-detail-empty-wrap">
            <EmptyState
              title="No lessons yet"
              subtitle="Create your first lesson or import content"
            />
          </div>
        ) : (
          <div className="so-detail-lesson-list">
            {refreshing && <div className="so-refresh-bar">Refreshing...</div>}
            <div className="so-detail-lesson-list-content">
              {lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onPress={handleLessonPress}
                  onLongPress={handleDeleteLesson}
                  onDelete={handleDeleteLesson}
                />
              ))}
            </div>
          </div>
        )}

        <FAB onPress={() => setSheetVisible(true)} ariaLabel="Add lesson" />

        {sheetVisible && (
          <div className="so-modal-overlay" role="dialog" aria-modal="true">
            <div className="so-modal-backdrop" onClick={closeModal} />
            <div className="so-modal so-modal-sm">
              <h2 className="so-modal-title">New lesson</h2>
              <form onSubmit={handleCreateLesson}>
                <div className="so-modal-section">
                  <input
                    type="text"
                    className="so-modal-input"
                    placeholder="Lesson name"
                    value={newLessonName}
                    onChange={(e) => setNewLessonName(e.target.value)}
                    autoFocus
                    disabled={creating}
                  />
                </div>
                <div className="so-modal-actions">
                  <button type="button" className="so-modal-btn so-modal-btn--cancel" onClick={closeModal} disabled={creating}>
                    Cancel
                  </button>
                  <button type="submit" className="so-modal-btn so-modal-btn--create" disabled={creating}>
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
