/**
 * Flashcards – flip cards, prev/next, progress. Data from lessonOutputs.repository.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { fetchFlashcards, generateFlashcards } from '../data/lessonOutputs.repository'
import { getFlashcards } from '../data/mock'
import './screens.css'

function loadFlashcards(lessonId) {
  return fetchFlashcards(lessonId).catch(() => getFlashcards(lessonId))
}

export default function FlashcardsScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Flashcards'

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const refresh = useCallback(() => {
    if (!lessonId) return
    setLoading(true)
    setError(null)
    loadFlashcards(lessonId)
      .then((data) => {
        setCards(Array.isArray(data) ? data : [])
        setIndex(0)
        setFlipped(false)
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load')
        setCards([])
      })
      .finally(() => setLoading(false))
  }, [lessonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleGenerate = () => {
    if (!lessonId || generating) return
    setGenerating(true)
    setError(null)
    generateFlashcards(lessonId)
      .then(() => refresh())
      .catch((e) => setError(e?.message || 'Generate failed'))
      .finally(() => setGenerating(false))
  }

  const card = cards[index]
  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1)
      setFlipped(false)
    }
  }
  const goNext = () => {
    if (index < cards.length - 1) {
      setIndex(index + 1)
      setFlipped(false)
    }
  }

  if (loading) {
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
          <p className="so-empty-subtitle">Loading…</p>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-simple-content so-empty">
          <p className="so-empty-title">No flashcards yet</p>
          <p className="so-empty-subtitle">Generate flashcards from this lesson to study.</p>
          {error && <p className="so-empty-subtitle" style={{ color: 'var(--so-error)' }}>{error}</p>}
          <button
            type="button"
            className="so-quiz-next-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate flashcards'}
          </button>
        </div>
      </div>
    )
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
        <div className="so-flashcards-content">
          <div className="so-flashcard-wrapper">
            <button
              type="button"
              className={`so-flashcard ${flipped ? 'is-flipped' : ''}`}
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? 'Show front' : 'Show back'}
            >
              <div className="so-flashcard-face so-flashcard-face-front">
                <span className="so-flashcard-label">Front</span>
                <p className="so-flashcard-text">{card.front}</p>
              </div>
              <div className="so-flashcard-face so-flashcard-face-back">
                <span className="so-flashcard-label">Back</span>
                <p className="so-flashcard-text">{card.back}</p>
              </div>
            </button>
          </div>
          <div className="so-flashcards-nav">
            <button
              type="button"
              className="so-flashcards-nav-btn"
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Previous card"
            >
              Previous
            </button>
            <span className="so-flashcards-progress">
              {index + 1} / {cards.length}
            </span>
            <button
              type="button"
              className="so-flashcards-nav-btn"
              onClick={goNext}
              disabled={index === cards.length - 1}
              aria-label="Next card"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
