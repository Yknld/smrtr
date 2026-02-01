/**
 * Matches study-os-mobile PodcastsScreen.tsx – loads real courses with podcasts from Supabase.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCoursesWithPodcasts } from '../data/podcasts.repository'
import EmptyState from '../components/EmptyState'
import { Icon } from '../components/Icons'
import './screens.css'

function formatDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - d.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}

export default function PodcastsScreen() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchCoursesWithPodcasts()
      setCourses(data)
    } catch (e) {
      console.error('Failed to load courses with podcasts:', e)
      setCourses([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCoursePress = (course) => {
    navigate(`/app/podcasts/course/${course.id}`, { state: { courseTitle: course.title } })
  }

  if (loading) {
    return (
      <div className="so-screen">
        <div className="so-podcasts-header">
          <h1 className="so-podcasts-title">Podcasts</h1>
        </div>
        <div className="so-podcasts-empty-container">
          <p className="so-podcasts-loading-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="so-screen">
        <div className="so-podcasts-header">
          <h1 className="so-podcasts-title">Podcasts</h1>
        </div>
        <div className="so-screen-inner">
          <EmptyState
            title="No podcasts yet"
            subtitle="Generate podcasts from your lessons to listen on the go"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="so-screen">
      <div className="so-podcasts-header">
        <h1 className="so-podcasts-title">Podcasts</h1>
      </div>
      <div className="so-screen-inner so-podcasts-content">
        {refreshing && <div className="so-refresh-bar">Refreshing...</div>}
        <div className="so-podcasts-content-inner">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              className="so-podcasts-course-card"
              onClick={() => handleCoursePress(course)}
            >
              <span
                className="so-podcasts-course-indicator"
                style={{ backgroundColor: course.color || 'var(--so-primary)' }}
              />
              <div className="so-podcasts-course-content">
                <div className="so-podcasts-course-header">
                  <span className="so-podcasts-course-title">{course.title}</span>
                  <span className="so-podcasts-chevron"><Icon name="chevronRight" size={20} /></span>
                </div>
                <div className="so-podcasts-course-meta">
                  <span className="so-podcasts-course-meta-text so-podcasts-course-meta-icon"><Icon name="headphones" size={14} /></span>
                  <span className="so-podcasts-course-meta-text">
                    {course.podcastCount} {course.podcastCount === 1 ? 'podcast' : 'podcasts'}
                  </span>
                  <span className="so-podcasts-course-meta-text">•</span>
                  <span className="so-podcasts-course-meta-text">{formatDate(course.lastPodcastAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
