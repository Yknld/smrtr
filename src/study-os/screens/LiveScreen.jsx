/**
 * Live screen – record via Supabase Edge Functions (transcribe_start + AssemblyAI WS),
 * LIVE TRANSCRIPT card, STUDY NOTES card (notes_commit / notes_get / notes_finalize), Ask this lesson.
 * Mirror: study-os-mobile LessonWorkspaceScreen + LiveTranscriptionScreen.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { AssemblyLiveService } from '../services/assemblyLive'
import { supabase } from '../config/supabase'
import {
  startTranscriptionSession,
  createStudySession,
  insertTranscriptSegment,
  notesCommit,
  notesGet,
  notesFinalize,
  persistTranscript,
  endStudySession,
} from '../data/liveTranscription.repository'
import './screens.css'

export default function LiveScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Lesson'

  const [transcriptExpanded, setTranscriptExpanded] = useState(true)
  const [askInput, setAskInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [transcriptText, setTranscriptText] = useState('')
  const [partialText, setPartialText] = useState('')
  const [notesText, setNotesText] = useState('')

  const assemblyRef = useRef(null)
  const studySessionIdRef = useRef(null)
  const seqRef = useRef(0)
  const commitIntervalRef = useRef(null)
  const transcriptRef = useRef('')

  const loadNotes = useCallback(async () => {
    if (!lessonId) return
    try {
      const data = await notesGet(lessonId)
      setNotesText(data?.notes_final_text || data?.notes_raw_text || '')
    } catch (_) {
      setNotesText('')
    }
  }, [lessonId])

  useEffect(() => {
    if (!recording && lessonId) loadNotes()
  }, [lessonId, recording, loadNotes])

  const handleTranscriptEvent = useCallback(
    (event) => {
      switch (event.type) {
        case 'connected':
          setStatus('Recording…')
          setError(null)
          break
        case 'partial':
          if (event.text) setPartialText(event.text)
          break
        case 'final':
          if (event.text) {
            setTranscriptText((prev) => {
              const next = prev ? `${prev} ${event.text}` : event.text
              transcriptRef.current = next
              return next
            })
            setPartialText('')
            const sid = studySessionIdRef.current
            if (lessonId && sid) {
              seqRef.current += 1
              insertTranscriptSegment(sid, seqRef.current, event.text, 'en').catch(() => {})
            }
          }
          break
        case 'error':
          setError(event.error || 'Transcription error')
          setStatus('')
          break
        case 'disconnected':
          setStatus('')
          break
        default:
          break
      }
    },
    [lessonId]
  )

  const startRecording = async () => {
    setError(null)
    setTranscriptText('')
    setPartialText('')
    setNotesText('')
    transcriptRef.current = ''
    setStatus('Starting…')
    try {
      let { data } = await supabase.auth.getSession()
      if (!data?.session && import.meta.env.DEV) {
        const email = import.meta.env.VITE_DEMO_EMAIL || 'user1@test.com'
        const password = import.meta.env.VITE_DEMO_PASSWORD || 'password123'
        await supabase.auth.signInWithPassword({ email, password })
        data = (await supabase.auth.getSession()).data
      }
      if (!data?.session) {
        setError('Sign in required to record.')
        setStatus('')
        return
      }
      let studySessionId = null
      if (lessonId) {
        const study = await createStudySession(lessonId)
        studySessionId = study.id
        studySessionIdRef.current = studySessionId
        seqRef.current = 0
      } else {
        studySessionIdRef.current = null
      }
      const backend = await startTranscriptionSession({ language: 'en' })
      if (!backend?.assemblyai_ws_url) {
        setError(backend?.error || 'Live transcription not available.')
        setStatus('')
        return
      }
      const service = new AssemblyLiveService(handleTranscriptEvent)
      assemblyRef.current = service
      await service.start(backend)
      setRecording(true)
      if (lessonId && studySessionId) {
        commitIntervalRef.current = setInterval(() => {
          notesCommit(lessonId, studySessionId).catch(() => {})
        }, 5000)
      }
    } catch (e) {
      setError(e?.message || 'Failed to start recording')
      setStatus('')
      setRecording(false)
    }
  }

  const stopRecording = async () => {
    setStatus('Stopping…')
    const service = assemblyRef.current
    if (commitIntervalRef.current) {
      clearInterval(commitIntervalRef.current)
      commitIntervalRef.current = null
    }
    const transcriptionSessionId = service ? await service.stop() : null
    assemblyRef.current = null
    const studySessionId = studySessionIdRef.current
    const finalTranscript = transcriptRef.current || transcriptText
    if (transcriptionSessionId && finalTranscript) {
      try {
        await persistTranscript(transcriptionSessionId, finalTranscript)
      } catch (_) {}
    }
    if (studySessionId && lessonId) {
      try {
        await notesCommit(lessonId, studySessionId)
        await endStudySession(studySessionId)
      } catch (_) {}
      try {
        await notesFinalize(lessonId)
        await loadNotes()
      } catch (_) {}
    }
    studySessionIdRef.current = null
    setRecording(false)
    setStatus('')
  }

  const toggleRecording = () => {
    if (recording) stopRecording()
    else startRecording()
  }

  const handleSendAsk = () => {
    if (!askInput.trim()) return
    // TODO: call tutor_chat Edge Function with lessonId + transcript/notes context
    setAskInput('')
  }

  const displayTranscript = transcriptText + (partialText ? ` ${partialText}` : '')
  const sourceCount = transcriptText ? 1 : 0

  return (
    <div className="so-screen">
      <header className="so-live-header">
        <button type="button" className="so-live-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <div className="so-live-header-center">
          <h1 className="so-live-title">{lessonTitle}</h1>
          <p className="so-live-subtitle">{status || (recording ? 'Recording…' : 'Tap the icon in the top right to record')}</p>
          {error && (
            <p className="so-live-subtitle" style={{ color: 'var(--so-error)' }}>
              {error}
            </p>
          )}
        </div>
        <div className="so-live-header-right">
          <button type="button" className="so-live-icon-btn" aria-label="Audio">
            <Icon name="waveform" size={22} />
          </button>
          <button type="button" className="so-live-icon-btn" aria-label="Headphones">
            <Icon name="headphones" size={22} />
          </button>
          <button type="button" className="so-live-icon-btn" aria-label="Translation">
            <Icon name="help" size={22} />
          </button>
        </div>
      </header>

      <div className="so-live-content">
        <div className="so-live-content-inner">
          <section className="so-live-card">
            <div className="so-live-card-header">
              <span className="so-live-card-icon" aria-hidden>
                <Icon name="mic" size={20} />
              </span>
              <h2 className="so-live-card-title">LIVE TRANSCRIPT</h2>
              <button
                type="button"
                className="so-live-card-expand"
                onClick={() => setTranscriptExpanded((e) => !e)}
                aria-label={transcriptExpanded ? 'Collapse' : 'Expand'}
              >
                <Icon name="chevronUp" size={20} className={transcriptExpanded ? '' : 'so-live-chevron-down'} />
              </button>
            </div>
            {transcriptExpanded && (
              <div className="so-live-card-body">
                {displayTranscript ? (
                  <p className="so-live-card-text">
                    {transcriptText}
                    {partialText && (
                      <span className="so-live-card-partial" style={{ color: 'var(--so-text-tertiary)', fontStyle: 'italic' }}>
                        {' '}
                        {partialText}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="so-live-card-hint">Tap the microphone icon to start recording.</p>
                )}
              </div>
            )}
          </section>

          <section className="so-live-card">
            <div className="so-live-card-header">
              <span className="so-live-card-icon" aria-hidden>
                <Icon name="fileText" size={20} />
              </span>
              <h2 className="so-live-card-title">STUDY NOTES</h2>
            </div>
            <div className="so-live-card-body">
              {notesText ? (
                <p className="so-live-card-text">{notesText}</p>
              ) : (
                <p className="so-live-card-hint">Start recording to generate notes automatically.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="so-live-footer">
        <p className="so-live-footer-meta">Lesson · {sourceCount} source{sourceCount !== 1 ? 's' : ''}</p>
        <div className="so-live-ask-bar">
          <input
            type="text"
            className="so-live-ask-input"
            placeholder="Ask this lesson…"
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendAsk()}
            aria-label="Ask this lesson"
          />
          <button type="button" className="so-live-ask-send" onClick={handleSendAsk} aria-label="Send" disabled={!askInput.trim()}>
            <Icon name="send" size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
