/**
 * Video player – loads real video from Supabase or shows placeholder + Generate.
 * Matches study-os-mobile VideoPlayerScreen / LessonHub video flow.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { fetchVideoForLesson, generateVideo } from '../data/video.repository'
import './screens.css'

const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 3 * 60 * 1000 // 3 min

export default function VideoPlayerScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Video'
  const stateVideoUrl = location.state?.videoUrl || null

  const [videoUrl, setVideoUrl] = useState(stateVideoUrl)
  const [loading, setLoading] = useState(!stateVideoUrl)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const loadVideo = useCallback(async () => {
    if (!lessonId) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const result = await fetchVideoForLesson(lessonId)
      if (result?.videoUrl) {
        setVideoUrl(result.videoUrl)
      } else {
        setVideoUrl(null)
      }
    } catch (e) {
      console.error('Failed to load video:', e)
      setError(e.message || 'Failed to load video')
      setVideoUrl(null)
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    if (stateVideoUrl) {
      setVideoUrl(stateVideoUrl)
      setLoading(false)
      return
    }
    setLoading(true)
    loadVideo()
  }, [lessonId, stateVideoUrl, loadVideo])

  const handleGenerate = async () => {
    if (!lessonId || generating) return
    try {
      setGenerating(true)
      setError(null)
      await generateVideo(lessonId)
      const deadline = Date.now() + POLL_TIMEOUT_MS
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        const result = await fetchVideoForLesson(lessonId)
        if (result?.videoUrl) {
          setVideoUrl(result.videoUrl)
          setGenerating(false)
          return
        }
      }
      setError('Video is still generating. Check back in a few minutes.')
    } catch (e) {
      setError(e.message || 'Failed to generate video')
    } finally {
      setGenerating(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    loadVideo()
  }

  return (
    <div className="so-screen">
      <header className="so-simple-header">
        <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-simple-title">{lessonTitle}</h1>
        <span className="so-simple-spacer" />
      </header>
      <div className="so-simple-content">
        <div className="so-video-content">
          <div className="so-video-wrapper">
            {error ? (
              <div className="so-video-placeholder">
                <span className="so-video-placeholder-icon" aria-hidden>
                  <Icon name="video" size={48} />
                </span>
                <p>{error}</p>
                <button
                  type="button"
                  className="so-video-generate-btn"
                  onClick={handleRetry}
                  style={{ marginTop: 12 }}
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="so-video-placeholder">
                <span className="so-video-placeholder-icon" aria-hidden>
                  <Icon name="video" size={48} />
                </span>
                <p>Loading video…</p>
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="so-video-element"
                aria-label="Lesson video"
              />
            ) : (
              <div className="so-video-placeholder">
                <span className="so-video-placeholder-icon" aria-hidden>
                  <Icon name="video" size={48} />
                </span>
                <p>No video yet</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>
                  Generate a 30s explainer from this lesson to watch here.
                </p>
                <button
                  type="button"
                  className="so-video-generate-btn"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ marginTop: 16 }}
                >
                  {generating ? 'Generating…' : 'Generate video'}
                </button>
              </div>
            )}
          </div>
          <h2 className="so-video-title">{lessonTitle}</h2>
        </div>
      </div>
    </div>
  )
}
