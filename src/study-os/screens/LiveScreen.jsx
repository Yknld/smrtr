/**
 * Live screen – record via Supabase Edge Functions (transcribe_start + AssemblyAI WS),
 * LIVE TRANSCRIPT card, STUDY NOTES card (notes_commit / notes_get / notes_finalize), Ask this lesson.
 * Mirror: study-os-mobile LessonWorkspaceScreen + LiveTranscriptionScreen.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { createElement } from 'react'
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
  notesUpdate,
  persistTranscript,
  endStudySession,
} from '../data/liveTranscription.repository'
import './screens.css'

/** Render **bold** as <strong> for Q&A answers */
function formatAnswerText (text) {
  if (!text || typeof text !== 'string') return text
  const parts = []
  const re = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(createElement('span', { key: key++ }, text.slice(lastIndex, match.index)))
    }
    parts.push(createElement('strong', { key: key++ }, match[1]))
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(createElement('span', { key: key++ }, text.slice(lastIndex)))
  }
  return parts.length ? parts : text
}

export default function LiveScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Lesson'

  const [transcriptExpanded, setTranscriptExpanded] = useState(true)
  const [qaExpanded, setQaExpanded] = useState(true)
  const [askInput, setAskInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [transcriptText, setTranscriptText] = useState('')
  const [partialText, setPartialText] = useState('')
  const [notesText, setNotesText] = useState('')
  const [qaHistory, setQaHistory] = useState([])
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false)
  const [lessonQaConversationId, setLessonQaConversationId] = useState(null)

  const assemblyRef = useRef(null)
  const studySessionIdRef = useRef(null)
  const seqRef = useRef(0)
  const commitIntervalRef = useRef(null)
  const transcriptRef = useRef('')
  const saveNotesTimeoutRef = useRef(null)
  const notesTextRef = useRef(notesText)

  useEffect(() => {
    notesTextRef.current = notesText
  }, [notesText])

  useEffect(() => {
    return () => {
      if (saveNotesTimeoutRef.current) {
        clearTimeout(saveNotesTimeoutRef.current)
        saveNotesTimeoutRef.current = null
      }
      const latest = notesTextRef.current
      if (lessonId && typeof latest === 'string') {
        notesUpdate(lessonId, latest).catch(() => {})
      }
    }
  }, [lessonId])

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

  const saveNotesDebounced = useCallback(
    (text) => {
      if (!lessonId) return
      if (saveNotesTimeoutRef.current) clearTimeout(saveNotesTimeoutRef.current)
      saveNotesTimeoutRef.current = setTimeout(() => {
        saveNotesTimeoutRef.current = null
        notesUpdate(lessonId, text).catch(() => {})
      }, 500)
    },
    [lessonId]
  )

  const handleNotesChange = useCallback(
    (e) => {
      const next = e.target.value
      setNotesText(next)
      saveNotesDebounced(next)
    },
    [saveNotesDebounced]
  )

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
          notesCommit(lessonId, studySessionId)
            .then(() => loadNotes())
            .catch(() => {})
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

  const displayTranscript = transcriptText + (partialText ? ` ${partialText}` : '')

  const handleSendAsk = async () => {
    if (!askInput.trim()) return
    const question = askInput.trim()
    setAskInput('')
    setQaExpanded(true)
    setIsLoadingAnswer(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sign in required to use Q&A.')
        return
      }
      const { data, error: fnError } = await supabase.functions.invoke('tutor_chat', {
        body: {
          conversationId: lessonQaConversationId,
          lessonId: lessonId || null,
          message: question,
          liveTranscript: (displayTranscript && displayTranscript.trim()) ? displayTranscript.trim() : undefined,
          notes: (notesText && notesText.trim()) ? notesText.trim() : undefined,
        },
      })
      if (fnError) {
        const msg = fnError.context?.body ?? fnError.message ?? 'Failed to get answer'
        setError(typeof msg === 'string' ? msg : 'Failed to get answer')
        return
      }
      if (data?.conversationId && !lessonQaConversationId) {
        setLessonQaConversationId(data.conversationId)
      }
      const answer = data?.assistantMessage ?? 'No response received'
      setQaHistory((prev) => [...prev, { question, answer }])
    } catch (err) {
      setError(err?.message ?? 'Failed to get answer')
    } finally {
      setIsLoadingAnswer(false)
    }
  }

  const sourceCount = [transcriptText, notesText].filter(Boolean).length

  return (
    <div
      className="so-screen so-live-screen"
      style={{
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
          <button
            type="button"
            className="so-live-icon-btn"
            onClick={toggleRecording}
            aria-label={recording ? 'Stop recording' : 'Start live notes'}
          >
            <Icon name={recording ? 'waveform' : 'mic'} size={22} />
          </button>
          <button type="button" className="so-live-icon-btn" aria-label="Headphones">
            <Icon name="headphones" size={22} />
          </button>
          <button type="button" className="so-live-icon-btn" aria-label="Translation">
            <Icon name="help" size={22} />
          </button>
        </div>
      </header>

      <div
        className="so-live-content"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}
      >
        <aside className="so-live-sidebar-left">
          <section className="so-live-card so-live-qa-card">
            <div className="so-live-card-header">
              <span className="so-live-card-icon" aria-hidden>
                <Icon name="chat" size={20} />
              </span>
              <h2 className="so-live-card-title">Q&A</h2>
              {qaHistory.length > 0 && (
                <span className="so-live-qa-badge" aria-hidden>{qaHistory.length}</span>
              )}
              <button
                type="button"
                className="so-live-card-expand"
                onClick={() => setQaExpanded((e) => !e)}
                aria-label={qaExpanded ? 'Collapse' : 'Expand'}
              >
                <Icon name="chevronUp" size={20} className={qaExpanded ? '' : 'so-live-chevron-down'} />
              </button>
            </div>
            {qaExpanded && (
              <div className="so-live-card-body">
                {(qaHistory.length > 0 || isLoadingAnswer) ? (
                  <>
                    {qaHistory.map((item, i) => (
                      <div key={i} className="so-live-qa-item">
                        <p className="so-live-qa-question"><strong>Q:</strong> {item.question}</p>
                        <p className="so-live-qa-answer"><strong>A:</strong> {formatAnswerText(item.answer)}</p>
                      </div>
                    ))}
                    {isLoadingAnswer && (
                      <p className="so-live-card-hint">Getting answer…</p>
                    )}
                  </>
                ) : (
                  <p className="so-live-card-hint">Ask a question about this lesson below.</p>
                )}
              </div>
            )}
          </section>
          <div className="so-live-ask-wrap">
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
        </aside>

        <div
          className="so-live-content-center"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '24px 24px 140px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="so-live-content-inner"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflow: 'hidden',
              width: '100%',
              maxWidth: 720,
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
            <section
              className="so-live-card so-live-card-transcript"
              style={{
                maxHeight: '38%',
                minHeight: 80,
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
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
                <div
                  className="so-live-card-body"
                  style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
                >
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

            <section
              className="so-live-card so-live-card-notes"
              style={{
                flex: '1 1 0',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div className="so-live-card-header">
                <span className="so-live-card-icon" aria-hidden>
                  <Icon name="fileText" size={20} />
                </span>
                <h2 className="so-live-card-title">STUDY NOTES</h2>
              </div>
              <div
                className="so-live-card-body"
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <textarea
                  className="so-live-card-notes-input"
                  value={notesText}
                  onChange={handleNotesChange}
                  placeholder="Start recording to generate notes automatically, or type here. Edits save automatically."
                  aria-label="Study notes"
                  style={{
                    flex: 1,
                    minHeight: 180,
                    overflowY: 'auto',
                    width: '100%',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: '#E5E5E5',
                    background: 'transparent',
                    border: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
