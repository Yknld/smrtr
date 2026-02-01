/**
 * Matches study-os-mobile CoursePodcastsScreen.tsx – loads real podcasts for course from Supabase.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchCoursePodcasts } from '../data/podcasts.repository'
import EmptyState from '../components/EmptyState'
import { Icon } from '../components/Icons'
import './screens.css'

function formatDuration(durationMs) {
  if (!durationMs) return '--:--'
  const totalSeconds = Math.floor(durationMs / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(date) {
  if (!date) return '--'
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}

export default function CoursePodcastsScreen() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const courseTitle = location.state?.courseTitle || 'Podcasts'

  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchCoursePodcasts(courseId)
      setPodcasts(data)
    } catch (e) {
      console.error('Failed to load course podcasts:', e)
      setPodcasts([])
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const handlePodcastPress = (item) => {
    navigate(`/app/podcasts/play/${item.lessonId}`, {
      state: {
        lessonTitle: item.lessonTitle,
      },
    })
  }

  return (
    <div className="so-screen">
      <div className="so-sub-header">
        <button type="button" className="so-sub-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-sub-title">{courseTitle}</h1>
        <span className="so-sub-spacer" />
      </div>

      <div className="so-screen-inner">
        {loading ? (
          <div className="so-podcasts-empty-container">
            <p className="so-podcasts-loading-text">Loading...</p>
          </div>
        ) : podcasts.length === 0 ? (
          <EmptyState
            title="No podcasts yet"
            subtitle="Generate podcasts from lessons in this course to start listening"
          />
        ) : (
          <div className="so-cp-content-inner">
            <h2 className="so-cp-section-title">
              {podcasts.length} {podcasts.length === 1 ? 'Podcast' : 'Podcasts'}
            </h2>
            {podcasts.map((podcast) => (
              <button
                key={podcast.id}
                type="button"
                className="so-cp-podcast-card"
                onClick={() => handlePodcastPress(podcast)}
              >
                <div className="so-cp-podcast-icon"><Icon name="mic" size={24} /></div>
                <div className="so-cp-podcast-info">
                  <p className="so-cp-podcast-title">{podcast.lessonTitle}</p>
                  <div className="so-cp-podcast-meta">
                    <span className="so-cp-podcast-meta-text">{formatDuration(podcast.durationMs)}</span>
                    <span className="so-cp-podcast-meta-text">•</span>
                    <span className="so-cp-podcast-meta-text">{formatDate(podcast.createdAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="so-cp-play-btn"
                  onClick={(e) => { e.stopPropagation(); handlePodcastPress(podcast) }}
                  aria-label="Play"
                >
                  <Icon name="play" size={20} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
