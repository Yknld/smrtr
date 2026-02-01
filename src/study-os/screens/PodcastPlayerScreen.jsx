/**
 * Podcast player – loads real episode/segments from Supabase, plays audio by segment.
 * Matches study-os-mobile PodcastPlayerScreen behavior (without join-in).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import {
  fetchPodcastEpisode,
  fetchPodcastSegments,
  createPodcastEpisode,
  generatePodcastScript,
  generatePodcastAudio,
} from '../data/podcasts.repository'
import './screens.css'

const POLL_INTERVAL_MS = 3000

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '0:00'
  const s = Math.floor(Number(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function PodcastPlayerScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const stateTitle = location.state?.lessonTitle

  const [lessonTitle, setLessonTitle] = useState(stateTitle || 'Podcast')
  const [episode, setEpisode] = useState(null)
  const [segments, setSegments] = useState([])
  const [audioUrls, setAudioUrls] = useState([])
  const [segmentDurations, setSegmentDurations] = useState([]) // seconds per segment
  const [duration, setDuration] = useState(0) // total seconds
  const [currentTime, setCurrentTime] = useState(0) // seconds
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [statusMessage, setStatusMessage] = useState('Loading...')

  const audioRef = useRef(null)
  const pollRef = useRef(null)

  const getStatusMessage = useCallback((ep) => {
    if (!ep) return 'Loading...'
    switch (ep.status) {
      case 'queued':
        return 'Podcast queued for generation...'
      case 'scripting':
        return 'Writing podcast dialogue...'
      case 'voicing':
        return `Generating audio (${segments.length}/${ep.totalSegments || 0} segments)...`
      case 'ready':
        return 'Podcast ready'
      case 'failed':
        return 'Generation failed'
      default:
        return 'Processing...'
    }
  }, [segments.length])

  // Load or create episode and poll until ready
  useEffect(() => {
    if (!lessonId) {
      setLoading(false)
      setLoadError('No lesson')
      return
    }
    if (stateTitle) setLessonTitle(stateTitle)

    let cancelled = false
    let pollInterval = null

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }

    const loadSegmentsAndUrls = async (ep) => {
      const segs = await fetchPodcastSegments(ep.id)
      const urls = segs.map((s) => s.signedUrl || '')
      const durs = segs.map((s) => (s.durationMs || 0) / 1000)
      const totalSec = durs.reduce((a, b) => a + b, 0)
      if (cancelled) return
      setSegments(segs)
      setAudioUrls(urls)
      setSegmentDurations(durs)
      setDuration(Math.floor(totalSec))
      setLoading(false)
    }

    const pollUntilReady = (epId) => {
      pollInterval = setInterval(async () => {
        if (cancelled) return
        try {
          const updated = await fetchPodcastEpisode(lessonId)
          if (cancelled || !updated) return
          setEpisode(updated)
          setStatusMessage(getStatusMessage(updated))
          if (updated.status === 'ready') {
            stopPolling()
            await loadSegmentsAndUrls(updated)
          } else if (updated.status === 'failed') {
            stopPolling()
            setLoadError(updated.error || 'Podcast generation failed')
            setLoading(false)
          }
        } catch (e) {
          if (!cancelled) setLoadError(e.message || 'Failed to load podcast')
        }
      }, POLL_INTERVAL_MS)
    }

    const run = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        let ep = await fetchPodcastEpisode(lessonId)
        if (cancelled) return

        if (ep) {
          setEpisode(ep)
          setStatusMessage(getStatusMessage(ep))
          if (ep.status === 'ready') {
            await loadSegmentsAndUrls(ep)
            return
          }
          if (ep.status === 'failed') {
            setLoadError(ep.error || 'Podcast generation failed')
            setLoading(false)
            return
          }
          if (ep.status === 'voicing' || ep.status === 'scripting') {
            pollUntilReady(ep.id)
            return
          }
          if (ep.status === 'queued') {
            try {
              await generatePodcastScript(ep.id)
              if (cancelled) return
              ep = await fetchPodcastEpisode(lessonId)
              if (ep) setEpisode(ep)
              generatePodcastAudio(ep.id).catch(() => {})
            } catch (e) {
              if (!cancelled) {
                setLoadError(e.message || 'Failed to generate script')
                setLoading(false)
              }
              return
            }
            pollUntilReady(ep.id)
            return
          }
        }

        // No episode: create and generate
        const { episodeId } = await createPodcastEpisode(lessonId)
        if (cancelled) return
        ep = await fetchPodcastEpisode(lessonId)
        if (cancelled || !ep) {
          setLoadError('Failed to create episode')
          setLoading(false)
          return
        }
        setEpisode(ep)
        setStatusMessage('Writing podcast dialogue...')

        await generatePodcastScript(episodeId)
        if (cancelled) return
        ep = await fetchPodcastEpisode(lessonId)
        if (ep) setEpisode(ep)
        generatePodcastAudio(episodeId).catch(() => {})
        pollUntilReady(episodeId)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Failed to load podcast')
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
      stopPolling()
    }
  }, [lessonId, stateTitle, getStatusMessage])

  // Single HTML5 Audio: play segment at currentSegmentIndex
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onEnded = () => {
      const next = currentSegmentIndex + 1
      if (next < audioUrls.length && audioUrls[next]) {
        setCurrentSegmentIndex(next)
      } else {
        setPlaying(false)
        setCurrentTime(0)
        setCurrentSegmentIndex(0)
      }
    }

    const onTimeUpdate = () => {
      const prevSec = segmentDurations.slice(0, currentSegmentIndex).reduce((a, b) => a + b, 0)
      setCurrentTime(prevSec + (audio.currentTime || 0))
    }

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.pause()
      audio.src = ''
    }
  }, [currentSegmentIndex, audioUrls.length, segmentDurations])

  // When segment or play state changes, load and play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || audioUrls.length === 0 || currentSegmentIndex >= audioUrls.length) return
    const url = audioUrls[currentSegmentIndex]
    if (!url) {
      if (currentSegmentIndex < audioUrls.length - 1) setCurrentSegmentIndex((i) => i + 1)
      return
    }
    if (audio.src !== url) {
      audio.src = url
      audio.load()
    }
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [currentSegmentIndex, playing, audioUrls])

  const togglePlay = () => {
    if (episode?.status !== 'ready' || audioUrls.length === 0) return
    setPlaying((p) => !p)
  }

  const skipBack = () => {
    const target = Math.max(0, currentTime - 15)
    seekTo(target)
  }

  const skipForward = () => {
    const target = Math.min(duration, currentTime + 15)
    seekTo(target)
  }

  function seekTo(targetSeconds) {
    if (segmentDurations.length === 0) return
    let acc = 0
    for (let i = 0; i < segmentDurations.length; i++) {
      if (acc + segmentDurations[i] >= targetSeconds) {
        setCurrentSegmentIndex(i)
        const audio = audioRef.current
        if (audio) {
          audio.currentTime = targetSeconds - acc
          if (playing) audio.play().catch(() => {})
        }
        setCurrentTime(targetSeconds)
        return
      }
      acc += segmentDurations[i]
    }
  }

  const handleSeek = (e) => {
    const pct = Number(e.target.value) / 100
    const target = Math.floor(pct * duration)
    seekTo(target)
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const ready = episode?.status === 'ready' && !loadError && audioUrls.length > 0

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
        <div className="so-podcast-content">
          {loadError ? (
            <>
              <p className="so-empty-subtitle">{loadError}</p>
              <button
                type="button"
                className="so-podcast-btn so-podcast-btn-play"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setLoadError(null)
                  setLoading(true)
                  setEpisode(null)
                  setSegments([])
                  setAudioUrls([])
                  setSegmentDurations([])
                  setDuration(0)
                  setCurrentTime(0)
                  setCurrentSegmentIndex(0)
                  setPlaying(false)
                  window.location.reload()
                }}
              >
                Try again
              </button>
            </>
          ) : loading ? (
            <>
              <div className="so-podcast-art" aria-hidden>
                <Icon name="mic" size={64} />
              </div>
              <h2 className="so-podcast-title">{lessonTitle}</h2>
              <p className="so-empty-subtitle">{statusMessage}</p>
            </>
          ) : ready ? (
            <>
              <div className="so-podcast-art" aria-hidden>
                <Icon name="mic" size={64} />
              </div>
              <h2 className="so-podcast-title">{lessonTitle}</h2>
              <div className="so-podcast-controls">
                <button type="button" className="so-podcast-btn" aria-label="Skip back 15s" onClick={skipBack}>
                  <Icon name="back" size={22} />
                </button>
                <button
                  type="button"
                  className="so-podcast-btn so-podcast-btn-play"
                  onClick={togglePlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  <Icon name={playing ? 'pause' : 'play'} size={28} />
                </button>
                <button type="button" className="so-podcast-btn" aria-label="Skip forward 15s" onClick={skipForward}>
                  <Icon name="chevronRight" size={22} />
                </button>
              </div>
              <div className="so-podcast-progress-wrap">
                <input
                  type="range"
                  className="so-podcast-progress-bar"
                  min={0}
                  max={100}
                  value={progressPct}
                  onChange={handleSeek}
                  aria-label="Seek"
                />
                <div className="so-podcast-times">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
