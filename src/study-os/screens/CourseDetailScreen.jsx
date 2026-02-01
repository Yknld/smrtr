/**
 * Matches study-os-mobile CourseDetailScreen.tsx – uses Supabase for signed-in user (same data as phone).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchLessons, createLesson } from '../data/lessons.repository'
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

  const handleCreateBlankLesson = async () => {
    setSheetVisible(false)
    if (!isValidUuid(courseId)) return
    try {
      const newLesson = await createLesson(courseId, `Lesson ${lessons.length + 1}`, 'upload')
      await loadLessons()
      navigate(`/app/lesson/${newLesson.id}`, { state: { lessonTitle: newLesson.title } })
    } catch (e) {
      console.error('Failed to create lesson:', e?.message)
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
        <button type="button" className="so-detail-menu-btn" aria-label="Menu">
          <Icon name="more" size={24} />
        </button>
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
                />
              ))}
            </div>
          </div>
        )}

        <FAB onPress={() => setSheetVisible(true)} ariaLabel="Add lesson" />

        {sheetVisible && (
          <div className="so-modal-overlay" role="dialog" aria-modal="true">
            <div className="so-modal-backdrop" onClick={() => setSheetVisible(false)} />
            <div className="so-modal so-modal-sm">
              <h2 className="so-modal-title">New lesson</h2>
              <button type="button" className="so-sheet-item" onClick={handleCreateBlankLesson}>
                New Blank Lesson
              </button>
              <button type="button" className="so-sheet-item" onClick={() => setSheetVisible(false)}>
                Import YouTube
              </button>
              <button type="button" className="so-sheet-item" onClick={() => setSheetVisible(false)}>
                Upload Files
              </button>
              <button type="button" className="so-modal-btn so-modal-btn--cancel" onClick={() => setSheetVisible(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
