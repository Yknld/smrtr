/**
 * Lesson Hub – main note (doc-style), ASSETS, ACTIONS.
 * NOTES synced with backend (notes_get / notes_set_raw) for real lessons.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import ActionTile from '../components/ActionTile'
import { Icon } from '../components/Icons'
import { notesGet, notesSetRaw } from '../data/liveTranscription.repository'
import { fetchLessonAssets } from '../data/lessonAssets.repository'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isValidUuid(str) {
  return typeof str === 'string' && UUID_REGEX.test(str)
}
import './screens.css'

const STORAGE_KEY_PREFIX = 'lesson-note-'
const SAVE_DEBOUNCE_MS = 800

function getStoredNote(lessonId) {
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + lessonId) || ''
  } catch {
    return ''
  }
}

function setStoredNote(lessonId, text) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + lessonId, text)
  } catch (_) {}
}

export default function LessonHubScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Lesson'

  const [noteBody, setNoteBody] = useState('')
  const [notesLoading, setNotesLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    if (!lessonId) {
      setNoteBody('')
      setNotesLoading(false)
      return
    }
    if (!isValidUuid(lessonId)) {
      setNoteBody(getStoredNote(lessonId))
      setNotesLoading(false)
      return
    }
    setNotesLoading(true)
    notesGet(lessonId)
      .then((data) => {
        const text = data?.notes_final_text || data?.notes_raw_text || ''
        setNoteBody(text)
      })
      .catch(() => setNoteBody(''))
      .finally(() => setNotesLoading(false))
  }, [lessonId])

  useEffect(() => {
    if (!lessonId) {
      setAssets([])
      setAssetsLoading(false)
      return
    }
    if (!isValidUuid(lessonId)) {
      setAssets([])
      setAssetsLoading(false)
      return
    }
    setAssetsLoading(true)
    fetchLessonAssets(lessonId)
      .then(setAssets)
      .catch(() => setAssets([]))
      .finally(() => setAssetsLoading(false))
  }, [lessonId])

  const saveNotes = useCallback(
    (text) => {
      if (!lessonId || !isValidUuid(lessonId)) {
        setStoredNote(lessonId, text)
        return
      }
      notesSetRaw(lessonId, text).catch(() => {})
    },
    [lessonId]
  )

  const handleNoteChange = useCallback(
    (e) => {
      const value = e.target.value
      setNoteBody(value)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => saveNotes(value), SAVE_DEBOUNCE_MS)
    },
    [saveNotes]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return (
    <div className="so-screen">
      <header className="so-lesson-hub-header">
        <button type="button" className="so-lesson-hub-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-lesson-hub-title">{lessonTitle}</h1>
        <div className="so-lesson-hub-right">
          <button type="button" className="so-lesson-hub-icon-btn" aria-label="Play"><Icon name="play" size={24} /></button>
          <button type="button" className="so-lesson-hub-icon-btn" aria-label="Calendar"><Icon name="calendar" size={24} /></button>
          <button type="button" className="so-lesson-hub-icon-btn" aria-label="Edit"><Icon name="pencil" size={24} /></button>
        </div>
      </header>

      <div className="so-lesson-hub-content">
        <div className="so-lesson-hub-content-inner">
          {/* NOTES – main note for this lesson (doc-style) */}
          <section className="so-lesson-hub-notes-section">
            <h2 className="so-lesson-hub-notes-label">NOTES</h2>
            <div className="so-lesson-hub-notes-doc">
              <textarea
                className="so-lesson-hub-notes-editor"
                value={noteBody}
                onChange={handleNoteChange}
                placeholder={notesLoading ? 'Loading notes…' : 'Start writing your notes…'}
                aria-label="Lesson notes"
                spellCheck="true"
                disabled={notesLoading}
              />
            </div>
          </section>

          {/* ASSETS – grid/list (above actions), synced with Supabase */}
          <section className="so-lesson-hub-assets-section">
            <h2 className="so-lesson-hub-assets-label">ASSETS</h2>
            {assetsLoading ? (
              <p className="so-lesson-hub-assets-empty-text">Loading assets…</p>
            ) : assets.length > 0 ? (
              <>
                <div className="so-lesson-hub-assets-grid">
                  {assets.slice(0, 6).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="so-asset-card"
                      onClick={() => navigate(`/app/lesson/${lessonId}/assets`, { state: { lessonTitle } })}
                    >
                      <span className="so-asset-card-icon" aria-hidden><Icon name="fileText" size={24} /></span>
                      <span className="so-asset-card-title">{asset.title}</span>
                      <span className="so-asset-card-meta">{asset.size}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="so-lesson-hub-assets-view-all"
                  onClick={() => navigate(`/app/lesson/${lessonId}/assets`, { state: { lessonTitle } })}
                >
                  View all assets
                </button>
              </>
            ) : (
              <div className="so-lesson-hub-assets-empty">
                <p className="so-lesson-hub-assets-empty-text">No assets yet. Generated outputs will appear here.</p>
                <button
                  type="button"
                  className="so-lesson-hub-assets-view-all"
                  onClick={() => navigate(`/app/lesson/${lessonId}/assets`, { state: { lessonTitle } })}
                >
                  Open assets
                </button>
              </div>
            )}
          </section>

          {/* ACTIONS – action grid */}
          <h2 className="so-lesson-hub-actions-label">ACTIONS</h2>
          <div className="so-lesson-hub-grid">
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="gamepad" size={28} />}
                label="Interact"
                subtitle="Practice steps"
                badge="Generated"
                onPress={() => navigate(`/app/lesson/${lessonId}/solver`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="radio" size={28} />}
                label="Live"
                subtitle="Record + translate"
                onPress={() => navigate(`/app/lesson/${lessonId}/live`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="chat" size={28} />}
                label="AI Tutor"
                onPress={() => navigate(`/app/lesson/${lessonId}/tutor`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="layers" size={28} />}
                label="Flashcards"
                badge="Generated"
                onPress={() => navigate(`/app/lesson/${lessonId}/flashcards`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="help" size={28} />}
                label="Quiz"
                badge="Generate"
                onPress={() => navigate(`/app/lesson/${lessonId}/quiz`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="mic" size={28} />}
                label="Podcast"
                badge="Generate"
                onPress={() => navigate(`/app/podcasts/play/${lessonId}`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="video" size={28} />}
                label="Video"
                subtitle="30s explainer"
                badge="Generate"
                onPress={() => navigate(`/app/lesson/${lessonId}/video`, { state: { lessonTitle } })}
              />
            </div>
            <div className="so-lesson-hub-grid-item">
              <ActionTile
                icon={<Icon name="folder" size={28} />}
                label="Assets"
                onPress={() => navigate(`/app/lesson/${lessonId}/assets`, { state: { lessonTitle } })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
